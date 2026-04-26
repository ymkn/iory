use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct AppSettings {
  pub version: u32,
  pub theme_id: String,
  pub background_mode: String,
  pub show_background_image: bool,
  pub ui_font_family: String,
  pub editor_font_family: String,
  pub count_mode: String,
  pub font_size: u32,
  pub line_height: f32,
  pub editor_width: u32,
  pub show_stats: bool,
  pub default_new_file_extension: String,
  pub autosave_interval_ms: u32,
  pub checkpoint_interval_ms: u32,
}

impl Default for AppSettings {
  fn default() -> Self {
    Self {
      version: 1,
      theme_id: "night-blue".to_string(),
      background_mode: "soft".to_string(),
      show_background_image: true,
      ui_font_family: "Inter, \"Noto Sans JP\", system-ui, sans-serif".to_string(),
      editor_font_family: "Inter, \"Noto Sans JP\", system-ui, sans-serif".to_string(),
      count_mode: "characters".to_string(),
      font_size: 22,
      line_height: 2.0,
      editor_width: 820,
      show_stats: true,
      default_new_file_extension: "md".to_string(),
      autosave_interval_ms: 1000,
      checkpoint_interval_ms: 300000,
    }
  }
}
