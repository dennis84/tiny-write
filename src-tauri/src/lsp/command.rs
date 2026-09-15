use anyhow::anyhow;
use async_lsp::lsp_types::InitializeParams;
use async_lsp::lsp_types::{self};
use serde_json::json;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tracing::debug;
use url::Url;

use crate::editor::editor_state::Language;
use crate::lsp::copilot::service::CopilotLspService;
use crate::lsp::registry::fallback_language_server_id;
use crate::{
    editor::editor_state::EditorState,
    lsp::{registry::LspRegistry, service::LspService},
};

const BROADCAST_EVENT: &str = "lsp";

#[tauri::command]
pub async fn start_language_server<R: Runtime>(
    language_id: String,
    app_handle: AppHandle<R>,
) -> tauri::Result<()> {
    let lsp_service = app_handle.state::<LspService<R>>();
    let lsp_registry = app_handle.state::<LspRegistry>();

    let language_server_id = fallback_language_server_id(Language(language_id));
    let (server, should_initialize) = lsp_service
        .register_language_server(&language_server_id)
        .await?;

    if should_initialize {
        let config = lsp_service
            .initialize(&server, &language_server_id, InitializeParams::default())
            .await?;
        let _ = lsp_registry
            .insert_language_server_config(&language_server_id, config.clone())
            .await;
        lsp_service.initialized(&server).await?;
    }

    Ok(())
}

#[tauri::command]
pub async fn lsp_message<R: Runtime>(
    uri: String,
    message: String,
    app_handle: AppHandle<R>,
) -> tauri::Result<()> {
    let url = Url::parse(&uri).map_err(|_| anyhow!("Invalid uri"))?;
    let path = url
        .to_file_path()
        .map_err(|_| anyhow!("Invalid file path from uri"))?;

    let editor_state = app_handle.state::<EditorState>();
    let lsp_service = app_handle.state::<LspService<R>>();
    let copilot_lsp_service = app_handle.state::<CopilotLspService<R>>();
    let lsp_registry = app_handle.state::<LspRegistry>();

    let v: Value = serde_json::from_str(&message)?;
    let id = v.get("id").and_then(Value::as_u64).unwrap_or_default();
    let method = v.get("method").and_then(Value::as_str).unwrap_or_default();
    let params = v.get("params").cloned().unwrap_or(Value::Null);

    debug!("Received LSP message (id={id:?}, path={path:?}, method={method:?}, params={params:?})");

    let doc = editor_state.get_document(path.as_ref()).await?;
    let language_server_id = doc.get_language_server_id().ok_or(anyhow!("No language"))?;

    match method {
        "initialize" => {
            let p: lsp_types::InitializeParams = serde_json::from_value(params)?;
            let (server, should_initialize) = lsp_service
                .register_language_server(&language_server_id)
                .await?;

            if should_initialize {
                let config = lsp_service
                    .initialize(&server, &language_server_id, p)
                    .await?;
                let _ = lsp_registry
                    .insert_language_server_config(&language_server_id, config.clone())
                    .await;
                app_handle.emit(
                    BROADCAST_EVENT,
                    json!({"jsonrpc": "2.0", "id": id, "result": config}),
                )?;
            } else {
                let config = lsp_registry
                    .get_language_server_config(&language_server_id)
                    .await;
                app_handle.emit(
                    BROADCAST_EVENT,
                    json!({"jsonrpc": "2.0", "id": id, "result": config}),
                )?;
            }
        }
        "initialized" => {
            let (server, _) = lsp_service
                .register_language_server(&language_server_id)
                .await?;
            lsp_service.initialized(&server).await?;
        }
        "textDocument/didOpen" => {
            let p: lsp_types::DidOpenTextDocumentParams = serde_json::from_value(params)?;
            let (server, _) = lsp_service
                .register_language_server(&language_server_id)
                .await?;
            lsp_service.open_document(&server, p.clone()).await?;
            let _ = copilot_lsp_service.open_document(p).await;
        }
        "textDocument/didClose" => {
            let p: lsp_types::DidCloseTextDocumentParams = serde_json::from_value(params)?;
            let (server, _) = lsp_service
                .register_language_server(&language_server_id)
                .await?;
            lsp_service.close_document(&server, p.clone()).await?;
            let _ = copilot_lsp_service.close_document(p).await;
        }
        "textDocument/didChange" => {
            let p: lsp_types::DidChangeTextDocumentParams = serde_json::from_value(params)?;
            let (server, _) = lsp_service
                .register_language_server(&language_server_id)
                .await?;
            lsp_service.insert_document(&server, p.clone()).await?;
            let _ = copilot_lsp_service.insert_document(p).await;
        }
        "textDocument/completion" => {
            let p: lsp_types::CompletionParams = serde_json::from_value(params)?;
            let result = lsp_service.completion(path.as_ref(), p).await?;
            app_handle.emit(
                BROADCAST_EVENT,
                json!({"jsonrpc": "2.0", "id": id, "result": result}),
            )?;
        }
        "textDocument/hover" => {
            let p: lsp_types::HoverParams = serde_json::from_value(params)?;
            let result = lsp_service.hover(path.as_ref(), p).await?;
            app_handle.emit(
                BROADCAST_EVENT,
                json!({"jsonrpc": "2.0", "id": id, "result": result}),
            )?;
        }
        "textDocument/definition" => {
            let p: lsp_types::GotoDefinitionParams = serde_json::from_value(params)?;
            let result = lsp_service.goto(path.as_ref(), p).await?;
            app_handle.emit(
                BROADCAST_EVENT,
                json!({"jsonrpc": "2.0", "id": id, "result": result}),
            )?;
        }
        "textDocument/inlineCompletion" => {
            let p: lsp_types::CompletionParams = serde_json::from_value(params)?;
            let result = copilot_lsp_service
                .inline_completion(path.as_ref(), p)
                .await?;
            app_handle.emit(
                BROADCAST_EVENT,
                json!({"jsonrpc": "2.0", "id": id, "result": result}),
            )?;
        }
        _ => {}
    }

    Ok(())
}
