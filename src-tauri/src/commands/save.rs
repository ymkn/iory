use std::{
  fs::File,
  io::Write,
  path::{Path, PathBuf},
  time::{Instant, SystemTime, UNIX_EPOCH},
};

use tauri::{async_runtime, command};

use super::{
  atomic_replace::replace_with_retry,
  text_encoding::{bom_bytes, encode_text, resolve_encoding},
};

const DEBUG_LOG_ENV: &str = "IORY_DEBUG_LOG";

macro_rules! timing_info {
  ($($arg:tt)*) => {
    if timing_log_enabled() {
      log::info!($($arg)*);
    }
  };
}

#[command]
pub async fn save_document_atomic(
  path: String,
  contents: String,
  encoding: Option<String>,
  bom: Option<String>,
) -> Result<(), String> {
  async_runtime::spawn_blocking(move || {
    save_document_atomic_blocking(path, contents, encoding, bom)
  })
  .await
  .map_err(|error| error.to_string())?
}

fn save_document_atomic_blocking(
  path: String,
  contents: String,
  encoding: Option<String>,
  bom: Option<String>,
) -> Result<(), String> {
  save_document_atomic_with_replace(path, contents, encoding, bom, replace_with_retry)
}

fn save_document_atomic_with_replace<R>(
  path: String,
  contents: String,
  encoding: Option<String>,
  bom: Option<String>,
  replace: R,
) -> Result<(), String>
where
  R: FnOnce(&Path, &Path) -> Result<(), String>,
{
  let total_start = Instant::now();
  let file_path = PathBuf::from(&path);
  let file_label = file_path
    .file_name()
    .and_then(|value| value.to_str())
    .unwrap_or("document");

  timing_info!(
    target: "iory::save_timing",
    "save start file={} chars={} encoding={:?} bom={:?}",
    file_label,
    contents.chars().count(),
    encoding,
    bom
  );

  let exists_start = Instant::now();
  if !file_path.exists() {
    return Err("Target file does not exist".to_string());
  }

  timing_info!(target: "iory::save_timing", "save step exists ms={}", elapsed_ms(exists_start));

  let is_file_start = Instant::now();
  if !file_path.is_file() {
    return Err("Target path is not a file".to_string());
  }

  timing_info!(target: "iory::save_timing", "save step is_file ms={}", elapsed_ms(is_file_start));

  let encode_start = Instant::now();
  let bytes = encode_document_bytes(&contents, encoding.as_deref(), bom.as_deref())?;
  timing_info!(target: "iory::save_timing", "save step encode ms={} bytes={}", elapsed_ms(encode_start), bytes.len());

  let temp_path_start = Instant::now();
  let temp_path = make_temp_path(&file_path);
  timing_info!(target: "iory::save_timing", "save step temp_path ms={}", elapsed_ms(temp_path_start));

  write_temp_file(&temp_path, &bytes)?;

  let replace_start = Instant::now();
  replace(&temp_path, &file_path)?;
  timing_info!(target: "iory::save_timing", "save step replace_with_retry ms={}", elapsed_ms(replace_start));

  sync_parent_directory(&file_path);

  timing_info!(target: "iory::save_timing", "save done total_ms={}", elapsed_ms(total_start));

  Ok(())
}

fn encode_document_bytes(
  contents: &str,
  encoding_label: Option<&str>,
  bom_label: Option<&str>,
) -> Result<Vec<u8>, String> {
  let encoding = resolve_encoding(encoding_label)?;
  let mut bytes = encode_text(contents, encoding)?;

  if let Some(prefix) = bom_bytes(bom_label) {
    let mut with_bom = prefix.to_vec();
    with_bom.extend(bytes);
    bytes = with_bom;
  }

  Ok(bytes)
}

fn write_temp_file(temp_path: &Path, bytes: &[u8]) -> Result<(), String> {
  let create_start = Instant::now();
  let mut temp_file = File::create(temp_path).map_err(|error| error.to_string())?;
  timing_info!(target: "iory::save_timing", "save step temp_create ms={}", elapsed_ms(create_start));

  let write_start = Instant::now();
  temp_file
    .write_all(bytes)
    .map_err(|error| error.to_string())?;
  timing_info!(target: "iory::save_timing", "save step temp_write_all ms={}", elapsed_ms(write_start));

  let flush_start = Instant::now();
  temp_file.flush().map_err(|error| error.to_string())?;
  timing_info!(target: "iory::save_timing", "save step temp_flush ms={}", elapsed_ms(flush_start));

  let sync_start = Instant::now();
  temp_file.sync_all().map_err(|error| error.to_string())?;
  timing_info!(target: "iory::save_timing", "save step temp_sync_all ms={}", elapsed_ms(sync_start));

  drop(temp_file);

  Ok(())
}

fn sync_parent_directory(file_path: &Path) {
  if let Some(parent) = file_path.parent() {
    let parent_open_start = Instant::now();
    if let Ok(directory) = File::open(parent) {
      timing_info!(target: "iory::save_timing", "save step parent_open ms={}", elapsed_ms(parent_open_start));

      let parent_sync_start = Instant::now();
      let _ = directory.sync_all();
      timing_info!(target: "iory::save_timing", "save step parent_sync_all ms={}", elapsed_ms(parent_sync_start));
    } else {
      timing_info!(target: "iory::save_timing", "save step parent_open_failed ms={}", elapsed_ms(parent_open_start));
    }
  }
}

fn elapsed_ms(start: Instant) -> u128 {
  start.elapsed().as_millis()
}

fn timing_log_enabled() -> bool {
  cfg!(debug_assertions) || std::env::var_os(DEBUG_LOG_ENV).is_some()
}

fn make_temp_path(path: &Path) -> PathBuf {
  let file_name = path
    .file_name()
    .and_then(|value| value.to_str())
    .unwrap_or("document.txt");

  let stamp = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis())
    .unwrap_or(0);

  path.with_file_name(format!(".{file_name}.{stamp}.neige.tmp"))
}

#[cfg(test)]
mod tests {
  use super::save_document_atomic_with_replace;
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
  fn save_document_atomic_replaces_contents() {
    let dir = TestDir::new("atomic-save");
    let file = dir.path().join("draft.txt");
    fs::write(&file, "before").expect("seed file");

    save_document_atomic_with_replace(
      file.to_string_lossy().to_string(),
      "after".to_string(),
      None,
      None,
      |from, to| {
        fs::remove_file(to).expect("remove target");
        fs::rename(from, to).map_err(|error| error.to_string())
      },
    )
    .expect("save succeeds");

    assert_eq!(fs::read_to_string(&file).expect("read saved file"), "after");
  }
}
