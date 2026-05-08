use encoding_rs::Encoding;

pub fn resolve_encoding(label: Option<&str>) -> Result<&'static Encoding, String> {
  let normalized = label.unwrap_or("utf-8");

  Encoding::for_label(normalized.as_bytes())
    .ok_or_else(|| format!("Unsupported encoding: {normalized}"))
}

pub fn encode_text(contents: &str, encoding: &'static Encoding) -> Result<Vec<u8>, String> {
  let (encoded, _, had_errors) = encoding.encode(contents);

  if had_errors {
    return Err(format!(
      "現在の本文は {} へ安全に保存できません。",
      encoding.name().to_ascii_lowercase()
    ));
  }

  Ok(encoded.into_owned())
}

pub fn bom_bytes(label: Option<&str>) -> Option<&'static [u8]> {
  match label {
    Some("utf-8") => Some(&[0xEF, 0xBB, 0xBF]),
    Some("utf-16le") => Some(&[0xFF, 0xFE]),
    Some("utf-16be") => Some(&[0xFE, 0xFF]),
    _ => None,
  }
}
