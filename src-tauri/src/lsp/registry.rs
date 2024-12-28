use anyhow::anyhow;
use async_lsp::lsp_types::InitializeResult;
use log::{debug, info};
use std::collections::HashMap;
use std::path::PathBuf;
use std::{collections::hash_map::Entry, path::Path};
use tokio::sync::RwLock;
use tokio::task::JoinHandle;

use crate::editor::editor_state::{Document, Language};

use super::server::LspServer;

// One language server for each workspace and language
#[derive(Eq, Hash, PartialEq, Debug, Clone)]
pub struct LanguageServerId(pub PathBuf, pub Language);

pub struct LspRegistry {
    pub language_servers: RwLock<HashMap<LanguageServerId, LspServer>>,
    pub language_server_configs: RwLock<HashMap<LanguageServerId, InitializeResult>>,
}

impl Document {
    pub fn get_language_server_id(&self) -> Option<LanguageServerId> {
        let language = self.language.clone()?;
        let path = self.worktree_path.clone().unwrap_or_else(|| {
            if cfg!(target_os = "windows") {
                Path::new("C:/").to_path_buf()
            } else {
                Path::new("/").to_path_buf()
            }
        });

        Some(LanguageServerId(path, language))
    }
}

impl LspRegistry {
    pub fn new() -> Self {
        Self {
            language_servers: RwLock::new(HashMap::new()),
            language_server_configs: RwLock::new(HashMap::new()),
        }
    }

    pub async fn get_language_server(
        &self,
        language_server_id: &LanguageServerId,
    ) -> Option<LspServer> {
        self.language_servers
            .read()
            .await
            .get(language_server_id)
            .cloned()
    }

    pub async fn get_language_server_config(
        &self,
        language_server_id: &LanguageServerId,
    ) -> Option<InitializeResult> {
        self.language_server_configs
            .read()
            .await
            .get(language_server_id)
            .cloned()
    }

    pub async fn register_language_server(
        &self,
        language_server_id: &LanguageServerId,
    ) -> anyhow::Result<(LspServer, bool)> {
        let mut language_servers = self.language_servers.write().await;

        match language_servers.entry(language_server_id.clone()) {
            Entry::Vacant(entry) => {
                info!(
                    "register new language server (id={:?})",
                    &language_server_id
                );
                let (server, _) = Self::create_language_server(language_server_id)?;
                let server = entry.insert(server.clone());
                Ok((server.clone(), true))
            }
            Entry::Occupied(entry) => {
                info!(
                    "language server already exists (id={:?})",
                    &language_server_id
                );
                Ok((entry.get().clone(), false))
            }
        }
    }

    pub async fn remove_language_server(
        &self,
        language_server_id: &LanguageServerId,
    ) -> anyhow::Result<()> {
        let mut language_servers = self.language_servers.write().await;
        if let Some(server) = language_servers.remove(language_server_id) {
            server.shutdown().await?;
        }
        Ok(())
    }

    pub async fn insert_language_server_config(
        &self,
        language_server_id: &LanguageServerId,
        config: InitializeResult,
    ) -> Option<InitializeResult> {
        debug!("insert language server config (id={language_server_id:?}, config={config:?})");
        let mut language_servers = self.language_server_configs.write().await;
        language_servers.insert(language_server_id.clone(), config)
    }

    pub async fn shutdown(&self) {
        info!("shutdown all language servers");
        let mut language_servers = self.language_servers.write().await;
        for (_, server) in language_servers.iter() {
            let _ = server.shutdown().await;
        }

        language_servers.clear();
    }

    fn create_language_server(
        language_server_id: &LanguageServerId,
    ) -> anyhow::Result<(LspServer, JoinHandle<()>)> {
        info!(
            "create language server (language_server_id={:?})",
            language_server_id
        );
        match language_server_id.1 .0.as_str() {
            "typescript" => Ok(LspServer::new("typescript-language-server --stdio")),
            "rust" => Ok(LspServer::new("rust-analyzer")),
            "copilot" => Ok(LspServer::new("copilot-language-server --stdio")),
            _ => Err(anyhow!("No language server found")),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::time::SystemTime;

    use ropey::Rope;
    use serial_test::serial;

    use crate::editor::editor_state::{Document, Language};
    use crate::editor::testutil::{create_test_workspace, get_test_dir};
    use crate::lsp::registry::{LanguageServerId, LspRegistry};

    #[tokio::test]
    #[serial]
    async fn test_lsp_registry() {
        create_test_workspace(true);

        let path = get_test_dir().join("src").join("index.ts");
        let language = Language("typescript".to_string());

        let doc = Document {
            path,
            worktree_path: Some(get_test_dir()),
            language: Some(language.clone()),
            text: Rope::new(),
            last_modified: SystemTime::now(),
            version: 0,
        };

        let lsp_registry = LspRegistry::new();
        lsp_registry
            .register_language_server(&doc.get_language_server_id().unwrap())
            .await
            .unwrap();

        assert!(lsp_registry
            .language_servers
            .read()
            .await
            .contains_key(&LanguageServerId(get_test_dir(), language)));
    }
}
