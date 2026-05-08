mod commands {
  mod atomic_replace;
  pub mod files;
  pub mod history;
  pub mod save;
  pub mod settings;
  mod text_encoding;
}

mod models {
  pub mod files;
  pub mod history;
  pub mod settings;
}

#[cfg(windows)]
fn notify_webview_parent_position_changed(window: &tauri::Window) {
  use tauri::{Manager, WebviewWindow};

  let Some(webview_window): Option<WebviewWindow> =
    window.app_handle().get_webview_window(window.label())
  else {
    return;
  };

  let _ = webview_window.with_webview(|webview| unsafe {
    let _ = webview.controller().NotifyParentWindowPositionChanged();
  });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .on_window_event(|window, event| {
      #[cfg(windows)]
      match event {
        tauri::WindowEvent::Resized(_) | tauri::WindowEvent::ScaleFactorChanged { .. } => {
          notify_webview_parent_position_changed(window);
        }
        _ => {}
      }
    })
    .invoke_handler(tauri::generate_handler![
      commands::files::read_text_file,
      commands::files::get_text_file_metadata,
      commands::files::create_empty_text_file,
      commands::history::load_file_history,
      commands::history::append_file_history_entry,
      commands::history::truncate_file_history_after,
      commands::save::save_document_atomic,
      commands::settings::load_settings,
      commands::settings::save_settings
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
