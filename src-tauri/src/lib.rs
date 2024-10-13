use async_lsp_client::ServerMessage;
use log::{debug, info};
use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_cli::CliExt;
use tokio::sync::Mutex;

use editor::editor_state::EditorState;
use lsp::registry::LspRegistry;
use lsp::service::LspService;

mod editor;
mod install_cli;
mod lsp;
mod menu;
mod fs;
mod logger;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_shell::init())
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
                    let verbose = matches
                        .args
                        .get("verbose")
                        .map(|a| a.value.as_bool().unwrap_or(false))
                        .unwrap_or(false);
                    logger::register_logger(handle, verbose)?;

                    debug!("Start app with cli args {:?}", &matches);

                    if let Some(help) = matches.args.get("help") {
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
                    }

                    if let Some(source) = matches.args.get("source") {
                        let source = source
                            .value
                            .as_str()
                            .map(|s| s.to_string())
                            .unwrap_or_default();
                        let args = editor::command_args::create_args(source);
                        info!("Log dir: {}", log_dir_string);
                        app.manage(args);
                    } else {
                        let args = editor::command_args::create_args("".to_string());
                        info!("Log dir: {}", log_dir_string);
                        app.manage(args);
                    }
                }
                Err(e) => {
                    println!("{}", e);
                    handle.exit(1);
                }
            }

            menu::setup_menu(handle)?;

            let lsp_registry = LspRegistry::new();
            let language_server_registered_rx = lsp_registry.language_server_registered_rx.clone();
            let lsp_registry = Arc::new(Mutex::new(lsp_registry));
            app.manage(lsp_registry);

            let editor_state = EditorState::new();
            let debounced_write_rx = editor_state.debounced_write_rx.clone();
            let open_doc_rx = editor_state.open_doc_rx.clone();
            let editor_state = Arc::new(Mutex::new(editor_state));
            let editor_state_2 = Arc::clone(&editor_state);
            app.manage(editor_state);

            let lsp_service = LspService::new(handle.clone());
            let lsp_service = Arc::new(lsp_service);
            let lsp_service_2 = Arc::clone(&lsp_service);
            app.manage(lsp_service);

            tauri::async_runtime::spawn(async move {
                loop {
                    if debounced_write_rx.recv().is_ok() {
                        let mut state = editor_state_2.lock().await;
                        let _ = state.write_all();
                        drop(state);
                    }
                }
            });

            tauri::async_runtime::spawn(async move {
                loop {
                    if let Ok(path) = open_doc_rx.recv() {
                        let _ = lsp_service_2.register_language_server(path.as_ref()).await;
                    }
                }
            });

            tauri::async_runtime::spawn(async move {
                loop {
                    if let Ok(mut rx) = language_server_registered_rx.recv() {
                        info!("receive requests and notifications from language server");
                        tauri::async_runtime::spawn(async move {
                            loop {
                                if let Some(message) = rx.recv().await {
                                    match message {
                                        ServerMessage::Notification(n) => {
                                            info!("Received notification from lsp server: {:?}", n);
                                        }
                                        // For requests, you need to send a response
                                        ServerMessage::Request(r) => {
                                            info!("Received request from lsp server: {:?}", r);
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            editor::command_args::get_args,
            fs::metadata::get_mime_type,
            fs::metadata::get_file_last_modified,
            fs::list::list_contents,
            fs::path::resolve_path,
            fs::path::dirname,
            fs::path::to_relative_path,
            fs::path::to_absolute_path,
            editor::command_editor_state::read_text,
            editor::command_editor_state::write_text,
            editor::command_editor_state::insert_text,
            editor::command_editor_state::delete_text,
            lsp::command::lsp_hover,
        ])
        .run(tauri::generate_context!("tauri.conf.json"))
        .expect("error while running tauri application");
}
