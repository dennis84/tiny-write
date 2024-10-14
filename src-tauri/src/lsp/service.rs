use std::path::Path;
use std::sync::Arc;
use std::time::SystemTime;

use anyhow::anyhow;
use async_lsp_client::LspServer;
use log::info;
use lsp_types::notification::{DidChangeTextDocument, DidOpenTextDocument};
use lsp_types::request::Completion;
use lsp_types::{
    request::HoverRequest, HoverParams, Position, Range, TextDocumentIdentifier,
    TextDocumentPositionParams, Url,
};
use lsp_types::{
    CompletionContext, CompletionParams, CompletionResponse, CompletionTriggerKind,
    DidChangeTextDocumentParams, DidOpenTextDocumentParams, Hover, InitializeParams,
    InitializeResult, TextDocumentContentChangeEvent, TextDocumentItem, TextDocumentSyncCapability,
    TextDocumentSyncKind, VersionedTextDocumentIdentifier, WorkspaceFolder,
};
use ropey::Rope;
use tauri::utils::config;
use tauri::{AppHandle, Manager, Runtime};
use tokio::sync::Mutex;

use crate::editor::editor_state::{Document, EditorState};
use crate::lsp::registry::LspRegistry;

pub struct LspService<R: Runtime> {
    pub app_handle: AppHandle<R>,
}

impl<R: Runtime> LspService<R> {
    pub fn new(app_handle: AppHandle<R>) -> Self {
        LspService { app_handle }
    }

    pub async fn register_language_server(&self, path: &Path) -> anyhow::Result<()> {
        let editor_state = self.app_handle.state::<Arc<Mutex<EditorState>>>();
        let mut editor_state = editor_state.lock().await;

        let lsp_registry = self.app_handle.state::<Arc<Mutex<LspRegistry>>>();
        let mut lsp_registry = lsp_registry.lock().await;

        let doc = editor_state.get_document(path)?;
        match lsp_registry.register_language_server(doc)? {
            (server, true) => {
                let result = self.initialize(&server, doc).await?;
                let _ = lsp_registry.set_language_server_config(doc, result);
                self.initialized(&server).await?;
                self.open_document(&server, doc).await?;
            }
            (server, false) => {
                self.open_document(&server, doc).await?;
            }
        }

        Ok(())
    }

    pub async fn initialize(
        &self,
        server: &LspServer,
        doc: &Document,
    ) -> anyhow::Result<InitializeResult> {
        info!("LSP - initialize doc");
        let root_uri = lsp_types::Url::from_file_path(doc.get_worktree_path())
            .map_err(|_| anyhow!("invalid root_uri"))?;
        let result = server
            .initialize(InitializeParams {
                root_uri: Some(root_uri.clone()),
                workspace_folders: Some(vec![WorkspaceFolder {
                    uri: root_uri,
                    name: Default::default(),
                }]),
                ..InitializeParams::default()
            })
            .await;
        Ok(result)
    }

    pub async fn initialized(&self, server: &LspServer) -> anyhow::Result<()> {
        info!("LSP - send initialized notification");
        server.initialized().await;
        Ok(())
    }

