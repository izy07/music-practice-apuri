# 🔍 楽器拡張性レビュー

## 📊 総合評価

**拡張性スコア: C+（改善の余地あり）**  
**抽象化レベル: B-（部分的に実装済み）**  
**コード変更箇所: 4-6ファイル（22番目の楽器追加時）**

---

## ✅ **良い設計（既に実装済み）**

### 1. **InstrumentThemeContext: データベース駆動** ⭐⭐⭐⭐

**ファイル**: `components/InstrumentThemeContext.tsx:358-388`

```typescript
// ✅ 素晴らしい！データベースから動的に読み込み
const loadInstrumentsFromDB = async () => {
  const { data: instruments } = await supabase
    .from('instruments')
    .select('id, name, name_en, color_primary, color_secondary, color_accent');
  
  const mappedInstruments = instruments.map(inst => ({
    id: inst.id,
    name: inst.name,
    nameEn: inst.name_en,
    primary: inst.color_primary,
    secondary: inst.color_secondary,
    accent: inst.color_accent,
    // ... 共通のテーマ設定
  }));
  
  setDbInstruments(mappedInstruments);
};
```

**評価:**
- ✅ データベースから自動読み込み
- ✅ 新しい楽器を追加してもコード変更不要
- ✅ マイグレーションのみで対応可能

---

### 2. **データベーススキーマ: 完全に正規化** ⭐⭐⭐⭐⭐

**テーブル**: `instruments`

