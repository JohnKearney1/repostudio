use std::error::Error;
use std::fs::File;
use std::path::Path;

use rusty_chromaprint::Configuration;
use rusty_chromaprint::Fingerprinter;
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymphError;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::default::{get_codecs, get_probe};

use tauri::{Emitter, Window};

use crate::commands::db::update_file;
use crate::commands::structures::FileMetadata;

/// Generates an audio fingerprint for a given file and updates its record in the database.
pub fn generate_audio_fingerprint_for_file(
    repo_id: &str,
    file_metadata: &FileMetadata,
) -> Result<String, Box<dyn Error>> {
    println!("Generating fingerprint for file: {}", file_metadata.path);

    let path = Path::new(&file_metadata.path);
    let file = File::open(path)?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = symphonia::core::probe::Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let format_opts = FormatOptions::default();
    let meta_opts = MetadataOptions::default();

    let probed = get_probe().format(&hint, mss, &format_opts, &meta_opts)?;
    let mut format = probed.format;

    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or("No supported audio track found")?;
    let track_id = track.id;

    let dec_opts = DecoderOptions::default();
    let mut decoder = get_codecs().make(&track.codec_params, &dec_opts)?;
    let sample_rate = track
        .codec_params
        .sample_rate
        .ok_or("Missing sample rate")?;
    let channels = track
        .codec_params
        .channels
        .ok_or("Missing channels")?
        .count() as u32;

    let config = Configuration::preset_test1();
    let mut printer = Fingerprinter::new(&config);
    printer.start(sample_rate, channels)?;

    let mut sample_buf: Option<SampleBuffer<i16>> = None;
    let mut packet_count: u64 = 0;

    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(_) => break,
        };

        if packet.track_id() != track_id {
            continue;
        }

        match decoder.decode(&packet) {
            Ok(audio_buf) => {
                if sample_buf.is_none() {
                    let spec = *audio_buf.spec();
                    let capacity = audio_buf.capacity() as u64;
                    sample_buf = Some(SampleBuffer::<i16>::new(capacity, spec));
                }

                if let Some(buf) = &mut sample_buf {
                    buf.copy_interleaved_ref(audio_buf);
                    printer.consume(buf.samples());
                }
            }
            Err(SymphError::DecodeError(_)) => continue,
            Err(e) => return Err(Box::new(e)),
        }

        packet_count += 1;
        if packet_count % 10 == 0 {
            println!("Processed {} packets...", packet_count);
        }
    }

    printer.finish();
    println!("Fingerprinting complete.");

    let fp_vec = printer.fingerprint().to_vec();
    let fp_string = fp_vec
        .iter()
        .map(|num| format!("{:08x}", num))
        .collect::<Vec<_>>()
        .join("");

    let mut updated_file = file_metadata.clone();
    updated_file.audio_fingerprint = Some(fp_string.clone());
    update_file(repo_id, &updated_file)?;

    Ok(fp_string)
}

#[tauri::command]
pub async fn generate_audio_fingerprint_for_file_command(
    window: Window, // <-- Added
    repo_id: String,
    file: FileMetadata,
) -> Result<(), String> {
    let emit_window = window.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let result = generate_audio_fingerprint_for_file(&repo_id, &file);

        let event_payload = match &result {
            Ok(fp) => {
                format!(
                    "Fingerprint generated for file '{}' (repo '{}'): {}",
                    file.name, repo_id, fp
                )
            }
            Err(e) => {
                format!(
                    "Failed to generate fingerprint for file '{}' (repo '{}'): {}",
                    file.name, repo_id, e
                )
            }
        };

        emit_window
            .emit(
                "generate_audio_fingerprint_completed", // Event name
                event_payload,
            )
            .unwrap_or_else(|e| {
                println!(
                    "Failed to emit generate_audio_fingerprint_completed event: {}",
                    e
                );
            });

        result.map(|_| ()).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
