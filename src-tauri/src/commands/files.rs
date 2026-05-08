use std::{
  fs,
  path::{Path, PathBuf},
  time::{Instant, UNIX_EPOCH},
};

use chardetng::EncodingDetector;
use encoding_rs::{Encoding, UTF_16BE, UTF_16LE, UTF_8};
use tauri::command;

use crate::models::files::{ReadTextFileResult, TextFileMetadata};

const DEBUG_LOG_ENV: &str = "IORY_DEBUG_LOG";

macro_rules! timing_info {
  ($($arg:tt)*) => {
    if timing_log_enabled() {
      log::info!($($arg)*);
    }
  };
}

fn ensure_supported_text_path(path: &Path) -> Result<(), String> {
  let extension = path.extension().and_then(|value| value.to_str());

  if matches!(extension, Some("md") | Some("markdown") | Some("txt")) {
    return Ok(());
  }

  Err("Only .md, .markdown, and .txt files are supported right now".to_string())
}

#[command]
pub fn read_text_file(path: String) -> Result<ReadTextFileResult, String> {
  let total_start = Instant::now();
  let file_path = PathBuf::from(&path);
  let file_label = file_path
    .file_name()
    .and_then(|value| value.to_str())
    .unwrap_or("document");

  timing_info!(target: "iory::file_timing", "read_text_file start file={}", file_label);

  let exists_start = Instant::now();
  if !file_path.exists() {
    return Err("Selected file does not exist".to_string());
  }
  timing_info!(target: "iory::file_timing", "read_text_file step exists ms={}", elapsed_ms(exists_start));

  let is_file_start = Instant::now();
  if !file_path.is_file() {
    return Err("Selected path is not a file".to_string());
  }
  timing_info!(target: "iory::file_timing", "read_text_file step is_file ms={}", elapsed_ms(is_file_start));

  let supported_start = Instant::now();
  ensure_supported_text_path(&file_path)?;
  timing_info!(target: "iory::file_timing", "read_text_file step supported_path ms={}", elapsed_ms(supported_start));

  let read_start = Instant::now();
  let bytes = fs::read(&file_path).map_err(|error| error.to_string())?;
  timing_info!(target: "iory::file_timing", "read_text_file step fs_read ms={} bytes={}", elapsed_ms(read_start), bytes.len());

  let decode_start = Instant::now();
  let result = decode_text_file(&bytes);
  timing_info!(target: "iory::file_timing", "read_text_file step decode ms={}", elapsed_ms(decode_start));
  timing_info!(target: "iory::file_timing", "read_text_file done total_ms={}", elapsed_ms(total_start));

  Ok(result)
}

#[command]
pub fn get_text_file_metadata(path: String) -> Result<TextFileMetadata, String> {
  let total_start = Instant::now();
  let file_path = PathBuf::from(&path);
  let file_label = file_path
    .file_name()
    .and_then(|value| value.to_str())
    .unwrap_or("document");

  timing_info!(target: "iory::file_timing", "get_text_file_metadata start file={}", file_label);

  let exists_start = Instant::now();
  if !file_path.exists() {
    return Err("Selected file does not exist".to_string());
  }
  timing_info!(target: "iory::file_timing", "get_text_file_metadata step exists ms={}", elapsed_ms(exists_start));

  let is_file_start = Instant::now();
  if !file_path.is_file() {
    return Err("Selected path is not a file".to_string());
  }
  timing_info!(target: "iory::file_timing", "get_text_file_metadata step is_file ms={}", elapsed_ms(is_file_start));

  let supported_start = Instant::now();
  ensure_supported_text_path(&file_path)?;
  timing_info!(target: "iory::file_timing", "get_text_file_metadata step supported_path ms={}", elapsed_ms(supported_start));

  let metadata_start = Instant::now();
  let metadata = fs::metadata(&file_path).map_err(|error| error.to_string())?;
  timing_info!(target: "iory::file_timing", "get_text_file_metadata step fs_metadata ms={}", elapsed_ms(metadata_start));

  let modified_start = Instant::now();
  let modified_at_ms = metadata
    .modified()
    .map_err(|error| error.to_string())?
    .duration_since(UNIX_EPOCH)
    .map_err(|error| error.to_string())?
    .as_millis();
  timing_info!(target: "iory::file_timing", "get_text_file_metadata step modified_time ms={}", elapsed_ms(modified_start));

  timing_info!(
    target: "iory::file_timing",
    "get_text_file_metadata done total_ms={} size={}",
    elapsed_ms(total_start),
    metadata.len()
  );

  Ok(TextFileMetadata {
    modified_at_ms,
    file_size: metadata.len(),
  })
}

