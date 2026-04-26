# IORY IME spike checklist

## Purpose

この文書は Phase 1 の textarea スパイク検証用メモである。

目的は以下。

- Windows + WebView2 上で日本語 IME が実用になるか確認する
- CodeMirror 6 へ進んでよいか判断する
- 問題が出た場合に、どの条件で再現するか記録する

---

## Environment

- App: IORY Phase 1 textarea spike
- Runtime: Tauri v2
- WebView: WebView2
- Platform: Windows
- Input methods tested:
  - [ ] Microsoft IME
  - [ ] Google Japanese Input / Mozc など別 IME

---

## Manual checklist

### Basic typing

- [ ] ひらがなを連続入力できる
- [ ] カタカナ変換が自然にできる
- [ ] 漢字変換候補が正しく出る
- [ ] 確定後に文字が欠けたり二重入力にならない

### Composition behavior

- [ ] composition start / end 中にテキストが乱れない
- [ ] 変換中 Enter がアプリショートカットとして誤爆しない
- [ ] 変換中 Esc で候補操作が自然に行える
- [ ] 矢印キーで候補選択しても textarea 側のカーソルが壊れない

### Editing behavior

- [ ] 改行が期待どおりに入る
- [ ] Backspace / Delete が変換中と確定後で不自然に壊れない
- [ ] コピー / ペースト後も IME が壊れない
- [ ] 長文入力でも体感遅延が目立たない

### Window and fullscreen behavior

- [ ] 起動直後から IME 入力できる
- [ ] フルスクリーン切替後も入力できる
- [ ] ウィンドウ再フォーカス後も IME 状態が壊れない
- [ ] プログラム制御のタイトルバードラッグ後も、textarea を選び直さず入力再開できる
- [ ] candidate window の位置が極端にずれない
- [ ] タイトルバー右端の最小化 / 最大化 / 閉じるが期待どおり動く

### Packaged build

- [ ] `tauri dev` で問題ない
- [ ] packaged build でも問題ない

---

## Result summary

- Overall result:
  - [ ] Pass
  - [ ] Pass with caveats
  - [ ] Fail

- Notes:

```text
ここに再現条件、使った IME、問題が起きたキー操作、フルスクリーン時の挙動などを書く。
```

---

## Gate to proceed

以下をすべて満たしたら CodeMirror 6 実装へ進む。

- 基本入力、変換、確定、改行が安定
- composition 中 Enter 誤爆なし
- フルスクリーン後も挙動が安定
- packaged build でも再現しない

満たさない場合は、Phase 2 以降へ進まず WebView2 / event handling / fullscreen 周辺の対策を先に行う。
