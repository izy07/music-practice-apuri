# 機能フロー分析レポート #14: 楽器選択・変更フロー（重要・重点分析）

## 概要
楽器選択画面での楽器選択・保存、楽器変更イベントの発火、各画面でのデータ切り替え、テーマ更新の各フローを詳細に分析し、余分な工程や潜在的なバグを特定する。

## 1. 楽器選択・保存フロー

### ユーザー操作の流れ
1. 楽器選択画面 (`app/(tabs)/instrument-selection.tsx`) を開く
2. 楽器を選択
3. 「楽器選択を保存」ボタンをクリック
4. 楽器がデータベースに保存される
5. 楽器変更イベントが発火される
6. 各画面でデータが更新される

### データの流れ

#### フロントエンド処理 (`app/(tabs)/instrument-selection.tsx`)
```
[楽器選択]
  ↓
handleInstrumentSelection(instrumentId)
  └─ setSelectedInstrumentId(instrumentId)
  ↓
[保存ボタンクリック]
  ↓
handleSaveInstrument()
  ├─ バリデーション
  ├─ リトライロジック（最大3回）
  │  ├─ 既存プロフィールを取得
  │  ├─ update / upsertを実行
  │  ├─ エラー処理
  │  │  ├─ 400エラー → upsertにフォールバック
  │  │  ├─ 409エラー → updateにフォールバック
  │  │  ├─ 外部キー制約違反 → 楽器を作成してリトライ
  │  │  └─ その他 → リトライまたはエラー
  │  └─ 成功まで繰り返し
  ├─ setSelectedInstrument() - InstrumentThemeContextで状態更新
  ├─ 100ms待機 ← ⚠️ 固定待機時間
  ├─ fetchUserProfile() - 認証プロフィール更新
  ├─ window.dispatchEvent('instrumentChanged') - 楽器変更イベント発火
  ├─ チュートリアル完了状態を更新
  ├─ storageManager.set() - ストレージ更新
  ├─ emitStorageEvent() - ストレージイベント発火
  ├─ fetchUserProfile() - 認証状態更新
  ├─ 800ms待機 ← ⚠️ 固定待機時間
  └─ router.back() - 画面遷移
```

### 問題点・余分な工程

#### 🟡 問題1: 複数の固定待機時間
**場所**: `app/(tabs)/instrument-selection.tsx:414, 524`
```typescript
// テーマ更新を確実にするため、少し待機
await new Promise(resolve => setTimeout(resolve, 100));

// 認証状態の更新を確実に反映するため、少し待つ
await new Promise(resolve => setTimeout(resolve, 800));
```

**問題**: 
- 固定待機時間は不確実
- テーマ更新や認証状態更新の完了を待っていない

**改善提案**: 
- Promiseベースで処理の完了を待つ
- または、状態更新の完了を確認

#### 🟡 問題2: 複雑なリトライロジック
**場所**: `app/(tabs)/instrument-selection.tsx:173-409`
- 最大3回のリトライ
- 複数のエラーハンドリング
- 楽器作成処理も含まれる

**問題**: 
- リトライロジックが複雑
- エラーハンドリングが多岐にわたる

**改善提案**: 
- リトライロジックを共通化
- または、エラーハンドリングを簡素化

#### 🟡 問題3: fetchUserProfileの重複呼び出し
**場所**: `app/(tabs)/instrument-selection.tsx:416, 517`
- `fetchUserProfile()`が2回呼び出されている
- 100ms待機の後と800ms待機の前に呼び出し

**改善提案**: 
- 1回の呼び出しに統合
- または、呼び出しのタイミングを最適化

## 2. 楽器変更イベントの発火と受信

### データの流れ

#### イベント発火 (`app/(tabs)/instrument-selection.tsx:418-426`)
```
[楽器保存成功]
  ↓
window.dispatchEvent('instrumentChanged')
  └─ detail: { instrumentId, previousInstrumentId }
```

#### イベント受信（各画面）