```sql
CREATE TABLE instruments (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color_primary TEXT NOT NULL,
  color_secondary TEXT NOT NULL,
  color_accent TEXT NOT NULL,
  starting_note TEXT,
  tuning_notes TEXT[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**評価:**
- ✅ 完全に正規化されたスキーマ
- ✅ 全ての楽器データをDBに保存
- ✅ 新規楽器は単純なINSERT文

---

## ❌ **問題のある設計（要改善）**

### 🔴 **問題1: basic-practice.tsx のハードコードマップ**

**場所**: `app/(tabs)/basic-practice.tsx:85-107`

```typescript
const getInstrumentKey = () => {
  const map: { [key: string]: string } = {
    '550e8400-e29b-41d4-a716-446655440001': 'piano',
    '550e8400-e29b-41d4-a716-446655440002': 'guitar',
    '550e8400-e29b-41d4-a716-446655440003': 'violin',
    // ... 21個全てハードコード ❌
  };
  return map[id] || 'other';
};
```

**問題:**
- ❌ UUID→キー名の変換をハードコード
- ❌ 22番目の楽器を追加するには、このマップを編集必要
- ❌ 保守性が低い

**影響:**
- 新規楽器追加時の変更箇所: **+1ファイル**

---

### 🔴 **問題2: 楽器名のswitch文**

**場所**: `app/(tabs)/basic-practice.tsx:1405-1416`

```typescript
const getInstrumentName = () => {
  switch (instrumentKey) {
    case 'violin': return 'バイオリン';
    case 'piano': return 'ピアノ';
    case 'guitar': return 'ギター';
    // ... ❌ ハードコード
    default: return '楽器';
  }
};
```

**問題:**
- ❌ 楽器名をハードコード
- ❌ データベースに既にある情報を重複定義
- ❌ 新規楽器追加時に編集必要

**影響:**
- 新規楽器追加時の変更箇所: **+1箇所**

---

### 🟡 **問題3: 絵文字マップのハードコード**

**場所**: `app/(tabs)/instrument-selection.tsx:159-183`

```typescript
const getInstrumentEmoji = (nameEn: string): string => {
  const emojiMap: { [key: string]: string } = {
    'Piano': '🎹',
    'Guitar': '🎸',
    'Violin': '🎻',
    // ... 21個全てハードコード ❌
  };
  return emojiMap[nameEn] || '🎵';
};
```

**問題:**
- ❌ 絵文字をコード内に定義
- ❌ 新規楽器追加時に編集必要

**影響:**
- 新規楽器追加時の変更箇所: **+1箇所**

---

### 🟡 **問題4: 楽器別練習メニュー**

**場所**: `app/(tabs)/basic-practice.tsx:444-1293`

```typescript
const instrumentSpecificMenus: { [key: string]: PracticeItem[] } = {
  piano: [
    { id: 'piano-scales', title: 'スケール（全調）', ... },
    // ... ピアノ専用メニュー
  ],
  violin: [
    { id: 'violin-bowing', title: '弓の使い方', ... },
    // ... バイオリン専用メニュー
  ],
  // ... 850行のハードコード ❌
};
```

**問題:**
- ❌ 850行の楽器別メニュー定義
- ❌ 新規楽器追加時に編集必要
- ⚠️ ただし、楽器固有のメニューは仕方ない面もある

**影響:**
- 新規楽器追加時の変更箇所: **+1セクション（任意）**

---

### 🟢 **問題5: main-settings.tsx の楽器リスト**

**場所**: `app/(tabs)/main-settings.tsx:145-184`

```typescript
const instrumentsData = [
  { id: 'piano', name: 'ピアノ', nameEn: 'Piano', emoji: '🎹', color: '#4CAF50' },
  { id: 'guitar', name: 'ギター', nameEn: 'Guitar', emoji: '🎸', color: '#9C27B0' },
  // ... 21個全てハードコード ❌
];
```

**問題:**
- ❌ 楽器リストをハードコード
- ❌ データベースの楽器と重複
- ❌ 新規楽器追加時に編集必要

**影響:**
- 新規楽器追加時の変更箇所: **+1ファイル**

---

## 📊 現状の拡張性分析

### **22番目の楽器を追加する際の変更箇所**

| ファイル | 変更内容 | 必須 | 行数 |
|---------|---------|------|------|
| **データベース** | INSERT文 | ✅ 必須 | 1行 |
| `InstrumentThemeContext.tsx` | defaultInstruments配列 | ⚠️ フォールバック用 | 15行 |
| `basic-practice.tsx` | UUID→キーマップ | ❌ 要修正 | 1行 |
| `basic-practice.tsx` | getInstrumentName switch | ❌ 要修正 | 1行 |
| `basic-practice.tsx` | 楽器別メニュー | △ 任意 | 50-100行 |
| `instrument-selection.tsx` | 絵文字マップ | ❌ 要修正 | 1行 |
| `main-settings.tsx` | 楽器リスト | ❌ 要修正 | 1行 |

**合計: 4-5ファイル、約70-115行の変更** ⚠️

---

## 🔧 推奨される改善策

### **修正1: InstrumentThemeContextの完全DB化** 🔴

#### 修正後の設計

```typescript
export const InstrumentThemeProvider = ({ children }) => {
  // ✅ データベースから読み込んだ楽器のみ使用
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selectedInstrument, setSelectedInstrumentState] = useState<string>('');
  
  useEffect(() => {
    loadInstrumentsFromDB();
  }, []);
  
  const loadInstrumentsFromDB = async () => {
    const { data } = await supabase
      .from('instruments')
      .select('*');  // 全カラム取得
    
    if (data) {
      const mapped = data.map(inst => ({
        id: inst.id,
        name: inst.name,
        nameEn: inst.name_en,
        primary: inst.color_primary,
        secondary: inst.color_secondary,
        accent: inst.color_accent,
        emoji: inst.emoji,  // ✅ DBに追加
        // 共通設定
        background: '#F7FAFC',
        surface: '#FFFFFF',
        text: '#2D3748',
        textSecondary: '#718096',
      }));
      setInstruments(mapped);
    }
  };
  
  // ✅ 選択中の楽器テーマを取得
  const currentTheme = instruments.find(i => i.id === selectedInstrument) 
    || instruments[0]  // フォールバック
    || defaultTheme;   // 最終フォールバック
};
```

**効果:**
- ✅ defaultInstruments配列が不要
- ✅ 新規楽器はDBのみで完結

---

### **修正2: 楽器マスターにメタデータ追加** 🔴

#### データベーススキーマ拡張

**新規マイグレーション**: `add_instrument_metadata.sql`

```sql
-- 楽器テーブルに拡張メタデータを追加
ALTER TABLE instruments 
ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '🎵',
ADD COLUMN IF NOT EXISTS key_name TEXT,  -- 'piano', 'guitar' など
ADD COLUMN IF NOT EXISTS description_ja TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 既存データに絵文字を追加
UPDATE instruments SET emoji = '🎹', key_name = 'piano' WHERE name_en = 'Piano';
UPDATE instruments SET emoji = '🎸', key_name = 'guitar' WHERE name_en = 'Guitar';
UPDATE instruments SET emoji = '🎻', key_name = 'violin' WHERE name_en = 'Violin';
UPDATE instruments SET emoji = '🪈', key_name = 'flute' WHERE name_en = 'Flute';
UPDATE instruments SET emoji = '🎺', key_name = 'trumpet' WHERE name_en = 'Trumpet';
UPDATE instruments SET emoji = '🥁', key_name = 'drums' WHERE name_en = 'Drums';
UPDATE instruments SET emoji = '🎷', key_name = 'saxophone' WHERE name_en = 'Saxophone';
UPDATE instruments SET emoji = '📯', key_name = 'horn' WHERE name_en = 'Horn';
UPDATE instruments SET emoji = '🎵', key_name = 'clarinet' WHERE name_en = 'Clarinet';
-- ... 全楽器に設定
```

**効果:**
- ✅ 全てのメタデータがDBに集約
- ✅ コード内の重複がゼロ

---

### **修正3: basic-practice.tsx の抽象化** 🔴

#### 楽器別メニューをデータベース化

**新規テーブル**: `practice_menus`

```sql
CREATE TABLE practice_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID REFERENCES instruments(id),
  key TEXT NOT NULL,  -- 'piano-scales'
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  points TEXT[],
  how_to_practice TEXT[],
  recommended_tempo TEXT,
  duration TEXT,
  tips TEXT[],
  video_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_practice_menus_instrument ON practice_menus(instrument_id, difficulty);
