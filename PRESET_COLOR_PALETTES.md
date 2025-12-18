# プリセットカラーパレット設定

このファイルには、アプリで使用されるプリセットカラーパレットの色設定が含まれています。

## プリセットパレット一覧

### 1. ダーク (dark)
```json
{
  "background": "#1E1E1E",
  "surface": "#2C2C2E",
  "primary": "#0A84FF",
  "secondary": "#3A3A3C",
  "accent": "#5AC8FA",
  "text": "#FFFFFF",
  "textSecondary": "#B0B0B5"
}
```

### 2. クラシック (classic)
```json
{
  "background": "#F5F5F5",
  "surface": "#FFFFFF",
  "primary": "#4A5568",
  "secondary": "#E2E8F0",
  "accent": "#2D3748",
  "text": "#1A202C",
  "textSecondary": "#718096"
}
```

### 3. ブルー (blue)
```json
{
  "background": "#E3F2FD",
  "surface": "#FFFFFF",
  "primary": "#2196F3",
  "secondary": "#BBDEFB",
  "accent": "#1976D2",
  "text": "#0D47A1",
  "textSecondary": "#1565C0"
}
```

### 4. グリーン (green)
```json
{
  "background": "#E8F5E9",
  "surface": "#FFFFFF",
  "primary": "#4CAF50",
  "secondary": "#C8E6C9",
  "accent": "#388E3C",
  "text": "#1B5E20",
  "textSecondary": "#2E7D32"
}
```

### 5. レッド (red)
```json
{
  "background": "#FFEBEE",
  "surface": "#FFFFFF",
  "primary": "#F44336",
  "secondary": "#FFCDD2",
  "accent": "#D32F2F",
  "text": "#B71C1C",
  "textSecondary": "#C62828"
}
```

### 6. パープル (purple)
```json
{
  "background": "#F3E5F5",
  "surface": "#FFFFFF",
  "primary": "#9C27B0",
  "secondary": "#E1BEE7",
  "accent": "#7B1FA2",
  "text": "#4A148C",
  "textSecondary": "#6A1B9A"
}
```

### 7. ミッドナイト (midnight)
```json
{
  "background": "#2A1F2A",
  "surface": "#3A2F3A",
  "primary": "#9D4EDD",
  "secondary": "#4A3F4A",
  "accent": "#7B2CBF",
  "text": "#F3E6F3",
  "textSecondary": "#C4B9C4"
}
```

### 8. ターコイズ (turquoise)
```json
{
  "background": "#E0F7FA",
  "surface": "#FFFFFF",
  "primary": "#00ACC1",
  "secondary": "#80DEEA",
  "accent": "#00838F",
  "text": "#006064",
  "textSecondary": "#00838F"
}
```

### 9. サンセット (sunset)
```json
{
  "background": "#FFF3E0",
  "surface": "#FFFFFF",
  "primary": "#FF9800",
  "secondary": "#FFE0B2",
  "accent": "#F57C00",
  "text": "#E65100",
  "textSecondary": "#F57C00"
}
```

### 10. フォレスト (forest)
```json
{
  "background": "#E8F5E9",
  "surface": "#FFFFFF",
  "primary": "#2E7D32",
  "secondary": "#C8E6C9",
  "accent": "#1B5E20",
  "text": "#1B5E20",
  "textSecondary": "#388E3C"
}
```

### 11. オーシャン (ocean)
```json
{
  "background": "#E1F5FE",
  "surface": "#FFFFFF",
  "primary": "#0277BD",
  "secondary": "#B3E5FC",
  "accent": "#01579B",
  "text": "#01579B",
  "textSecondary": "#0277BD"
}
```

### 12. ローズ (rose)
```json
{
  "background": "#FCE4EC",
  "surface": "#FFFFFF",
  "primary": "#C2185B",
  "secondary": "#F8BBD0",
  "accent": "#880E4F",
  "text": "#880E4F",
  "textSecondary": "#AD1457"
}
```

## 使用方法

これらのカラーパレットは `components/main-settings/AppearanceSettings.tsx` で定義されています。

新しいパレットを追加する場合は、以下の構造に従ってください：

```typescript
{
  id: 'palette_id',      // ユニークなID
  name: 'パレット名',    // 日本語表示名
  colors: {
    background: '#XXXXXX',      // 背景色
    surface: '#XXXXXX',         // サーフェス色（カード背景など）
    primary: '#XXXXXX',         // プライマリ色（主要なボタンなど）
    secondary: '#XXXXXX',       // セカンダリ色（枠線など）
    accent: '#XXXXXX',          // アクセント色
    text: '#XXXXXX',            // メインテキスト色
    textSecondary: '#XXXXXX'    // サブテキスト色
  }
}
```

## 更新履歴

- 2025-01-XX: 初版作成
- プリセットパレットの定義を文書化

