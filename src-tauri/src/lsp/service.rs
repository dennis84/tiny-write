use std::path::Path;

use anyhow::anyhow;
use async_lsp::lsp_types::notification::{DidChangeTextDocument, DidCloseTextDocument, DidOpenTextDocument};
use async_lsp::lsp_types::request::{Completion, GotoDefinition};
use async_lsp::lsp_types::{
    request::HoverRequest, HoverParams, Range, TextDocumentIdentifier, TextDocumentPositionParams,
    Url,
};
use async_lsp::lsp_types::{
    ClientCapabilities, CompletionContext, CompletionParams, CompletionResponse, CompletionTriggerKind, DidChangeConfigurationParams, DidChangeTextDocumentParams, DidCloseTextDocumentParams, DidOpenTextDocumentParams, GotoDefinitionParams, GotoDefinitionResponse, Hover, InitializeParams, InitializeResult, TextDocumentClientCapabilities, TextDocumentContentChangeEvent, TextDocumentItem, TextDocumentSyncCapability, TextDocumentSyncClientCapabilities, TextDocumentSyncKind, TraceValue, VersionedTextDocumentIdentifier, WorkspaceFolder
};
use serde_json::json;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_cli::CliExt;
use tracing::{debug, info};

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

    pub async fn register_language_server(&self, language_server_id: &LanguageServerId)
            -> anyhow::Result<(LspServer, bool)> {
        let lsp_registry = self.app_handle.state::<LspRegistry>();

        info!("Register language server (language_server_id={language_server_id:?})");

        let result = lsp_registry
            .register_language_server(&language_server_id, &self.app_handle)
            .await?;

        Ok(result)
    }

    pub async fn initialize(
        &self,
        server: &LspServer,
        language_server_id: &LanguageServerId,
        params: InitializeParams
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
                capabilities: ClientCapabilities {
                    text_document: Some(TextDocumentClientCapabilities {
                        synchronization: Some(TextDocumentSyncClientCapabilities {
                            dynamic_registration: Some(true),
                            ..Default::default()
                        }),
                        ..Default::default()
                    }),
                    ..Default::default()
                },
                workspace_folders: Some(vec![WorkspaceFolder {
                    uri: root_uri,
                    name: Default::default(),
                }]),
                initialization_options: Some(json!({
                    "editorInfo": {
                        "name": "TinyWrite",
                        "version": "0.8.0",
                    },
                    "editorPluginInfo": {
                        "name": server.plugin_name,
                        "version": "0.8.0",
                    },
                })),
                ..params
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

    pub async fn close_document(&self, path: &Path, params: DidCloseTextDocumentParams) -> anyhow::Result<()> {
        let editor_state = self.app_handle.state::<EditorState>();
        let lsp_registry = self.app_handle.state::<LspRegistry>();
        let doc = editor_state.get_document(path).await?;
        let language_server_id = doc.get_language_server_id().ok_or(anyhow!("No language"))?;

        let server = lsp_registry
            .get_language_server(&language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;
        server.notify::<DidCloseTextDocument>(params).await?;

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
        params: DidChangeTextDocumentParams,
    ) -> anyhow::Result<()> {
        let lsp_registry = self.app_handle.state::<LspRegistry>();

        let server = lsp_registry
            .get_language_server(language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;

        server
            .notify::<DidChangeTextDocument>(params)
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
        params: CompletionParams,
    ) -> anyhow::Result<CompletionResponse> {
        let editor_state = self.app_handle.state::<EditorState>();
        let lsp_registry = self.app_handle.state::<LspRegistry>();

        let doc = editor_state.get_document(path).await?;
        let language_server_id = doc.get_language_server_id().ok_or(anyhow!("No language"))?;

        let server = lsp_registry
            .get_language_server(&language_server_id)
            .await
            .ok_or(anyhow!("No language server"))?;

        debug!("LSP - send completion request");

        let response = server
            .request::<Completion>(params)
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
}