##### カレンダー画面 (`app/(tabs)/index.tsx:317-334`)
```
[楽器変更イベント受信]
  ↓
handleInstrumentChange()
  ├─ loadPracticeData() - 新しい楽器IDで再取得
  ├─ loadTotalPracticeTime() - 新しい楽器IDで再取得
  └─ loadRecordingsData() - 新しい楽器IDで再取得
```

##### 統計画面 (`app/(tabs)/statistics.tsx:133-135`)
```
[楽器変更検知]
  ↓
selectedInstrument変更
  ↓
fetchPracticeRecords() - 新しい楽器IDで再取得
```

##### 録音ライブラリ画面 (`app/(tabs)/recordings-library.tsx:59-64`)
```
[楽器変更検知]
  ↓
selectedInstrument変更（useFocusEffectの依存配列）
  ↓
loadRecordings() - 新しい楽器IDで再取得
```

### 問題点

#### 🟡 問題1: イベント受信の不統一
**場所**: 各画面
- カレンダー画面: `window.addEventListener('instrumentChanged')`で受信
- 統計画面: `selectedInstrument`の変更を検知（useEffect）
- 録音ライブラリ画面: `useFocusEffect`の依存配列で検知

**問題**: 
- イベント受信方法が統一されていない
- 一部の画面ではイベントを直接受信していない

**改善提案**: 
- すべての画面で`window.addEventListener('instrumentChanged')`を使用
- または、Contextで楽器変更を管理

#### 🟡 問題2: カレンダー画面のキャッシュ問題
**場所**: `hooks/tabs/useCalendarData.ts`
- 楽器変更時にキャッシュがクリアされていない
- 古い楽器のデータがキャッシュに残る

**改善提案**: 
- 楽器変更時にキャッシュをクリア
- または、キャッシュキーに楽器IDを含める

## 3. テーマ更新フロー

### データの流れ (`components/InstrumentThemeContext.tsx:520-592`)
```
[setSelectedInstrument(instrumentId)]
  ├─ 同期中チェック
  │  └─ 同期中 → ローカルのみ更新
  ├─ ローカル状態を更新
  ├─ AsyncStorageに保存
  ├─ サーバーにも同期
  │  └─ updateSelectedInstrument(userId, instrumentId)
  └─ テーマを更新
     └─ 楽器IDに基づいてテーマを設定
```

### 問題点

#### 🟡 問題1: テーマ更新の待機時間
**場所**: `app/(tabs)/instrument-selection.tsx:413-414`
```typescript
// テーマ更新を確実にするため、少し待機
await new Promise(resolve => setTimeout(resolve, 100));
```

**問題**: 
- 固定100ms待機は不確実
- テーマ更新の完了を待っていない

**改善提案**: 
- テーマ更新の完了を待つ（Promiseベース）
- または、状態更新の完了を確認

## 4. 楽器作成フロー（外部キー制約違反時）

### データの流れ (`app/(tabs)/instrument-selection.tsx:324-370`)
```
[外部キー制約違反検出]
  ↓
楽器がデータベースに存在しない
  ↓
instrumentService.getDefaultInstruments()
  ↓
楽器をデータベースに作成
  └─ supabase.from('instruments').upsert()
  ↓
500ms待機 ← ⚠️ 固定待機時間
  ↓
リトライ（楽器作成後に再試行）
```

### 問題点

#### 🟡 問題1: 楽器作成後の固定待機時間
**場所**: `app/(tabs)/instrument-selection.tsx:376`
```typescript
// 少し待ってから再試行（楽器作成の反映を待つ）
await new Promise<void>((resolve) => setTimeout(resolve, 500));
```

**問題**: 
- 固定500ms待機は不確実
- 楽器作成の完了を待っていない

**改善提案**: 
- 楽器作成の完了を待つ（Promiseベース）
- または、作成完了を確認してからリトライ

## 5. ストレージ更新フロー

### データの流れ (`app/(tabs)/instrument-selection.tsx:496-512`)
```
[ストレージ更新]
  ├─ storageManager.set() - AsyncStorage更新
  ├─ emitStorageEvent() - ストレージイベント発火
  └─ グローバルキャッシュ更新
     └─ globalThis.__last_selected_instrument_id
```

### 問題点

特に大きな問題は見当たらない。

## 6. 各画面での楽器変更検知

