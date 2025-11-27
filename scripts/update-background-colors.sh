#!/bin/bash

# 共通スタイルのインポートを追加し、ハードコードされた背景色を置換するスクリプト

echo "Updating background colors to use common styles..."

# 対象ファイルのリスト
files=(
  "app/(tabs)/main-settings.tsx"
  "app/(tabs)/statistics.tsx"
  "app/(tabs)/goals.tsx"
  "app/(tabs)/timer.tsx"
  "app/(tabs)/profile-settings.tsx"
  "app/(tabs)/notification-settings.tsx"
  "app/(tabs)/instrument-selection.tsx"
  "app/(tabs)/tuner.tsx"
  "app/(tabs)/note-training.tsx"
  "app/(tabs)/my-library.tsx"
  "app/(tabs)/music-dictionary.tsx"
  "app/(tabs)/pricing-plans.tsx"
  "app/(tabs)/share.tsx"
  "app/(tabs)/recordings-library.tsx"
  "app/(tabs)/inspirational-performances.tsx"
  "app/(tabs)/language-settings.tsx"
  "app/(tabs)/room.tsx"
  "app/(tabs)/score-auto-scroll.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # インポート文を追加（既に存在しない場合）
    if ! grep -q "import { COMMON_STYLES }" "$file"; then
      sed -i '' '/import.*from.*@\/lib\/dateUtils/a\
import { COMMON_STYLES } from '\''@/lib/appStyles'\'';
' "$file"
    fi
    
    # ハードコードされた背景色を置換
    sed -i '' 's/{ backgroundColor: '\''#FEFEFE'\'' }/COMMON_STYLES.container/g' "$file"
    sed -i '' 's/{ backgroundColor: '\''#FFFFFF'\'' }/COMMON_STYLES.surface/g' "$file"
    
    echo "Updated $file"
  else
    echo "File $file not found, skipping..."
  fi
done

echo "Background color update completed!"
