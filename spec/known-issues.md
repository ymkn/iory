# IORY known issues

## Current status
- 現時点で、MVP を止める致命的不具合は確認していない。

## Non-blocking issues

### 1. Frontend chunk size warning
- 症状: `vite build` 時に `WritingEditor` を含む chunk が size warning を出す
- 影響: build 自体は成功するが、配布品質にはまだ改善余地がある
- 現状判断: いまは blocker ではない

### 2. 単一ファイル化後の内部整理不足
- 症状: 旧 workspace 前提の名残がコードベースに残っている可能性がある
- 影響: 現行 UX の blocker ではないが、今後の判断を濁らせやすい
- 現状判断: 挙動を壊さない形で段階的に整理する

## Verification gaps
- 最新の packaged build で、単一ファイル導線・manual checkpoint・restore・splash を通した総合確認はまだ継続中
- Windows / IME / fullscreen / titlebar drag を含む最新 UI の実機確認は、継続して重視する
