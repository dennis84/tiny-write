use log::error;
use lsp_types::{CompletionResponse, GotoDefinitionResponse, Hover};
use tauri::{path::SafePathBuf, AppHandle, Manager, Runtime};

use crate::lsp::service::LspService;

#[tauri::command]
pub async fn lsp_hover<R: Runtime>(
    path: SafePathBuf,
    pos: usize,
    app_handle: AppHandle<R>,
) -> tauri::Result<Hover> {
    let lsp_service = app_handle.state::<LspService<R>>();
    lsp_service.hover(path.as_ref(), pos).await.map_err(|e| {
        error!("lsp_hover failed {e:?}");
        tauri::Error::Anyhow(e)
    })
}

#[tauri::command]
pub async fn lsp_completion<R: Runtime>(
    path: SafePathBuf,
    pos: usize,
    trigger: String,
    app_handle: AppHandle<R>,
) -> tauri::Result<CompletionResponse> {
    let lsp_service = app_handle.state::<LspService<R>>();
    let result = lsp_service.completion(path.as_ref(), pos, trigger).await?;
    Ok(result)
}

#[tauri::command]
pub async fn lsp_goto<R: Runtime>(
    path: SafePathBuf,
    pos: usize,
    app_handle: AppHandle<R>,
) -> tauri::Result<GotoDefinitionResponse> {
    let lsp_service = app_handle.state::<LspService<R>>();
    let result = lsp_service.goto(path.as_ref(), pos).await?;
    Ok(result)
}
