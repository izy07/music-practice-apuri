# 機能フロー分析レポート #7: カレンダー表示フロー

## 概要
カレンダー画面での練習記録、録音、イベント、目標の表示、楽器変更時のデータ切り替え、月別データのキャッシュ機能の各フローを詳細に分析し、余分な工程や潜在的なバグを特定する。

## 1. カレンダーデータ読み込みフロー

### ユーザー操作の流れ
1. カレンダー画面 (`app/(tabs)/index.tsx`) を開く
2. 現在の月のデータが自動的に読み込まれる
3. 月を切り替える
4. 新しい月のデータが読み込まれる（キャッシュがあれば即座に表示）

### データの流れ

#### フロントエンド処理 (`app/(tabs)/index.tsx`, `hooks/tabs/useCalendarData.ts`)
```
画面表示 / 月変更
  ↓
loadAllData()
  ├─ キャッシュチェック
  │  └─ キャッシュがあれば即座に表示（遅延ゼロ）
  ├─ 並列実行でデータ取得
  │  ├─ loadPracticeData() - 練習記録
  │  ├─ loadTotalPracticeTime() - 総練習時間
  │  ├─ loadEvents() - イベント
  │  ├─ loadRecordingsData() - 録音データ
  │  └─ loadShortTermGoal() - 短期目標
  └─ キャッシュに保存（最新3ヶ月分）
```

### 問題点・余分な工程

#### 🟡 問題1: 複数のrefによる状態管理の複雑さ
**場所**: `hooks/tabs/useCalendarData.ts:51-59, 111-133`
```typescript
const totalPracticeTimeRef = useRef(0);
const practiceDataRef = useRef<PracticeData>({});
const monthlyTotalRef = useRef(0);
const eventsRef = useRef<EventData>({});
const recordingsDataRef = useRef<RecordingsData>({});
const shortTermGoalRef = useRef<ShortTermGoal | null>(null);
```

**問題**: 
- 状態とrefが重複管理されている
- 複数の`useEffect`でrefを更新している
- 管理が複雑

**改善提案**: 
- カスタムフックに集約
- または、状態とrefの役割を明確化

#### 🟡 問題2: 楽器変更イベントの遅延
**場所**: `app/(tabs)/index.tsx:288`
```typescript
// タイマーからの通知の場合は少し待機してから更新（データベースの反映を待つ）
const delay = source === 'timer' ? 1000 : 0;
```

**問題**: 
- タイマーからの通知時に1000ms固定待機
- 他のソース（手動記録、音声記録など）は即座に更新

**改善提案**: 
- 保存処理の完了を待つ（Promiseベース）
- または、データベースのリアルタイム更新を監視

#### 🟡 問題3: キャッシュサイズの制限
**場所**: `hooks/tabs/useCalendarData.ts:261-265`
```typescript
// キャッシュサイズを制限（最新3ヶ月分のみ保持）
if (monthDataCacheRef.current.size > 3) {
  const oldestKey = Array.from(monthDataCacheRef.current.keys()).sort()[0];
  monthDataCacheRef.current.delete(oldestKey);
}
```

**問題**: 
- キャッシュサイズが固定（3ヶ月）
- ユーザーの利用パターンによっては不適切な可能性

**改善提案**: 
- 設定可能にする
- または、メモリ使用量に基づいて動的に制限

## 2. 楽器変更時のデータ切り替えフロー

### データの流れ

#### イベント発火 (`app/(tabs)/instrument-selection.tsx:418-426`)
```
[楽器選択保存]
  ↓
setSelectedInstrument(selectedInstrumentId)
  ├─ InstrumentThemeContextで状態更新
  └─ window.dispatchEvent('instrumentChanged')
     └─ detail: { instrumentId, previousInstrumentId }
```

#### イベント受信 (`app/(tabs)/index.tsx:317-334`)
```
[楽器変更イベント受信]
  ↓
handleInstrumentChange()
  ├─ loadPracticeData() - 楽器IDでフィルタリング
  ├─ loadTotalPracticeTime() - 楽器IDでフィルタリング
  └─ loadRecordingsData() - 楽器IDでフィルタリング
```

### 問題点

