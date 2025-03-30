// src/commands/mod.rs
pub mod actions;
pub mod audio_ops;
pub mod db;
pub mod file_ops;
pub mod structures;

// Optionally, re-export specific command functions for easier access:
// pub use structures::*;
pub use actions::*;
pub use audio_ops::*;
pub use db::*;
pub use file_ops::*;
