use anyhow::anyhow;
use async_lsp_client::{LspServer, ServerMessage};
use log::info;
use lsp_types::InitializeResult;
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::RwLock;
use tokio::sync::mpsc::Receiver;

use crate::editor::editor_state::{Document, Language};

// One language server for each workspace and language
#[derive(Eq, Hash, PartialEq, Debug, Clone)]
pub struct LanguageServerId(PathBuf, Language);

pub struct LspRegistry {
    pub language_servers: RwLock<HashMap<LanguageServerId, LspServer>>,
    pub language_server_configs: RwLock<HashMap<LanguageServerId, InitializeResult>>,
    pub language_server_registered_tx: async_channel::Sender<Receiver<ServerMessage>>,
    pub language_server_registered_rx: async_channel::Receiver<Receiver<ServerMessage>>,
}

impl Document {
    pub fn get_language_server_id(&self) -> Option<LanguageServerId> {
        let language = self.language.clone()?;
        let path = self.get_worktree_path();
        Some(LanguageServerId(path, language))
    }
}

impl LspRegistry {
    pub fn new() -> Self {
        let (language_server_registered_tx, language_server_registered_rx) =
            async_channel::unbounded();
        Self {
            language_servers: RwLock::new(HashMap::new()),
            language_server_configs: RwLock::new(HashMap::new()),
            language_server_registered_tx,
            language_server_registered_rx,
        }
    }

    pub fn get_language_server(&self, doc: &Document) -> Option<LspServer> {
        self.language_servers
            .read()
            .unwrap()
            .get(&doc.get_language_server_id()?)
            .cloned()
    }

    pub fn get_language_server_config(&self, doc: &Document) -> Option<InitializeResult> {
        self.language_server_configs
            .read()
            .unwrap()
            .get(&doc.get_language_server_id()?)
            .cloned()
    }

    fn insert_language_server(
        &self,
        id: &LanguageServerId,
    ) -> anyhow::Result<(LspServer, Option<Receiver<ServerMessage>>)> {
        let mut language_servers = self.language_servers.write().unwrap();

        match language_servers.entry(id.clone()) {
            Entry::Vacant(entry) => {
                info!("register new language server (id={:?})", &id);
                let (server, rx) = Self::create_language_server(&id.1)?;
                let server = entry.insert(server.clone());
                Ok((server.clone(), Some(rx)))
            }
            Entry::Occupied(entry) => {
                info!("language server already exists (id={:?})", &id);
                Ok((entry.get().clone(), None))
            }
        }
    }

    pub async fn register_language_server(
        &self,
        doc: &Document,
    ) -> anyhow::Result<(LspServer, bool)> {
        let language_server_id = doc.get_language_server_id().ok_or(anyhow!("No language"))?;

        match self.insert_language_server(&language_server_id)? {
            (server, Some(rx)) => {
                self.language_server_registered_tx.send(rx).await?;
                Ok((server, true))
            }
            (server, None) => Ok((server, false)),
        }
    }

    pub fn insert_language_server_config(
        &self,
        doc: &Document,
        config: InitializeResult,
    ) -> Option<InitializeResult> {
        let mut language_servers = self.language_server_configs.write().unwrap();
        language_servers.insert(doc.get_language_server_id()?, config)
    }

    fn create_language_server(
        language: &Language,
    ) -> anyhow::Result<(LspServer, Receiver<ServerMessage>)> {
        info!("create language server (language={:?})", language);
        match language.0.as_str() {
            "typescript" => Ok(LspServer::new("typescript-language-server", ["--stdio"])),
            "rust" => Ok(LspServer::new("rust-analyzer", [])),
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
        create_test_workspace();

        let path = get_test_dir().join("src").join("index.ts");
        let language = Language("typescript".to_string());

        let doc = Document {
            path,
            worktree_path: Some(get_test_dir()),
            language: Some(language.clone()),
            text: Rope::new(),
            changed: false,
            last_modified: SystemTime::now(),
            version: 0,
        };

        let lsp_registry = LspRegistry::new();
        lsp_registry.register_language_server(&doc).await.unwrap();

        assert!(lsp_registry
            .language_servers
            .read()
            .unwrap()
            .contains_key(&LanguageServerId(get_test_dir(), language)));
    }
}
