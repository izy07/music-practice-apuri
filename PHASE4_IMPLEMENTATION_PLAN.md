# Phase 4 実装計画

## 概要

Phase 4は中程度の改善を実施し、コード品質と保守性を向上させます。

## 4.1 ESLint設定の作成・更新 ✅

### 完了した作業

1. **`.eslintrc.js`の作成**
   - `no-console`ルール: console.logの直接使用を禁止（loggerを使用）
   - `import/order`ルール: インポート順序の統一
   - 例外設定: logger.ts、テストファイル、スクリプトファイルではconsole.logを許可

### 次のステップ

1. ESLintプラグインのインストール確認
2. ESLintの実行と自動修正

## 4.2 console.logの統一

### 現状

- **254箇所**（30ファイル）で`console.log/warn/error`を使用
- コードファイル（ドキュメント・ビルドファイル除く）: **約13ファイル**

### 対象ファイル（優先度順）

#### 高優先度（認証関連）
1. ✅ `app/auth/signup.tsx` - 16箇所
2. ✅ `app/auth/callback.tsx` - 24箇所
3. ✅ `app/auth/reset-password.tsx` - 8箇所

#### 中優先度（主要コンポーネント）
4. ✅ `components/InstrumentThemeContext.tsx` - 10箇所
5. ✅ `components/PracticeRecordModal.tsx` - 12箇所
6. ✅ `app/(tabs)/tutorial.tsx` - 12箇所
7. ✅ `components/AudioRecorder.tsx` - 4箇所

#### 低優先度（その他）
8. `app/(tabs)/goals.tsx` - 3箇所
9. `app/(tabs)/profile-settings.tsx` - 1箇所
10. `app/(tabs)/recordings-library.tsx` - 5箇所
11. `app/events.tsx` - 2箇所
12. `app/attendance.tsx` - 6箇所
13. その他

### 移行パターン

```typescript
// ❌ Before
console.log('データ取得開始');
console.warn('警告メッセージ');
console.error('エラー:', error);

// ✅ After
import logger from '@/lib/logger';
logger.debug('データ取得開始');
logger.warn('警告メッセージ');
logger.error('エラー:', error);
```

## 4.3 エラーハンドリングの統一

### 現状

- `ErrorHandler`クラスが存在し、一部で使用されている
- 一部で直接`console.error`を使用
- `ErrorHandler`の使用が徹底されていない

### 改善計画

1. 直接`console.error`の使用箇所を特定
2. `ErrorHandler.handle()`への置き換え
3. エラーレスポンス形式の統一（Result型パターン）

## 4.4 テストカバレッジの向上

### 現状

- **30%**（ステートメント）
- 目標: **70%**

### 改善計画

1. **サービス層のテスト追加**（優先度: 高）
   - `services/goalService.ts`
   - `services/practiceService.ts`
   - その他のサービス

2. **リポジトリ層のテスト拡充**（優先度: 高）
   - 既存テストの拡充
   - エッジケースの追加

3. **コンポーネントテストの追加**（優先度: 中）
   - 主要コンポーネントのテスト
   - 統合テストの追加

### 進捗目標

- Week 1: 35%（5%向上）
- Week 2: 40%（5%向上）
- Week 3: 45%（5%向上）
- Week 4: 50%（5%向上）
- 以降: 週5%ずつ向上

## 4.5 パフォーマンス最適化

### 計画

1. プロファイリングにより不要な再レンダリングを特定
2. メモ化の強化（`React.memo`, `useMemo`, `useCallback`）
3. バンドルサイズの分析と最適化

## 進捗管理

- 各タスクの進捗を週次で確認
- 完了したタスクはチェックマーク（✅）で記録



