use std::path::{Path, PathBuf};

use anyhow::{anyhow, Result};
use std::fs;
use tauri::{AppHandle, Manager, Runtime};

pub fn install_cli<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf> {
    let cli_path = tauri::process::current_binary(&app.env()).unwrap();
    let link_path = Path::new("/usr/local/bin/tinywrite");
    let bin_dir_path = link_path.parent().unwrap();

    // Don't re-create symlink if it points to the same CLI binary.
    if fs::read_link(link_path).ok().as_ref() == Some(&cli_path) {
        return Ok(link_path.into());
    }

    // If the symlink is not there or is outdated, first try replacing it
    // without escalating.
    fs::remove_file(link_path)?;

    if std::os::unix::fs::symlink(&cli_path, link_path).is_ok() {
        return Ok(link_path.into());
    }

    // The symlink could not be created, so use osascript with admin privileges
    // to create it.
    let status = std::process::Command::new("/usr/bin/osascript")
        .args([
            "-e",
            &format!(
                "do shell script \" \
                    mkdir -p \'{}\' && \
                    ln -sf \'{}\' \'{}\' \
                \" with administrator privileges",
                bin_dir_path.to_string_lossy(),
                cli_path.to_string_lossy(),
                link_path.to_string_lossy(),
            ),
        ])
        .stdout(std::process::Stdio::inherit())
        .stderr(std::process::Stdio::inherit())
        .output()?
        .status;
    if status.success() {
        Ok(link_path.into())
    } else {
        Err(anyhow!("error running osascript"))
    }
}
