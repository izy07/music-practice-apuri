# 機能フロー分析レポート #11: プロフィール設定フロー

## 概要
プロフィール情報の編集、アバター画像のアップロード、過去の所属団体・受賞・演奏経験の管理の各フローを詳細に分析し、余分な工程や潜在的なバグを特定する。

## 1. プロフィール情報読み込みフロー

### ユーザー操作の流れ
1. プロフィール設定画面 (`app/(tabs)/profile-settings.tsx`) を開く
2. ユーザープロフィール情報が自動的に読み込まれる
3. 各種設定項目が表示される

### データの流れ

#### フロントエンド処理 (`app/(tabs)/profile-settings.tsx`)
```
画面表示
  ↓
loadCurrentUser()
  ├─ getCurrentUser() - 現在のユーザー取得
  ├─ getUserProfile(user.id) - プロフィール情報取得
  ├─ ニックネームを解決（優先順位）
  │  ├─ profile.display_name
  │  ├─ user.user_metadata.display_name
  │  ├─ user.user_metadata.name
  │  └─ user.email（@より前の部分）
  ├─ 各種情報を状態に設定
  │  ├─ アバターURL
  │  ├─ 年齢情報
  │  ├─ 所属団体
  │  └─ その他
  └─ loadCareerData() - 経歴データ読み込み
```

### 問題点・余分な工程

#### 🟡 問題1: ニックネーム解決の複雑さ
**場所**: `app/(tabs)/profile-settings.tsx:104-111`
```typescript
const resolvedNickname = profile?.display_name?.trim() || 
                          user.user_metadata?.display_name?.trim() || 
                          user.user_metadata?.name?.trim() || 
                          user.email?.split('@')[0] || 
                          'ユーザー';
```

**問題**: 
- 複数の情報源からニックネームを解決
- 優先順位が複雑

**改善提案**: 
- ニックネーム解決ロジックを共通化
- または、一貫性のある情報源を決定

#### 🟡 問題2: getUserProfileの最小限のカラムのみ選択
**場所**: `repositories/userRepository.ts:43-45`
```typescript
.select('id, user_id, display_name, selected_instrument_id')
```

**問題**: 
- 最小限のカラムのみ選択している
- プロフィール設定画面で必要な情報（年齢、所属団体など）が取得できない

**改善提案**: 
- 必要なカラムを含める
- または、別途プロフィール詳細を取得する関数を作成

## 2. アバター画像アップロードフロー

### ユーザー操作の流れ
1. 「プロフィール画像を選択」ボタンをクリック
2. カメラまたはギャラリーから画像を選択
3. 画像がアップロードされ、プロフィールに反映される

### データの流れ (`app/(tabs)/profile-settings.tsx:350-430`)
```
[画像選択]
  ↓
showImagePicker()
  ├─ Alert.alert() - 選択方法を選択
  ├─ カメラ撮影 → takePhoto()
  └─ ギャラリー選択 → pickImage()
  ↓
[画像アップロード]
  ├─ ImagePicker.launchImageLibraryAsync() / launchCameraAsync()
  ├─ 画像をリサイズ
  ├─ Supabase Storageにアップロード
  │  └─ supabase.storage.from('avatars').upload(fileName, file)
  ├─ 公開URLを取得
  │  └─ supabase.storage.from('avatars').getPublicUrl(fileName)
  └─ プロフィールにアバターURLを保存
     └─ updateAvatarUrl(userId, publicUrl)
```

### 問題点

特に大きな問題は見当たらない。

## 3. プロフィール保存フロー

### ユーザー操作の流れ
1. プロフィール情報を編集
2. 「保存」ボタンをクリック
3. プロフィール情報がデータベースに保存される

### データの流れ (`app/(tabs)/profile-settings.tsx:613-673`)
```
[saveProfile()]
  ├─ バリデーション
  │  └─ ニックネーム必須チェック
  ├─ 所属団体をカンマ区切り文字列に変換
  ├─ upsertUserProfile() - プロフィール保存
  │  └─ supabase.from('user_profiles').upsert()
  ├─ fetchUserProfile() - 認証プロフィール更新
  └─ 成功メッセージ表示
```

### 問題点

#### 🟡 問題1: オプショナルカラムのコメントアウト
**場所**: `app/(tabs)/profile-settings.tsx:642-650`
```typescript
// オプショナルカラム（存在する場合のみ追加）
// これらのカラムはマイグレーション（20250120000003_add_age_fields.sql）で追加される必要があります
// カラムが存在しない場合のエラーを避けるため、一旦コメントアウト
// if (currentAge) upsertRow.current_age = parseInt(currentAge);
// if (musicStartAge) upsertRow.music_start_age = parseInt(musicStartAge);
// ...
```

**問題**: 
- 年齢や所属団体などの情報が保存されない
- マイグレーション実行後にコメントを解除する必要がある

**改善提案**: 
- カラム存在チェックを実行時に確認
- または、マイグレーションを確実に実行

