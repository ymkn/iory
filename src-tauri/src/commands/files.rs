use std::{
  fs,
  io::Write,
  path::{Component, Path, PathBuf},
  time::UNIX_EPOCH,
};

use chardetng::EncodingDetector;
use encoding_rs::{Encoding, UTF_16BE, UTF_16LE, UTF_8};
use tauri::command;

use crate::models::files::{ReadTextFileResult, TextFileMetadata};

fn ensure_supported_text_path(path: &Path) -> Result<(), String> {
  let extension = path.extension().and_then(|value| value.to_str());

  if matches!(extension, Some("md") | Some("markdown") | Some("txt")) {
    return Ok(());
  }

  Err("Only .md, .markdown, and .txt files are supported right now".to_string())
}

#[command]
pub fn read_text_file(path: String) -> Result<ReadTextFileResult, String> {
  let file_path = PathBuf::from(&path);

  if !file_path.exists() {
    return Err("Selected file does not exist".to_string());
  }

  if !file_path.is_file() {
    return Err("Selected path is not a file".to_string());
  }

  ensure_supported_text_path(&file_path)?;

  let bytes = fs::read(&file_path).map_err(|error| error.to_string())?;

  Ok(decode_text_file(&bytes))
}

#[command]
pub fn get_text_file_metadata(path: String) -> Result<TextFileMetadata, String> {
  let file_path = PathBuf::from(&path);

  if !file_path.exists() {
    return Err("Selected file does not exist".to_string());
  }

  if !file_path.is_file() {
    return Err("Selected path is not a file".to_string());
  }

  ensure_supported_text_path(&file_path)?;

  let metadata = fs::metadata(&file_path).map_err(|error| error.to_string())?;
  let modified_at_ms = metadata
    .modified()
    .map_err(|error| error.to_string())?
    .duration_since(UNIX_EPOCH)
    .map_err(|error| error.to_string())?
    .as_millis();

  Ok(TextFileMetadata {
    modified_at_ms,
    file_size: metadata.len(),
  })
}

#[command]
pub fn write_text_file(path: String, contents: String, encoding: Option<String>, bom: Option<String>) -> Result<(), String> {
  let file_path = PathBuf::from(&path);

  if !file_path.exists() {
    return Err("Target file does not exist".to_string());
  }

  if !file_path.is_file() {
    return Err("Target path is not a file".to_string());
  }

  ensure_supported_text_path(&file_path)?;

  let encoding = resolve_encoding(encoding.as_deref())?;
  let mut bytes = encode_text(&contents, encoding)?;

  if let Some(prefix) = bom_bytes(bom.as_deref()) {
    let mut with_bom = prefix.to_vec();
    with_bom.extend(bytes);
    bytes = with_bom;
  }

  let mut file = fs::OpenOptions::new()
    .write(true)
    .truncate(true)
    .open(&file_path)
    .map_err(|error| error.to_string())?;

  file
    .write_all(&bytes)
    .map_err(|error| error.to_string())?;
  file.flush().map_err(|error| error.to_string())?;

  Ok(())
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

#[command]
pub fn create_text_file(root_path: String, relative_path: String) -> Result<String, String> {
  let root = PathBuf::from(&root_path);

  if !root.exists() {
    return Err("Selected workspace does not exist".to_string());
  }

  if !root.is_dir() {
    return Err("Selected workspace is not a directory".to_string());
  }

  if relative_path.trim().is_empty() {
    return Err("新規ファイル名を入力してください。".to_string());
  }

  let target = resolve_workspace_relative_path(&root, &relative_path)?;

  ensure_supported_text_path(&target)?;

  if target.exists() {
    return Err("同名ファイルがすでに存在します。".to_string());
  }

  if let Some(parent) = target.parent() {
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
  }

  fs::write(&target, []).map_err(|error| error.to_string())?;

  Ok(target.to_string_lossy().to_string())
}

#[command]
pub fn create_folder(root_path: String, relative_path: String) -> Result<String, String> {
  let root = PathBuf::from(&root_path);

  if !root.exists() {
    return Err("Selected workspace does not exist".to_string());
  }

  if !root.is_dir() {
    return Err("Selected workspace is not a directory".to_string());
  }

  if relative_path.trim().is_empty() {
    return Err("新規フォルダ名を入力してください。".to_string());
  }

  let target = resolve_workspace_relative_path(&root, &relative_path)?;

  if target.exists() {
    return Err("同名フォルダまたはファイルがすでに存在します。".to_string());
  }

  fs::create_dir_all(&target).map_err(|error| error.to_string())?;

  Ok(target.to_string_lossy().to_string())
}

#[command]
pub fn rename_workspace_entry(root_path: String, from_relative_path: String, to_relative_path: String) -> Result<String, String> {
  let root = PathBuf::from(&root_path);

  if !root.exists() {
    return Err("Selected workspace does not exist".to_string());
  }

  if !root.is_dir() {
    return Err("Selected workspace is not a directory".to_string());
  }

  if from_relative_path.trim().is_empty() || to_relative_path.trim().is_empty() {
    return Err("新しいファイル名を入力してください。".to_string());
  }

  let source = resolve_workspace_relative_path(&root, &from_relative_path)?;
  let target = resolve_workspace_relative_path(&root, &to_relative_path)?;

  if !source.exists() {
    return Err("対象ファイルが見つかりません。".to_string());
  }

  if !source.is_file() {
    return Err("現在はファイルのみリネームできます。".to_string());
  }

  ensure_supported_text_path(&source)?;
  ensure_supported_text_path(&target)?;

  if source == target {
    return Ok(source.to_string_lossy().to_string());
  }

  if target.exists() {
    return Err("同名ファイルがすでに存在します。".to_string());
  }

  fs::rename(&source, &target).map_err(|error| error.to_string())?;

  Ok(target.to_string_lossy().to_string())
}

#[command]
pub fn delete_workspace_entry(root_path: String, relative_path: String) -> Result<(), String> {
  let root = PathBuf::from(&root_path);

  if !root.exists() {
    return Err("Selected workspace does not exist".to_string());
  }

  if !root.is_dir() {
    return Err("Selected workspace is not a directory".to_string());
  }

  if relative_path.trim().is_empty() {
    return Err("削除するファイルを選択してください。".to_string());
  }

  let target = resolve_workspace_relative_path(&root, &relative_path)?;

  if !target.exists() {
    return Err("対象ファイルが見つかりません。".to_string());
  }

  if !target.is_file() {
    return Err("現在はファイルのみ削除できます。".to_string());
  }

  ensure_supported_text_path(&target)?;

  fs::remove_file(&target).map_err(|error| error.to_string())?;

  Ok(())
}

fn resolve_workspace_relative_path(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
  let mut resolved = PathBuf::from(root);

  for component in Path::new(relative_path).components() {
    match component {
      Component::Normal(segment) => resolved.push(segment),
      Component::CurDir => {}
      Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
        return Err("Workspace の外には作成できません。".to_string());
      }
    }
  }

  Ok(resolved)
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

fn resolve_encoding(label: Option<&str>) -> Result<&'static Encoding, String> {
  let normalized = label.unwrap_or("utf-8");

  Encoding::for_label(normalized.as_bytes())
    .ok_or_else(|| format!("Unsupported encoding: {normalized}"))
}

