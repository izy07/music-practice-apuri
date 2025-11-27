#!/bin/bash

# 非推奨のshadow*プロパティをboxShadowに変換するスクリプト

echo "🔧 shadow*プロパティをboxShadowに変換中..."

# 各ファイルを処理
files=(
  "app/auth/signup.tsx"
  "app/(tabs)/share.tsx"
  "app/(tabs)/instrument-selection.tsx"
  "app/(tabs)/main-settings.tsx"
  "app/components/QuickRecordModal.tsx"
  "app/components/PostureCameraModal.tsx"
  "app/auth/reset-password.tsx"
  "components/QuickRecordModal.tsx"
  "app/(tabs)/timer.tsx"
  "app/(tabs)/profile-settings.tsx"
  "app/(tabs)/support.tsx"
  "app/(tabs)/privacy-settings.tsx"
  "components/UserFeedback.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 処理中: $file"
    
    # shadowColor, shadowOffset, shadowOpacity, shadowRadiusをboxShadowに変換
    # パターン: shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2
    # 結果: boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)'
    
    # 一時ファイルを作成
    temp_file=$(mktemp)
    
    # 複数行のshadowプロパティを検出して変換
    awk '
    BEGIN { 
      in_shadow_block = 0
      shadow_color = ""
      shadow_offset_x = 0
      shadow_offset_y = 0
      shadow_opacity = 0
      shadow_radius = 0
    }
    
    /shadowColor:/ {
      in_shadow_block = 1
      match($0, /shadowColor:\s*['\''"]([^'\''"]*)['\''"]/, arr)
      shadow_color = arr[1]
      next
    }
    
    /shadowOffset:/ {
      if (in_shadow_block) {
        match($0, /width:\s*([0-9-]+)/, arr)
        shadow_offset_x = arr[1]
        match($0, /height:\s*([0-9-]+)/, arr)
        shadow_offset_y = arr[1]
        next
      }
    }
    
    /shadowOpacity:/ {
      if (in_shadow_block) {
        match($0, /shadowOpacity:\s*([0-9.]+)/, arr)
        shadow_opacity = arr[1]
        next
      }
    }
    
    /shadowRadius:/ {
      if (in_shadow_block) {
        match($0, /shadowRadius:\s*([0-9.]+)/, arr)
        shadow_radius = arr[1]
        # boxShadowを生成
        if (shadow_color == "#000" || shadow_color == "#000000") {
          printf "    boxShadow: '\''%dpx %dpx %dpx rgba(0, 0, 0, %.2f)'\''\n", shadow_offset_x, shadow_offset_y, shadow_radius, shadow_opacity
        } else {
          printf "    boxShadow: '\''%dpx %dpx %dpx %s'\''\n", shadow_offset_x, shadow_offset_y, shadow_radius, shadow_color
        }
        in_shadow_block = 0
        next
      }
    }
    
    {
      if (in_shadow_block) {
        print $0
      } else {
        print $0
      }
    }
    ' "$file" > "$temp_file"
    
    # 一時ファイルを元のファイルに移動
    mv "$temp_file" "$file"
    
    echo "✅ 完了: $file"
  else
    echo "⚠️  ファイルが見つかりません: $file"
  fi
done

echo "🎉 すべてのshadow*プロパティの変換が完了しました！"
