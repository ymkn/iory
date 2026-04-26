use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceNode {
  pub name: String,
  pub path: String,
  pub relative_path: String,
  pub kind: WorkspaceNodeKind,
  pub children: Option<Vec<WorkspaceNode>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum WorkspaceNodeKind {
  File,
  Directory,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceScanResult {
  pub root_path: String,
  pub name: String,
  pub nodes: Vec<WorkspaceNode>,
}