#### 🟡 問題1: 楽器変更時のキャッシュクリア
**場所**: `hooks/tabs/useCalendarData.ts`
- 楽器変更時にキャッシュがクリアされていない
- 古い楽器のデータがキャッシュに残る可能性

**改善提案**: 
- 楽器変更時にキャッシュをクリア
- または、キャッシュキーに楽器IDを含める

#### 🟡 問題2: 楽器変更イベントの待機時間
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

## 3. 練習記録データ読み込みフロー

### データの流れ (`hooks/tabs/useCalendarData.ts:144-362`)
```
loadPracticeData()
  ├─ オンライン時
  │  ├─ 楽器IDでフィルタリング
  │  ├─ 月の範囲でフィルタリング
  │  ├─ データ取得
  │  ├─ 日別に集計
  │  ├─ hasRecordとhasBasicPracticeを判定
  │  └─ キャッシュに保存
  └─ オフライン時
     ├─ ローカルストレージから取得
     └─ 月でフィルタリング
```

### 問題点

特に大きな問題は見当たらない。

## 4. 録音データ読み込みフロー

### データの流れ (`hooks/tabs/useCalendarData.ts:492-610`)
```
loadRecordingsData()
  ├─ 楽器IDでフィルタリング
  ├─ 月の範囲で取得（前後1日を含める）
  ├─ ローカル日付で再フィルタリング
  └─ キャッシュに保存
```

### 問題点

#### 🟡 問題1: タイムゾーン処理の冗長性
**場所**: `hooks/tabs/useCalendarData.ts:516-524, 574-586`
- 前後1日を含めて取得し、その後ローカル日付で再フィルタリング
- 2回フィルタリングしている

**改善提案**: 
- タイムゾーン処理を統一
- または、正確な日付範囲で検索

## 5. イベントデータ読み込みフロー

### データの流れ (`hooks/tabs/useCalendarData.ts:410-490`)
```
loadEvents()
  ├─ 月の範囲でフィルタリング
  ├─ is_completed = falseでフィルタリング
  └─ 日別にグループ化
```

### 問題点

特に大きな問題は見当たらない。

## 6. 目標データ読み込みフロー

### データの流れ (`hooks/tabs/useCalendarData.ts:612-766`)
```
loadShortTermGoal()
  ├─ show_on_calendarカラムの存在確認
  │  ├─ localStorageフラグ確認（高速化）
  │  └─ データベース確認（必要時のみ）
  ├─ 個人目標を取得
  ├─ 達成済みをフィルタリング
  ├─ show_on_calendarでフィルタリング
  └─ 最初の目標を返す
```

### 問題点

#### 🟡 問題1: show_on_calendarカラムの存在確認の複雑さ
**場所**: `hooks/tabs/useCalendarData.ts:623-676`
- localStorageとデータベースの両方で確認
- 複雑なエラーハンドリング

**改善提案**: 
- カラム存在確認を初期化時に一度だけ実行
- または、マイグレーションで確実に存在するようにする

#### 🟡 問題2: localStorageとデータベースの二重管理
**場所**: `hooks/tabs/useCalendarData.ts:723-736`
- `show_on_calendar`がlocalStorageとデータベースの両方に保存されている
- 同期が取れていない可能性

**改善提案**: 
- データベースを唯一の情報源にする
- localStorageは削除

## 7. 月別データキャッシュフロー

### データの流れ (`hooks/tabs/useCalendarData.ts:62-108`)
```
月変更時
  ↓
キャッシュチェック
  ├─ キャッシュあり → 即座に表示（遅延ゼロ）
  └─ キャッシュなし → データをクリアして読み込み開始
  ↓
データ読み込み完了後
  └─ キャッシュに保存（最新3ヶ月分のみ保持）
```

### 問題点

#### 🟡 問題1: キャッシュキーに楽器IDが含まれていない
**場所**: `hooks/tabs/useCalendarData.ts:63, 254`
- キャッシュキーは月のみ（`YYYY-MM`形式）
- 楽器変更時に古い楽器のデータがキャッシュに残る

**改善提案**: 
- キャッシュキーに楽器IDを含める（`YYYY-MM:instrumentId`）
- 楽器変更時にキャッシュをクリア

## 8. 練習記録更新イベントフロー

