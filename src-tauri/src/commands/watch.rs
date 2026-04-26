use std::{
  collections::HashMap,
  path::{Path, PathBuf},
  sync::{Arc, Mutex},
  time::{Duration, Instant},
};

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

const WATCH_EVENT_NAME: &str = "workspace://file-changed";
const WATCH_DEBOUNCE_WINDOW: Duration = Duration::from_millis(250);

#[derive(Default)]
pub struct WorkspaceWatchState {
  inner: Mutex<Option<WorkspaceWatcherHandle>>,
}

struct WorkspaceWatcherHandle {
  root_path: String,
  _watcher: RecommendedWatcher,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceFileChangedEvent {
  pub root_path: String,
  pub paths: Vec<String>,
}

#[tauri::command]
pub fn start_workspace_watcher(
  app: AppHandle,
  state: State<'_, WorkspaceWatchState>,
  root_path: String,
) -> Result<(), String> {
  let watch_root = PathBuf::from(&root_path);

  if !watch_root.exists() {
    return Err("Selected workspace does not exist".to_string());
  }

  if !watch_root.is_dir() {
    return Err("Selected workspace is not a directory".to_string());
  }

  let mut guard = state.inner.lock().map_err(|_| "Watcher state is unavailable".to_string())?;

  if let Some(existing) = guard.as_ref() {
    if existing.root_path == root_path {
      return Ok(());
    }
  }

  let app_handle = app.clone();
  let root_for_callback = watch_root.clone();
  let root_path_for_callback = root_path.clone();
  let debounce_state = Arc::new(Mutex::new(HashMap::<String, Instant>::new()));
  let debounce_state_for_callback = Arc::clone(&debounce_state);

  let mut watcher = notify::recommended_watcher(move |result: Result<Event, notify::Error>| {
    if let Ok(event) = result {
      emit_normalized_event(
        &app_handle,
        &root_for_callback,
        &root_path_for_callback,
        &debounce_state_for_callback,
        event,
      );
    }
  })
  .map_err(|error| error.to_string())?;

  watcher
    .configure(Config::default().with_poll_interval(Duration::from_secs(2)))
    .map_err(|error| error.to_string())?;

  watcher
    .watch(&watch_root, RecursiveMode::Recursive)
    .map_err(|error| error.to_string())?;

  *guard = Some(WorkspaceWatcherHandle {
    root_path,
    _watcher: watcher,
  });

  Ok(())
}

#[tauri::command]
pub fn stop_workspace_watcher(state: State<'_, WorkspaceWatchState>) -> Result<(), String> {
  let mut guard = state.inner.lock().map_err(|_| "Watcher state is unavailable".to_string())?;
  *guard = None;
  Ok(())
}

fn emit_normalized_event(
  app: &AppHandle,
  root: &Path,
  root_path: &str,
  debounce_state: &Arc<Mutex<HashMap<String, Instant>>>,
  event: Event,
) {
  if !should_emit_event(&event.kind) {
    return;
  }

  let now = Instant::now();
  let mut normalized_paths = Vec::new();

  for path in event.paths {
    if !should_track_path(&path) {
      continue;
    }

    let Ok(relative_path) = normalize_relative_path(root, &path) else {
      continue;
    };

    let Ok(mut debounce_guard) = debounce_state.lock() else {
      continue;
    };

    let should_skip = debounce_guard
      .get(&relative_path)
      .map(|last_seen| now.duration_since(*last_seen) < WATCH_DEBOUNCE_WINDOW)
      .unwrap_or(false);

    if should_skip {
      continue;
    }

    debounce_guard.insert(relative_path.clone(), now);
    normalized_paths.push(relative_path);
  }

  if normalized_paths.is_empty() {
    return;
  }

  let _ = app.emit(
    WATCH_EVENT_NAME,
    WorkspaceFileChangedEvent {
      root_path: root_path.to_string(),
      paths: normalized_paths,
    },
  );
}

fn should_emit_event(kind: &EventKind) -> bool {
  matches!(
    kind,
    EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_) | EventKind::Any
  )
}

fn normalize_relative_path(root: &Path, path: &Path) -> Result<String, String> {
  path
    .strip_prefix(root)
    .map(|segment| segment.to_string_lossy().replace('\\', "/"))
    .map_err(|error| error.to_string())
}

fn should_track_path(path: &Path) -> bool {
  path.is_dir() || !path.exists() || is_supported_text_file(path)
}

fn is_supported_text_file(path: &Path) -> bool {
  path
    .extension()
    .and_then(|extension| extension.to_str())
    .map(|extension| {
      matches!(
        extension.to_ascii_lowercase().as_str(),
        "md" | "markdown" | "txt"
      )
    })
    .unwrap_or(false)
}

#[cfg(test)]
mod tests {
  use super::should_track_path;
  use std::{env, fs, path::{Path, PathBuf}, time::{SystemTime, UNIX_EPOCH}};

  struct TestDir {
    path: PathBuf,
  }

  impl TestDir {
    fn new(prefix: &str) -> Self {
      let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("valid time")
        .as_nanos();
      let path = env::temp_dir().join(format!("iory-watch-{prefix}-{stamp}"));
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
  fn tracks_removed_directory_paths_even_after_deletion() {
    let dir = TestDir::new("removed-dir");
    let removed = dir.path().join("chapter");
    fs::create_dir_all(&removed).expect("create child dir");
    fs::remove_dir_all(&removed).expect("remove child dir");

    assert!(should_track_path(&removed));
  }

  #[test]
  fn ignores_existing_unsupported_files() {
    let dir = TestDir::new("unsupported-file");
    let file = dir.path().join("image.png");
    fs::write(&file, "png").expect("write file");

    assert!(!should_track_path(&file));
  }
}
