use tauri::{AppHandle, Manager, Result, Runtime};

use crate::lsp::copilot::service::CopilotLspService;

use super::request;

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
pub async fn copilot_auth_token<R: Runtime>(app_handle: AppHandle<R>) -> Result<String> {
    let service = app_handle.state::<CopilotLspService<R>>();
    let token = service.get_auth_token()?;
    Ok(token)
}
