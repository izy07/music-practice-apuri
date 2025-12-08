# 機能フロー分析レポート #6: 組織管理フロー

## 概要
組織の作成、参加、検索、削除、メンバーシップ管理の各フローを詳細に分析し、余分な工程や潜在的なバグを特定する。

## 1. 組織作成フロー

### ユーザー操作の流れ
1. 組織管理画面 (`app/(tabs)/share.tsx`) で「組織を作成」ボタンをクリック
2. 組織名、説明、ソロモード設定を入力
3. 「作成」ボタンをクリック
4. 組織が作成され、パスワードと招待コードが表示される

### データの流れ

#### フロントエンド処理 (`app/(tabs)/share.tsx`)
```
[組織作成ボタンクリック]
  ↓
handleCreateOrganization()
  ├─ バリデーション
  │  ├─ 組織名必須チェック
  │  └─ 認証チェック
  ├─ organizationService.createOrganization() 呼び出し
  │  └─ organizationRepository.create()
  │     ├─ 組織名の正規化
  │     ├─ パスワード生成（ソロモードでない場合）
  │     ├─ パスワードハッシュ化
  │     ├─ 招待コード生成
  │     ├─ 招待コードハッシュ化
  │     └─ INSERT実行
  ├─ メンバーシップ確認（リトライロジック）
  │  └─ 最大3回リトライ（各500ms待機）
  └─ 成功モーダル表示
```

### 問題点・余分な工程

#### 🟡 問題1: メンバーシップ確認の固定待機時間
**場所**: `services/organizationService.ts:214-236`
```typescript
// メンバーシップが作成されるまで最大3回リトライ（各500ms待機）
for (let retry = 0; retry < 3; retry++) {
  await new Promise(resolve => setTimeout(resolve, 500));
  // メンバーシップ確認
}
```

**問題**: 
- データベーストリガーでメンバーシップが作成されるため、アプリケーション側で待機
- 固定500ms待機は不確実
- リトライ回数が固定（最大3回）

**改善提案**: 
- 指数バックオフでリトライ
- または、メンバーシップ作成をアプリケーション側で明示的に行う（トリガーに依存しない）

#### 🟡 問題2: ソロモードとグループモードの処理分岐
**場所**: `services/organizationService.ts:158-193`
- ソロモードの場合、パスワードと招待コードを生成しない
- カラムの存在チェックが複雑

**改善提案**: 
- 処理を明確に分離（関数を分割）

## 2. 組織参加フロー

### ユーザー操作の流れ
1. 組織管理画面で「組織に参加」ボタンをクリック
2. 組織名で検索
3. 組織を選択
4. パスワードを入力
5. 「参加」ボタンをクリック
6. 組織に参加完了

### データの流れ

#### フロントエンド処理 (`app/(tabs)/share.tsx`)
```
[組織名検索]
  ↓
handleSearchOrganizations()
  ├─ organizationService.searchByName() 呼び出し
  │  └─ organizationRepository.searchByName()
  ├─ 検索結果処理
  │  ├─ 0件 → アラート表示
  │  ├─ 1件 → 自動選択
  │  └─ 複数件 → アラート表示
  ↓
[パスワード入力]
  ↓
handleJoinOrganization()
  ├─ organizationService.joinOrganization() 呼び出し
  │  └─ パスワード検証
  │     ├─ organizationRepository.findById()
  │     ├─ verifyPassword()
  │     └─ membershipRepository.create()
  └─ 成功メッセージ表示
```

### 問題点

#### 🟡 問題1: 複数組織が見つかった場合の処理
**場所**: `app/(tabs)/share.tsx:119-123`
```typescript
if (foundOrgs.length > 1) {
  const orgNames = foundOrgs.map(org => org.name);
  Alert.alert(t('multipleOrganizationsFound'), orgNames.join('\n'));
}
```

**問題**: 
- アラートに組織名を表示するのみ
- ユーザーが選択できない

**改善提案**: 
- 選択可能なリストを表示
- または、組織IDを含む詳細情報を表示

#### 🟡 問題2: 既存メンバーの場合のエラーハンドリング
**場所**: `services/organizationService.ts:395-401`
```typescript
if (membershipResult.error) {
  // 既にメンバーの場合は成功として扱う
  const errorCode = (membershipResult.error as any).code;
  if (errorCode !== '23505') {
    throw membershipResult.error;
  }
}
```

**問題**: 
- エラーコードで判定している（PostgreSQLの一意制約エラー）
- エラーメッセージをチェックしていない

**改善提案**: 
- エラーメッセージも確認
- または、参加前にメンバーシップを確認