fn elapsed_ms(start: Instant) -> u128 {
  start.elapsed().as_millis()
}

fn timing_log_enabled() -> bool {
  cfg!(debug_assertions) || std::env::var_os(DEBUG_LOG_ENV).is_some()
}

#[command]
pub fn create_empty_text_file(path: String) -> Result<(), String> {
  let file_path = PathBuf::from(&path);

  ensure_supported_text_path(&file_path)?;

  if file_path.exists() {
    return Err("Target file already exists".to_string());
  }

  if let Some(parent) = file_path.parent() {
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
  }

  fs::OpenOptions::new()
    .write(true)
    .create_new(true)
    .open(&file_path)
    .map_err(|error| error.to_string())?;

  Ok(())
}

fn decode_text_file(bytes: &[u8]) -> ReadTextFileResult {
  if let Some((encoding, bom, payload)) = sniff_bom(bytes) {
    let (text, _, had_decoding_errors) = encoding.decode(payload);

    return ReadTextFileResult {
      text: text.into_owned(),
      encoding: normalize_encoding_label(encoding),
      bom: Some(bom.to_string()),
      had_decoding_errors,
    };
  }

  if let Ok(text) = std::str::from_utf8(bytes) {
    return ReadTextFileResult {
      text: text.to_string(),
      encoding: "utf-8".to_string(),
      bom: None,
      had_decoding_errors: false,
    };
  }

  let mut detector = EncodingDetector::new();
  detector.feed(bytes, true);
  let encoding = detector.guess(None, true);
  let (text, _, had_decoding_errors) = encoding.decode(bytes);

  ReadTextFileResult {
    text: text.into_owned(),
    encoding: normalize_encoding_label(encoding),
    bom: None,
    had_decoding_errors,
  }
}

fn sniff_bom(bytes: &[u8]) -> Option<(&'static Encoding, &'static str, &[u8])> {
  if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
    return Some((UTF_8, "utf-8", &bytes[3..]));
  }

  if bytes.starts_with(&[0xFF, 0xFE]) {
    return Some((UTF_16LE, "utf-16le", &bytes[2..]));
  }

  if bytes.starts_with(&[0xFE, 0xFF]) {
    return Some((UTF_16BE, "utf-16be", &bytes[2..]));
  }

  None
}

fn normalize_encoding_label(encoding: &'static Encoding) -> String {
  encoding.name().to_ascii_lowercase()
}

#[cfg(test)]
mod tests {
  use super::create_empty_text_file;
  use std::{
    env, fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
  };

  struct TestDir {
    path: PathBuf,
  }

  impl TestDir {
    fn new(prefix: &str) -> Self {
      let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("valid time")
        .as_nanos();
      let path = env::temp_dir().join(format!("iory-{prefix}-{stamp}"));
      fs::create_dir_all(&path).expect("create temp dir");
      Self { path }
    }

    fn path(&self) -> &Path {
      &self.path
    }
  }

  impl Drop for TestDir {
    fn drop(&mut self) {
      let _ = fs::remove_dir_all(&self.path);
    }
  }

  #[test]
  fn create_empty_text_file_creates_absolute_file() {
    let dir = TestDir::new("create-empty-file");
    let target = dir.path().join("draft.txt");

    create_empty_text_file(target.to_string_lossy().to_string()).expect("create empty file");

    assert!(target.exists());
  }
}
