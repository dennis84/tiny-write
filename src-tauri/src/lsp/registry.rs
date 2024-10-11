use anyhow::anyhow;
use async_lsp_client::{LspServer, ServerMessage};
use log::info;
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Manager, Runtime};
use tokio::sync::mpsc::Receiver;
use tokio::sync::Mutex;

use crate::editor::editor_state::{Document, EditorState, Language};
use crate::lsp::service::LspService;

// One language server for each workspace and language
pub type LanguageServerId = (PathBuf, Language);

pub struct LspRegistry<R: Runtime> {
    pub language_servers: HashMap<LanguageServerId, LspServer>,
    pub language_server_registered_tx: crossbeam_channel::Sender<Receiver<ServerMessage>>,
    pub language_server_registered_rx: crossbeam_channel::Receiver<Receiver<ServerMessage>>,
    pub app_handle: AppHandle<R>,
}

impl<R: Runtime> LspRegistry<R> {
    pub fn new(app_handle: AppHandle<R>) -> Self {
        let (language_server_registered_tx, language_server_registered_rx) =
            crossbeam_channel::unbounded();
        Self {
            language_servers: HashMap::new(),
            language_server_registered_tx,
            language_server_registered_rx,
            app_handle,
        }
    }

    pub fn get_language_server(&mut self, doc: &Document) -> Option<&LspServer> {
        let language = doc.language.clone()?;
        let path = doc.get_worktree_path();
        info!(
            "get language server (path={:?}, language={:?})",
            &path, &language
        );

        self.language_servers.get(&(path, language))
    }

    pub async fn register_language_server(&mut self, path: &Path) -> anyhow::Result<()> {
        let lsp_service = self.app_handle.state::<Arc<LspService<R>>>();

        let editor_state = self.app_handle.state::<Arc<Mutex<EditorState>>>();
        let mut editor_state = editor_state.lock().await;

        let doc = editor_state.get_document(path)?.clone();
        let language = doc.language.clone().ok_or(anyhow!("No language"))?;
        drop(editor_state);

        let workspace_path = doc.get_worktree_path();

        match self
            .language_servers
            .entry((workspace_path.clone(), language.clone()))
        {
            Entry::Vacant(entry) => {
                info!(
                    "register new language server (wordspace_path={:?}, language={:?})",
                    &workspace_path, &language
                );
                let (server, rx) = Self::create_language_server(&language)?;
                entry.insert(server.clone());
                self.language_server_registered_tx.send(rx)?;
                lsp_service.initialize(&server, &doc).await?;
                lsp_service.open_document(&server, &doc).await?;
            }
            Entry::Occupied(entry) => {
                info!(
                    "language server already exists (workspace_path={:?}, language={:?})",
                    &workspace_path, &language
                );
                lsp_service.open_document(entry.get(), &doc).await?;
            }
        }

        Ok(())
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
    use std::sync::Arc;

    use serial_test::serial;
    use tauri::Manager;
    use tokio::sync::Mutex;

    use crate::editor::editor_state::{EditorState, Language};
    use crate::editor::testutil::{create_test_workspace, get_test_dir};
    use crate::lsp::registry::LspRegistry;
    use crate::lsp::service::LspService;

    #[tokio::test]
    #[serial]
    async fn test_lsp_registry() {
        create_test_workspace();

        let path = get_test_dir().join("src").join("index.ts");
        let app = tauri::test::mock_builder()
            .build(tauri::generate_context!())
            .unwrap();

        let editor_state = Arc::new(Mutex::new(EditorState::new()));
        app.manage(editor_state);

        let lsp_service = Arc::new(LspService::new(app.app_handle().clone()));
        app.manage(lsp_service);

        let mut lsp_registry = LspRegistry::new(app.app_handle().clone());
        lsp_registry
            .register_language_server(path.as_ref())
            .await
            .unwrap();

        let language = Language("typescript".to_string());

        assert!(lsp_registry
            .language_servers
            .contains_key(&(get_test_dir(), language)));
    }
}
