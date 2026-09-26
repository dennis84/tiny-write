use tauri::{Builder, Manager, Runtime};
use tauri_plugin_cli::CliExt;

use editor::editor_state::EditorState;
use lsp::copilot::service::CopilotLspService;
use lsp::registry::LspRegistry;
use lsp::service::LspService;
use tracing::debug;

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
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let handle = app.handle();

            match handle.cli().matches() {
                Ok(matches) => {
                    let verbose = matches
                        .args
                        .get("verbose")
                        .map(|a| a.value.as_bool().unwrap_or(false))
                        .unwrap_or(false);
                    logger::setup::register_logger(handle, verbose)?;

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
                        app.manage(args);
                    } else {
                        let args = editor::command_args::create_args("".to_string());
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

            let copilot_lsp_service = CopilotLspService::new(handle.clone());
            app.manage(copilot_lsp_service);

            // let handle2 = handle.clone();
            // tauri::async_runtime::spawn(async move {
            //     let editor_state = handle2.state::<EditorState>();
            //     loop {
            //         tokio::select! {
            //             Ok(path) = editor_state.open_doc_rx.recv() => {
            //                 // handle file open
            //             },
            //         }
            //     }
            // });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            editor::command_args::get_args,
            fs::metadata::get_mime_type,
            fs::metadata::get_file_last_modified,
            fs::list::list_contents,
            fs::path::resolve_path,
            fs::path::dirname,
            fs::path::basename,
            fs::path::to_relative_path,
            fs::path::to_absolute_path,
            editor::command_editor_state::get_document,
            editor::command_editor_state::read_text,
            editor::command_editor_state::replace_text,
            editor::command_editor_state::insert_text,
            editor::command_editor_state::delete_text,
            editor::command_editor_state::write_file,
            lsp::command::lsp_message,
            lsp::command::start_language_server,
            lsp::copilot::command::copilot_disconnect,
            lsp::copilot::command::copilot_sign_in,
            lsp::copilot::command::copilot_status,
            lsp::copilot::command::copilot_auth_token,
            logger::command::log_debug,
            logger::command::log_info,
            logger::command::log_warn,
            logger::command::log_error,
            logger::command::log_span_start,
            logger::command::log_span_end,
        ])
        .build(tauri::generate_context!("tauri.conf.json"))
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                let lsp_registry = app_handle.state::<LspRegistry>();
                tauri::async_runtime::block_on(async { lsp_registry.shutdown().await });
            }
        });
}
