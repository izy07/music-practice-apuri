# アイコン生成ガイド

音符アイコンのSVGファイルを作成しました。以下の手順でPNG形式のアイコンを生成してください。

## 作成されたSVGファイル

1. `assets/images/icon-note.svg` - 基本的な音符アイコン
2. `assets/images/icon-note-simple.svg` - シンプルなデザイン
3. `assets/images/icon-note-modern.svg` - モダンなデザイン（推奨）

## PNG変換方法

### 方法1: オンラインツールを使用
1. [CloudConvert](https://cloudconvert.com/svg-to-png) または [Convertio](https://convertio.co/svg-png/) にアクセス
2. `icon-note-modern.svg` をアップロード
3. サイズ: 1024x1024 ピクセル
4. 背景: 透明（必要に応じて）
5. PNG形式でダウンロード
6. `assets/images/icon.png` として保存

### 方法2: ImageMagickを使用（コマンドライン）
```bash
cd music-practice
convert -background none -resize 1024x1024 assets/images/icon-note-modern.svg assets/images/icon.png
```

### 方法3: Inkscapeを使用
```bash
inkscape --export-type=png --export-width=1024 --export-height=1024 assets/images/icon-note-modern.svg --export-filename=assets/images/icon.png
```

### 方法4: Node.jsスクリプト（sharpを使用）
```bash
npm install sharp --save-dev
```

その後、以下のスクリプトを実行：
```javascript
const sharp = require('sharp');
sharp('assets/images/icon-note-modern.svg')
  .resize(1024, 1024)
  .png()
  .toFile('assets/images/icon.png')
  .then(() => console.log('アイコン生成完了'))
  .catch(err => console.error('エラー:', err));
```

## ファビコンの生成

同じSVGからファビコンも生成できます：
```bash
# 32x32 サイズのファビコン
convert -background none -resize 32x32 assets/images/icon-note-modern.svg assets/images/favicon.png
```

## 推奨サイズ

- **icon.png**: 1024x1024 ピクセル（アプリアイコン用）
- **favicon.png**: 32x32 または 64x64 ピクセル（Web用）

## 注意事項

- iOSとAndroidでは、アイコンの角が自動的に丸く処理されます
- 背景色は `#1976D2`（青）を使用しています
- 音符は白色（`#FFFFFF`）で表示されます

