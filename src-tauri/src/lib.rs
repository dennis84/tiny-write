use async_lsp_client::ServerMessage;
use log::{debug, info};
use tauri::{Builder, Manager, Runtime, WindowEvent};
use tauri_plugin_cli::CliExt;

use copilot::service::CopilotService;
use editor::editor_state::EditorState;
use lsp::registry::LspRegistry;
use lsp::service::LspService;

mod copilot;
mod editor;
mod fs;
mod install_cli;
mod logger;
mod lsp;
mod menu;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run<R: Runtime>(builder: Builder<R>) {
    builder
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
            app.manage(lsp_registry);

            let editor_state = EditorState::new();
            app.manage(editor_state);

            let lsp_service = LspService::new(handle.clone());
            app.manage::<LspService<R>>(lsp_service);

            let copilot_service = CopilotService::new(handle.clone());
            app.manage(copilot_service);

            let handle2 = handle.clone();

            tauri::async_runtime::spawn(async move {
                let editor_state = handle2.state::<EditorState>();
                let lsp_service = handle2.state::<LspService<R>>();
                let lsp_registry = handle2.state::<LspRegistry>();
                let copilot_service = handle2.state::<CopilotService<R>>();

                loop {
                    tokio::select! {
                        Ok(path) = editor_state.open_doc_rx.recv() => {
                            let _ = lsp_service.register_language_server(path.as_ref()).await;
                            let _ = copilot_service.register_language_server(path.as_ref()).await;
                        },

                        Ok(mut rx) = lsp_registry.language_server_registered_rx.recv() => {
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
            editor::command_editor_state::get_document,
            editor::command_editor_state::read_text,
            editor::command_editor_state::replace_text,
            editor::command_editor_state::insert_text,
            editor::command_editor_state::delete_text,
            editor::command_editor_state::write_file,
            lsp::command::lsp_hover,
            lsp::command::lsp_completion,
            lsp::command::lsp_goto,
            copilot::command::enable_copilot,
            copilot::command::disable_copilot,
            copilot::command::copilot_sign_in,
            copilot::command::copilot_status,
            copilot::command::copilot_completion,
        ])
        .build(tauri::generate_context!("tauri.conf.json"))
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                println!("Destroyed");
                let lsp_registry = app_handle.state::<LspRegistry>();
                println!("block_on");
                tauri::async_runtime::block_on(async {
                    println!("AAAAAAA");
                    lsp_registry.shutdown().await
                });
                println!("block_on::done");
            }
        });
}
        // .on_window_event(move |window, event| {
        //     if let WindowEvent::Destroyed = event {
        //     }
        // })
