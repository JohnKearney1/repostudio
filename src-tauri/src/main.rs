// main.rs
// This file is the entry point for the Tauri application. It is responsible for invoking the run function that is defined in the lib.rs file.
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    repostudio_lib::run()
}
