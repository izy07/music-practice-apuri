# アプリ全体のコード複雑度分析レポート

## 📊 基本統計

- **総コード量**: 63,419行（136ファイル）
- **平均ファイルサイズ**: 約466行/ファイル
- **推奨サイズ**: 500行以下

## 🔴 最も複雑なファイル（要分割）

| ファイル | 行数 | 問題点 | 優先度 |
|---------|------|--------|--------|
| `app/(tabs)/goals.tsx` | **3,696行** | 巨大すぎる。複数の責務を持つ | 🔴 最高 |
| `app/(tabs)/basic-practice.tsx` | **2,599行** | 巨大。分割が必要 | 🔴 高 |
| `app/(tabs)/tuner.tsx` | **2,508行** | 巨大。分割が必要 | 🔴 高 |
| `app/(tabs)/beginner-guide.tsx` | **2,356行** | 巨大。分割が必要 | 🔴 高 |
| `app/(tabs)/profile-settings.tsx` | **2,159行** | 大きい。分割推奨 | 🟡 中 |
| `app/(tabs)/index.tsx` | **1,947行** | 大きい。分割推奨 | 🟡 中 |
| `hooks/useAuthAdvanced.ts` | **1,822行** | 複雑すぎる。既に新しい`authService.ts`を作成済み | 🔴 高 |
| `app/(tabs)/main-settings.tsx` | **1,812行** | 大きい。分割推奨 | 🟡 中 |

## ⚠️ 依存関係の問題

### 1. **InstrumentThemeContext の過剰な依存（54ファイル）**

**問題点:**
- 54ファイル（全136ファイルの約40%）が`InstrumentThemeContext`に依存
- 単一のコンテキストに依存しすぎており、変更時の影響範囲が大きい
- テーマ情報が不要な画面でも依存している可能性がある

**影響:**
- `InstrumentThemeContext`を変更すると、54ファイルに影響
- テストが困難
- パフォーマンスへの影響（不必要な再レンダリング）

**推奨対応:**
- テーマ情報が不要な画面では使用しない
- テーマ情報を必要な箇所のみに制限
- より軽量なテーマフックの作成を検討

### 2. **supabase の直接インポート（58ファイル）**

**問題点:**
- 58ファイル（全136ファイルの約43%）が`supabase`を直接インポート
- データベースロジックが分散
- 抽象化レイヤーが不十分

**影響:**
- データベースクエリの変更が困難
- エラーハンドリングが一貫性がない
- テストが困難（モックが困難）

**推奨対応:**
- リポジトリパターンの徹底（既に`repositories/`ディレクトリがあるが、使用率が低い）
- 全てのデータベースアクセスをリポジトリ経由にする
- `supabase`の直接インポートを禁止する（lintルール）

### 3. **useAuthAdvanced の依存（18ファイル）**

**問題点:**
- 18ファイルが`useAuthAdvanced`を使用
- `useAuthAdvanced.ts`が1,822行と巨大で複雑すぎる
- 26個のReact Hooks（useEffect, useState, useCallback）を使用

**影響:**
- 認証ロジックの変更が困難
- バグが発生しやすい
- テストが困難

**現在の対応:**
- ✅ 新しい`authService.ts`（約200行）を作成済み
- ✅ 新しい`useAuthSimple.ts`（約260行）を作成済み
- ⚠️ まだ18ファイルが古い`useAuthAdvanced`を使用中

**推奨対応:**
- 段階的に`useAuthAdvanced`から`useAuthSimple`に移行
- `_layout.tsx`からも`useAuthAdvanced`を削除

## 🔄 循環依存の可能性

### 潜在的な循環依存

1. **`_layout.tsx` ↔ `useAuthAdvanced.ts`**
   - `_layout.tsx`が`useAuthAdvanced`を使用
   - `useAuthAdvanced`が`_layout.tsx`のルーティングロジックに依存している可能性

2. **`InstrumentThemeContext.tsx` ↔ `useAuthAdvanced.ts`**
   - `InstrumentThemeContext`が認証状態に依存
   - `useAuthAdvanced`が楽器選択状態を参照

3. **複数の画面 ↔ `supabase`**
   - 多くの画面が直接`supabase`をインポート
   - 共通のデータアクセスパターンがない

