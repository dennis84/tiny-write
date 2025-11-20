use anyhow::Result;
use tauri::{AppHandle, Runtime};

#[cfg(target_os = "macos")]
use crate::install_cli::install_cli;
#[cfg(target_os = "macos")]
use tracing::{error, info};
#[cfg(target_os = "macos")]
use tauri::menu::*;

pub fn setup_menu<R: Runtime>(_app_handle: &AppHandle<R>) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        let install_cli_item = MenuItemBuilder::new("Install CLI")
            .id("install_cli")
            .build(_app_handle)?;
        let submenu_app = SubmenuBuilder::new(_app_handle, "TinyWrite")
            .item(&install_cli_item)
            .quit()
            .build()?;
        let submenu_edit = SubmenuBuilder::new(_app_handle, "Edit")
            .undo()
            .redo()
            .separator()
            .cut()
            .copy()
            .paste()
            .build()?;
        let menu = MenuBuilder::new(_app_handle)
            .item(&submenu_app)
            .item(&submenu_edit)
            .build()?;
        _app_handle.set_menu(menu)?;

        _app_handle.on_menu_event(move |app, event| {
            if event.id().as_ref() == "install_cli" {
                match install_cli(app) {
                    Ok(path) => info!("Sucessfully installed cli to: {:?}", path),
                    Err(e) => error!("Install CLI failed: {}", e),
                }
            }
        });
    }

    Ok(())
}
