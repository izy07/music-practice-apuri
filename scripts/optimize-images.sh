#!/bin/bash
# 画像アセットをWebP形式に変換するスクリプト

set -e

ASSETS_DIR="assets/images"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "画像アセットの最適化を開始します..."

# WebP変換ツールの確認
if command -v cwebp &> /dev/null; then
    CONVERTER="cwebp"
    echo "cwebpが見つかりました"
elif command -v convert &> /dev/null; then
    CONVERTER="convert"
    echo "ImageMagickが見つかりました"
else
    echo "警告: WebP変換ツール（cwebpまたはImageMagick）が見つかりません"
    echo "以下のいずれかをインストールしてください:"
    echo "  - macOS: brew install webp"
    echo "  - Ubuntu: sudo apt-get install webp"
    echo "  - ImageMagick: brew install imagemagick"
    exit 1
fi

# icon.pngの変換
if [ -f "$ASSETS_DIR/icon.png" ]; then
    echo "icon.pngを変換中..."
    if [ "$CONVERTER" = "cwebp" ]; then
        cwebp -q 85 "$ASSETS_DIR/icon.png" -o "$ASSETS_DIR/icon.webp"
    else
        convert "$ASSETS_DIR/icon.png" -quality 85 "$ASSETS_DIR/icon.webp"
    fi
    echo "✓ icon.webpを作成しました"
    
    # 元のPNGファイルのサイズとWebPファイルのサイズを比較
    PNG_SIZE=$(stat -f%z "$ASSETS_DIR/icon.png" 2>/dev/null || stat -c%s "$ASSETS_DIR/icon.png" 2>/dev/null)
    WEBP_SIZE=$(stat -f%z "$ASSETS_DIR/icon.webp" 2>/dev/null || stat -c%s "$ASSETS_DIR/icon.webp" 2>/dev/null)
    if [ -n "$PNG_SIZE" ] && [ -n "$WEBP_SIZE" ]; then
        REDUCTION=$(echo "scale=1; ($PNG_SIZE - $WEBP_SIZE) * 100 / $PNG_SIZE" | bc)
        echo "  サイズ削減: ${REDUCTION}% (${PNG_SIZE} bytes → ${WEBP_SIZE} bytes)"
    fi
else
    echo "警告: $ASSETS_DIR/icon.pngが見つかりません"
fi

# favicon.pngの変換
if [ -f "$ASSETS_DIR/favicon.png" ]; then
    echo "favicon.pngを変換中..."
    if [ "$CONVERTER" = "cwebp" ]; then
        cwebp -q 85 "$ASSETS_DIR/favicon.png" -o "$ASSETS_DIR/favicon.webp"
    else
        convert "$ASSETS_DIR/favicon.png" -quality 85 "$ASSETS_DIR/favicon.webp"
    fi
    echo "✓ favicon.webpを作成しました"
    
    # 元のPNGファイルのサイズとWebPファイルのサイズを比較
    PNG_SIZE=$(stat -f%z "$ASSETS_DIR/favicon.png" 2>/dev/null || stat -c%s "$ASSETS_DIR/favicon.png" 2>/dev/null)
    WEBP_SIZE=$(stat -f%z "$ASSETS_DIR/favicon.webp" 2>/dev/null || stat -c%s "$ASSETS_DIR/favicon.webp" 2>/dev/null)
    if [ -n "$PNG_SIZE" ] && [ -n "$WEBP_SIZE" ]; then
        REDUCTION=$(echo "scale=1; ($PNG_SIZE - $WEBP_SIZE) * 100 / $PNG_SIZE" | bc)
        echo "  サイズ削減: ${REDUCTION}% (${PNG_SIZE} bytes → ${WEBP_SIZE} bytes)"
    fi
else
    echo "警告: $ASSETS_DIR/favicon.pngが見つかりません"
fi

echo ""
echo "画像アセットの最適化が完了しました！"
echo ""
echo "注意: app.config.tsとweb/index.htmlでWebP形式への参照を更新する必要があります。"