fn encode_text(contents: &str, encoding: &'static Encoding) -> Result<Vec<u8>, String> {
  let (encoded, _, had_errors) = encoding.encode(contents);

  if had_errors {
    return Err(format!("現在の本文は {} へ安全に保存できません。", normalize_encoding_label(encoding)));
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

fn normalize_encoding_label(encoding: &'static Encoding) -> String {
  encoding.name().to_ascii_lowercase()
}

#[cfg(test)]
mod tests {
  use super::{create_empty_text_file, create_text_file, delete_workspace_entry, rename_workspace_entry};
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
  fn create_text_file_creates_missing_parent_directories() {
    let dir = TestDir::new("create-file");

    let created = create_text_file(
      dir.path().to_string_lossy().to_string(),
      "chapters/scene-01.md".to_string(),
    )
    .expect("create file");

    assert!(Path::new(&created).exists());
    assert!(dir.path().join("chapters").is_dir());
  }

  #[test]
  fn create_empty_text_file_creates_absolute_file() {
    let dir = TestDir::new("create-empty-file");
    let target = dir.path().join("draft.txt");

    create_empty_text_file(target.to_string_lossy().to_string()).expect("create empty file");

    assert!(target.exists());
  }

  #[test]
  fn create_text_file_rejects_workspace_escape() {
    let dir = TestDir::new("create-file-escape");

    let error = create_text_file(
      dir.path().to_string_lossy().to_string(),
      "../outside.md".to_string(),
    )
    .expect_err("should reject parent traversal");

    assert_eq!(error, "Workspace の外には作成できません。");
  }

  #[test]
  fn rename_workspace_entry_renames_file() {
    let dir = TestDir::new("rename-file");
    let original = dir.path().join("scene.md");
    fs::write(&original, "hello").expect("write file");

    let renamed = rename_workspace_entry(
      dir.path().to_string_lossy().to_string(),
      "scene.md".to_string(),
      "scene-renamed.md".to_string(),
    )
    .expect("rename file");

    assert!(!original.exists());
    assert!(Path::new(&renamed).exists());
  }

  #[test]
  fn delete_workspace_entry_removes_file() {
    let dir = TestDir::new("delete-file");
    let original = dir.path().join("scene.md");
    fs::write(&original, "hello").expect("write file");

    delete_workspace_entry(
      dir.path().to_string_lossy().to_string(),
      "scene.md".to_string(),
    )
    .expect("delete file");

    assert!(!original.exists());
  }
}