```

#### アプリ側の実装

```typescript
// ✅ データベースから練習メニューを読み込み
const [practiceMenus, setPracticeMenus] = useState<PracticeItem[]>([]);

useEffect(() => {
  loadPracticeMenus();
}, [selectedInstrument, selectedLevel]);

const loadPracticeMenus = async () => {
  const { data } = await supabase
    .from('practice_menus')
    .select('*')
    .eq('instrument_id', selectedInstrument)
    .eq('difficulty', selectedLevel)
    .eq('is_active', true)
    .order('display_order');
  
  setPracticeMenus(data || []);
};
```

**効果:**
- ✅ 楽器別メニューの850行が不要
- ✅ 新規楽器はDBのINSERTのみ
- ✅ CMS的にメニュー管理可能

---

### **修正4: 楽器情報取得ヘルパーの作成** 🟡

#### 新規ファイル: `lib/instrumentUtils.ts`

```typescript
import { supabase } from './supabase';

// 楽器情報のキャッシュ
let instrumentCache: Map<string, any> = new Map();
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10分

/**
 * 楽器情報を取得（キャッシュ付き）
 */
export async function getInstrument(instrumentId: string) {
  // キャッシュチェック
  if (instrumentCache.has(instrumentId) && 
      Date.now() - lastFetchTime < CACHE_DURATION) {
    return instrumentCache.get(instrumentId);
  }
  
  // DBから取得
  const { data, error } = await supabase
    .from('instruments')
    .select('*')
    .eq('id', instrumentId)
    .single();
  
  if (data) {
    instrumentCache.set(instrumentId, data);
    lastFetchTime = Date.now();
  }
  
  return data;
}

