use serde::{Deserialize, Serialize};

pub const FILE_HISTORY_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileHistorySelectionRange {
  pub anchor: usize,
  pub head: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileHistoryEditorSnapshot {
  pub selection: Vec<FileHistorySelectionRange>,
  pub main_index: usize,
  pub scroll_top: f64,
  pub scroll_left: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileHistoryEntry {
  pub id: String,
  pub file_path: String,
  pub saved_at_ms: u128,
  pub reason: String,
  pub text: String,
  pub encoding: String,
  pub bom: Option<String>,
  pub modified_at_ms: u128,
  pub file_size: u64,
  pub editor_snapshot: Option<FileHistoryEditorSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendFileHistoryEntryInput {
  pub file_path: String,
  pub reason: String,
  pub text: String,
  pub encoding: String,
  pub bom: Option<String>,
  pub modified_at_ms: u128,
  pub file_size: u64,
  pub editor_snapshot: Option<FileHistoryEditorSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileHistoryDocument {
  pub version: u32,
  pub file_path: String,
  pub entries: Vec<FileHistoryEntry>,
}

impl FileHistoryDocument {
  pub fn empty(file_path: String) -> Self {
    Self {
      version: FILE_HISTORY_VERSION,
      file_path,
      entries: Vec::new(),
    }
  }
}