## 📈 React Hooks の使用状況（複雑度指標）

### 最も多くのHooksを使用しているファイル

1. **`hooks/useAuthAdvanced.ts`**: 26個のHooks
   - `useEffect`: 複数
   - `useState`: 複数
   - `useCallback`: 複数
   - `useRef`: 複数

2. **`components/InstrumentThemeContext.tsx`**: 13個のHooks
   - 状態管理が複雑

3. **`app/_layout.tsx`**: 7個のHooks
   - ルーティングロジックが複雑

## 🎯 主な問題点のまとめ

### 1. **単一責任の原則違反**
- `goals.tsx`（3,696行）: 目標管理、目標曲管理、憧れの演奏管理、カレンダー表示など、複数の責務を持つ
- `useAuthAdvanced.ts`（1,822行）: 認証、プロフィール管理、楽器選択状態管理、セッション管理など、複数の責務を持つ

### 2. **依存関係の過剰**
- `InstrumentThemeContext`: 54ファイル（40%）
- `supabase`: 58ファイル（43%）
- 単一のモジュールに依存しすぎている

### 3. **抽象化レイヤーの不足**
- データベースアクセスが直接行われている
- 共通のエラーハンドリングがない
- テストが困難

### 4. **重複コード**
- 複数のファイルで同じパターンのデータベースアクセス
- エラーハンドリングが分散

## 🛠️ 推奨される改善策

### Priority 1: 巨大ファイルの分割（緊急）

1. **`goals.tsx`（3,696行）の分割**
   ```
   app/(tabs)/goals/
     ├── index.tsx (250行)
     ├── hooks/
     │   ├── useGoals.ts ✅ 既存
     │   ├── useTargetSong.ts
     │   └── useInspirationalPerformances.ts
     ├── components/
     │   ├── PersonalGoalsSection.tsx
     │   ├── TargetSongSection.tsx
     │   └── InspirationalSection.tsx
     └── styles.ts
   ```

2. **`useAuthAdvanced.ts`（1,822行）の置き換え**
   - ✅ `authService.ts`（200行）と`useAuthSimple.ts`（260行）を作成済み
   - ⚠️ 18ファイルを段階的に移行

### Priority 2: 依存関係の削減（重要）

1. **InstrumentThemeContext の使用を削減**
   - テーマ情報が不要な画面では使用しない
   - 必要な箇所のみに限定

2. **supabase の直接インポートを禁止**
   - リポジトリパターンを徹底
   - ESLintルールで直接インポートを禁止

3. **useAuthAdvanced から useAuthSimple への移行**
   - 新規コードは`useAuthSimple`を使用
   - 既存コードを段階的に移行

### Priority 3: 抽象化レイヤーの追加（重要）

1. **リポジトリパターンの徹底**
   - 全てのデータベースアクセスをリポジトリ経由にする
   - `repositories/`ディレクトリの活用

2. **共通エラーハンドリング**
   - 統一されたエラーハンドリングサービス
   - エラーログの一元化

## 📊 複雑度スコア

| カテゴリ | スコア | 評価 |
|---------|--------|------|
| ファイルサイズ | 7.5/10 | 🔴 高（多くのファイルが500行を超える） |
| 依存関係 | 8.0/10 | 🔴 高（単一モジュールへの依存が過剰） |
| 循環依存 | 6.0/10 | 🟡 中（潜在的な循環依存あり） |
| 抽象化 | 5.0/10 | 🔴 低（直接インポートが多い） |
| テスト容易性 | 4.0/10 | 🔴 低（巨大ファイルでテスト困難） |
| **総合** | **6.1/10** | 🟡 **中程度（改善が必要）** |

## 🎯 即座に実施すべき対応

1. **`goals.tsx`の分割**（Priority 1）
   - 最も大きなファイル（3,696行）
   - 複数の責務を持つ

2. **`useAuthAdvanced`の段階的置き換え**（Priority 1）
   - 新しい`useAuthSimple`への移行
   - `_layout.tsx`から始める

3. **`supabase`直接インポートの削減**（Priority 2）
   - リポジトリパターンの徹底
   - ESLintルールの追加

4. **`InstrumentThemeContext`依存の削減**（Priority 2）
   - 不要な依存の削除
   - テーマ情報が不要な画面での使用を避ける

