use std::{fs::File, path::PathBuf};

use crate::pathutil::{home_dir, path_buf_to_string};

pub fn create_test_workspace() {
    std::fs::remove_dir_all(get_test_dir()).unwrap();
    std::fs::create_dir(get_test_dir()).unwrap();
    File::create(get_test_dir().join("README.md")).unwrap();
    File::create(get_test_dir().join("main.rs")).unwrap();
}

pub fn get_home() -> PathBuf {
    home_dir().unwrap()
}

pub fn get_home_as_string() -> String {
    path_buf_to_string(get_home()).unwrap()
}

pub fn get_test_dir() -> PathBuf {
    get_home().join("tinywrite")
}


pub fn get_test_dir_as_string() -> String {
    path_buf_to_string(get_home().join("tinywrite")).unwrap()
}
