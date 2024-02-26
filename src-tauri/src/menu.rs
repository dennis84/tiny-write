use tauri::{Error, menu::*, AppHandle, Runtime};

pub fn setup_menu<R: Runtime>(app: &AppHandle<R>) -> Result<(), Error> {
    #[cfg(target_os = "macos")]
    {
        let submenu_app = SubmenuBuilder::new(app, "TinyWrite")
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
    }

    Ok(())
}
