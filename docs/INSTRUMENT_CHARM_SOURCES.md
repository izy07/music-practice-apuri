# 楽器の魅力文章が書いてあるファイル

各楽器の「魅力」テキストは次の2ファイルで管理されています。

## 1. `components/InstrumentHeader.tsx`

- **用途**: 学習ツールモーダル内で表示する、楽器ごとの長文の魅力説明
- **場所**: `getInstrumentAppealText()` 内の `appealMapJa`（日本語）と `appealMapEn`（英語）
- **キー**: 楽器の英語名（Piano, Guitar, Violin, Flute, Trumpet, Drums, Saxophone, Horn, Clarinet, Trombone, Viola, Cello, Bassoon, Oboe, Harp, Contrabass, Other など）
- **編集**: 約352行目〜393行付近のオブジェクトを編集

## 2. `data/instrumentGuides.ts`

- **用途**: 初心者ガイド画面で表示する、楽器ごとの概要・ヒーロー文・魅力文
- **場所**: 各楽器オブジェクト内の
  - `hero.tagline` … 短いキャッチコピー
  - `hero.subtitle` … サブタイトル
  - `overview.charm` … 魅力の一文
  - `overview.yourCharm` … 「あなたの〇〇は…」の一文
- **編集**: 楽器キー（violin, piano, guitar, flute など）ごとのオブジェクトを編集

---

- **InstrumentHeader**: モーダル用の長文（1楽器あたり1〜2文）
- **instrumentGuides**: ガイド用の短文・中程度の文（tagline / charm / yourCharm）
