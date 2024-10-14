use std::sync::Arc;

use lsp_types::{CompletionResponse, Hover};
use tauri::{path::SafePathBuf, AppHandle, Manager, Runtime};

use crate::lsp::service::LspService;

#[tauri::command]
pub async fn lsp_hover<R: Runtime>(
    path: SafePathBuf,
    pos: usize,
    app_handle: AppHandle<R>,
) -> tauri::Result<Hover> {
    let lsp_service = app_handle.state::<Arc<LspService<R>>>();
    let result = lsp_service.hover(path.as_ref(), pos).await?;
    Ok(result)
}

#[tauri::command]
pub async fn lsp_completion<R: Runtime>(
    path: SafePathBuf,
    pos: usize,
    trigger: String,
    app_handle: AppHandle<R>,
) -> tauri::Result<CompletionResponse> {
    let lsp_service = app_handle.state::<Arc<LspService<R>>>();
    let result = lsp_service
        .completion(path.as_ref(), pos, trigger)
        .await?;
    Ok(result)
}
