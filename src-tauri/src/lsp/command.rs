use std::sync::Arc;

use tauri::{path::SafePathBuf, AppHandle, Manager, Runtime};
use lsp_types::Hover;

use crate::lsp::service::LspService;

#[tauri::command]
pub async fn lsp_hover<R: Runtime>(
    path: SafePathBuf,
    row: u32,
    column: u32,
    app_handle: AppHandle<R>
) -> tauri::Result<Hover> {
    let lsp_service = app_handle.state::<Arc<LspService<R>>>();
    let result = lsp_service.hover(path.as_ref(), row, column).await?;
    Ok(result)
}
