# 機能フロー分析レポート #13: 録音ライブラリフロー

## 概要
録音データの表示、楽器IDでのフィルタリング、時間フィルター、検索、録音再生、お気に入り機能、ペイウォール対応の各フローを詳細に分析し、余分な工程や潜在的なバグを特定する。

## 1. 録音データ読み込みフロー

### ユーザー操作の流れ
1. 録音ライブラリ画面 (`app/(tabs)/recordings-library.tsx`) を開く
2. ユーザーの録音データが自動的に読み込まれる
3. 楽器IDでフィルタリングされて表示される

### データの流れ

#### フロントエンド処理 (`app/(tabs)/recordings-library.tsx`)
```
画面表示 / フォーカス時 / 楽器変更時
  ↓
loadRecordings()
  ├─ ペイウォールチェック
  │  └─ canAccessFeature('recordings', entitlement)
  ├─ アクセス不可 → 空配列を設定
  ├─ アクセス可能 → データベースから取得
  │  └─ listAllRecordings(userId, instrumentId)
  │     └─ supabase.from('recordings')
  │        .select('*')
  │        .eq('user_id', userId)
  │        .eq('instrument_id', instrumentId) / .is('instrument_id', null)
  │        .order('recorded_at', { ascending: false })
  └─ recordings状態を更新
```

### 問題点・余分な工程

#### 🟡 問題1: データ更新時の既存データ保持
**場所**: `app/(tabs)/recordings-library.tsx:96-99`
```typescript
setRecordings(prevRecordings => {
  // 新しいデータがある場合は更新、ない場合は既存データを保持
  return data && data.length > 0 ? data : prevRecordings;
});
```

**問題**: 
- データが0件の場合、既存データを保持する
- 実際にデータが0件になった場合（削除など）に正しく反映されない

**改善提案**: 
- データが0件の場合は空配列を設定
- または、明示的に状態をクリア

#### 🟡 問題2: 楽器変更時のデータ再取得
**場所**: `app/(tabs)/recordings-library.tsx:59-64`
- `selectedInstrument`が変更されると、データを再取得
- `useFocusEffect`で`selectedInstrument`を依存配列に含めている

**評価**: 
- これは適切な動作（楽器変更時にデータを更新する必要がある）
- 特に問題なし

## 2. 録音再生フロー

### ユーザー操作の流れ
1. 録音カードの再生ボタンをクリック
2. 録音が再生される
3. 他の録音をクリックすると、現在の録音が停止して新しい録音が再生される

### データの流れ (`app/(tabs)/recordings-library.tsx:181-240`)
```
[再生ボタンクリック]
  ↓
playRecording(recording)
  ├─ 動画URLチェック
  │  └─ 動画URL → ブラウザで開く
  ├─ 既存の録音を停止
  │  └─ audioElement.pause()
  ├─ Supabase Storageから公開URLを取得
  │  └─ supabase.storage.from('recordings').getPublicUrl(file_path)
  ├─ Audioオブジェクトを作成
  ├─ イベントハンドラーを設定
  │  ├─ onended - 再生終了時に状態をクリア
  │  └─ onerror - エラー時にアラート表示
  └─ audio.play() - 再生開始
```

### 問題点

#### 🟡 問題1: Web環境でのAudio API使用
**場所**: `app/(tabs)/recordings-library.tsx:217`
```typescript
const audio = new Audio(publicUrl);
```

**問題**: 
- Web環境でのみ動作する（React Nativeでは動作しない）
- プラットフォームチェックがない

**改善提案**: 
- プラットフォームチェックを追加
- または、React Native用のオーディオライブラリを使用

#### 🟡 問題2: メモリリークの可能性
**場所**: `app/(tabs)/recordings-library.tsx:217-234`
- `Audio`オブジェクトが作成されるが、コンポーネントのアンマウント時にクリーンアップされていない
- 複数の`Audio`オブジェクトがメモリに残る可能性

**改善提案**: 
- `useEffect`のクリーンアップ関数で`Audio`オブジェクトをクリーンアップ

## 3. 時間フィルタリングフロー

### データの流れ (`app/(tabs)/recordings-library.tsx:254-299`)
```
[時間フィルター選択]
  ↓
getFilteredRecordings(filter)
  ├─ 時間フィルター適用
  │  └─ recorded_atでフィルタリング
  ├─ 検索クエリ適用
  │  └─ titleまたはmemoで検索
  └─ フィルタリングされたリストを返す
```

