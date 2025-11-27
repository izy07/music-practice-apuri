# Phase 2 実装計画（現状調整版）

## 現状分析の結果

プロジェクトはレビュー時点よりシンプルな構造であることが判明。

### 確認された問題

1. **Supabase直接インポート**: `basic-practice.tsx`で4箇所使用
   - `supabase.auth.getUser()`を4箇所で使用

2. **不足しているファイル/ディレクトリ**:
   - リポジトリ層: 存在しない（新規作成が必要）
   - サービス層: 存在しない可能性（確認が必要）
   - logger.ts: 存在確認が必要
   - errorHandler.ts: 存在確認が必要

## Phase 2 実装計画（調整版）

### 2.1 Supabase直接インポートの削減

**現状**: `basic-practice.tsx`で4箇所の`supabase.auth.getUser()`使用

**実装ステップ**:

1. **ユーザーリポジトリの作成**:
   - `app/lib/userRepository.ts`を作成
   - `getCurrentUser()`メソッドを実装

2. **basic-practice.tsxの修正**:
   - `supabase.auth.getUser()`を`userRepository.getCurrentUser()`に置き換え
   - 4箇所すべてを修正

**成果物**:
- `app/lib/userRepository.ts`
- 修正後の`basic-practice.tsx`

### 2.2 リポジトリ層の基本構造作成

**目的**: 将来的な拡張に備えて基本構造を作成

**実装ステップ**:

1. `app/lib/repositories/`ディレクトリを作成
2. 基本インターフェースを定義（将来的に使用）
3. `userRepository.ts`を配置

### 2.3 型定義の整理

**目的**: 型安全性の向上

**実装ステップ**:

1. `app/types/`ディレクトリの活用
2. `basic-practice.tsx`の型定義を`types/`に移動
3. 共通型定義の整理

## 優先順位

1. **最優先**: `basic-practice.tsx`のSupabase直接インポート削減
2. **次**: リポジトリ層の基本構造作成
3. **その後**: 型定義の整理

## 実装開始

まず、`basic-practice.tsx`のSupabase直接インポートを削減します。

