#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::env;
use tauri::{Menu, MenuItem, Submenu};

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

    builder
        .manage(cmd::args::create_args(env::args().skip(1).collect::<Vec<_>>()))
        .invoke_handler(tauri::generate_handler![
            cmd::args::get_args,
            cmd::file::get_mime_type,
            cmd::file::get_file_last_modified,
            cmd::path::resolve_path,
            cmd::path::dirname,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
