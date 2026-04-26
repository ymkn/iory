# IORY manual QA checklist

## 前提
- QA は packaged build を優先する
- 中間生成物の exe を packaged QA の代表として扱わない
- Windows + 日本語 IME を基準に確認する

## 1. 起動と復帰
- [ ] splash が表示され、空状態と同じロゴ言語で揃っている
- [ ] splash や空状態が border / heavy box に寄っていない
- [ ] アプリが自然に起動する
- [ ] 前回開いていたファイルが自然に復元される
- [ ] recent files から再開できる

## 2. 単一ファイル基本導線
- [ ] titlebar の `New File` / `Open File` が動く
- [ ] 空状態からも `New File` / `Open File` が動く
- [ ] `.md` / `.markdown` / `.txt` を開ける
- [ ] txt → md / md → txt の切替で固まらない
- [ ] current file を閉じてもアプリが壊れない

## 3. 編集と保存
- [ ] 日本語 IME で入力、変換、確定、改行が自然に動く
- [ ] Undo / Redo / Cut / Copy / Paste が壊れない
- [ ] autosave が自然に働く
- [ ] blur 時の保存が不自然に競合しない
- [ ] Ctrl+S で保存できる
- [ ] Ctrl+S 後、checkpoint timeline に明示 checkpoint が増える（重複時を除く）

## 4. checkpoint timeline
- [ ] 右ペインにのみ表示される
- [ ] timestamp / 差分行数が静かに読める
- [ ] bold や border で過剰に強調されていない
- [ ] 定期 checkpoint は変更がある時だけ増える
- [ ] restore preview が開く
- [ ] restore 実行で本文が巻き戻る
- [ ] restore 後、以後の local history が切り捨てられる
- [ ] restore 完了通知はしばらくして消える

## 5. document / recent files / current
- [ ] 左ペインが `current → document → recent files` の順になっている
- [ ] document はラベルと値が上下に分かれている
- [ ] 値は自分の行の中だけ右揃えになっている
- [ ] 長い時刻や値がラベルと衝突しない
- [ ] current / recent files が過度に装飾されていない

## 6. 通知と conflict
- [ ] 上部メッセージが box 的に主張しない
- [ ] 成功 / 情報通知は自動で消える
- [ ] save error は残って分かる
- [ ] conflict は残って分かる
- [ ] clean 状態の外部変更は安全に再読込される
- [ ] dirty 状態の外部変更は conflict として止まる

## 7. focus / fullscreen / titlebar
- [ ] focus mode で見た目が破綻しない
- [ ] fullscreen 切替後も IME が壊れない
- [ ] titlebar drag 後も入力へ自然に戻れる
- [ ] overlay の開閉で入力フォーカスが不自然に失われない

## 8. 結果メモ
- [ ] Pass
- [ ] Pass with caveats
- [ ] Fail

```text
ここに使用 IME、再現条件、違和感、UI ノイズ、保存まわりの不安点を書く。
```
