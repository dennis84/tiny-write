use log::{error, info};
use tauri::{menu::*, AppHandle, Runtime};
use crate::install_cli::install_cli;
use anyhow::Result;

pub fn setup_menu<R: Runtime>(app: &AppHandle<R>) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        let submenu_app = SubmenuBuilder::new(app, "TinyWrite")
            .text("install_cli", "Install CLI")
            .quit()
            .build()?;
        let submenu_edit = SubmenuBuilder::new(app, "Edit")
            .undo()
            .redo()
            .separator()
            .cut()
            .copy()
            .paste()
            .build()?;
        let menu = MenuBuilder::new(app)
            .item(&submenu_app)
            .item(&submenu_edit)
            .build()?;
        app.set_menu(menu)?;

        app.on_menu_event(move |app, event| {
            if event.id == "install_cli" {
                match install_cli(app) {
                    Ok(path) => info!("Sucessfully installed cli to: {:?}", path),
                    Err(e) => error!("Install CLI failed: {}", e)
                }
            }
        });
    }

    Ok(())
}
