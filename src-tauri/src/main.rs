#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use log::{info, LevelFilter, Level};
use std::env;
use tauri::{Manager, Menu, MenuItem, Submenu};
use tauri_plugin_log::LogTarget;

mod cmd;
mod pathutil;

fn main() {
    let mut builder = tauri::Builder::default();
    if cfg!(target_os = "macos") {
        let submenu = Submenu::new(
            "Edit",
            Menu::new()
                .add_native_item(MenuItem::Undo)
                .add_native_item(MenuItem::Redo)
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Cut)
                .add_native_item(MenuItem::Copy)
                .add_native_item(MenuItem::Paste),
        );
        let menu = Menu::new().add_submenu(submenu);
        builder = builder.menu(menu);
    }

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
        .targets([LogTarget::LogDir, LogTarget::Stdout, LogTarget::Webview])
        .level(LevelFilter::Info)
        .build();

    builder
        .plugin(logger)
        .setup(|app| {
            let log_dir_string = app
                .path_resolver()
                .app_log_dir()
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
                    } else if matches.args.contains_key("version") {
                        println!("{}", app.package_info().version);
                        app.app_handle().exit(0);
                    } else {
                        app.manage(cmd::args::create_args("".to_string()));
                    }
                }
                Err(e) => {
                    println!("{}", e.to_string());
                    app.app_handle().exit(1);
                }
            }

            info!(
                "Start app with {:?}",
                app.state::<cmd::args::Args>().inner()
            );
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
