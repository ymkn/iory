# IORY implementation tasks

## 1. この文書の役割
- ここには「今後の実装判断に意味がある残タスク」だけを書く。
- 既に終わった bootstrap や古い workspace-first 計画は残さない。
- タスクの優先順位は常に、保存安全性 → Windows 実機品質 → UI 一貫性 → 追加機能 の順で考える。

## 2. 直近の優先タスク

### A. 単一ファイル化後の整理
- [ ] 旧 workspace / watcher 前提の不要コードを安全に削減する
- [ ] 単一ファイル方針と矛盾する内部用語や古い導線を整理する
- [ ] 履歴 / recent files / restore last file を中心にした実態へ依存関係を揃える

### B. packaged QA の実施
- [ ] packaged build で、起動 → splash → 前回ファイル復帰 → 編集 → 保存 → restore まで通す
- [ ] Windows で txt ↔ md 切替時のフリーズ再発がないことを確認する
- [ ] titlebar drag / fullscreen / IME / focus mode が崩れないことを確認する

### C. 履歴 UX の継続改善
- [ ] checkpoint timeline の密度と可読性を、説明を増やさず整える
- [ ] restore / manual checkpoint の意味が UI 上で十分伝わるかを見直す
- [ ] 最近のファイル導線を軽量なまま維持できているか確認する

### D. 通知 UX の継続改善
- [ ] 成功通知・警告・エラーの表示寿命と文言の一貫性を整える
- [ ] 「静かな通知」の方針を壊す新規メッセージが入り込んでいないか確認する

## 3. 中期タスク

### A. 保存まわりの堅牢化
- [ ] packaged build を前提に atomic save / conflict / manual checkpoint の実地確認を増やす
- [ ] 例外経路でも timeline と保存状態表示が破綻しないかを洗う

### B. パフォーマンスと配布品質
- [ ] `vite build` の大きい chunk warning への対応方針を決める
- [ ] 初回起動、空状態、エディタ表示までの体感速度を測る

### C. 設定 UX の見直し
- [ ] 設定項目の密度を保ちつつ、説明過多になっていないか確認する
- [ ] 書き手にとって本当に効く設定だけを残す方向で整理する

## 4. 後回しにするもの
- LLM 本実装
- BGM / 環境音
- project / workspace 管理への回帰
- 派手な dashboard 的 UI
- 本文より前に出る補助機能

## 5. Done の考え方
- 「動く」だけでなく、「静かで壊れにくく、書く邪魔をしない」状態を done とみなす。
- UI 変更は、装飾が増えていないことまで確認して完了とする。
- 保存や履歴の変更は、成功時だけでなく conflict / restore / dialog 中断まで含めて考える。
