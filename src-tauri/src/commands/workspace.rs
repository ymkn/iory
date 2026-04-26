use std::{
  fs,
  path::{Component, Path, PathBuf},
};

use tauri::command;

use crate::models::workspace::{WorkspaceNode, WorkspaceNodeKind, WorkspaceScanResult};

const SUPPORTED_EXTENSIONS: &[&str] = &["md", "markdown", "txt"];

#[command]
pub fn scan_workspace(root_path: String) -> Result<WorkspaceScanResult, String> {
  let root = PathBuf::from(&root_path);

  if !root.exists() {
    return Err("Selected workspace does not exist".to_string());
  }

  if !root.is_dir() {
    return Err("Selected workspace is not a directory".to_string());
  }

  let name = root
    .file_name()
    .map(|segment| segment.to_string_lossy().to_string())
    .unwrap_or_else(|| root_path.clone());

  let nodes = scan_directory(&root, &root)?;

  Ok(WorkspaceScanResult {
    root_path,
    name,
    nodes,
  })
}

#[command]
pub fn scan_workspace_children(root_path: String, relative_path: Option<String>) -> Result<Vec<WorkspaceNode>, String> {
  let root = PathBuf::from(&root_path);

  if !root.exists() {
    return Err("Selected workspace does not exist".to_string());
  }

  if !root.is_dir() {
    return Err("Selected workspace is not a directory".to_string());
  }

  let target = match relative_path {
    Some(path) if !path.is_empty() => resolve_workspace_relative_path(&root, &path)?,
    _ => root.clone(),
  };

  if !target.exists() {
    return Err("Requested directory does not exist".to_string());
  }

  if !target.is_dir() {
    return Err("Requested path is not a directory".to_string());
  }

  scan_directory_shallow(&root, &target)
}

fn scan_directory(root: &Path, current: &Path) -> Result<Vec<WorkspaceNode>, String> {
  let mut nodes = Vec::new();

  let entries = fs::read_dir(current).map_err(|error| error.to_string())?;

  for entry in entries {
    let entry = entry.map_err(|error| error.to_string())?;
    let path = entry.path();
    let metadata = entry.metadata().map_err(|error| error.to_string())?;
    let name = entry.file_name().to_string_lossy().to_string();

    if name.starts_with('.') {
      continue;
    }

    if metadata.is_dir() {
      let children = scan_directory(root, &path)?;

      nodes.push(WorkspaceNode {
        name,
        path: path.to_string_lossy().to_string(),
        relative_path: relative_path(root, &path)?,
        kind: WorkspaceNodeKind::Directory,
        children: Some(children),
      });

      continue;
    }

    if !is_supported_text_file(&path) {
      continue;
    }

    nodes.push(WorkspaceNode {
      name,
      path: path.to_string_lossy().to_string(),
      relative_path: relative_path(root, &path)?,
      kind: WorkspaceNodeKind::File,
      children: None,
    });
  }

  nodes.sort_by(|left, right| match (&left.kind, &right.kind) {
    (WorkspaceNodeKind::Directory, WorkspaceNodeKind::File) => std::cmp::Ordering::Less,
    (WorkspaceNodeKind::File, WorkspaceNodeKind::Directory) => std::cmp::Ordering::Greater,
    _ => left.name.to_lowercase().cmp(&right.name.to_lowercase()),
  });

  Ok(nodes)
}

fn scan_directory_shallow(root: &Path, current: &Path) -> Result<Vec<WorkspaceNode>, String> {
  let mut nodes = Vec::new();

  let entries = fs::read_dir(current).map_err(|error| error.to_string())?;

  for entry in entries {
    let entry = entry.map_err(|error| error.to_string())?;
    let path = entry.path();
    let metadata = entry.metadata().map_err(|error| error.to_string())?;
    let name = entry.file_name().to_string_lossy().to_string();

    if name.starts_with('.') {
      continue;
    }

    if metadata.is_dir() {
      nodes.push(WorkspaceNode {
        name,
        path: path.to_string_lossy().to_string(),
        relative_path: relative_path(root, &path)?,
        kind: WorkspaceNodeKind::Directory,
        children: None,
      });

      continue;
    }

    if !is_supported_text_file(&path) {
      continue;
    }

    nodes.push(WorkspaceNode {
      name,
      path: path.to_string_lossy().to_string(),
      relative_path: relative_path(root, &path)?,
      kind: WorkspaceNodeKind::File,
      children: None,
    });
  }

  nodes.sort_by(|left, right| match (&left.kind, &right.kind) {
    (WorkspaceNodeKind::Directory, WorkspaceNodeKind::File) => std::cmp::Ordering::Less,
    (WorkspaceNodeKind::File, WorkspaceNodeKind::Directory) => std::cmp::Ordering::Greater,
    _ => left.name.to_lowercase().cmp(&right.name.to_lowercase()),
  });

  Ok(nodes)
}

fn relative_path(root: &Path, path: &Path) -> Result<String, String> {
  path
    .strip_prefix(root)
    .map(|segment| segment.to_string_lossy().replace('\\', "/"))
    .map_err(|error| error.to_string())
}

fn resolve_workspace_relative_path(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
  let mut resolved = PathBuf::from(root);

  for component in Path::new(relative_path).components() {
    match component {
      Component::Normal(segment) => resolved.push(segment),
      Component::CurDir => {}
      Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
        return Err("Requested path escapes the workspace".to_string());
      }
    }
  }

  Ok(resolved)
}

fn is_supported_text_file(path: &Path) -> bool {
  path
    .extension()
    .and_then(|extension| extension.to_str())
    .map(|extension| SUPPORTED_EXTENSIONS.iter().any(|supported| extension.eq_ignore_ascii_case(supported)))
    .unwrap_or(false)
}

#[cfg(test)]
mod tests {
  use super::{scan_workspace, scan_workspace_children};
  use std::{
    env,
    fs,
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
  fn scan_workspace_filters_hidden_and_unsupported_entries() {
    let dir = TestDir::new("workspace-scan");
    fs::write(dir.path().join("draft.md"), "hello").expect("write markdown");
    fs::write(dir.path().join("notes.txt"), "world").expect("write text");
    fs::write(dir.path().join("image.png"), "binary").expect("write png");
    fs::write(dir.path().join(".secret.md"), "hidden").expect("write hidden");
    fs::create_dir_all(dir.path().join("chapters")).expect("create dir");
    fs::write(dir.path().join("chapters").join("01.md"), "chapter").expect("write chapter");
    fs::create_dir_all(dir.path().join("empty")).expect("create empty dir");

    let result = scan_workspace(dir.path().to_string_lossy().to_string()).expect("scan workspace");

    assert_eq!(result.nodes.len(), 4);
    assert_eq!(result.nodes[0].name, "chapters");
    assert_eq!(result.nodes[1].name, "empty");
    assert_eq!(result.nodes[2].name, "draft.md");
    assert_eq!(result.nodes[3].name, "notes.txt");
    assert_eq!(result.nodes[0].children.as_ref().expect("children").len(), 1);
    assert_eq!(result.nodes[1].children.as_ref().expect("children").len(), 0);
  }

  #[test]
  fn scan_workspace_children_rejects_workspace_escape() {
    let dir = TestDir::new("workspace-escape");

    let error = scan_workspace_children(
      dir.path().to_string_lossy().to_string(),
      Some("../outside".to_string()),
    )
    .expect_err("should reject parent traversal");

    assert_eq!(error, "Requested path escapes the workspace");
  }
}