/**
 * 楽器名を取得（日本語）
 */
export async function getInstrumentName(instrumentId: string): Promise<string> {
  const instrument = await getInstrument(instrumentId);
  return instrument?.name || '楽器';
}

/**
 * 楽器名を取得（英語）
 */
export async function getInstrumentNameEn(instrumentId: string): Promise<string> {
  const instrument = await getInstrument(instrumentId);
  return instrument?.name_en || 'Instrument';
}

/**
 * 楽器の絵文字を取得
 */
export async function getInstrumentEmoji(instrumentId: string): Promise<string> {
  const instrument = await getInstrument(instrumentId);
  return instrument?.emoji || '🎵';
}

/**
 * 楽器のキー名を取得（後方互換性用）
 */
export async function getInstrumentKey(instrumentId: string): Promise<string> {
  const instrument = await getInstrument(instrumentId);
  return instrument?.key_name || 'other';
}

/**
 * 全楽器を取得
 */
export async function getAllInstruments() {
  if (instrumentCache.size > 0 && 
      Date.now() - lastFetchTime < CACHE_DURATION) {
    return Array.from(instrumentCache.values());
  }
  
  const { data } = await supabase
    .from('instruments')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (data) {
    instrumentCache.clear();
    data.forEach(inst => instrumentCache.set(inst.id, inst));
    lastFetchTime = Date.now();
  }
  
  return data || [];
}

/**
 * キャッシュをクリア
 */
export function clearInstrumentCache() {
  instrumentCache.clear();
  lastFetchTime = 0;
}
```

**使用例:**
```typescript
// ❌ 修正前
const getInstrumentName = () => {
  switch (instrumentKey) {
    case 'violin': return 'バイオリン';
    // ...
  }
};

// ✅ 修正後
import { getInstrumentName } from '@/lib/instrumentUtils';

const [instrumentName, setInstrumentName] = useState('');

useEffect(() => {
  getInstrumentName(selectedInstrument).then(setInstrumentName);
}, [selectedInstrument]);
```

---

### **修正5: InstrumentThemeContext からのヘルパー提供** 🟡

#### Context拡張

```typescript
interface InstrumentThemeContextType {
  selectedInstrument: string;
  currentTheme: Instrument;
  // ✅ 追加: 楽器情報取得ヘルパー
  getInstrument: (id: string) => Instrument | undefined;
  getAllInstruments: () => Instrument[];
  getInstrumentByKey: (key: string) => Instrument | undefined;
}

export const InstrumentThemeProvider = ({ children }) => {
  const [dbInstruments, setDbInstruments] = useState<Instrument[]>([]);
  
  // ✅ ヘルパー関数を提供
  const getInstrument = (id: string) => {
    return dbInstruments.find(i => i.id === id);
  };
  
  const getAllInstruments = () => {
    return dbInstruments;
  };
  
  const getInstrumentByKey = (key: string) => {
    return dbInstruments.find(i => i.keyName === key);
  };
  
  return (
    <InstrumentThemeContext.Provider value={{
      selectedInstrument,
      currentTheme,
      getInstrument,      // ✅ 追加
      getAllInstruments,  // ✅ 追加
      getInstrumentByKey, // ✅ 追加
      // ...
    }}>
      {children}
    </InstrumentThemeContext.Provider>
  );
};
```

**使用例:**
```typescript
// ✅ どこからでも楽器情報取得可能
const { getInstrument } = useInstrumentTheme();
const instrument = getInstrument(selectedInstrument);
console.log(instrument.name, instrument.emoji);
```

---

## 🎯 改善実装の優先度

### **Priority 1: データベーススキーマ拡張** 🔴
- emoji, key_name, description をDBに追加
- **実装時間**: 10分
- **効果**: 大

### **Priority 2: instrumentUtils.ts 作成** 🔴
- 楽器情報取得ヘルパー
- **実装時間**: 15分
- **効果**: 大

### **Priority 3: basic-practice.tsx リファクタリング** 🟡
- ハードコードマップを削除
- ヘルパー使用に変更
- **実装時間**: 20分
- **効果**: 中

### **Priority 4: instrument-selection.tsx リファクタリング** 🟡
- 絵文字マップをDB取得に変更
- **実装時間**: 10分
- **効果**: 小

### **Priority 5: main-settings.tsx リファクタリング** 🟡
- 楽器リストをDB取得に変更
- **実装時間**: 15分
- **効果**: 中

### **Priority 6: 練習メニューのDB化** 🟢（任意）
- practice_menusテーブル作成
- **実装時間**: 2-3時間
- **効果**: 大（CMS化）

---

## 📊 改善効果

### **現状**
```
22番目の楽器追加時:
  - 変更ファイル: 5ファイル
  - 変更行数: 70-115行
  - 所要時間: 30-45分
  - エラーリスク: 中
