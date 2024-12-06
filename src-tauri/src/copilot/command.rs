use tauri::path::SafePathBuf;
use tauri::{AppHandle, Manager, Result, Runtime};

use crate::copilot::service::CopilotService;

use super::request;

#[tauri::command]
pub async fn enable_copilot<R: Runtime>(app_handle: AppHandle<R>) -> Result<String> {
    let service = app_handle.state::<CopilotService<R>>();
    service.enable().await?;
    Ok("Ok".to_string())
}

#[tauri::command]
pub async fn disable_copilot<R: Runtime>(app_handle: AppHandle<R>) -> Result<String> {
    let service = app_handle.state::<CopilotService<R>>();
    service.disable().await?;
    Ok("Ok".to_string())
}

#[tauri::command]
pub async fn copilot_sign_in<R: Runtime>(
    app_handle: AppHandle<R>,
) -> Result<request::SignInInitiateResult> {
    let service = app_handle.state::<CopilotService<R>>();
    let response = service.sign_in().await?;
    Ok(response)
}

#[tauri::command]
pub async fn copilot_status<R: Runtime>(app_handle: AppHandle<R>) -> Result<request::SignInStatus> {
    let service = app_handle.state::<CopilotService<R>>();
    let response = service.get_status().await?;
    Ok(response)
}

#[tauri::command]
pub async fn copilot_completion<R: Runtime>(
    path: SafePathBuf,
    pos: usize,
    app_handle: AppHandle<R>,
) -> Result<request::GetCompletionsResult> {
    let service = app_handle.state::<CopilotService<R>>();
    let result = service.completion(path.as_ref(), pos).await?;
    Ok(result)
}
