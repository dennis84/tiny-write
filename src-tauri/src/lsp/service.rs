use std::path::Path;

use anyhow::anyhow;
use async_lsp::lsp_types::notification::{DidChangeTextDocument, DidOpenTextDocument};
use async_lsp::lsp_types::request::{Completion, GotoDefinition};
use async_lsp::lsp_types::{
    request::HoverRequest, HoverParams, Range, TextDocumentIdentifier, TextDocumentPositionParams,
    Url,
};
use async_lsp::lsp_types::{
    CompletionContext, CompletionParams, CompletionResponse, CompletionTriggerKind,
    DidChangeTextDocumentParams, DidOpenTextDocumentParams, GotoDefinitionParams,
    GotoDefinitionResponse, Hover, InitializeParams, InitializeResult,
    TextDocumentContentChangeEvent, TextDocumentItem, TextDocumentSyncCapability,
    TextDocumentSyncKind, TraceValue, VersionedTextDocumentIdentifier, WorkspaceFolder,
};
use log::debug;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_cli::CliExt;

use crate::editor::editor_state::{Delete, Document, EditorState, Insert};
use crate::lsp::registry::LspRegistry;
use crate::lsp::util::{get_offset_encoding, pos_to_lsp_pos, url_for_path};

use super::registry::LanguageServerId;
use super::server::LspServer;

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
        let editor_state = self.app_handle.state::<EditorState>();
        let lsp_registry = self.app_handle.state::<LspRegistry>();

        let doc = editor_state.get_document(path).await?;
        let language_server_id = doc.get_language_server_id().ok_or(anyhow!("No language"))?;

        match lsp_registry
            .register_language_server(&language_server_id)
            .await?
        {
            (server, true) => {
                let result = self.initialize(&server, &language_server_id).await?;
                lsp_registry
                    .insert_language_server_config(&language_server_id, result)
                    .await;
                self.initialized(&server).await?;
                self.open_document(&server, &doc).await?;
            }
            (server, false) => {
                self.open_document(&server, &doc).await?;
            }
        }

        Ok(())
    }

    pub async fn initialize(
        &self,
        server: &LspServer,
        language_server_id: &LanguageServerId,
    ) -> anyhow::Result<InitializeResult> {
        debug!("LSP - send initialize request");
        let root_uri = async_lsp::lsp_types::Url::from_file_path(&language_server_id.0)
            .map_err(|_| anyhow!("invalid root_uri"))?;
        let trace = self
            .app_handle
            .cli()
            .matches()
            .ok()
            .and_then(|m| m.args.get("verbose").and_then(|a| a.value.as_bool()))
            .map(|verbose| {
                if verbose {
                    TraceValue::Verbose
                } else {
                    TraceValue::Off
                }
            })
            .or(Some(TraceValue::Off));

        let result = server
            .initialize(InitializeParams {
                trace,
                workspace_folders: Some(vec![WorkspaceFolder {
                    uri: root_uri,
                    name: Default::default(),
                }]),
                ..InitializeParams::default()
            })
            .await?;
        debug!("LSP - send initialize response {:?}", result);
        Ok(result)
    }

    pub async fn initialized(&self, server: &LspServer) -> anyhow::Result<()> {
        debug!("LSP - send initialized notification");
        server.initialized().await?;
        Ok(())
    }

    pub async fn open_document(&self, server: &LspServer, doc: &Document) -> anyhow::Result<()> {
        let file_uri = url_for_path(doc.path.as_ref());
        debug!("LSP - open document (file_uri={:?})", file_uri);
        server
            .notify::<DidOpenTextDocument>(DidOpenTextDocumentParams {
                text_document: TextDocumentItem {
                    uri: file_uri,
                    language_id: doc.get_language_id(),
                    version: doc.version,
                    text: doc.text.to_string(),
                },
            })
            .await?;
        Ok(())
    }

    pub async fn update_document(
        &self,
        language_server_id: &LanguageServerId,
        doc: &Document,
    ) -> anyhow::Result<()> {
        let lsp_registry = self.app_handle.state::<LspRegistry>();

        let server = lsp_registry
            .get_language_server(language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;

        let content_changes = vec![TextDocumentContentChangeEvent {
            range: None,
            range_length: None,
            text: doc.text.to_string(),
        }];

        debug!("LSP - update document (version={})", doc.version);

        server
            .notify::<DidChangeTextDocument>(DidChangeTextDocumentParams {
                text_document: VersionedTextDocumentIdentifier {
                    uri: url_for_path(doc.path.as_ref()),
                    version: doc.version,
                },
                content_changes,
            })
            .await?;
        Ok(())
    }

    pub async fn insert_document(
        &self,
        language_server_id: &LanguageServerId,
        doc: &Document,
        data: &Insert,
    ) -> anyhow::Result<()> {
        let lsp_registry = self.app_handle.state::<LspRegistry>();

        let config = lsp_registry
            .get_language_server_config(language_server_id)
            .await
            .ok_or(anyhow!("No language server config"))?;

        let server = lsp_registry
            .get_language_server(language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;

        let document_sync_kind = self.document_sync_kind(&config);
        let offset_encoding = get_offset_encoding(&config);
        let from = pos_to_lsp_pos(&doc.text, data.from_a, offset_encoding);
        let to = pos_to_lsp_pos(&doc.text, data.to_b, offset_encoding);

        let content_changes: Vec<_> = match document_sync_kind {
            Some(TextDocumentSyncKind::FULL) => {
                debug!("LSP - full document update");
                vec![TextDocumentContentChangeEvent {
                    range: None,
                    range_length: None,
                    text: doc.text.to_string(),
                }]
            }
            Some(TextDocumentSyncKind::INCREMENTAL) => {
                debug!("LSP - incremental document update");
                vec![TextDocumentContentChangeEvent {
                    range: Some(Range::new(from, to)),
                    range_length: None,
                    text: data.text.clone(),
                }]
            }
            _ => Vec::new(),
        };

        debug!(
            "LSP - insert document (from=[{}, {}], to=[{}, {}], text={}, version={})",
            from.line, from.character, to.line, to.character, data.text, doc.version
        );

        server
            .notify::<DidChangeTextDocument>(DidChangeTextDocumentParams {
                text_document: VersionedTextDocumentIdentifier {
                    uri: Url::from_file_path(doc.path.clone()).unwrap(),
                    version: doc.version,
                },
                content_changes,
            })
            .await?;
        Ok(())
    }

    pub async fn delete_document(
        &self,
        language_server_id: &LanguageServerId,
        doc: &Document,
        data: &Delete,
    ) -> anyhow::Result<()> {
        let lsp_registry = self.app_handle.state::<LspRegistry>();

        let config = lsp_registry
            .get_language_server_config(language_server_id)
            .await
            .ok_or(anyhow!("No language server config"))?;

        let server = lsp_registry
            .get_language_server(language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;

        let document_sync_kind = self.document_sync_kind(&config);
        let offset_encoding = get_offset_encoding(&config);
        let from = pos_to_lsp_pos(&doc.text, data.from_a, offset_encoding);
        let to = pos_to_lsp_pos(&doc.text, data.to_a, offset_encoding);

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

        debug!(
            "LSP - delete document (from=[{}, {}], to=[{}, {}], version={})",
            from.line, from.character, to.line, to.character, doc.version
        );

        server
            .notify::<DidChangeTextDocument>(DidChangeTextDocumentParams {
                text_document: VersionedTextDocumentIdentifier {
                    uri: Url::from_file_path(doc.path.clone()).unwrap(),
                    version: doc.version,
                },
                content_changes,
            })
            .await?;
        Ok(())
    }

    pub async fn hover(&self, path: &Path, pos: usize) -> anyhow::Result<Hover> {
        debug!("LSP - hover");
        let editor_state = self.app_handle.state::<EditorState>();
        let lsp_registry = self.app_handle.state::<LspRegistry>();

        let doc = editor_state.get_document(path).await?;
        let language_server_id = doc.get_language_server_id().ok_or(anyhow!("No language"))?;

        let server = lsp_registry
            .get_language_server(&language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;

        let config = lsp_registry
            .get_language_server_config(&language_server_id)
            .await
            .ok_or(anyhow!("No language server config"))?;

        let offset_encoding = get_offset_encoding(&config);

        debug!("LSP - send hover request");
        let response = server
            .request::<HoverRequest>(HoverParams {
                text_document_position_params: TextDocumentPositionParams {
                    text_document: TextDocumentIdentifier {
                        uri: Url::from_file_path(path).unwrap(),
                    },
                    position: pos_to_lsp_pos(&doc.text, pos, offset_encoding),
                },
                work_done_progress_params: Default::default(),
            })
            .await?;

        response.ok_or(anyhow!("No response"))
    }

    pub async fn completion(
        &self,
        path: &Path,
        pos: usize,
        trigger: String,
    ) -> anyhow::Result<CompletionResponse> {
        let editor_state = self.app_handle.state::<EditorState>();
        let lsp_registry = self.app_handle.state::<LspRegistry>();

        let doc = editor_state.get_document(path).await?;
        let language_server_id = doc.get_language_server_id().ok_or(anyhow!("No language"))?;

        let config = lsp_registry
            .get_language_server_config(&language_server_id)
            .await
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
            .get_language_server(&language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;

        debug!(
            "LSP - send completion request (pos={}, trigger={:?}, kind={:?})",
            pos, trigger_character, trigger_kind
        );
        let file_uri = Url::from_file_path(path).unwrap();
        let offset_encoding = get_offset_encoding(&config);

        let response = server
            .request::<Completion>(CompletionParams {
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
            .await?;

        response.ok_or(anyhow!("No response"))
    }

    pub async fn goto(&self, path: &Path, pos: usize) -> anyhow::Result<GotoDefinitionResponse> {
        let editor_state = self.app_handle.state::<EditorState>();
        let lsp_registry = self.app_handle.state::<LspRegistry>();

        let doc = editor_state.get_document(path).await?;
        let language_server_id = doc.get_language_server_id().ok_or(anyhow!("No language"))?;

        let config = lsp_registry
            .get_language_server_config(&language_server_id)
            .await
            .ok_or(anyhow!("No language server config"))?;

        let server = lsp_registry
            .get_language_server(&language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;

        debug!("LSP - goto definition request (pos={})", pos);
        let file_uri = Url::from_file_path(path).unwrap();
        let offset_encoding = get_offset_encoding(&config);

        let response = server
            .request::<GotoDefinition>(GotoDefinitionParams {
                text_document_position_params: TextDocumentPositionParams::new(
                    TextDocumentIdentifier::new(file_uri),
                    pos_to_lsp_pos(&doc.text, pos, offset_encoding),
                ),
                work_done_progress_params: Default::default(),
                partial_result_params: Default::default(),
            })
            .await?;

        response.ok_or(anyhow!("No response"))
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
}