### データの流れ (`app/(tabs)/index.tsx:270-314`)
```
[練習記録保存]
  ↓
window.dispatchEvent('practiceRecordUpdated')
  └─ detail: { action, source, date }
  ↓
handlePracticeRecordUpdate()
  ├─ タイマーからの通知 → 1000ms待機
  ├─ 録音保存 → 録音データも更新
  └─ 通常の更新 → 即座に更新
```

### 問題点

#### 🟡 問題1: タイマーからの通知の固定待機時間
**場所**: `app/(tabs)/index.tsx:288`
```typescript
const delay = source === 'timer' ? 1000 : 0;
```

**問題**: 
- 固定1000ms待機は不確実
- データベースの反映タイミングに依存

**改善提案**: 
- 保存処理の完了を待つ（Promiseベース）
- または、データベースのリアルタイム更新を監視

## 9. 余分なファイル・重複コード

### 重複している処理

特に大きな重複は見当たらない。

## 10. 潜在的なバグ

### バグ1: 楽器変更時のキャッシュ不整合
- 楽器変更時にキャッシュがクリアされていない
- 古い楽器のデータがキャッシュに残る
- 新しい楽器のデータが表示されない可能性

### バグ2: タイマーからの通知の遅延
- 固定1000ms待機では、データベースの反映を待てない可能性
- イベントが発火してもデータが更新されていない

### バグ3: localStorageとデータベースの不整合
- `show_on_calendar`がlocalStorageとデータベースの両方に保存されている
- 同期が取れていない可能性

## 11. 改善提案まとめ

### 優先度: 高
1. **楽器変更時のキャッシュクリア**: キャッシュキーに楽器IDを含める、または楽器変更時にクリア
2. **タイマーからの通知の改善**: 固定待機時間からPromiseベースの処理へ
3. **localStorageとデータベースの統一**: `show_on_calendar`の保存先を統一

### 優先度: 中
4. **複数のrefによる状態管理の簡素化**: カスタムフックに集約
5. **show_on_calendarカラムの存在確認の最適化**: 初期化時に一度だけ確認
6. **タイムゾーン処理の統一**: 録音データの取得処理を改善

### 優先度: 低
7. **キャッシュサイズの設定可能化**: ユーザー設定で変更可能にする

## 12. フロー図（テキストベース）

### カレンダーデータ読み込みフロー
```
[画面表示 / 月変更]
  ↓
[キャッシュチェック]
  ├─ キャッシュあり → 即座に表示 ← ✅ 遅延ゼロ
  └─ キャッシュなし → データをクリアして読み込み開始
  ↓
[並列実行でデータ取得]
  ├─ loadPracticeData() - 楽器IDでフィルタリング
  ├─ loadTotalPracticeTime() - 楽器IDでフィルタリング
  ├─ loadEvents() - 月でフィルタリング
  ├─ loadRecordingsData() - 楽器ID + 月でフィルタリング
  └─ loadShortTermGoal() - show_on_calendarでフィルタリング
  ↓
[キャッシュに保存] ← 🟡 楽器IDが含まれていない
  └─ 最新3ヶ月分のみ保持
```

### 楽器変更フロー
```
[楽器選択保存]
  ↓
[setSelectedInstrument()]
  ├─ InstrumentThemeContextで状態更新
  └─ window.dispatchEvent('instrumentChanged')
  ↓
[100ms待機] ← ⚠️ 固定待機時間
  ↓
[楽器変更イベント受信]
  ├─ loadPracticeData() - 新しい楽器IDでフィルタリング
  ├─ loadTotalPracticeTime() - 新しい楽器IDでフィルタリング
  └─ loadRecordingsData() - 新しい楽器IDでフィルタリング
  ↓
[キャッシュ更新] ← ⚠️ 古い楽器のキャッシュが残る
```

## 13. 結論

カレンダー表示フローは機能しているが、以下の改善が必要：
- 楽器変更時のキャッシュクリア（最重要）
- タイマーからの通知の改善（固定待機時間からPromiseベースへ）
- localStorageとデータベースの統一
- 複数のrefによる状態管理の簡素化

これらの改善により、楽器変更時のデータ不整合を解消し、コードの可読性向上が期待できる。



