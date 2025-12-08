# 機能フロー分析レポート #15: 外観設定フロー

## 概要
プリセットカラーパレットの選択、カスタムテーマの保存・読み込み、楽器の自動テーマへのリセット、カラー変更の即座反映の各フローを詳細に分析し、余分な工程や潜在的なバグを特定する。

## 1. プリセットパレット選択フロー

### ユーザー操作の流れ
1. 外観設定画面でプリセットパレットを選択
2. パレットが適用され、テーマが更新される
3. 成功メッセージが表示される

### データの流れ (`components/main-settings/AppearanceSettings.tsx:358-365`)
```
[プリセットパレット選択]
  ↓
handlePresetSelect(palette)
  ├─ newTheme = { ...customColors, ...palette.colors }
  ├─ setCustomColors(newTheme)
  ├─ setUseCustomTheme(true)
  ├─ setSelectedPresetId(palette.id)
  ├─ setCustomTheme(newTheme) - AsyncStorageに保存
  └─ Alert.alert() - 成功メッセージ
```

### 問題点・余分な工程

特に大きな問題は見当たらない。

## 2. カスタムテーマ保存フロー

### ユーザー操作の流れ
1. カスタムカラーを変更
2. 「カスタムテーマを保存」ボタンをクリック
3. テーマが保存され、成功メッセージが表示される

### データの流れ (`components/main-settings/AppearanceSettings.tsx:367-372`)
```
[保存ボタンクリック]
  ↓
handleSaveCustomTheme()
  ├─ setCustomTheme(customColors) - AsyncStorageに保存
  ├─ setUseCustomTheme(true)
  ├─ setSelectedPresetId(null)
  └─ Alert.alert() - 成功メッセージ
```

### 問題点

特に大きな問題は見当たらない。

## 3. カラー変更の即座反映フロー

### データの流れ (`components/main-settings/AppearanceSettings.tsx:511-582`)
```
[カラーピッカーの「変更」ボタンクリック]
  ↓
Alert.alert('カラーピッカー', 'カラーピッカー機能は準備中です')
  └─ 現在は未実装
```

### 問題点

#### 🟡 問題1: カラーピッカー機能が未実装
**場所**: `components/main-settings/AppearanceSettings.tsx:36`
```typescript
Alert.alert('カラーピッカー', 'カラーピッカー機能は準備中です');
```

**問題**: 
- カラーピッカー機能が実装されていない
- ユーザーがカスタムカラーを直接変更できない

**改善提案**: 
- カラーピッカー機能を実装
- または、機能を非表示にする

#### 🟡 問題2: カラー変更時の即座反映
**場所**: `components/main-settings/AppearanceSettings.tsx:511-582`
- カラーピッカーの`onColorChange`で`setCustomTheme`を呼び出しているが、実際には機能していない（カラーピッカーが未実装）

**評価**: 
- カラーピッカーが実装されれば、即座に反映される仕組みは用意されている

## 4. 楽器の自動テーマへのリセットフロー

### データの流れ (`components/main-settings/AppearanceSettings.tsx:374-378`)
```
[リセットボタンクリック]
  ↓
handleResetTheme()
  ├─ setUseCustomTheme(false)
  ├─ resetToInstrumentTheme() - AsyncStorageからカスタムテーマを削除
  └─ Alert.alert() - 成功メッセージ
```

### データの流れ（InstrumentThemeContext） (`components/InstrumentThemeContext.tsx:797-821`)
```
resetToInstrumentTheme()
  ├─ setCustomThemeState(null)
  ├─ setIsCustomTheme(false)
  ├─ AsyncStorage.removeItem(customTheme)
  ├─ AsyncStorage.setItem(isCustomTheme, 'false')
  └─ 楽器のテーマを設定
     └─ selectedInstrumentから取得
```

### 問題点

特に大きな問題は見当たらない。

## 5. カスタムテーマ読み込みフロー

### データの流れ (`components/InstrumentThemeContext.tsx`)
```
コンポーネント初期化時
  ↓
AsyncStorageから読み込み
  ├─ customTheme
  ├─ isCustomTheme
  └─ selectedInstrument
  ↓
currentTheme計算
  ├─ isCustomTheme = true → customThemeを使用
  └─ isCustomTheme = false → 楽器のテーマを使用
```

### 問題点

特に大きな問題は見当たらない。

## 6. プリセットパレットデータ

### データソース (`components/main-settings/AppearanceSettings.tsx:57-344`)
- プリセットパレットがコード内にハードコードされている
- 14種類のプリセットパレットが定義されている

### 問題点

#### 🟡 問題1: プリセットパレットのハードコード
**場所**: `components/main-settings/AppearanceSettings.tsx:57-344`
- プリセットパレットがコード内にハードコードされている
- 追加や変更の際にコード修正が必要

**改善提案**: 
- データベースまたは設定ファイルに保存
- または、設定ファイルに分離

## 7. カラーピッカーコンポーネント

### 現状
- `ColorPicker`コンポーネントが定義されているが、カラーピッカー機能は未実装
- クリックすると「カラーピッカー機能は準備中です」というアラートが表示される

### 問題点

#### 🟡 問題1: カラーピッカー機能の未実装
**場所**: `components/main-settings/AppearanceSettings.tsx:28-44`
- カラーピッカー機能が実装されていない
- ユーザーがカスタムカラーを直接変更できない

**改善提案**: 
- カラーピッカー機能を実装（react-native-color-pickerなど）
- または、機能を非表示にする

## 8. 余分なファイル・重複コード

### 重複している処理

特に大きな重複は見当たらない。

## 9. 潜在的なバグ

### バグ1: カラーピッカー機能の未実装
- カラーピッカー機能が実装されていない
- カスタムカラーを変更できない

## 10. 改善提案まとめ

### 優先度: 高
1. **カラーピッカー機能の実装**: カスタムカラーを変更できるようにする
2. **プリセットパレットの外部化**: データベースまたは設定ファイルに保存

### 優先度: 低
3. **コード整理**: 未使用のコードやコメントの整理

## 11. フロー図（テキストベース）

### プリセットパレット選択フロー
```
[プリセットパレット選択]
  ↓
[handlePresetSelect()]
  ├─ newTheme作成
  ├─ setCustomColors()
  ├─ setUseCustomTheme(true)
  ├─ setSelectedPresetId()
  ├─ setCustomTheme() - AsyncStorageに保存
  └─ 成功メッセージ表示
```

### カスタムテーマ保存フロー
```
[保存ボタンクリック]
  ↓
[handleSaveCustomTheme()]
  ├─ setCustomTheme() - AsyncStorageに保存
  ├─ setUseCustomTheme(true)
  └─ 成功メッセージ表示
```

### リセットフロー
```
[リセットボタンクリック]
  ↓
[handleResetTheme()]
  ├─ setUseCustomTheme(false)
  ├─ resetToInstrumentTheme()
  │  ├─ AsyncStorageからカスタムテーマを削除
  │  └─ 楽器のテーマを設定
  └─ 成功メッセージ表示
```

## 12. 結論

外観設定フローは機能しているが、以下の改善が必要：
- カラーピッカー機能の実装（最重要）
- プリセットパレットの外部化

これらの改善により、ユーザーがカスタムカラーを自由に変更でき、プリセットパレットの管理が容易になる。

