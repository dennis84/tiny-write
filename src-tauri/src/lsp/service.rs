use std::path::Path;
use std::sync::Arc;
use std::time::SystemTime;

use anyhow::anyhow;
use async_lsp_client::LspServer;
use log::info;
use lsp_types::notification::{DidChangeTextDocument, DidOpenTextDocument};
use lsp_types::request::{Completion, GotoDefinition};
use lsp_types::{
    request::HoverRequest, HoverParams, Range, TextDocumentIdentifier, TextDocumentPositionParams,
    Url,
};
use lsp_types::{
    CompletionContext, CompletionParams, CompletionResponse, CompletionTriggerKind,
    DidChangeTextDocumentParams, DidOpenTextDocumentParams, GotoDefinitionParams,
    GotoDefinitionResponse, Hover, InitializeParams, InitializeResult,
    TextDocumentContentChangeEvent, TextDocumentItem, TextDocumentSyncCapability,
    TextDocumentSyncKind, VersionedTextDocumentIdentifier, WorkspaceFolder,
};
use tauri::{AppHandle, Manager, Runtime};
use tokio::sync::Mutex;

use crate::editor::editor_state::{Delete, Document, EditorState, Insert};
use crate::lsp::registry::LspRegistry;
use crate::lsp::util::pos_to_lsp_pos;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum OffsetEncoding {
    /// UTF-8 code units aka bytes
    Utf8,
    /// UTF-32 code units aka chars
    Utf32,
    /// UTF-16 code units
    #[default]
    Utf16,
}

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
                    version: self.get_version(doc)?,
                    text: doc.text.to_string(),
                },
            })
            .await;
        Ok(())
    }

    pub async fn insert_document(&self, doc: &Document, data: &Insert) -> anyhow::Result<()> {
        let lsp_registry = self.app_handle.state::<Arc<Mutex<LspRegistry>>>();
        let lsp_registry = lsp_registry.lock().await;

        let config = lsp_registry
            .get_language_server_config(doc)
            .ok_or(anyhow!("No language server config"))?;

        let server = lsp_registry
            .get_language_server(doc)
            .ok_or(anyhow!("No language server"))?;

        let document_sync_kind = self.document_sync_kind(config);
        let offset_encoding = self.offset_encoding(config);
        let from = pos_to_lsp_pos(&doc.text, data.from, offset_encoding);
        let to = pos_to_lsp_pos(&doc.text, data.to, offset_encoding);

        let content_changes: Vec<_> = match document_sync_kind {
            Some(TextDocumentSyncKind::FULL) => {
                vec![TextDocumentContentChangeEvent {
                    range: None,
                    range_length: None,
                    text: doc.text.to_string(),
                }]
            }
            Some(TextDocumentSyncKind::INCREMENTAL) => vec![TextDocumentContentChangeEvent {
                range: Some(Range::new(from, to)),
                range_length: None,
                text: data.text.clone(),
            }],
            _ => Vec::new(),
        };

        info!(
            "LSP - insert document (from=[{}, {}], to=[{}, {}], text={})",
            from.line, from.character, to.line, to.character, data.text
        );

        server
            .send_notification::<DidChangeTextDocument>(DidChangeTextDocumentParams {
                text_document: VersionedTextDocumentIdentifier {
                    uri: Url::from_file_path(doc.path.clone()).unwrap(),
                    version: self.get_version(doc)?,
                },
                content_changes,
            })
            .await;
        Ok(())
    }

    pub async fn delete_document(&self, doc: &Document, data: &Delete) -> anyhow::Result<()> {
        let lsp_registry = self.app_handle.state::<Arc<Mutex<LspRegistry>>>();
        let lsp_registry = lsp_registry.lock().await;

        let config = lsp_registry
            .get_language_server_config(doc)
            .ok_or(anyhow!("No language server config"))?;

        let server = lsp_registry
            .get_language_server(doc)
            .ok_or(anyhow!("No language server"))?;

        let document_sync_kind = self.document_sync_kind(config);
        let offset_encoding = self.offset_encoding(config);
        let from = pos_to_lsp_pos(&doc.text, data.from, offset_encoding);
        let to = pos_to_lsp_pos(&doc.text, data.to, offset_encoding);

        let content_changes: Vec<_> = match document_sync_kind {
            Some(TextDocumentSyncKind::FULL) => {
                vec![TextDocumentContentChangeEvent {
                    range: None,
                    range_length: None,
                    text: doc.text.to_string(),
                }]
            }
            Some(TextDocumentSyncKind::INCREMENTAL) => vec![TextDocumentContentChangeEvent {
                range: Some(Range::new(from, to)),
                range_length: None,
                text: "".to_string(),
            }],
            _ => Vec::new(),
        };

        info!(
            "LSP - delete document (from=[{}, {}], to=[{}, {}])",
            from.line, from.character, to.line, to.character
        );

        server
            .send_notification::<DidChangeTextDocument>(DidChangeTextDocumentParams {
                text_document: VersionedTextDocumentIdentifier {
                    uri: Url::from_file_path(doc.path.clone()).unwrap(),
                    version: self.get_version(doc)?,
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

        let config = lsp_registry
            .get_language_server_config(doc)
            .ok_or(anyhow!("No language server config"))?;

        let offset_encoding = self.offset_encoding(config);

        info!("LSP - send hover request");
        let response = server
            .send_request::<HoverRequest>(HoverParams {
                text_document_position_params: TextDocumentPositionParams {
                    text_document: TextDocumentIdentifier {
                        uri: Url::from_file_path(path).unwrap(),
                    },
                    position: pos_to_lsp_pos(&doc.text, pos, offset_encoding),
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

        info!(
            "LSP - send completion request (pos={}, trigger={:?}, kind={:?})",
            pos, trigger_character, trigger_kind
        );
        let file_uri = Url::from_file_path(path).unwrap();
        let offset_encoding = self.offset_encoding(config);

        let response = server
            .send_request::<Completion>(CompletionParams {
                text_document_position: TextDocumentPositionParams::new(
                    TextDocumentIdentifier::new(file_uri),
                    pos_to_lsp_pos(&doc.text, pos, offset_encoding),
                ),
                context: Some(CompletionContext {
                    trigger_kind,
                    trigger_character,
                }),
                work_done_progress_params: Default::default(),
                partial_result_params: Default::default(),
            })
            .await;

        drop(lsp_registry);
        drop(editor_state);

        response.ok_or(anyhow!("No response"))
    }

    pub async fn goto(&self, path: &Path, pos: usize) -> anyhow::Result<GotoDefinitionResponse> {
        let editor_state = self.app_handle.state::<Arc<Mutex<EditorState>>>();
        let mut editor_state = editor_state.lock().await;

        let lsp_registry = self.app_handle.state::<Arc<Mutex<LspRegistry>>>();
        let lsp_registry = lsp_registry.lock().await;

        let doc = editor_state.get_document(path)?;

        let config = lsp_registry
            .get_language_server_config(doc)
            .ok_or(anyhow!("No language server config"))?;

        let server = lsp_registry
            .get_language_server(doc)
            .ok_or(anyhow!("No language server"))?;

        info!("LSP - goto definition request (pos={})", pos);
        let file_uri = Url::from_file_path(path).unwrap();
        let offset_encoding = self.offset_encoding(config);

        let response = server
            .send_request::<GotoDefinition>(GotoDefinitionParams {
                text_document_position_params: TextDocumentPositionParams::new(
                    TextDocumentIdentifier::new(file_uri),
                    pos_to_lsp_pos(&doc.text, pos, offset_encoding),
                ),
                work_done_progress_params: Default::default(),
                partial_result_params: Default::default(),
            })
            .await;

        response.ok_or(anyhow!("No response"))
    }

    fn offset_encoding(&self, config: &InitializeResult) -> OffsetEncoding {
        config.capabilities
            .position_encoding
            .as_ref()
            .and_then(|encoding| match encoding.as_str() {
                "utf-8" => Some(OffsetEncoding::Utf8),
                "utf-16" => Some(OffsetEncoding::Utf16),
                "utf-32" => Some(OffsetEncoding::Utf32),
                encoding => {
                    log::error!("Server provided invalid position encoding {encoding}, defaulting to utf-16");
                    None
                },
            })
            .unwrap_or_default()
    }

    fn document_sync_kind(&self, config: &InitializeResult) -> Option<TextDocumentSyncKind> {
        config
            .capabilities
            .text_document_sync
            .as_ref()
            .and_then(|sync| match sync {
                TextDocumentSyncCapability::Kind(kind) => Some(*kind),
                TextDocumentSyncCapability::Options(options) => options.change,
            })
    }

    fn get_version(&self, doc: &Document) -> anyhow::Result<i32> {
        let duration = SystemTime::now().duration_since(doc.version)?;
        Ok(duration.as_secs() as i32)
    }
}