    pub async fn open_document(&self, server: &LspServer, doc: &Document) -> anyhow::Result<()> {
        let file_uri = lsp_types::Url::from_file_path(doc.path.clone())
            .map_err(|_| anyhow!("invalid file_uri"))?;
        info!("LSP - open document (file_uri={:?})", file_uri);
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

    pub async fn update_document(
        &self,
        server: &LspServer,
        _config: &InitializeResult,
        doc: &Document,
    ) -> anyhow::Result<()> {
        // let config = lsp_registry
        //     .get_language_server_config(doc)
        //     .ok_or(anyhow!("No language server config"))?;

        // let document_sync_kind = config
        //     .capabilities
        //     .text_document_sync
        //     .as_ref()
        //     .and_then(|sync| match sync {
        //         TextDocumentSyncCapability::Kind(kind) => Some(*kind),
        //         TextDocumentSyncCapability::Options(options) => options.change,
        //     });

        // let content_changes: Vec<_> = match document_sync_kind {
        //     Some(TextDocumentSyncKind::FULL) => {
        //         vec![TextDocumentContentChangeEvent {
        //             range: None,
        //             range_length: None,
        //             text: doc.text.to_string(),
        //         }]
        //     }
        //     Some(TextDocumentSyncKind::INCREMENTAL) => TextDocumentContentChangeEvent {
        //         range: Some(Range::new(
        //             Position::new(row, column),
        //             Position::new(row, column),
        //             // point_to_lsp(edit_start),
        //             // point_to_lsp(edit_end),
        //         )),
        //         range_length: None,
        //         text: new_text,
        //     },
        //     _ => Vec::new(),
        // };

        let content_changes = vec![TextDocumentContentChangeEvent {
            range: None,
            range_length: None,
            text: doc.text.to_string(),
        }];

        info!("LSP - update document (version={})", doc.version);

        server
            .send_notification::<DidChangeTextDocument>(DidChangeTextDocumentParams {
                text_document: VersionedTextDocumentIdentifier {
                    uri: Url::from_file_path(doc.path.clone()).unwrap(),
                    version: doc.version,
                },
                content_changes,
            })
            .await;
        Ok(())
    }

    pub async fn hover(&self, path: &Path, pos: usize) -> anyhow::Result<Hover> {
        let editor_state = self.app_handle.state::<Arc<Mutex<EditorState>>>();
        let mut editor_state = editor_state.lock().await;

        let lsp_registry = self.app_handle.state::<Arc<Mutex<LspRegistry>>>();
        let lsp_registry = lsp_registry.lock().await;

        let doc = editor_state.get_document(path)?;
        let server = lsp_registry
            .get_language_server(doc)
            .ok_or(anyhow!("No language server"))?;

        info!("LSP - send hover request");
        let response = server
            .send_request::<HoverRequest>(HoverParams {
                text_document_position_params: TextDocumentPositionParams {
                    text_document: TextDocumentIdentifier {
                        uri: Url::from_file_path(path).unwrap(),
                    },
                    position: Self::pos_to_lsp_pos(&doc.text, pos),
                },
                work_done_progress_params: Default::default(),
            })
            .await;

        response.ok_or(anyhow!("No response"))
    }

    pub async fn completion(
        &self,
        path: &Path,
        pos: usize,
        trigger: String,
    ) -> anyhow::Result<CompletionResponse> {
        let editor_state = self.app_handle.state::<Arc<Mutex<EditorState>>>();
        let mut editor_state = editor_state.lock().await;

        let lsp_registry = self.app_handle.state::<Arc<Mutex<LspRegistry>>>();
        let lsp_registry = lsp_registry.lock().await;

        let doc = editor_state.get_document(path)?;

        let config = lsp_registry
            .get_language_server_config(doc)
            .ok_or(anyhow!("No language server config"))?;

        let trigger_character =
            config
                .capabilities
                .completion_provider
                .as_ref()
                .and_then(|provider| {
                    provider
                        .trigger_characters
                        .as_deref()?
                        .iter()
                        .find(|&t| trigger.ends_with(t))
                });

        let trigger_kind = trigger_character
            .as_ref()
            .map(|_| CompletionTriggerKind::TRIGGER_CHARACTER)
            .unwrap_or(CompletionTriggerKind::INVOKED);

        let trigger_character = trigger_character.cloned();

        let server = lsp_registry
            .get_language_server(doc)
            .ok_or(anyhow!("No language server"))?;

        self.update_document(server, config, doc).await?;

        info!(
            "LSP - send completion request (pos={}, trigger={:?}, kind={:?})",
            pos, trigger_character, trigger_kind
        );
        let file_uri = Url::from_file_path(path).unwrap();

        let response = server
            .send_request::<Completion>(CompletionParams {
                text_document_position: TextDocumentPositionParams::new(
                    TextDocumentIdentifier::new(file_uri),
                    Self::pos_to_lsp_pos(&doc.text, pos),
                ),
                context: Some(CompletionContext {
                    trigger_kind,
                    trigger_character,
                }),
                work_done_progress_params: Default::default(),
                partial_result_params: Default::default(),
            })
            .await;
        println!("AAAAAAAAAAAA: {:?}", response);

        drop(lsp_registry);
        drop(editor_state);

        response.ok_or(anyhow!("No response"))
    }

    fn pos_to_lsp_pos(doc: &Rope, pos: usize) -> Position {
        let line = doc.char_to_line(pos);
        let line_start = doc.line_to_byte(line);
        let col = doc.char_to_byte(pos) - line_start;

        Position::new(line as u32, col as u32)
    }
}
