use async_lsp::lsp_types::{CompletionParams, InitializeParams};
use dirs::home_dir;
use rusqlite::Connection;
use serde_json::Value;
use std::path::{Path, PathBuf};

use anyhow::anyhow;
use tauri::{AppHandle, Manager, Runtime};
use tokio::sync::Mutex;
use tracing::{debug, info};

use crate::editor::editor_state::{is_buffer, Delete, Document, EditorState, Insert, Language};

use crate::lsp::{
    registry::{LanguageServerId, LspRegistry},
    server::LspServer,
    service::LspService,
    util::{get_offset_encoding, pos_to_lsp_pos, url_for_path},
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

    pub async fn start(&self) -> anyhow::Result<()> {
        info!("Copilot - start language server");
        *self.enabled.lock().await = true;
        let language_server_id = Self::language_server_id(None);
        self.register_language_server(&language_server_id.0).await?;
        Ok(())
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

    pub async fn register_language_server(&self, path: &Path) -> anyhow::Result<()> {
        if !*self.enabled.lock().await {
            return Ok(());
        }

        debug!(
            "Copilot - register copilot language server (path={:?})",
            path
        );

        let editor_state = self.app_handle.state::<EditorState>();
        let lsp_registry = self.app_handle.state::<LspRegistry>();
        let lsp_service = self.app_handle.state::<LspService<R>>();

        let maybe_doc = editor_state.get_document(path).await.ok();
        let worktree_path = maybe_doc.clone().and_then(|d| d.worktree_path);
        let language_server_id = Self::language_server_id(worktree_path);

        match lsp_registry
            .register_language_server(&language_server_id, &self.app_handle)
            .await?
        {
            (server, true) => {
                let result = lsp_service.initialize(&server, &language_server_id, InitializeParams::default()).await?;
                let _ = lsp_registry
                    .insert_language_server_config(&language_server_id, result)
                    .await;
                lsp_service.initialized(&server).await?;
                self.check_status(&server).await?;
                if let Some(doc) = maybe_doc {
                    lsp_service.open_document(&server, &doc).await?;
                }
            }
            (server, false) => {
                if let Some(doc) = maybe_doc {
                    lsp_service.open_document(&server, &doc).await?;
                }
            }
        }

        Ok(())
    }

    pub async fn insert_document(&self, doc: &Document, data: &Insert) -> anyhow::Result<()> {
        Ok(())
        // if !*self.enabled.lock().await {
        //     return Ok(());
        // }
        //
        // let lsp_service = self.app_handle.state::<LspService<R>>();
        // let language_server_id = Self::language_server_id(doc.worktree_path.clone());
        // lsp_service
        //     .insert_document(&language_server_id, doc, data)
        //     .await
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

        // let file_uri = url_for_path(path);
        // let offset_encoding = get_offset_encoding(&config);
        // let relative_path = if is_buffer(path) {
        //     "".to_string()
        // } else {
        //     doc.get_relative_path().to_string_lossy().to_string()
        // };
        //
        // let position = pos_to_lsp_pos(&doc.text, pos, offset_encoding);

        let response = server
            .request::<request::InlineCompletions>(p)
            .await?;
        debug!("Copilot - inlineCompletions response {:?}", response);

        Ok(response)
    }

    pub async fn completion(
        &self,
        path: &Path,
        pos: usize,
        tab_width: u32,
        use_tabs: bool,
    ) -> anyhow::Result<request::GetCompletionsResult> {
        let editor_state = self.app_handle.state::<EditorState>();
        let lsp_registry = self.app_handle.state::<LspRegistry>();
        let lsp_service = self.app_handle.state::<LspService<R>>();

        let doc = editor_state.get_document(path).await?;
        let language_server_id = Self::language_server_id(doc.worktree_path.clone());

        lsp_service
            .update_document(&language_server_id, &doc)
            .await?;

        let config = lsp_registry
            .get_language_server_config(&language_server_id)
            .await
            .ok_or(anyhow!("No language server config"))?;

        let server = lsp_registry
            .get_language_server(&language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;

        debug!(
            "Copilot - send copilot completion request (pos={}, language={:?}, tab_width={}, use_tabs={})",
            pos, doc.language, tab_width, use_tabs
        );
        let file_uri = url_for_path(path);
        let offset_encoding = get_offset_encoding(&config);
        let relative_path = if is_buffer(path) {
            "".to_string()
        } else {
            doc.get_relative_path().to_string_lossy().to_string()
        };

        let position = pos_to_lsp_pos(&doc.text, pos, offset_encoding);

        let response = server
            .request::<request::GetCompletions>(request::GetCompletionsParams {
                doc: request::GetCompletionsDocument {
                    uri: file_uri,
                    tab_size: tab_width,
                    indent_size: tab_width,
                    insert_spaces: !use_tabs,
                    relative_path: relative_path.to_string(),
                    position,
                    version: doc.version as usize,
                },
            })
            .await?;
        debug!("Copilot - GetCompletions response {:?}", response);

        Ok(response)
    }

    fn language_server_id(worktree_path: Option<PathBuf>) -> LanguageServerId {
        match worktree_path {
            Some(path) => LanguageServerId(path.clone(), Language("copilot".to_string())),
            None => {
                let fallback_root_path = if cfg!(target_os = "windows") {
                    Path::new("C:/").to_path_buf()
                } else {
                    Path::new("/").to_path_buf()
                };

                LanguageServerId(fallback_root_path, Language("copilot".to_string()))
            }
        }
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
}
