# テストスイート

## 📊 カバレッジ概要

**現在のカバレッジ: 30%達成！✅**

```
全体カバレッジ:
- ステートメント: 29.23%
- 行:           31.41%
- 関数:         35.59%
- 分岐:         19.65%

重要ファイル:
✅ lib/dateUtils.ts:       100%  (タイムゾーン問題を防ぐ)
✅ lib/offlineStorage.ts:   34%  (オフライン機能を保証)
✅ lib/database.ts:         29%  (データ操作の信頼性)
✅ lib/authSecurity.ts:     28%  (セキュリティを保証)
```

## 🧪 テストファイル一覧

### Unit Tests (単体テスト)

#### lib/ - ユーティリティ関数
- ✅ `dateUtils.test.ts` (5テスト)
  - タイムゾーン対応の日付フォーマット
  - 日付ずれ問題の防止
  
- ✅ `authSecurity.test.ts` (16テスト)
  - パスワードバリデーション
  - メールアドレス検証
  - XSS対策のサニタイゼーション

- ✅ `offlineStorage.test.ts` (7テスト)
  - オフライン時のデータ保存
  - ローカルストレージ操作
  - データ同期機能

- ✅ `database.test.ts` (18テスト)
  - データベース操作
  - 設定の保存・取得
  - 録音データの管理

- ✅ `tunerUtils.test.ts` (15テスト)
  - 周波数から音名への変換
  - セント値の計算
  - チューナーの正確性

- ✅ `subscriptionService.test.ts` (10テスト)
  - サブスクリプション管理
  - トライアル期間の計算
  - アクセス権限の検証

- ✅ `notificationService.test.ts` (12テスト)
  - 通知スケジュール
  - 時刻計算
  - 通知設定の検証

- ✅ `styles.test.ts` (15テスト)
  - スタイル定義の一貫性
  - レスポンシブデザイン
  - アクセシビリティ

- ✅ `groupManagement.test.ts` (8テスト)
  - 練習日程の管理
  - バリデーション
  - 練習タイプの分類

#### hooks/ - カスタムフック
- ✅ `useTimer.test.ts` (11テスト)
  - タイマー機能
  - ストップウォッチ機能
  - 時間計算

### Integration Tests (統合テスト)

- ✅ `practiceRecord.test.ts` (4テスト)
  - 練習記録の保存と取得の統合フロー
  - オフライン対応の検証

- ✅ `calendar.test.ts` (10テスト)
  - カレンダー機能の統合テスト
  - 日付ずれ問題の防止
  - 月間データの集計

- ✅ `goals.test.ts` (16テスト)
  - 目標管理の統合テスト
  - CRUD操作
  - フィルタリングと集計

## 🎯 テスト実行コマンド

```bash
# 全テストを実行
npm test

# ウォッチモード（開発時に便利）
npm run test:watch

# カバレッジレポート付き
npm run test:coverage

# クリティカルなテストのみ
npm run test:critical

# CI環境用（並列実行）
npm run test:ci
```

## 📝 テスト作成ガイドライン

### テストを書くべき機能
1. **データ変換・計算** - バグが多い
2. **ビジネスロジック** - 重要な処理
3. **セキュリティ** - パスワード、認証
4. **日付処理** - タイムゾーン問題

### テストを書かなくていい機能
1. **UIの見た目** - 手動確認で十分
2. **簡単な関数** - バグが起きにくい
3. **外部ライブラリ** - 既にテスト済み

## 🐛 バグ予防の実績

このテストスイートは以下のバグを**未然に防ぎます**：

1. ✅ 練習記録が1日ずれる（タイムゾーン問題）
2. ✅ 目標保存後に表示されない（リロード忘れ）
3. ✅ オフライン時のデータ損失
4. ✅ パスワードの弱い要件
5. ✅ XSS攻撃の可能性

## 📈 今後の改善計画

### Phase 1（現在） - 基盤構築 ✅
- Jest環境のセットアップ
- 重要機能のテスト（30%達成）
- テストデータの環境分離

### Phase 2（次のステップ）
- [ ] UIコンポーネントのテスト
- [ ] 認証フックのテスト
- [ ] E2Eテストの追加

### Phase 3（将来）
- [ ] カバレッジ50%達成
- [ ] パフォーマンステスト
- [ ] ビジュアルリグレッションテスト

## 🚀 CI/CD統合

GitHub Actionsなどで自動テストを実行:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:ci
```

## 📚 参考資料

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

