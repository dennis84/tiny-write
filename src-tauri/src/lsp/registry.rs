use anyhow::anyhow;
use async_lsp_client::{LspServer, ServerMessage};
use log::info;
use lsp_types::InitializeResult;
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::sync::mpsc::Receiver;

use crate::editor::editor_state::{Document, Language};

// One language server for each workspace and language
pub type LanguageServerId = (PathBuf, Language);

pub struct LspRegistry {
    pub language_servers: HashMap<LanguageServerId, LspServer>,
    pub language_server_configs: HashMap<LanguageServerId, InitializeResult>,
    pub language_server_registered_tx: crossbeam_channel::Sender<Receiver<ServerMessage>>,
    pub language_server_registered_rx: crossbeam_channel::Receiver<Receiver<ServerMessage>>,
}

impl LspRegistry {
    pub fn new() -> Self {
        let (language_server_registered_tx, language_server_registered_rx) =
            crossbeam_channel::unbounded();
        Self {
            language_servers: HashMap::new(),
            language_server_configs: HashMap::new(),
            language_server_registered_tx,
            language_server_registered_rx,
        }
    }

    pub fn get_language_server(&self, doc: &Document) -> Option<&LspServer> {
        self.language_servers
            .get(&self.get_language_server_id(doc)?)
    }

    pub fn get_language_server_config(&self, doc: &Document) -> Option<&InitializeResult> {
        self.language_server_configs
            .get(&self.get_language_server_id(doc)?)
    }

    pub fn register_language_server(
        &mut self,
        doc: &Document,
    ) -> anyhow::Result<(LspServer, bool)> {
        let language_server_id = self
            .get_language_server_id(doc)
            .ok_or(anyhow!("No language"))?;

        match self.language_servers.entry(language_server_id.clone()) {
            Entry::Vacant(entry) => {
                info!(
                    "register new language server (id={:?})",
                    &language_server_id
                );
                let (server, rx) = Self::create_language_server(&language_server_id.1)?;
                let server = entry.insert(server.clone());
                self.language_server_registered_tx.send(rx)?;
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

    pub fn set_language_server_config(
        &mut self,
        doc: &Document,
        config: InitializeResult,
    ) -> Option<InitializeResult> {
        self.language_server_configs
            .insert(self.get_language_server_id(doc)?, config)
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

    fn get_language_server_id(&self, doc: &Document) -> Option<LanguageServerId> {
        let language = doc.language.clone()?;
        let path = doc.get_worktree_path();
        Some((path, language))
    }
}

#[cfg(test)]
mod tests {
    use ropey::Rope;
    use serial_test::serial;

    use crate::editor::editor_state::{Document, Language};
    use crate::editor::testutil::{create_test_workspace, get_test_dir};
    use crate::lsp::registry::LspRegistry;

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
            version: 0,
        };

        let mut lsp_registry = LspRegistry::new();
        lsp_registry.register_language_server(&doc).unwrap();

        let language = Language("typescript".to_string());

        assert!(lsp_registry
            .language_servers
            .contains_key(&(get_test_dir(), language)));
    }
}
