use std::fs;

use anyhow::Result;
use tauri::{AppHandle, Manager, Runtime};
use tracing::dispatcher::set_global_default;
use tracing::{info, Level};
use tracing_appender::rolling;
use tracing_subscriber::fmt::format::FmtSpan;
use tracing_subscriber::fmt::Layer;
use tracing_subscriber::{prelude::*, EnvFilter, Registry};

pub fn register_logger<R: Runtime>(app: &AppHandle<R>, verbose: bool) -> Result<()> {
    let path = app.path().app_log_dir()?;
    if !path.exists() {
        fs::create_dir_all(&path)?;
    }

    let level = if verbose { Level::TRACE } else { Level::INFO };

    let app_name = &app.package_info().name;

    let fmt_stdout = Layer::new()
        .with_writer(std::io::stdout)
        .with_target(false)
        .with_file(false)
        .with_span_events(FmtSpan::CLOSE)
        .with_thread_names(false)
        .with_thread_ids(false);

    let fmt_file = Layer::new()
        .with_writer(rolling::never(&path, format!("{}.log", app_name)))
        .with_target(false)
        .with_file(false)
        .with_span_events(FmtSpan::CLOSE)
        .with_thread_names(false)
        .with_thread_ids(false);

    let subscriber = Registry::default()
        .with(EnvFilter::from_default_env().add_directive(level.into()))
        .with(fmt_stdout)
        .with(fmt_file);
    set_global_default(subscriber.into())?;

    info!("Log dir: {}", path.to_string_lossy());

    Ok(())
}
