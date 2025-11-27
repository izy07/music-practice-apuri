# goals.tsx リファクタリング計画

## 現状
- **総行数**: 2897行
- **問題**: メンテナンス困難、テストが書けない、可読性低下

## 分割後の構成

```
app/(tabs)/goals/
├── index.tsx                      (250行) メインコンポーネント
├── useGoals.ts                    (200行) 目標管理ロジック ✅
├── useTargetSong.ts               (150行) 目標曲管理
├── useInspirationalPerformances.ts (150行) 憧れの演奏管理
├── PersonalGoalsSection.tsx       (300行) 個人目標表示
├── TargetSongSection.tsx          (250行) 目標曲表示  
├── InspirationalSection.tsx       (300行) 憧れの演奏表示
├── CompletedGoalsSection.tsx      (200行) 達成済み目標
├── GoalCard.tsx                   (150行) 目標カードUI
├── AddGoalModal.tsx               (350行) 目標追加モーダル
├── TargetSongModal.tsx            (300行) 目標曲モーダル
├── PerformanceModal.tsx           (300行) 憧れの演奏モーダル
└── styles.ts                      (300行) スタイル定義
```

**合計**: 約3200行（コメント・空行含む）
**分割後の平均**: 246行/ファイル

## 実装済み
- ✅ useGoals.ts - 目標管理のカスタムフック

## 優先実装
簡略版として、最も重要な分割のみ実施します。