## 3. 組織検索フロー

### データの流れ

#### バックエンド処理 (`repositories/organizationRepository.ts:217-229`)
```
searchByName(name, limit)
  ├─ supabase.from('organizations')
  │  .select('*')
  │  .ilike('name', `%${name}%`)
  │  .limit(limit)
  └─ 結果を返す
```

### 問題点

特に大きな問題は見当たらない。

## 4. メンバーシップ管理フロー

### データの流れ

#### バックエンド処理
- **自動作成**: 組織作成時にデータベーストリガーでメンバーシップが自動的に作成される
- **手動作成**: 組織参加時に`membershipRepository.create()`で作成

### 問題点

#### 🟡 問題1: データベーストリガーへの依存
**場所**: `services/organizationService.ts:210-253`
- メンバーシップの作成をデータベーストリガーに依存
- アプリケーション側で待機処理が必要

**改善提案**: 
- トリガーに依存せず、アプリケーション側で明示的にメンバーシップを作成
- または、トリガーの動作を確認する仕組みを追加

## 5. 組織削除フロー

### データの流れ

#### フロントエンド処理
```
[削除ボタンクリック]
  ↓
deleteOrganization(organizationId)
  ├─ organizationService.deleteOrganization() 呼び出し
  │  └─ organizationRepository.delete()
  └─ 組織一覧を再読み込み
```

### 問題点

特に大きな問題は見当たらない。

## 6. 余分なファイル・重複コード

### 重複している処理

特に大きな重複は見当たらない。

## 7. 潜在的なバグ

### バグ1: メンバーシップ確認の競合状態
- 組織作成後にメンバーシップが作成されるまで待機しているが、リトライ中に他の処理が実行される可能性
- 固定待機時間では不確実

### バグ2: 既存メンバーの判定
- エラーコードで判定しているが、他のエラーも23505になる可能性がある

### バグ3: パスワードと平文パスワードの混在
**場所**: `services/organizationService.ts:188-189`
```typescript
insertData.password = password;
insertData.password_hash = passwordHash;
```

**問題**: 
- パスワードの平文も保存されている
- セキュリティ上の問題

**改善提案**: 
- 平文パスワードは保存しない（`password_hash`のみ保存）

## 8. 改善提案まとめ

### 優先度: 高
1. **パスワードの平文保存を削除**: `password`カラムに平文を保存しない
2. **メンバーシップ確認の改善**: 指数バックオフでリトライ、またはアプリケーション側で明示的に作成

### 優先度: 中
3. **既存メンバーの判定改善**: エラーメッセージも確認、または事前チェック
4. **複数組織が見つかった場合の処理改善**: 選択可能なリストを表示

### 優先度: 低
5. **ソロモードとグループモードの処理分離**: 関数を分割して可読性向上

## 9. フロー図（テキストベース）

### 組織作成フロー
```
[組織作成ボタンクリック]
  ↓
[バリデーション]
  ├─ 組織名必須チェック
  └─ 認証チェック
  ↓
[organizationService.createOrganization()]
  ├─ 組織名の正規化
  ├─ パスワード生成（ソロモードでない場合）
  ├─ パスワードハッシュ化
  ├─ 招待コード生成
  ├─ 招待コードハッシュ化
  └─ INSERT実行（パスワード平文も保存） ← ⚠️ セキュリティ問題
  ↓
[メンバーシップ確認（リトライ）] ← ⚠️ 固定待機時間
  ├─ 500ms待機
  ├─ メンバーシップ確認
  └─ 最大3回リトライ
  ↓
[成功モーダル表示]
```

### 組織参加フロー
```
[組織名検索]
  ↓
[organizationService.searchByName()]
  └─ 組織検索
  ↓
[検索結果処理]
  ├─ 0件 → アラート
  ├─ 1件 → 自動選択
  └─ 複数件 → アラート（選択不可） ← ⚠️ 改善必要
  ↓
[パスワード入力]
  ↓
[organizationService.joinOrganization()]
  ├─ パスワード検証
  ├─ membershipRepository.create()
  └─ 既存メンバーの場合はエラーを無視（エラーコード判定） ← ⚠️ 改善必要
  ↓
[成功メッセージ表示]
```

## 10. 結論

組織管理フローは機能しているが、以下の改善が必要：
- パスワードの平文保存を削除（最重要）
- メンバーシップ確認の改善（固定待機時間から指数バックオフへ）
- 既存メンバーの判定改善
- 複数組織が見つかった場合の処理改善

これらの改善により、セキュリティ向上とコードの可読性向上が期待できる。

