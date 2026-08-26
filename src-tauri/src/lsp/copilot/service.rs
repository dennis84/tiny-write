use async_lsp::lsp_types::CompletionParams;
use dirs::home_dir;
use rusqlite::Connection;
use serde_json::Value;
use std::path::{Path, PathBuf};

use anyhow::anyhow;
use tauri::{AppHandle, Manager, Runtime};
use tokio::sync::Mutex;
use tracing::{debug, info};

use crate::editor::editor_state::{EditorState, Language};

use crate::lsp::registry::fallback_language_server_id;
use crate::lsp::{
    registry::{LanguageServerId, LspRegistry},
    server::LspServer,
};

use super::{plugin, request};

pub struct CopilotLspService<R: Runtime> {
    pub app_handle: AppHandle<R>,
    pub enabled: Mutex<bool>,
}

impl<R: Runtime> CopilotLspService<R> {
    pub fn new(app_handle: AppHandle<R>) -> Self {
        Self {
            app_handle,
            enabled: Mutex::new(false),
        }
    }

    pub async fn disconnect(&self) -> anyhow::Result<()> {
        info!("Copilot - disconnect");
        *self.enabled.lock().await = false;
        let lsp_registry = self.app_handle.state::<LspRegistry>();
        let language_server_id = Self::language_server_id(None);
        let language_server = lsp_registry
            .get_language_server(&language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;
        self.sign_out(&language_server).await?;
        lsp_registry
            .remove_language_server(&language_server_id)
            .await?;
        Ok(())
    }

    pub async fn get_status(&self) -> anyhow::Result<request::SignInStatus> {
        info!("Copilot - get sign-in status");
        let lsp_registry = self.app_handle.state::<LspRegistry>();
        let language_server_id = Self::language_server_id(None);
        let language_server = lsp_registry
            .get_language_server(&language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;
        self.check_status(&language_server).await
    }

    pub async fn sign_in(&self) -> anyhow::Result<request::SignInInitiateResult> {
        debug!("Copilot - send sign-in request");

        let lsp_registry = self.app_handle.state::<LspRegistry>();
        let language_server_id = Self::language_server_id(None);
        let language_server = lsp_registry
            .get_language_server(&language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;

        let response = language_server
            .request::<request::SignInInitiate>(request::SignInInitiateParams {})
            .await?;
        debug!("Copilot - SignInInitiate response {:?}", response);

        Ok(response)
    }

    pub async fn check_status(&self, server: &LspServer) -> anyhow::Result<request::SignInStatus> {
        debug!("Copilot - send check status request");

        let response = server
            .request::<request::CheckStatus>(request::CheckStatusParams {
                local_checks_only: false,
            })
            .await?;
        debug!("Copilot - CheckStatus response {:?}", response);
        Ok(response)
    }

    pub async fn sign_out(&self, server: &LspServer) -> anyhow::Result<request::SignOutResult> {
        debug!("Copilot - send sign-out request");
        let response = server
            .request::<request::SignOut>(request::SignOutParams {})
            .await?;
        debug!("Copilot - SignOut response {:?}", response);
        Ok(response)
    }

    pub async fn inline_completion(
        &self,
        path: &Path,
        p: CompletionParams,
    ) -> anyhow::Result<Value> {
        let editor_state = self.app_handle.state::<EditorState>();
        let lsp_registry = self.app_handle.state::<LspRegistry>();

        let doc = editor_state.get_document(path).await?;
        let language_server_id = Self::language_server_id(doc.worktree_path.clone());

        let server = lsp_registry
            .get_language_server(&language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;

        let response = server.request::<request::InlineCompletions>(p).await?;
        debug!("Copilot - inlineCompletions response {:?}", response);

        Ok(response)
    }

    pub fn get_auth_token(&self) -> anyhow::Result<String> {
        let path = Self::get_copilot_auth_db_path().ok_or(anyhow!("No home directory"))?;
        Self::read_auth_token_from_db(&path)
    }

    fn read_auth_token_from_db(path: &PathBuf) -> anyhow::Result<String> {
        let conn = Connection::open(path)?;
        let token: Vec<u8> = conn.query_row(
            "SELECT token_ciphertext FROM oauth_tokens WHERE source_editor_id = ?1",
            [plugin::PLUGIN_NAME],
            |row| row.get(0),
        )?;
        let token = String::from_utf8(token)?;

        Ok(token)
    }

    fn get_copilot_auth_db_path() -> Option<PathBuf> {
        Some(
            home_dir()?
                .join(".config")
                .join("github-copilot")
                .join("auth.db"),
        )
    }

    fn language_server_id(worktree_path: Option<PathBuf>) -> LanguageServerId {
        let language_id =  Language("copilot".to_string());
        match worktree_path {
            Some(path) => LanguageServerId(path.clone(), language_id),
            None => fallback_language_server_id(language_id)
        }
    }
}
