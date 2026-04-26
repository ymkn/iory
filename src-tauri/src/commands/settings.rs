use std::{fs, path::PathBuf};

use tauri::{AppHandle, Manager};

use crate::models::settings::AppSettings;

const SETTINGS_FILE_NAME: &str = "settings.json";

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Result<AppSettings, String> {
  let settings_path = resolve_settings_path(&app)?;

  if !settings_path.exists() {
    return Ok(AppSettings::default());
  }

  let contents = fs::read_to_string(&settings_path).map_err(|error| error.to_string())?;
  serde_json::from_str::<AppSettings>(&contents)
    .map(normalize_settings)
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettings) -> Result<AppSettings, String> {
  let settings_path = resolve_settings_path(&app)?;
  let settings = normalize_settings(settings);

  if let Some(parent) = settings_path.parent() {
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
  }

  let contents = serde_json::to_string_pretty(&settings).map_err(|error| error.to_string())?;
  fs::write(&settings_path, contents).map_err(|error| error.to_string())?;

  Ok(settings)
}

fn resolve_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
  let directory = resolve_app_config_dir(app)?;

  Ok(directory.join(SETTINGS_FILE_NAME))
}

fn resolve_app_config_dir(app: &AppHandle) -> Result<PathBuf, String> {
  app
    .path()
    .app_config_dir()
    .map_err(|error| error.to_string())
}

fn normalize_settings(mut settings: AppSettings) -> AppSettings {
  // Backward compatibility for older local settings written before User CSS was removed.
  if settings.theme_id == "user-custom" {
    settings.theme_id = "night-blue".to_string();
  }

  settings
}
