# クリーンアーキテクチャ実装ガイド

## 概要

このドキュメントでは、プロフェッショナルなコード設計に基づいたアーキテクチャパターンの実装について説明します。

## アーキテクチャの原則

### 1. 依存性逆転の原則（Dependency Inversion Principle）

**問題**: UI層が直接Supabaseに依存している
**解決**: 抽象化レイヤーを通じて依存関係を逆転

```
UI層 → サービス層 → リポジトリ層 → Supabase
```

### 2. 単一責任の原則（Single Responsibility Principle）

各レイヤーは明確な責任を持つ：

- **UI層**: 表示とユーザーインタラクション
- **サービス層**: ビジネスロジック
- **リポジトリ層**: データアクセス

### 3. 開放閉鎖の原則（Open/Closed Principle）

新しい機能の追加が既存コードの変更を必要としない設計

## レイヤー構成

```
┌─────────────────────────────────┐
│         UI層（Components）        │
│  - React Components             │
│  - Hooks                        │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│       サービス層（Services）       │
│  - Business Logic              │
│  - Validation                  │
│  - Error Handling              │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│     リポジトリ層（Repositories）    │
│  - Data Access                 │
│  - Database Queries            │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│      データアクセス層（Supabase）   │
│  - Database Client             │
└─────────────────────────────────┘
```

## 実装例

### ❌ 悪い例: UI層が直接Supabaseに依存

```typescript
// app/(tabs)/goals.tsx
import { supabase } from '@/lib/supabase';

export default function GoalsScreen() {
  const [goals, setGoals] = useState([]);
  
  const loadGoals = async () => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error(error);
      return;
    }
    
    setGoals(data);
  };
  
  // ...
}
```

**問題点**:
- データベースクエリがUI層に混在
- テストが困難（Supabaseに依存）
- ビジネスロジックが散在
- エラーハンドリングが不統一

### ✅ 良い例: レイヤー分離による実装

```typescript
// app/(tabs)/goals.tsx
import { goalService } from '@/services';
import { useGoals } from './hooks/useGoals';

export default function GoalsScreen() {
  const { goals, loading, error, loadGoals } = useGoals();
  
  useEffect(() => {
    loadGoals();
  }, []);
  
  // UIのみに集中
  return (
    <View>
      {goals.map(goal => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </View>
  );
}
```

```typescript
// hooks/useGoals.ts
import { goalService } from '@/services';
import { useState, useCallback } from 'react';

export function useGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await goalService.getGoals(userId);
    
    if (result.success && result.data) {
      setGoals(result.data);
    } else {
      setError(result.error || '目標の読み込みに失敗しました');
    }
    
    setLoading(false);
  }, [userId]);
  
  return { goals, loading, error, loadGoals };
}
```

```typescript
// services/goalService.ts
import { goalRepository } from '@/repositories/goalRepository';
import { safeServiceExecute } from './baseService';

export class GoalService {
  async getGoals(userId: string, instrumentId?: string) {
    return safeServiceExecute(
      async () => {
        // ビジネスロジック（バリデーションなど）
        if (!userId) {
          throw new Error('ユーザーIDは必須です');
        }
        
        // リポジトリ層に委譲
        return await goalRepository.getGoals(userId, instrumentId);
      },
      'GoalService.getGoals'
    );
  }
}
```

```typescript
// repositories/goalRepository.ts
import { supabase } from '@/lib/supabase';

export const goalRepository = {
  async getGoals(userId: string, instrumentId?: string) {
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);
    
    if (instrumentId) {
      query = query.eq('instrument_id', instrumentId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data || [];
  },
};
```

## 依存性注入（DI）

テスト容易性を向上させるため、依存性注入パターンを使用：

```typescript
// services/goalService.ts
import { resolveService, SERVICE_KEYS } from '@/lib/dependencyInjection/container';

export class GoalService {
  private repository: IGoalRepository;
  
  constructor(repository?: IGoalRepository) {
    // 依存性注入可能（テスト時にモックを注入）
    this.repository = repository || resolveService(SERVICE_KEYS.GOAL_REPOSITORY);
  }
  
  // ...
}
```

## 型安全性の向上

共通型定義を使用して型安全性を確保：

```typescript
// types/common.ts
export type ID = string;
export type Timestamp = string;

export interface Goal {
  id: ID;
  user_id: ID;
  title: string;
  // ...
}

// services/goalService.ts
import { Goal, ID } from '@/types/common';

export class GoalService {
  async getGoals(userId: ID): Promise<ServiceResult<Goal[]>> {
    // 型安全な実装
  }
}
```

## 軽量フックの活用

不要な依存を削減するため、軽量版フックを使用：

```typescript
// ❌ 悪い例: 全てのテーマ情報を取得
const { currentTheme, practiceSettings, selectedInstrument } = useInstrumentTheme();

// ✅ 良い例: 必要な情報のみを取得
const { selectedInstrument, hasInstrument } = useInstrumentSelection();
const { primaryColor } = useInstrumentColors();
```

## ベストプラクティス

1. **UI層**: データ取得やビジネスロジックを含めない
2. **サービス層**: UI層とリポジトリ層を結ぶ中間層
3. **リポジトリ層**: データアクセスのみを担当
4. **型定義**: 共通型定義を活用して型安全性を確保
5. **エラーハンドリング**: 統一されたエラーハンドリングパターンを使用

## 移行ガイド

既存コードを段階的に移行：

1. 新しい機能は新しいアーキテクチャで実装
2. 既存コードはリファクタリング時に移行
3. リポジトリパターンが確立されたら、Supabase直接インポートを禁止

## まとめ

このアーキテクチャにより：

- ✅ **結合度の削減**: レイヤー間の依存関係が明確
- ✅ **テスト容易性**: 各レイヤーを独立してテスト可能
- ✅ **拡張性**: 新しい機能の追加が容易
- ✅ **保守性**: コードの理解と変更が容易
- ✅ **型安全性**: TypeScriptの型システムを最大限活用