### カレンダー画面
- **方法**: `window.addEventListener('instrumentChanged')`
- **処理**: `loadPracticeData()`, `loadTotalPracticeTime()`, `loadRecordingsData()`を呼び出し

### 統計画面
- **方法**: `selectedInstrument`の変更を検知（useEffect）
- **処理**: `fetchPracticeRecords()`を呼び出し

### 録音ライブラリ画面
- **方法**: `useFocusEffect`の依存配列で検知
- **処理**: `loadRecordings()`を呼び出し

### 問題点

#### 🟡 問題1: イベント受信方法の不統一
- カレンダー画面はイベントを直接受信
- 統計画面と録音ライブラリ画面は依存配列で検知

**改善提案**: 
- すべての画面でイベントを直接受信
- または、Contextで楽器変更を管理

## 7. 余分なファイル・重複コード

### 重複している処理

特に大きな重複は見当たらない。

## 8. 潜在的なバグ

### バグ1: 複数の固定待機時間
- テーマ更新や認証状態更新の完了を待っていない
- 処理が完了する前に次の処理が実行される可能性

### バグ2: カレンダー画面のキャッシュ問題
- 楽器変更時にキャッシュがクリアされていない
- 古い楽器のデータがキャッシュに残る

### バグ3: fetchUserProfileの重複呼び出し
- 同じ処理が2回実行されている
- 不要なネットワークリクエスト

## 9. 改善提案まとめ

### 優先度: 高
1. **固定待機時間の削除**: Promiseベースで処理の完了を待つ
2. **カレンダー画面のキャッシュクリア**: 楽器変更時にキャッシュをクリア、またはキャッシュキーに楽器IDを含める
3. **fetchUserProfileの重複呼び出しを削除**: 1回の呼び出しに統合

### 優先度: 中
4. **リトライロジックの簡素化**: 共通化または簡素化
5. **イベント受信方法の統一**: すべての画面でイベントを直接受信

### 優先度: 低
6. **コード整理**: 未使用のコードやコメントの整理

## 10. フロー図（テキストベース）

### 楽器選択・保存フロー
```
[楽器選択]
  ↓
[保存ボタンクリック]
  ↓
[handleSaveInstrument()]
  ├─ リトライロジック（最大3回）
  │  ├─ update / upsert実行
  │  ├─ エラー処理
  │  │  ├─ 400エラー → upsert
  │  │  ├─ 409エラー → update
  │  │  └─ 外部キー制約違反 → 楽器作成 + リトライ
  │  └─ 成功まで繰り返し
  ├─ setSelectedInstrument() - テーマ更新
  ├─ 100ms待機 ← ⚠️ 固定待機時間
  ├─ fetchUserProfile() - 認証プロフィール更新
  ├─ window.dispatchEvent('instrumentChanged') - イベント発火
  ├─ チュートリアル完了状態更新
  ├─ storageManager.set() - ストレージ更新
  ├─ emitStorageEvent() - ストレージイベント発火
  ├─ fetchUserProfile() - 認証状態更新（重複） ← ⚠️ 重複呼び出し
  ├─ 800ms待機 ← ⚠️ 固定待機時間
  └─ router.back() - 画面遷移
```

### 楽器変更イベント受信フロー
```
[instrumentChangedイベント発火]
  ↓
[カレンダー画面]
  ├─ window.addEventListener('instrumentChanged')
  └─ loadPracticeData(), loadTotalPracticeTime(), loadRecordingsData()
  ↓
[統計画面]
  ├─ selectedInstrument変更（useEffect）
  └─ fetchPracticeRecords()
  ↓
[録音ライブラリ画面]
  ├─ selectedInstrument変更（useFocusEffect）
  └─ loadRecordings()
```

## 11. 結論

楽器選択・変更フローは機能しているが、以下の改善が必要：
- 固定待機時間の削除（最重要）
- カレンダー画面のキャッシュクリア
- fetchUserProfileの重複呼び出しを削除
- リトライロジックの簡素化
- イベント受信方法の統一

これらの改善により、楽器変更時のデータ切り替えが確実に動作し、コードの可読性向上が期待できる。



