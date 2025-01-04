use log::error;
use tauri::ipc::Channel;
use tauri::path::SafePathBuf;
use tauri::{AppHandle, Manager, Result, Runtime};

use crate::copilot::lsp_service::CopilotLspService;

use super::chat_service::{ChatMessage, CopilotChatService, Model};
use super::request;

#[tauri::command]
pub async fn copilot_start_language_server<R: Runtime>(app_handle: AppHandle<R>) -> Result<String> {
    let service = app_handle.state::<CopilotLspService<R>>();
    service.start().await?;
    Ok("Ok".to_string())
}

#[tauri::command]
pub async fn copilot_disconnect<R: Runtime>(app_handle: AppHandle<R>) -> Result<String> {
    let service = app_handle.state::<CopilotLspService<R>>();
    service.disconnect().await?;
    Ok("Ok".to_string())
}

#[tauri::command]
pub async fn copilot_sign_in<R: Runtime>(
    app_handle: AppHandle<R>,
) -> Result<request::SignInInitiateResult> {
    let service = app_handle.state::<CopilotLspService<R>>();
    let response = service.sign_in().await?;
    Ok(response)
}

#[tauri::command]
pub async fn copilot_status<R: Runtime>(app_handle: AppHandle<R>) -> Result<request::SignInStatus> {
    let service = app_handle.state::<CopilotLspService<R>>();
    let response = service.get_status().await?;
    Ok(response)
}

#[tauri::command]
pub async fn copilot_completion<R: Runtime>(
    path: SafePathBuf,
    pos: usize,
    tab_width: u32,
    use_tabs: bool,
    app_handle: AppHandle<R>,
) -> Result<request::GetCompletionsResult> {
    let service = app_handle.state::<CopilotLspService<R>>();
    let result = service
        .completion(path.as_ref(), pos, tab_width, use_tabs)
        .await?;
    Ok(result)
}

#[tauri::command]
pub async fn copilot_chat_completions<R: Runtime>(
    app_handle: AppHandle<R>,
    model: Model,
    messages: Vec<ChatMessage>,
    on_event: Channel<String>,
) -> Result<()> {
    let service = app_handle.state::<CopilotChatService>();
    service
        .completions(model, messages, on_event)
        .await
        .map_err(|e| {
            error!("chat_completion failed {e:?}");
            tauri::Error::Anyhow(e)
        })
}
