use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadTextFileResult {
  pub text: String,
  pub encoding: String,
  pub bom: Option<String>,
  pub had_decoding_errors: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextFileMetadata {
  pub modified_at_ms: u128,
  pub file_size: u64,
}
