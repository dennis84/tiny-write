use anyhow::anyhow;
use async_lsp::lsp_types::InitializeParams;
use async_lsp::lsp_types::{self, CompletionResponse, GotoDefinitionResponse, Hover};
use serde_json::json;
use serde_json::Value;
use tauri::{path::SafePathBuf, utils::config, AppHandle, Emitter, Manager, Runtime};
use tracing::{debug, error};

use crate::editor::editor_state::is_buffer;
use crate::editor::editor_state::Insert;
use crate::editor::editor_state::Language;
use crate::lsp::copilot::service::CopilotLspService;
use crate::lsp::registry::LanguageServerId;
use crate::lsp::registry::fallback_language_server_id;
use crate::{
    editor::editor_state::EditorState,
    lsp::{self, registry::LspRegistry, service::LspService},
};

#[tauri::command]
pub async fn start_language_server<R: Runtime>(
    language_id: String,
    app_handle: AppHandle<R>,
) -> tauri::Result<()> {
    let lsp_service = app_handle.state::<LspService<R>>();
    let lsp_registry = app_handle.state::<LspRegistry>();

    let language_server_id = fallback_language_server_id(Language(language_id));
    let (server, should_initialize) =
        lsp_service.register_language_server(&language_server_id).await?;

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
    path: SafePathBuf,
    message: String,
    language_id: Option<String>,
    app_handle: AppHandle<R>,
) -> tauri::Result<()> {
    let editor_state = app_handle.state::<EditorState>();
    let lsp_service = app_handle.state::<LspService<R>>();
    let copilot_lsp_service = app_handle.state::<CopilotLspService<R>>();
    let lsp_registry = app_handle.state::<LspRegistry>();

    let v: Value = serde_json::from_str(&message)?;
    let id = v.get("id").and_then(Value::as_u64).unwrap_or_default();
    let method = v.get("method").and_then(Value::as_str).unwrap_or_default();
    let params = v.get("params").cloned().unwrap_or(Value::Null);

    debug!("Received LSP message (id={id:?}, method={method:?}, params={params:?}, language_id={language_id:?})");

    let doc = editor_state.get_document(path.as_ref()).await?;
    let mut language_server_id = doc.get_language_server_id().ok_or(anyhow!("No language"))?;
    if let Some(lang) = language_id {
        language_server_id = LanguageServerId(language_server_id.0, Language(lang))
    }

    match method {
        "initialize" => {
            let p: lsp_types::InitializeParams = serde_json::from_value(params)?;
            let (server, should_initialize) =
                lsp_service.register_language_server(&language_server_id).await?;

            if should_initialize {
                let config = lsp_service
                    .initialize(&server, &language_server_id, p)
                    .await?;
                let _ = lsp_registry
                    .insert_language_server_config(&language_server_id, config.clone())
                    .await;
                app_handle.emit("lsp", json!({"jsonrpc": "2.0", "id": id, "result": config}))?;
            } else {
                let config = lsp_registry
                    .get_language_server_config(&language_server_id)
                    .await;
                app_handle.emit("lsp", json!({"jsonrpc": "2.0", "id": id, "result": config}))?;
            }
        }
        "initialized" => {
            let (server, _) = lsp_service.register_language_server(&language_server_id).await?;
            lsp_service.initialized(&server).await?;
        }
        "textDocument/didOpen" => {
            let p: lsp_types::DidOpenTextDocumentParams = serde_json::from_value(params)?;
            let (server, _) = lsp_service.register_language_server(&language_server_id).await?;
            let mut doc = editor_state.get_document(path.as_ref()).await?;
            let is_buffer = is_buffer(path.as_ref());
            let text: &str = &p.text_document.text;
            let text = ropey::Rope::from_str(text);
            if is_buffer {
                doc.text = text;
            }

            lsp_service.open_document(&server, &doc).await?;
        }
        "textDocument/didClose" => {
            let p: lsp_types::DidCloseTextDocumentParams = serde_json::from_value(params)?;
            lsp_service.close_document(path.as_ref(), p).await?;
        }
        "textDocument/didChange" => {
            let p: lsp_types::DidChangeTextDocumentParams = serde_json::from_value(params)?;
            lsp_service.insert_document(&language_server_id, p).await?;
        }
        "textDocument/completion" => {
            let p: lsp_types::CompletionParams = serde_json::from_value(params)?;
            let result = lsp_service.completion(path.as_ref(), p).await?;
            app_handle.emit("lsp", json!({"jsonrpc": "2.0", "id": id, "result": result}))?;
        }
        "textDocument/inlineCompletion" => {
            let p: lsp_types::CompletionParams = serde_json::from_value(params)?;
            let result = copilot_lsp_service.inline_completion(path.as_ref(), p).await?;
            app_handle.emit("lsp", json!({"jsonrpc": "2.0", "id": id, "result": result}))?;
        }
        _ => {}
    }

    Ok(())
}

// #[tauri::command]
// pub async fn lsp_hover<R: Runtime>(
//     path: SafePathBuf,
//     pos: usize,
//     app_handle: AppHandle<R>,
// ) -> tauri::Result<Hover> {
//     let lsp_service = app_handle.state::<LspService<R>>();
//     lsp_service.hover(path.as_ref(), pos).await.map_err(|e| {
//         error!("lsp_hover failed {e:?}");
//         tauri::Error::Anyhow(e)
//     })
// }
//
// #[tauri::command]
// pub async fn lsp_goto<R: Runtime>(
//     path: SafePathBuf,
//     pos: usize,
//     app_handle: AppHandle<R>,
// ) -> tauri::Result<GotoDefinitionResponse> {
//     let lsp_service = app_handle.state::<LspService<R>>();
//     let result = lsp_service.goto(path.as_ref(), pos).await?;
//     Ok(result)
// }
