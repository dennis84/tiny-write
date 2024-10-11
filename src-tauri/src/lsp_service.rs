use std::sync::Arc;

use anyhow::anyhow;
use async_lsp_client::LspServer;
use log::info;
use lsp_types::notification::DidOpenTextDocument;
use lsp_types::{
    request::HoverRequest, HoverParams, Position, TextDocumentIdentifier,
    TextDocumentPositionParams, Url,
};
use lsp_types::{
    DidOpenTextDocumentParams, Hover, InitializeParams, TextDocumentItem, WorkspaceFolder,
};
use tauri::{AppHandle, Manager, Runtime};
use tokio::sync::Mutex;

use crate::editor_state::{Document, EditorState};
use crate::lsp_registry::LspRegistry;

pub struct LspService<R: Runtime> {
    pub app_handle: AppHandle<R>,
}

impl<R: Runtime> LspService<R> {
    pub fn new(app_handle: AppHandle<R>) -> Self {
        LspService { app_handle }
    }

    pub async fn initialize(&self, server: &LspServer, doc: &Document) -> anyhow::Result<()> {
        info!("LspService::initialize - initialize");
        let root_uri = lsp_types::Url::from_file_path(doc.get_worktree_path())
            .map_err(|_| anyhow!("invalid root_uri"))?;
        server
            .initialize(InitializeParams {
                root_uri: Some(root_uri.clone()),
                workspace_folders: Some(vec![WorkspaceFolder {
                    uri: root_uri,
                    name: Default::default(),
                }]),
                ..InitializeParams::default()
            })
            .await;

        info!("LspService::initialize - send initialized notification");
        server.initialized().await;
        Ok(())
    }

    pub async fn open_document(&self, server: &LspServer, doc: &Document) -> anyhow::Result<()> {
        let file_uri = lsp_types::Url::from_file_path(doc.path.clone())
            .map_err(|_| anyhow!("invalid file_uri"))?;
        info!("LspService::open_document (file_uri={:?})", file_uri);
        server
            .send_notification::<DidOpenTextDocument>(DidOpenTextDocumentParams {
                text_document: TextDocumentItem {
                    uri: file_uri,
                    language_id: doc.get_language_id(),
                    version: 0,
                    text: doc.text.to_string(),
                },
            })
            .await;
        Ok(())
    }

    pub async fn hover(&self, path: String, row: u32, column: u32) -> anyhow::Result<Hover> {
        info!("LspService::hover - get editor_state");
        let editor_state = self.app_handle.state::<Arc<Mutex<EditorState>>>();
        let mut editor_state = editor_state.lock().await;

        info!("LspService::hover - get lsp_registry");
        let lsp_registry = self.app_handle.state::<Arc<Mutex<LspRegistry<R>>>>();
        let mut lsp_registry = lsp_registry.lock().await;

        info!("LspService::hover - get_document");
        let doc = editor_state.get_document(path.clone())?;
        let server = lsp_registry
            .get_language_server(doc)
            .ok_or(anyhow!("No language server"))?;

        info!("LspService::hover - send hover request");
        let response = server
            .send_request::<HoverRequest>(HoverParams {
                text_document_position_params: TextDocumentPositionParams {
                    text_document: TextDocumentIdentifier {
                        uri: Url::from_file_path(path).unwrap(),
                    },
                    position: Position::new(row, column),
                },
                work_done_progress_params: Default::default(),
            })
            .await;
        info!("LspService::hover - response: {:?}", response);

        response.ok_or(anyhow!("No response"))
    }
}
