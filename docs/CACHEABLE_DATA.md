# 頻繁に変わらないデータ（キャッシュ候補）

このプロジェクトには、頻繁に変更されないデータがいくつかあります。これらはキャッシュの候補として最適です。

---

## 📊 キャッシュ候補データ一覧

### 1. **楽器データ（instruments）** ⭐️ 最優先

**特徴:**
- データベースに保存されているが、ほとんど変更されない
- アプリ起動時に毎回取得している
- 全ユーザー共通のマスターデータ

**データ内容:**
- 楽器ID、名前（日本語/英語）
- 色設定（primary, secondary, accent）
- チューニング情報（starting_note, tuning_notes）

**現在の実装:**
```typescript
// services/instrumentService.ts
const result = await instrumentRepository.getAllInstruments();
```

**キャッシュ推奨:**
- ✅ **AsyncStorage**に保存（オフライン対応）
- ✅ **メモリキャッシュ**（アプリ起動中は再利用）
- ✅ **TTL（Time To Live）**: 24時間またはアプリ更新時まで

**実装例:**
```typescript
// キャッシュキー
const CACHE_KEY = 'instruments_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24時間

// キャッシュから取得
const cached = await AsyncStorage.getItem(CACHE_KEY);
if (cached) {
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp < CACHE_TTL) {
    return data; // キャッシュから返す
  }
}

// データベースから取得してキャッシュに保存
const instruments = await instrumentService.getAllInstruments();
await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
  data: instruments,
  timestamp: Date.now()
}));
```

---

### 2. **代表曲データ（representative_songs）** ⭐️ 最優先

**特徴:**
- 楽器ごとの代表曲リスト
- ほとんど変更されないマスターデータ
- 現在は毎回データベースから取得

**データ内容:**
- 曲名、作曲家
- 時代、ジャンル、難易度
- YouTube/Spotify URL
- 説明文（日本語/英語）

**現在の実装:**
```typescript
// app/representative-songs.tsx
const { data: songsData } = await supabase
  .from('representative_songs')
  .select('*')
  .eq('instrument_id', instrumentId)
  .order('display_order', { ascending: true });
```

**キャッシュ推奨:**
- ✅ **AsyncStorage**に保存（楽器IDごと）
- ✅ **メモリキャッシュ**（同じ楽器の曲は再利用）
- ✅ **TTL**: 7日間（曲データは滅多に変わらない）

**実装例:**
```typescript
const CACHE_KEY = `representative_songs_${instrumentId}`;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7日間
```

---

### 3. **楽器ガイドデータ（instrumentGuides.ts）** ✅ 既に静的

**特徴:**
- TypeScriptファイルにハードコードされている
- ビルド時にバンドルされる
- 変更時はアプリの再ビルドが必要

**データ内容:**
- 楽器の説明、練習方法
- FAQ、ロードマップ
- リソース（動画、画像）

**現在の実装:**
```typescript
// data/instrumentGuides.ts
export const instrumentGuides = {
  violin: { ... },
  piano: { ... },
  // ...
};
```

**キャッシュ状況:**
- ✅ **既に最適化済み**（静的データ）
- 追加のキャッシュは不要

---

### 4. **ユーザー設定（user_settings）** ⚠️ 条件付き

**特徴:**
- ユーザーごとに異なる
- 変更頻度は低い（言語、テーマ設定など）
- 現在はAsyncStorageにも保存されている

**データ内容:**
- 言語設定（language）
- テーマ設定（theme）
- 通知設定（notification_settings）
- メトロノーム設定（metronome_settings）
- チューナー設定（tuner_settings）

**現在の実装:**
```typescript
// AsyncStorageに保存
await AsyncStorage.setItem('app_language', lang);

// データベースにも保存
await saveLanguageSetting(userId, language);
```

**キャッシュ推奨:**
- ✅ **AsyncStorage**（既に実装済み）
- ⚠️ **メモリキャッシュ**（セッション中のみ）
- ❌ **長期間キャッシュは不要**（ユーザーが変更する可能性がある）

---

### 5. **組織データ（organizations）** ⚠️ 条件付き

**特徴:**
- 組織情報は頻繁に変わらない
- ただし、メンバー情報は変わる可能性がある

**データ内容:**
- 組織名、説明
- 組織設定
- メンバーリスト

**キャッシュ推奨:**
- ✅ **メモリキャッシュ**（セッション中のみ）
- ⚠️ **AsyncStorage**（オフライン対応が必要な場合のみ）
- ⚠️ **TTL**: 1時間（メンバー情報が変わる可能性）

---

