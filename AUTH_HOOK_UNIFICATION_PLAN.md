# 認証フック統一計画

## 📋 現状分析

### 認証フックの使用状況

| フック | 使用箇所 | 状態 |
|--------|---------|------|
| `useAuthAdvanced` | 13ファイル | ✅ 標準化推奨 |
| `useAuthSimple` | 1ファイル（`app/_layout.tsx`） | ⚠️ 移行が必要 |
| `useAuth` | 0ファイル | ❌ 削除対象 |

### 使用箇所の詳細

#### `useAuthAdvanced` (13ファイル)
- `app/(tabs)/instrument-selection.tsx`
- `app/(tabs)/share.tsx`
- `app/(tabs)/profile-settings.tsx`
- `lib/tabs/basic-practice/components/PracticeDetailModal.tsx`
- `app/(tabs)/basic-practice/index.tsx`
- `app/(tabs)/timer.tsx`
- `app/auth/callback.tsx`
- `app/auth/login.tsx`
- `app/(tabs)/statistics.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/_layout.tsx`
- `app/organization-settings.tsx`

#### `useAuthSimple` (1ファイル)
- `app/_layout.tsx` - **ルートレイアウト（重要）**

#### `useAuth` (0ファイル)
- 使用されていない（古い実装）

---

## 🎯 統一目標

1. **`useAuthAdvanced`を標準化** - 全ての認証処理で使用
2. **`useAuthSimple`を`useAuthAdvanced`に統合** - `app/_layout.tsx`を移行
3. **`useAuth`を削除** - 古い実装を削除
4. **認証状態管理を一元化** - グローバル状態の統一

---

## 📝 実装計画

### フェーズ1: `app/_layout.tsx`の移行（優先度: 高）

**目的**: `useAuthSimple`を`useAuthAdvanced`に置き換え

**変更内容**:
```typescript
// Before
import { useAuthSimple } from '@/hooks/useAuthSimple';
const { isAuthenticated, isLoading, isInitialized, ... } = useAuthSimple();

// After
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
const { isAuthenticated, isLoading, isInitialized, ... } = useAuthAdvanced();
```

**注意点**:
- `useAuthSimple`と`useAuthAdvanced`のAPIはほぼ互換
- `signOut`の戻り値が異なる（`Promise<boolean>` vs `Promise<void>`）
- `useIdleTimeout`のラッパー関数はそのまま使用可能

**影響範囲**:
- `app/_layout.tsx`のみ
- 他のファイルへの影響なし

**テスト項目**:
- [ ] アプリ起動時の認証状態確認
- [ ] ログイン/ログアウトの動作確認
- [ ] アイドルタイムアウトの動作確認
- [ ] 画面遷移の動作確認

---

### フェーズ2: `useAuth`の削除（優先度: 中）

**目的**: 古い実装を削除してコードベースをクリーンに

**変更内容**:
1. `hooks/useAuth.ts`を削除
2. ドキュメントから`useAuth`の参照を削除
3. 型定義の重複を確認

**注意点**:
- 現在使用されていないため、削除は安全
- 念のため、削除前に使用箇所を再確認

**影響範囲**:
- なし（既に使用されていない）

---

### フェーズ3: 型定義の統一（優先度: 低）

**目的**: 認証関連の型定義を統一

**変更内容**:
- `useAuthAdvanced`の型定義を標準化
- 必要に応じて`types/`ディレクトリに型定義を移動

**注意点**:
- 既存の型定義との互換性を維持
- 段階的に移行

---

## 🔍 詳細な比較

### API比較

| 機能 | `useAuthSimple` | `useAuthAdvanced` | 互換性 |
|------|----------------|-------------------|--------|
| `isAuthenticated` | ✅ | ✅ | ✅ 互換 |
| `isLoading` | ✅ | ✅ | ✅ 互換 |
| `isInitialized` | ✅ | ✅ | ✅ 互換 |
| `user` | ✅ | ✅ | ✅ 互換 |
| `signIn` | ✅ | ✅ | ✅ 互換 |
| `signUp` | ✅ | ✅ | ✅ 互換 |
| `signOut` | `Promise<boolean>` | `Promise<void>` | ⚠️ 戻り値が異なる |
| `hasInstrumentSelected` | ✅ | ✅ | ✅ 互換 |
| `needsTutorial` | ✅ | ✅ | ✅ 互換 |
| `canAccessMainApp` | ✅ | ✅ | ✅ 互換 |

