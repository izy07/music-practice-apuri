# サブグループ機能削除計画

## 概要
サブグループ機能を完全に削除し、組織レベルでのみ管理できるようにする。

## 影響範囲

### データベース
1. **`sub_groups`テーブル** - 削除
2. **`user_group_memberships.sub_group_id`** - カラム削除（NULLのみ許可）
3. **`tasks.sub_group_id`** - カラム削除（組織レベルで管理）
4. **`practice_schedules.target_sub_group_id`** - カラム削除（組織レベルで管理）

### コード
1. **型定義** (`types/organization.ts`)
   - `SubGroup`インターフェース
   - `SubGroupType`型
   - `Task.sub_group_id`
   - `UserGroupMembership.sub_group_id`

2. **リポジトリ**
   - `repositories/subGroupRepository.ts` - 削除
   - `repositories/membershipRepository.ts` - `sub_group_id`関連の処理を削除
   - `repositories/taskRepository.ts` - `sub_group_id`関連の処理を削除

3. **サービス**
   - `services/subGroupService.ts` - 削除
   - `services/taskService.ts` - `sub_group_id`関連の処理を削除

4. **フック**
   - `hooks/useSubGroup.ts` - 削除

5. **UI**
   - `app/organization-settings.tsx` - サブグループタブと機能を削除
   - `app/tasks.tsx` - サブグループ選択機能を削除、組織レベルでタスク管理
   - `app/tasks-all-orgs.tsx` - サブグループ関連の処理を削除
   - `app/calendar.tsx` - `target_sub_group_id`関連の処理を削除

6. **ライブラリ**
   - `lib/groupManagement.ts` - `SubGroupManager`を削除

## 削除手順

### Phase 1: データベースマイグレーション
1. `user_group_memberships.sub_group_id`カラムを削除
2. `tasks.sub_group_id`カラムを削除
3. `practice_schedules.target_sub_group_id`カラムを削除
4. `sub_groups`テーブルを削除
5. 外部キー制約を削除

### Phase 2: 型定義の修正
1. `SubGroup`インターフェースを削除
2. `SubGroupType`型を削除
3. `Task.sub_group_id`を削除
4. `UserGroupMembership.sub_group_id`を削除

### Phase 3: リポジトリ・サービスの修正
1. `subGroupRepository.ts`を削除
2. `subGroupService.ts`を削除
3. `membershipRepository.ts`から`sub_group_id`関連を削除
4. `taskRepository.ts`から`sub_group_id`関連を削除、組織レベルで取得するように変更

### Phase 4: UIの修正
1. `organization-settings.tsx`からサブグループタブと機能を削除
2. `tasks.tsx`を組織レベルでのタスク管理に変更
3. `tasks-all-orgs.tsx`からサブグループ関連を削除
4. `calendar.tsx`から`target_sub_group_id`関連を削除

### Phase 5: フック・ライブラリの修正
1. `useSubGroup.ts`を削除
2. `groupManagement.ts`から`SubGroupManager`を削除

## 注意事項
- 既存のサブグループデータは削除される
- タスクは組織レベルで管理されるようになる
- メンバーシップは組織レベルでのみ管理される


