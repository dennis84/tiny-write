use log::LevelFilter;
use tauri::{AppHandle, Error, Runtime};
use tauri_plugin_log::{Target, TargetKind};

pub fn register_logger<R: Runtime>(app: &AppHandle<R>, verbose: bool) -> Result<(), Error> {
    let logger = tauri_plugin_log::Builder::default()
        .level(if verbose { LevelFilter::Debug } else { LevelFilter::Info })
        .format(move |out, message, record| {
            out.finish(format_args!("{}: {}", record.level(), message));
        })
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::LogDir { file_name: None }),
            Target::new(TargetKind::Webview),
        ])
        .build();
    app.plugin(logger)
}

