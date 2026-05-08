use std::{
  fs,
  io::ErrorKind,
  path::Path,
  thread,
  time::{Duration, Instant},
};

#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;

#[cfg(windows)]
use windows_sys::Win32::Storage::FileSystem::ReplaceFileW;

const WINDOWS_RETRY_ATTEMPTS: usize = 5;
const WINDOWS_RETRY_DELAY_MS: u64 = 40;
const DEBUG_LOG_ENV: &str = "IORY_DEBUG_LOG";
pub const ERROR_UNABLE_TO_REMOVE_REPLACED: i32 = 1175;

macro_rules! timing_info {
  ($($arg:tt)*) => {
    if timing_log_enabled() {
      log::info!($($arg)*);
    }
  };
}

macro_rules! timing_warn {
  ($($arg:tt)*) => {
    if timing_log_enabled() {
      log::warn!($($arg)*);
    }
  };
}

pub fn replace_with_retry(from: &Path, to: &Path) -> Result<(), String> {
  replace_with_retry_impl(from, to, replace_file, |duration| thread::sleep(duration))
}

pub fn replace_with_retry_impl<R, S>(
  from: &Path,
  to: &Path,
  mut replacer: R,
  mut sleeper: S,
) -> Result<(), String>
where
  R: FnMut(&Path, &Path) -> std::io::Result<()>,
  S: FnMut(Duration),
{
  for attempt in 0..WINDOWS_RETRY_ATTEMPTS {
    let attempt_start = Instant::now();
    match replacer(from, to) {
      Ok(()) => {
        timing_info!(
          target: "iory::save_timing",
          "save step replace_attempt attempt={} result=ok ms={}",
          attempt + 1,
          elapsed_ms(attempt_start)
        );
        return Ok(());
      }
      Err(error) if should_retry(&error) && attempt + 1 < WINDOWS_RETRY_ATTEMPTS => {
        let delay = Duration::from_millis(WINDOWS_RETRY_DELAY_MS * (attempt as u64 + 1));
        timing_warn!(
          target: "iory::save_timing",
          "save step replace_attempt attempt={} result=retry ms={} delay_ms={} error={}",
          attempt + 1,
          elapsed_ms(attempt_start),
          delay.as_millis(),
          error
        );
        sleeper(delay);
      }
      Err(error) => {
        timing_warn!(
          target: "iory::save_timing",
          "save step replace_attempt attempt={} result=error ms={} error={}",
          attempt + 1,
          elapsed_ms(attempt_start),
          error
        );
        let _ = fs::remove_file(from);
        return Err(error.to_string());
      }
    }
  }

  Err("Atomic save failed after retries".to_string())
}

fn should_retry(error: &std::io::Error) -> bool {
  matches!(error.kind(), ErrorKind::PermissionDenied)
    || matches!(
      error.raw_os_error(),
      Some(5) | Some(32) | Some(ERROR_UNABLE_TO_REMOVE_REPLACED)
    )
}

fn elapsed_ms(start: Instant) -> u128 {
  start.elapsed().as_millis()
}

fn timing_log_enabled() -> bool {
  cfg!(debug_assertions) || std::env::var_os(DEBUG_LOG_ENV).is_some()
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
  use super::{replace_with_retry_impl, ERROR_UNABLE_TO_REMOVE_REPLACED};
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
    assert_eq!(
      &*sleeps_for_assert.borrow(),
      &[Duration::from_millis(40), Duration::from_millis(80)]
    );
    assert_eq!(fs::read_to_string(&to).expect("read target"), "next");
  }

  #[test]
  fn replace_with_retry_retries_unable_to_remove_replaced_then_succeeds() {
    let dir = TestDir::new("retry-replace-file");
    let from = dir.path().join("from.txt");
    let to = dir.path().join("to.txt");
    fs::write(&from, "next").expect("write source");
    fs::write(&to, "prev").expect("write target");

    let attempts = Rc::new(RefCell::new(0usize));
    let attempts_for_replacer = Rc::clone(&attempts);

    let result = replace_with_retry_impl(
      &from,
      &to,
      move |from, to| {
        let mut count = attempts_for_replacer.borrow_mut();
        *count += 1;

        if *count < 2 {
          return Err(Error::from_raw_os_error(ERROR_UNABLE_TO_REMOVE_REPLACED));
        }

        fs::rename(from, to)
      },
      |_| {},
    );

    assert!(result.is_ok());
    assert_eq!(*attempts.borrow(), 2);
    assert_eq!(fs::read_to_string(&to).expect("read target"), "next");
  }
}
