# Phase 3 実装進捗

## 完了項目 ✅

### 1. 型定義ファイルの作成
- ✅ `app/(tabs)/basic-practice/types/practice.types.ts` を作成
- ✅ `PracticeItem`, `Level`, `InstrumentBasics` の型定義を追加
- ✅ `basic-practice.tsx` で型定義をインポートするように変更

## 次のステップ

### 2. データファイルの外部化（進行中）

現在の状況:
- `genericMenus`: 約313行のデータ
- `instrumentSpecificMenus`: 約898行のデータ

データファイルが非常に大きいため、段階的に進めます:

1. **`data/genericMenus.ts` の作成**:
   - 型定義をインポート
   - `genericMenus`配列をエクスポート

2. **`data/instrumentSpecificMenus.ts` の作成**:
   - 型定義をインポート
   - `instrumentSpecificMenus`オブジェクトをエクスポート

3. **`basic-practice.tsx` の修正**:
   - データ定義を削除
   - 外部ファイルからインポート

## 注意事項

- データファイルは非常に大きいため、一度にすべてを移行するのではなく、段階的に進めます
- 既存の機能が動作することを確認しながら進めます

## 今後の実装予定

3. フックの抽出
4. コンポーネントの分割
5. スタイルの分離
6. メインコンポーネントのリファクタリング

