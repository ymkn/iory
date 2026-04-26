use std::{
  fs::{self, File},
  io::{ErrorKind, Write},
  path::{Path, PathBuf},
  thread,
  time::{Duration, SystemTime, UNIX_EPOCH},
};

use encoding_rs::Encoding;
use tauri::command;

#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;

#[cfg(windows)]
use windows_sys::Win32::Storage::FileSystem::ReplaceFileW;

const WINDOWS_RETRY_ATTEMPTS: usize = 5;
const WINDOWS_RETRY_DELAY_MS: u64 = 40;

#[command]
pub fn save_document_atomic(path: String, contents: String, encoding: Option<String>, bom: Option<String>) -> Result<(), String> {
  let file_path = PathBuf::from(&path);

  if !file_path.exists() {
    return Err("Target file does not exist".to_string());
  }

  if !file_path.is_file() {
    return Err("Target path is not a file".to_string());
  }

  let encoding = resolve_encoding(encoding.as_deref())?;
  let mut bytes = encode_text(&contents, encoding)?;

  if let Some(prefix) = bom_bytes(bom.as_deref()) {
    let mut with_bom = prefix.to_vec();
    with_bom.extend(bytes);
    bytes = with_bom;
  }

  let temp_path = make_temp_path(&file_path);

  {
    let mut temp_file = File::create(&temp_path).map_err(|error| error.to_string())?;
    temp_file.write_all(&bytes).map_err(|error| error.to_string())?;
    temp_file.flush().map_err(|error| error.to_string())?;
    temp_file.sync_all().map_err(|error| error.to_string())?;
  }

  replace_with_retry(&temp_path, &file_path)?;

  if let Some(parent) = file_path.parent() {
    if let Ok(directory) = File::open(parent) {
      let _ = directory.sync_all();
    }
  }

  Ok(())
}

fn replace_with_retry(from: &Path, to: &Path) -> Result<(), String> {
  replace_with_retry_impl(from, to, replace_file, |duration| thread::sleep(duration))
}

fn replace_with_retry_impl<R, S>(from: &Path, to: &Path, mut replacer: R, mut sleeper: S) -> Result<(), String>
where
  R: FnMut(&Path, &Path) -> std::io::Result<()>,
  S: FnMut(Duration),
{
  for attempt in 0..WINDOWS_RETRY_ATTEMPTS {
    match replacer(from, to) {
      Ok(()) => return Ok(()),
      Err(error) if should_retry(&error) && attempt + 1 < WINDOWS_RETRY_ATTEMPTS => {
        sleeper(Duration::from_millis(WINDOWS_RETRY_DELAY_MS * (attempt as u64 + 1)));
      }
      Err(error) => {
        let _ = fs::remove_file(from);
        return Err(error.to_string());
      }
    }
  }

  Err("Atomic save failed after retries".to_string())
}

fn should_retry(error: &std::io::Error) -> bool {
  matches!(error.kind(), ErrorKind::PermissionDenied)
    || matches!(error.raw_os_error(), Some(5) | Some(32))
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

fn resolve_encoding(label: Option<&str>) -> Result<&'static Encoding, String> {
  let normalized = label.unwrap_or("utf-8");

  Encoding::for_label(normalized.as_bytes())
    .ok_or_else(|| format!("Unsupported encoding: {normalized}"))
}

fn encode_text(contents: &str, encoding: &'static Encoding) -> Result<Vec<u8>, String> {
  let (encoded, _, had_errors) = encoding.encode(contents);

  if had_errors {
    return Err(format!("現在の本文は {} へ安全に保存できません。", encoding.name().to_ascii_lowercase()));
  }

  Ok(encoded.into_owned())
}

fn bom_bytes(label: Option<&str>) -> Option<&'static [u8]> {
  match label {
    Some("utf-8") => Some(&[0xEF, 0xBB, 0xBF]),
    Some("utf-16le") => Some(&[0xFF, 0xFE]),
    Some("utf-16be") => Some(&[0xFE, 0xFF]),
    _ => None,
  }
}

#[cfg(windows)]
fn replace_file(from: &Path, to: &Path) -> std::io::Result<()> {
  let target: Vec<u16> = to.as_os_str().encode_wide().chain(Some(0)).collect();
  let replacement: Vec<u16> = from.as_os_str().encode_wide().chain(Some(0)).collect();

  let result = unsafe {
    ReplaceFileW(
      target.as_ptr(),
      replacement.as_ptr(),
      std::ptr::null(),
      0,
      std::ptr::null_mut(),
      std::ptr::null_mut(),
    )
  };

  if result == 0 {
    Err(std::io::Error::last_os_error())
  } else {
    Ok(())
  }
}

#[cfg(not(windows))]
fn replace_file(from: &Path, to: &Path) -> std::io::Result<()> {
  fs::rename(from, to)
}

#[cfg(test)]
mod tests {
  use super::{replace_with_retry_impl, save_document_atomic};
  use std::{
    cell::RefCell,
    env, fs,
    io::{Error, ErrorKind},
    path::{Path, PathBuf},
    rc::Rc,
    time::{Duration, SystemTime, UNIX_EPOCH},
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

    save_document_atomic(file.to_string_lossy().to_string(), "after".to_string(), None, None)
      .expect("save succeeds");

    assert_eq!(fs::read_to_string(&file).expect("read saved file"), "after");
  }

  #[test]
  fn replace_with_retry_retries_permission_errors_then_succeeds() {
    let dir = TestDir::new("retry-save");
    let from = dir.path().join("from.txt");
    let to = dir.path().join("to.txt");
    fs::write(&from, "next").expect("write source");
    fs::write(&to, "prev").expect("write target");

    let attempts = Rc::new(RefCell::new(0usize));
    let sleeps = Rc::new(RefCell::new(Vec::<Duration>::new()));

    let attempts_for_replacer = Rc::clone(&attempts);
    let sleeps_for_assert = Rc::clone(&sleeps);

    let result = replace_with_retry_impl(
      &from,
      &to,
      move |from, to| {
        let mut count = attempts_for_replacer.borrow_mut();
        *count += 1;

        if *count < 3 {
          return Err(Error::new(ErrorKind::PermissionDenied, "locked"));
        }

        fs::rename(from, to)
      },
      move |duration| {
        sleeps.borrow_mut().push(duration);
      },
    );

    assert!(result.is_ok());
    assert_eq!(*attempts.borrow(), 3);
    assert_eq!(&*sleeps_for_assert.borrow(), &[Duration::from_millis(40), Duration::from_millis(80)]);
    assert_eq!(fs::read_to_string(&to).expect("read target"), "next");
  }
}
