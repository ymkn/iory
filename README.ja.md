# IORY - 禅の庵、作家の隠れ家

[English](./README.md) | 日本語

<p align="center">
<img src="./img/title.png" width="300">
</p>

IORY：禅の「庵」のような、静かでミニマルな執筆の隠れ家をつくるデスクトップアプリ。雑念のないテキストキャンバスで、純粋に書くことへ集中できます。

**[Web デモを試す →](https://ymkn.github.io/iory/)**

## スクリーンショットとテーマ

<p align="center">
<a href="./img/screenshot-night-blue.png"><img src="./img/screenshot-night-blue.png" width="400"></a>
<a href="./img/screenshot-snow.png"><img src="./img/screenshot-snow.png" width="400"></a>
<br>
<a href="./img/screenshot-warm-paper.png"><img src="./img/screenshot-warm-paper.png" width="400"></a>
<a href="./img/screenshot-ash.png"><img src="./img/screenshot-ash.png" width="400"></a>
</p>

## フルスクリーン集中モード

UI を消して、文字だけに向き合えます。

<p align="center">
<a href="./img/fullscreen-focus.png"><img src="./img/fullscreen-focus.png" width="800"></a>
</p>

## Web デモについて

IORY には、ブラウザで軽く試せる **GitHub Pages 向けの限定 Web デモ** もあります。

- **正式版はデスクトップアプリ**です。
- **Web デモはあくまで試用向け**で、機能を意図的に絞っています。
- Web デモでは本文は **ブラウザ内の IndexedDB** に autosave されます。
- 入力中の内容を **ローカルファイルへ直接保存することはしません**。
- ディスク上のファイルが欲しいときは、**Download ボタン**から明示的に書き出してください。
- ブラウザの保存領域は消える可能性があるため、大事な執筆の本番用途には **インストール版を推奨**します。

ローカルファイルを直接編集する本来の IORY、より強い保存安全性、そして意図した執筆 UX を使うならデスクトップ版を使ってください。

## できること

- **単一ファイルに集中**  
  `New File` / `Open File` / `Recent files` を起点に、いま開いている 1 ファイルへ自然に集中できます。

- **ローカルファイルをそのまま編集**  
  本文の主データは常にディスク上のファイルです。アプリ独自の形式に閉じ込めず、そのまま書き続けられます。

- **autosave が標準**  
  保存を意識し続けなくても、書いた内容をこまめに保存します。

- **Ctrl+S で明示チェックポイント**  
  明示保存時には local checkpoint を残せるので、「この時点を残したい」ができます。

- **checkpoint timeline から復元**  
  一定間隔で作られたスナップショットをたどって、過去の状態へ戻せます。

- **テーマ切り替え**  
  Night Blue / Snow / Ash / Warm Paper を切り替え可能です。

- **執筆向けの細かな調整**  
  フォント、行間、本文幅、カウント方式、背景表現、checkpoint 間隔を調整できます。

## こんな人に向いています

- 作品管理より、まず本文を書きたい
- 小説、原稿、アイディアを 1 ファイルずつ静かに書きたい
- autosave と履歴で、書いたものを失いにくくしたい

## ローカル履歴について

checkpoint と復元用のローカル履歴は、クラウドではなく端末内のアプリ設定ディレクトリに保存されます。本文保護のためのローカル機能であり、外部同期や共有を前提としたものではありません。

Web デモでは、これに相当する履歴もブラウザ内だけに保存されます。
