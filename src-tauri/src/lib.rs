use log::{info, Level};
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_cli::CliExt;

use tauri::{
    Manager,
    menu::*,
};

mod cmd;
mod pathutil;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let context = tauri::generate_context!("tauri.conf.json");

    let logger = tauri_plugin_log::Builder::default()
        .format(move |out, message, record| {
            match record.level() {
                Level::Info => {
                    out.finish(format_args!("{}", message))
                }
                level => {
                    out.finish(format_args!("{}: {}", level, message));
                }
            }
        })
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::LogDir { file_name: None }),
            Target::new(TargetKind::Webview),
        ])
        .build();

    tauri::Builder::default()
        .plugin(logger)
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_cli::init())
        .setup(|app| {
            let handle = app.handle();
            let log_dir_string = app
                .path()
                .app_log_dir()?
                .into_os_string()
                .into_string()
                .unwrap();

            match handle.cli().matches() {
                Ok(matches) => {
                    if let Some(source) = matches.args.get("source") {
                        let source = source
                            .value
                            .as_str()
                            .map(|s| s.to_string())
                            .unwrap_or_default();
                        let args = cmd::args::create_args(source);
                        info!("Start app with {:?}", &args);
                        info!("Log dir: {}", log_dir_string);
                        app.manage(args);
                    } else if let Some(help) = matches.args.get("help") {
                       let help_text = help
                           .value
                           .as_str()
                           .map(|s| s.to_string())
                           .unwrap_or_default();
                       println!("{}", help_text);
                       handle.exit(0);
                    } else if matches.args.contains_key("version") {
                       println!("{} {}", app.package_info().name, app.package_info().version);
                       handle.exit(0);
                    } else {
                        let args = cmd::args::create_args("".to_string());
                        info!("Start app with {:?}", &args);
                        info!("Log dir: {}", log_dir_string);
                        app.manage(args);
                    }
                }
                Err(e) => {
                    println!("{}", e);
                    handle.exit(1);
                }
            }

            #[cfg(target_os = "macos")]
            {
                let submenu_app = SubmenuBuilder::new(handle, "TinyWrite")
                    .quit()
                    .build()?;
                let submenu_edit = SubmenuBuilder::new(handle, "Edit")
                    .undo()
                    .redo()
                    .separator()
                    .cut()
                    .copy()
                    .paste()
                    .build()?;
                let menu = MenuBuilder::new(handle)
                    .item(&submenu_app)
                    .item(&submenu_edit)
                    .build()?;
                app.set_menu(menu)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cmd::args::show_main_window,
            cmd::args::get_args,
            cmd::file::get_mime_type,
            cmd::file::get_file_last_modified,
            cmd::path::list_contents,
            cmd::path::resolve_path,
            cmd::path::dirname,
            cmd::path::to_relative_path,
        ])
        .run(context)
        .expect("error while running tauri application");
}