```

### **修正後（Priority 1-4実装）**
```
22番目の楽器追加時:
  - 変更ファイル: 1ファイル（マイグレーション）
  - 変更行数: 1行（INSERT文）
  - 所要時間: 3分
  - エラーリスク: 低
```

**改善率: 93%削減** 🎯

---

## 🎨 理想的なアーキテクチャ

### **完全データベース駆動設計**

```
┌──────────────────────────────────────┐
│  データベース（instruments）          │
│  - id, name, name_en, emoji           │
│  - color_*, tuning_notes             │
│  - key_name, description             │
├──────────────────────────────────────┤
│  lib/instrumentUtils.ts              │
│  - getInstrument()                   │
│  - getAllInstruments()               │
│  - キャッシュ管理                    │
├──────────────────────────────────────┤
│  InstrumentThemeContext              │
│  - DB読み込み                        │
│  - テーマ提供                        │
│  - ヘルパー提供                      │
├──────────────────────────────────────┤
│  各画面（ハードコードなし）          │
│  - Context/Utils使用のみ             │
└──────────────────────────────────────┘
```

---

## 📝 実装ステップ

### **ステップ1: データベース拡張（10分）**
```sql
ALTER TABLE instruments 
ADD COLUMN emoji TEXT DEFAULT '🎵',
ADD COLUMN key_name TEXT,
ADD COLUMN description_ja TEXT;

UPDATE instruments SET 
  emoji = '🎹', 
  key_name = 'piano' 
WHERE name_en = 'Piano';
-- ... 全楽器に設定
```

### **ステップ2: instrumentUtils.ts 作成（15分）**
- ヘルパー関数実装
- キャッシュ機能

### **ステップ3: basic-practice.tsx 修正（20分）**
- getInstrumentKey() 削除
- getInstrumentName() を instrumentUtils使用に変更
- UUIDマップ削除

### **ステップ4: instrument-selection.tsx 修正（10分）**
- getInstrumentEmoji() 削除
- DB取得に変更

### **ステップ5: main-settings.tsx 修正（15分）**
- instrumentsData配列削除
- getAllInstruments()使用

**合計: 70分（私が実装すれば15分）**

---

## 🎯 最終評価

### 現状
```
拡張性: C+（要改善）
コード重複: 多い
保守性: 低
変更箇所: 5ファイル
```

### 修正後
```
拡張性: A（優秀）
コード重複: なし
保守性: 高
変更箇所: 1ファイル（マイグレーションのみ）
```

---

## 💡 結論

**現状では22番目の楽器追加に5ファイル70行の変更が必要です。**

**推奨:**
1. DBにemoji、key_name追加（10分）
2. instrumentUtils.ts作成（15分）
3. ハードコードを削除（45分）

**これで新規楽器は単純なINSERT文1行で完結！** 🎉

実装しますか？