### 機能比較

| 機能 | `useAuthSimple` | `useAuthAdvanced` |
|------|----------------|-------------------|
| グローバル状態管理 | ❌ | ✅ |
| ローカルストレージ永続化 | ✅ | ✅ |
| セッション自動復元 | ✅ | ✅ |
| エラーハンドリング | ✅ | ✅ |
| リダイレクトループ検出 | ❌ | ✅ |
| 認証状態のリアルタイム同期 | ❌ | ✅ |
| レート制限 | ❌ | ✅ |

**結論**: `useAuthAdvanced`の方が機能が充実しており、標準化に適している

---

## 🚀 実装手順

### ステップ1: `app/_layout.tsx`の移行

1. `useAuthSimple`のインポートを`useAuthAdvanced`に変更
2. `signOut`の戻り値の違いに対応（既にラッパー関数があるため問題なし）
3. 動作確認

### ステップ2: `useAuthSimple`の非推奨化

1. `hooks/useAuthSimple.ts`に非推奨コメントを追加
2. ドキュメントを更新
3. 将来的な削除を検討（`app/_layout.tsx`の移行後）

### ステップ3: `useAuth`の削除

1. `hooks/useAuth.ts`を削除
2. ドキュメントから参照を削除
3. 型定義の重複を確認

---

## ⚠️ 注意事項

### 1. `signOut`の戻り値の違い

`useAuthSimple`の`signOut`は`Promise<boolean>`を返すが、`useAuthAdvanced`は`Promise<void>`を返す。

**対応**:
- `app/_layout.tsx`では既にラッパー関数を使用しているため問題なし
- 他の箇所でも同様の対応が必要な場合はラッパー関数を作成

### 2. グローバル状態管理

`useAuthAdvanced`はグローバル状態管理を使用しているため、複数のコンポーネント間で状態が共有される。

**利点**:
- 認証状態の一貫性が保たれる
- パフォーマンスが向上（重複する認証チェックを削減）

**注意点**:
- 状態の更新が全てのコンポーネントに反映される
- テスト時にモックが必要な場合は注意

### 3. レート制限

`useAuthAdvanced`にはレート制限機能が組み込まれている。

**利点**:
- セキュリティが向上
- 不正なアクセスを防止

**注意点**:
- テスト時にレート制限が発動しないように注意

---

## 📊 期待される効果

### コード品質
- ✅ 認証フックの統一により、コードの理解が容易になる
- ✅ メンテナンス性が向上
- ✅ バグの発生リスクが低下

### パフォーマンス
- ✅ グローバル状態管理により、重複する認証チェックを削減
- ✅ 認証状態のリアルタイム同期により、UIの応答性が向上

### セキュリティ
- ✅ レート制限機能により、不正なアクセスを防止
- ✅ 統一されたエラーハンドリングにより、セキュリティホールを防止

---

## ✅ チェックリスト

### フェーズ1: `app/_layout.tsx`の移行
- [ ] `useAuthSimple`を`useAuthAdvanced`に変更
- [ ] `signOut`の戻り値の違いに対応
- [ ] 動作確認（ログイン/ログアウト）
- [ ] 動作確認（アイドルタイムアウト）
- [ ] 動作確認（画面遷移）

### フェーズ2: `useAuth`の削除
- [ ] `hooks/useAuth.ts`を削除
- [ ] ドキュメントから参照を削除
- [ ] 型定義の重複を確認

### フェーズ3: ドキュメント更新
- [ ] `hooks/README.md`を更新
- [ ] `CODE_REVIEW_REPORT.md`を更新
- [ ] 移行ガイドを作成

---

## 📚 参考資料

- [認証システムの問題点](docs/AUTHENTICATION_ISSUES.md)
- [コードレビューレポート](CODE_REVIEW_REPORT.md)
- [フックガイド](hooks/README.md)

---

**作成日**: 2024年12月  
**次回レビュー**: 実装完了後




