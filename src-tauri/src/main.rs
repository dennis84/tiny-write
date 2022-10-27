#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::env;
use log::{info, LevelFilter};
use tauri::{Menu, MenuItem, Submenu, Manager};
use tauri_plugin_log::{LogTarget, LoggerBuilder};

mod cmd;

fn main() {
    let mut builder = tauri::Builder::default();
    if cfg!(target_os = "macos") {
        let submenu = Submenu::new("Edit", Menu::new()
            .add_native_item(MenuItem::Undo)
            .add_native_item(MenuItem::Redo)
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::Cut)
            .add_native_item(MenuItem::Copy)
            .add_native_item(MenuItem::Paste));
        let menu = Menu::new()
            .add_submenu(submenu);
        builder = builder.menu(menu);
    }

    let logger = LoggerBuilder::default()
        .targets([
            LogTarget::LogDir,
            LogTarget::Stdout,
            LogTarget::Webview,
        ])
        .level(LevelFilter::Info)
        .build();

    builder
        .plugin(logger)
        .setup(|app| {
            let log_dir_string = app
                .path_resolver()
                .log_dir()
                .unwrap()
                .into_os_string()
                .into_string()
                .unwrap();
            info!("Log dir: {}", log_dir_string);

            match app.get_cli_matches() {
                Ok(matches) => {
                    if let Some(source) = matches.args.get("source") {
                        let source = source
                            .value
                            .as_str()
                            .map(|s| s.to_string())
                            .unwrap_or_default();
                        app.manage(cmd::args::create_args(source));
                    } else if let Some(help) = matches.args.get("help") {
                        let help_text = help
                            .value
                            .as_str()
                            .map(|s| s.to_string())
                            .unwrap_or_default();
                        println!("{}", help_text);
                        app.app_handle().exit(0);
                    }
                }
                Err(e) => {
                    println!("{}", e.to_string());
                    app.app_handle().exit(1);
                }
            }

            info!("Start app with {:?}", app.state::<cmd::args::Args>().inner());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cmd::args::get_args,
            cmd::file::get_mime_type,
            cmd::file::get_file_last_modified,
            cmd::path::list_contents,
            cmd::path::resolve_path,
            cmd::path::dirname,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