## 🎯 キャッシュ戦略の推奨

### 優先度1: 即座に実装すべき

1. **楽器データ（instruments）**
   - 影響: アプリ起動時のパフォーマンス向上
   - 実装難易度: 低
   - 効果: 高

2. **代表曲データ（representative_songs）**
   - 影響: 代表曲画面の読み込み速度向上
   - 実装難易度: 低
   - 効果: 中〜高

### 優先度2: 検討すべき

3. **ユーザー設定（user_settings）**
   - 現在AsyncStorageに保存済み
   - メモリキャッシュの追加を検討

### 優先度3: 現状維持

4. **楽器ガイドデータ（instrumentGuides.ts）**
   - 既に静的データとして最適化済み

---

## 💡 実装パターン

### パターン1: AsyncStorage + メモリキャッシュ

```typescript
class DataCache {
  private memoryCache = new Map<string, { data: any; timestamp: number }>();
  
  async get<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
    // 1. メモリキャッシュをチェック
    const cached = this.memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    // 2. AsyncStorageをチェック
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < ttl) {
          // メモリキャッシュに保存
          this.memoryCache.set(key, { data, timestamp });
          return data;
        }
      }
    } catch (error) {
      // AsyncStorageエラーは無視
    }
    
    // 3. データベースから取得
    const data = await fetcher();
    
    // 4. キャッシュに保存
    const timestamp = Date.now();
    this.memoryCache.set(key, { data, timestamp });
    try {
      await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp }));
    } catch (error) {
      // AsyncStorageエラーは無視
    }
    
    return data;
  }
  
  invalidate(key: string) {
    this.memoryCache.delete(key);
    AsyncStorage.removeItem(key);
  }
}
```

### パターン2: React Query / SWR を使用

```typescript
import { useQuery } from '@tanstack/react-query';

// 楽器データの取得（自動キャッシュ）
const { data: instruments } = useQuery({
  queryKey: ['instruments'],
  queryFn: () => instrumentService.getAllInstruments(),
  staleTime: 24 * 60 * 60 * 1000, // 24時間
  cacheTime: 7 * 24 * 60 * 60 * 1000, // 7日間
});
```

---

## 📈 期待される効果

### パフォーマンス向上

1. **アプリ起動時間の短縮**
   - 楽器データの取得が不要になる
   - 推定: 200-500ms短縮

2. **画面遷移の高速化**
   - 代表曲画面の読み込みが即座に
   - 推定: 300-800ms短縮

3. **オフライン対応**
   - ネットワーク接続なしでも基本機能が動作
   - ユーザー体験の向上

### データベース負荷の軽減

1. **リクエスト数の削減**
   - 楽器データ: 1日あたり数百〜数千リクエスト削減
   - 代表曲データ: 同様に削減

2. **コスト削減**
   - Supabaseのリクエスト数が減る
   - 特に無料プランで効果的

---

## ⚠️ 注意事項

### キャッシュの無効化

キャッシュを無効化するタイミング:

1. **アプリの更新時**
   - 新しいバージョンではキャッシュをクリア

2. **データの手動更新時**
   - 管理者が楽器データを更新した場合

3. **エラー発生時**
   - データベースエラー時はキャッシュを無効化

### キャッシュサイズの管理

- AsyncStorageの容量制限に注意
- 古いキャッシュを定期的に削除
- キャッシュサイズの監視

---

## 🔧 実装チェックリスト

- [ ] 楽器データのキャッシュ実装
- [ ] 代表曲データのキャッシュ実装
- [ ] キャッシュ無効化ロジックの実装
- [ ] エラーハンドリングの追加
- [ ] オフライン対応のテスト
- [ ] パフォーマンステスト
- [ ] キャッシュサイズの監視

---

## 📚 参考資料

- [AsyncStorage ドキュメント](https://react-native-async-storage.github.io/async-storage/)
- [React Query ドキュメント](https://tanstack.com/query/latest)
- [SWR ドキュメント](https://swr.vercel.app/)

---

## まとめ

**頻繁に変わらないデータ:**

1. ✅ **楽器データ（instruments）** - 最優先でキャッシュ実装
2. ✅ **代表曲データ（representative_songs）** - 最優先でキャッシュ実装
3. ✅ **楽器ガイドデータ（instrumentGuides.ts）** - 既に静的データ
4. ⚠️ **ユーザー設定（user_settings）** - AsyncStorageに保存済み
5. ⚠️ **組織データ（organizations）** - 条件付きでキャッシュ

これらのデータをキャッシュすることで、アプリのパフォーマンスが大幅に向上し、ユーザー体験が改善されます！



