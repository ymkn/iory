use std::{
  collections::hash_map::DefaultHasher,
  fs,
  hash::{Hash, Hasher},
  path::PathBuf,
  time::{SystemTime, UNIX_EPOCH},
};

use tauri::{AppHandle, Manager};

use crate::models::history::{AppendFileHistoryEntryInput, FileHistoryDocument, FileHistoryEntry};

const HISTORY_DIRECTORY_NAME: &str = "history";

#[tauri::command]
pub fn load_file_history(app: AppHandle, path: String) -> Result<FileHistoryDocument, String> {
  load_history_document(&app, &path)
}

#[tauri::command]
pub fn append_file_history_entry(app: AppHandle, entry: AppendFileHistoryEntryInput) -> Result<FileHistoryEntry, String> {
  let mut document = load_history_document(&app, &entry.file_path)?;
  let saved_at_ms = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map_err(|error| error.to_string())?
    .as_millis();

  let history_entry = FileHistoryEntry {
    id: format!("{}-{}", saved_at_ms, document.entries.len()),
    file_path: entry.file_path.clone(),
    saved_at_ms,
    reason: entry.reason,
    text: entry.text,
    encoding: entry.encoding,
    bom: entry.bom,
    modified_at_ms: entry.modified_at_ms,
    file_size: entry.file_size,
    editor_snapshot: entry.editor_snapshot,
  };

  document.entries.push(history_entry.clone());
  save_history_document(&app, &document)?;

  Ok(history_entry)
}

#[tauri::command]
pub fn truncate_file_history_after(app: AppHandle, path: String, entry_id: String) -> Result<FileHistoryDocument, String> {
  let mut document = load_history_document(&app, &path)?;
  let entry_index = document
    .entries
    .iter()
    .position(|entry| entry.id == entry_id)
    .ok_or_else(|| "History entry was not found.".to_string())?;

  document.entries.truncate(entry_index + 1);
  save_history_document(&app, &document)?;

  Ok(document)
}

fn load_history_document(app: &AppHandle, file_path: &str) -> Result<FileHistoryDocument, String> {
  let history_path = resolve_history_path(app, file_path)?;

  if !history_path.exists() {
    return Ok(FileHistoryDocument::empty(file_path.to_string()));
  }

  let contents = fs::read_to_string(&history_path).map_err(|error| error.to_string())?;
  let document = serde_json::from_str::<FileHistoryDocument>(&contents).map_err(|error| error.to_string())?;

  if document.file_path != file_path {
    return Ok(FileHistoryDocument::empty(file_path.to_string()));
  }

  Ok(document)
}

fn save_history_document(app: &AppHandle, document: &FileHistoryDocument) -> Result<(), String> {
  let history_path = resolve_history_path(app, &document.file_path)?;

  if let Some(parent) = history_path.parent() {
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
  }

  let contents = serde_json::to_string_pretty(document).map_err(|error| error.to_string())?;
  fs::write(&history_path, contents).map_err(|error| error.to_string())
}

fn resolve_history_path(app: &AppHandle, file_path: &str) -> Result<PathBuf, String> {
  let app_config_dir = app
    .path()
    .app_config_dir()
    .map_err(|error| error.to_string())?;

  Ok(app_config_dir.join(HISTORY_DIRECTORY_NAME).join(format!("{}.json", hash_file_path(file_path))))
}

fn hash_file_path(file_path: &str) -> String {
  let mut hasher = DefaultHasher::new();
  file_path.hash(&mut hasher);
  format!("{:016x}", hasher.finish())
}

#[cfg(test)]
mod tests {
  use super::hash_file_path;

  #[test]
  fn hashes_same_path_consistently() {
    assert_eq!(hash_file_path("C:/drafts/chapter-1.md"), hash_file_path("C:/drafts/chapter-1.md"));
  }
}