### 問題点

#### 🟡 問題1: スクロール位置の固定待機時間
**場所**: `app/(tabs)/recordings-library.tsx:305-320`
```typescript
setTimeout(() => {
  // スクロール処理
}, 200);
```

**問題**: 
- 固定200ms待機
- レンダリングの完了を待っていない

**改善提案**: 
- `requestAnimationFrame`を使用
- または、レンダリング完了を待つ仕組みを追加

## 4. お気に入り機能フロー

### データの流れ (`app/(tabs)/recordings-library.tsx:118-141`)
```
[お気に入りボタンクリック]
  ↓
toggleFavorite(recordingId, currentFavorite)
  ├─ supabase.from('recordings')
  │  .update({ is_favorite: !currentFavorite })
  │  .eq('id', recordingId)
  └─ ローカル状態を更新
```

### 問題点

特に大きな問題は見当たらない。

## 5. 録音削除フロー

### データの流れ (`app/(tabs)/recordings-library.tsx:143-175`)
```
[削除ボタンクリック]
  ↓
Alert.alert() - 確認ダイアログ
  ↓
[削除確認]
  ↓
deleteRecording(recordingId)
  ├─ supabase.from('recordings').delete()
  └─ ローカル状態から削除
```

### 問題点

特に大きな問題は見当たらない。

## 6. 検索機能フロー

### データの流れ (`app/(tabs)/recordings-library.tsx:288-296`)
```
[検索クエリ入力]
  ↓
setSearchQuery(query)
  ↓
getFilteredRecordings()
  └─ titleまたはmemoで検索
```

### 問題点

特に大きな問題は見当たらない。

## 7. ソート機能フロー

### データの流れ (`app/(tabs)/recordings-library.tsx:323-328`)
```
sortedRecordings
  ├─ お気に入りを優先
  └─ 録音日時で降順ソート
```

### 問題点

特に大きな問題は見当たらない。

## 8. 余分なファイル・重複コード

### 重複している処理

特に大きな重複は見当たらない。

## 9. 潜在的なバグ

### バグ1: データ更新時の既存データ保持
- データが0件の場合、既存データを保持する
- 実際にデータが0件になった場合に正しく反映されない

### バグ2: Audio APIのメモリリーク
- `Audio`オブジェクトが作成されるが、クリーンアップされていない
- 複数の`Audio`オブジェクトがメモリに残る可能性

### バグ3: Web環境でのAudio API使用
- Web環境でのみ動作する
- React Nativeでは動作しない

## 10. 改善提案まとめ

### 優先度: 高
1. **Audio APIのメモリリーク解消**: `useEffect`のクリーンアップ関数でクリーンアップ
2. **データ更新時の既存データ保持問題**: データが0件の場合は空配列を設定

### 優先度: 中
3. **プラットフォームチェック**: Audio API使用前にプラットフォームチェックを追加
4. **スクロール位置の改善**: `requestAnimationFrame`を使用

### 優先度: 低
5. **コード整理**: 未使用のコードやコメントの整理

## 11. フロー図（テキストベース）

### 録音データ読み込みフロー
```
[画面表示 / フォーカス時 / 楽器変更時]
  ↓
[loadRecordings()]
  ├─ ペイウォールチェック
  ├─ アクセス不可 → 空配列を設定
  └─ アクセス可能 → データベースから取得
     └─ 楽器IDでフィルタリング
  ↓
[recordings状態を更新] ← ⚠️ 0件の場合も既存データを保持
```

### 録音再生フロー
```
[再生ボタンクリック]
  ↓
[playRecording()]
  ├─ 動画URLチェック → ブラウザで開く
  ├─ 既存の録音を停止
  ├─ Supabase Storageから公開URLを取得
  ├─ Audioオブジェクトを作成 ← ⚠️ Web環境でのみ動作
  ├─ イベントハンドラーを設定
  └─ audio.play() - 再生開始
```

## 12. 結論

録音ライブラリフローは機能しているが、以下の改善が必要：
- Audio APIのメモリリーク解消（最重要）
- データ更新時の既存データ保持問題
- プラットフォームチェックの追加

これらの改善により、メモリリークの防止とプラットフォーム互換性の向上が期待できる。



