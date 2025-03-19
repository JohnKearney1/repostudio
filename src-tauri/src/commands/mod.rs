// src/commands/mod.rs
pub mod file_ops;
pub mod audio_ops;
pub mod structures;
pub mod db;
pub mod actions;

// Optionally, re-export specific command functions for easier access:
// pub use structures::*;
pub use file_ops::*;
pub use audio_ops::*;
pub use db::*;
pub use actions::*;