#### 🟡 問題2: 所属団体のカンマ区切り保存
**場所**: `app/(tabs)/profile-settings.tsx:629-633`
```typescript
const organizationsString = currentOrganizations
  .filter(org => org.name.trim() !== '')
  .map(org => org.name.trim())
  .join(',');
```

**問題**: 
- 所属団体をカンマ区切り文字列として保存
- しかし、保存処理でコメントアウトされている

**改善提案**: 
- 所属団体テーブルを作成してリレーションで管理
- または、JSON形式で保存

## 4. 経歴データ（過去の所属団体・受賞・演奏経験）管理フロー

### ユーザー操作の流れ
1. 経歴セクションで「追加」ボタンをクリック
2. モーダルで情報を入力
3. 保存ボタンをクリック
4. データが保存され、一覧に表示される

### データの流れ

#### 過去の所属団体 (`app/(tabs)/profile-settings.tsx:505-526`)
```
[追加ボタンクリック]
  ↓
PastOrgEditorModal表示
  ├─ 情報入力
  └─ 保存
     └─ supabase.from('user_past_organizations').insert()
  ↓
loadCareerData() - 経歴データ再読み込み
```

#### 受賞 (`app/(tabs)/profile-settings.tsx:553-574`)
```
[追加ボタンクリック]
  ↓
AwardEditorModal表示
  ├─ 情報入力
  └─ 保存
     └─ supabase.from('user_awards').insert()
  ↓
loadCareerData() - 経歴データ再読み込み
```

#### 演奏経験 (`app/(tabs)/profile-settings.tsx:576-598`)
```
[追加ボタンクリック]
  ↓
PerformanceEditorModal表示
  ├─ 情報入力
  └─ 保存
     └─ supabase.from('user_performances').insert()
  ↓
loadCareerData() - 経歴データ再読み込み
```

### 問題点

特に大きな問題は見当たらない。

## 5. 削除処理フロー

### データの流れ

#### 休止期間削除 (`app/(tabs)/profile-settings.tsx:465-476`)
```
handleDeleteBreakPeriod(id)
  └─ deleteBreakPeriod(id)
     └─ supabase.from('user_break_periods').delete()
```

#### 過去の所属団体削除 (`app/(tabs)/profile-settings.tsx:478-489`)
```
handleDeletePastOrganization(id)
  └─ deletePastOrganization(id)
     └─ supabase.from('user_past_organizations').delete()
```

#### 受賞削除 (`app/(tabs)/profile-settings.tsx:491-502`)
```
handleDeleteAward(id)
  └─ deleteAward(id)
     └─ supabase.from('user_awards').delete()
```

#### 演奏経験削除 (`app/(tabs)/profile-settings.tsx:600-611`)
```
handleDeletePerformance(id)
  └─ deletePerformance(id)
     └─ supabase.from('user_performances').delete()
```

### 問題点

特に大きな問題は見当たらない。

## 6. 余分なファイル・重複コード

### 重複している処理

特に大きな重複は見当たらない。

## 7. 潜在的なバグ

### バグ1: オプショナルカラムが保存されない
- 年齢や所属団体などの情報がコメントアウトされているため、保存されない
- マイグレーション実行後にコメントを解除する必要がある

### バグ2: getUserProfileの最小限のカラムのみ選択
- プロフィール設定画面で必要な情報が取得できない可能性

## 8. 改善提案まとめ

### 優先度: 高
1. **オプショナルカラムの保存有効化**: マイグレーション実行後にコメントを解除、またはカラム存在チェックを追加
2. **getUserProfileの改善**: 必要なカラムを含める、または別途プロフィール詳細を取得する関数を作成

### 優先度: 中
3. **ニックネーム解決ロジックの共通化**: 複数の情報源からの解決ロジックを共通化
4. **所属団体の管理方法改善**: テーブルでリレーション管理、またはJSON形式で保存

### 優先度: 低
5. **コード整理**: 未使用のコードやコメントの整理

## 9. フロー図（テキストベース）

### プロフィール情報読み込みフロー
```
[画面表示]
  ↓
[loadCurrentUser()]
  ├─ getCurrentUser()
  ├─ getUserProfile() - 最小限のカラムのみ ← ⚠️ 改善必要
  ├─ ニックネーム解決（複数情報源） ← ⚠️ 複雑
  ├─ 各種情報を状態に設定
  └─ loadCareerData()
```

### プロフィール保存フロー
```
[saveProfile()]
  ├─ バリデーション
  ├─ 所属団体をカンマ区切り文字列に変換
  ├─ upsertUserProfile()
  │  └─ 基本カラムのみ保存 ← ⚠️ オプショナルカラムがコメントアウト
  ├─ fetchUserProfile()
  └─ 成功メッセージ表示
```

## 10. 結論

プロフィール設定フローは機能しているが、以下の改善が必要：
- オプショナルカラムの保存有効化（最重要）
- getUserProfileの改善（必要なカラムを含める）
- ニックネーム解決ロジックの共通化
- 所属団体の管理方法改善

これらの改善により、プロフィール情報の保存と読み込みが正常に動作するようになる。

