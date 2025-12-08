# 機能フロー分析レポート #1: 認証フロー

## 概要
ログイン、新規登録、ログアウトの認証フローを詳細に分析し、余分な工程や潜在的なバグを特定する。

## 1. ログインフロー

### ユーザー操作の流れ
1. ユーザーがログイン画面 (`app/auth/login.tsx`) を開く
2. メールアドレスとパスワードを入力
3. 「ログイン」ボタンをクリック
4. ログイン成功 → メイン画面またはチュートリアル画面に遷移
5. ログイン失敗 → エラーメッセージ表示、新規登録への誘導

### データの流れ

#### フロントエンド処理 (`app/auth/login.tsx`)
```
handleLogin()
├─ フォームバリデーション
│  └─ validateForm()
│     ├─ メールアドレス形式チェック
│     └─ パスワード存在チェック
├─ signIn(formData) 呼び出し (useAuthAdvanced)
│  └─ signInWithPassword() (Supabase)
│     ├─ レート制限チェック
│     ├─ エラーハンドリング
│     └─ セッション確立
├─ ログイン直後フラグ設定 (sessionStorage)
│  └─ 'login-just-completed' = 'true'
├─ 認証状態更新待機 (最大2秒、100ms × 20回)
│  └─ isAuthenticated確認
└─ 画面遷移判定
   ├─ canAccessMainApp() → /(tabs)/
   ├─ needsTutorial() → /(tabs)/tutorial
   └─ その他 → /(tabs)/instrument-selection
```

#### バックエンド処理 (`hooks/useAuthAdvanced.ts`)
```
signIn(formData)
├─ レート制限チェック
│  └─ rateLimiter.isBlocked(emailKey)
├─ Supabase認証
│  └─ supabase.auth.signInWithPassword()
├─ セッション確認
│  └─ supabase.auth.getSession()
├─ ユーザープロフィール取得
│  └─ fetchUserProfile()
└─ 認証状態更新
   └─ updateAuthState()
```

### 問題点・余分な工程

#### 🔴 問題1: 認証状態更新待機の冗長性
**場所**: `app/auth/login.tsx:229-235`
```typescript
let retryCount = 0;
const maxRetries = 20; // 2秒間待機（100ms × 20回）
while (retryCount < maxRetries && !isAuthenticated && !isLoading) {
  await new Promise(resolve => setTimeout(resolve, 100));
  retryCount++;
}
```

**問題**: 
- `useAuthAdvanced`の`onAuthStateChange`で既に認証状態が更新されるはず
- この待機ループは冗長で、2秒の遅延が発生する可能性
- `useEffect`で認証状態を監視しているため、手動待機は不要

**改善提案**: 
- 待機ループを削除し、`useEffect`での自動遷移に任せる
- `isAuthenticated`が更新されたら自動的に遷移

#### 🟡 問題2: sessionStorageフラグの二重管理
**場所**: `app/auth/login.tsx:224-227`
```typescript
sessionStorage.setItem('login-just-completed', 'true');
```

**問題**: 
- `_layout.tsx`でも同様のフラグをチェックしているが、削除タイミングが不透明
- フラグが残ると、次回のログイン時に影響する可能性

**改善提案**: 
- フラグの削除タイミングを明確にする
- または、フラグを使わずに認証状態のみで判定する

#### 🟡 問題3: エラー状態の重複管理
**場所**: `app/auth/login.tsx:71, 184, 220`
```typescript
const [uiError, setUiError] = useState<string | null>(null);
// useAuthAdvancedからもerrorが返される
const { error } = useAuthAdvanced();
```

**問題**: 
- `uiError`と`error`の二重管理
- 同期が取れていない可能性

**改善提案**: 
- `error`のみを使用し、`uiError`を削除

## 2. 新規登録フロー

### ユーザー操作の流れ
1. ユーザーが新規登録画面 (`app/auth/signup.tsx`) を開く
2. ニックネーム、メールアドレス、パスワード、パスワード確認を入力
3. 「新規登録」ボタンをクリック
4. 登録成功 → チュートリアル画面に遷移
5. 登録失敗 → エラーメッセージ表示

### データの流れ

#### フロントエンド処理 (`app/auth/signup.tsx`)
```
handleSignup()
├─ フォームバリデーション
│  └─ validateForm()
│     ├─ メールアドレス形式チェック
│     ├─ パスワード強度チェック（8文字以上、小文字と数字）
│     ├─ パスワード一致チェック
│     └─ ニックネーム長チェック（2文字以上）
├─ signUp(formData) 呼び出し（ローカル関数）
│  ├─ supabase.auth.signUp()
│  │  └─ user_metadataにニックネーム保存
│  ├─ プロフィール存在確認（500ms待機後）
│  │  └─ user_profilesテーブル確認
│  ├─ プロフィール作成（存在しない場合）
│  │  └─ upsert処理
│  └─ セッション確認
├─ 新規登録処理フラグ設定 (sessionStorage)
│  ├─ 'signup-processing' = 'true'
│  └─ 'signup-just-completed' = 'true'
├─ チュートリアル画面への即座遷移
│  └─ router.replace('/(tabs)/tutorial')
└─ バックグラウンドで認証状態更新
   └─ fetchUserProfile() (非同期)
```

### 問題点・余分な工程

#### 🔴 問題1: プロフィール作成の手動処理
**場所**: `app/auth/signup.tsx:118-166`
```typescript
// user_profilesレコードが存在することを確認し、存在しない場合は作成する
await new Promise(resolve => setTimeout(resolve, 500));
const { data: existingProfile } = await supabase.from('user_profiles')...
if (!existingProfile) {
  // 手動でプロフィール作成
}
```

**問題**: 
- データベーストリガーで自動作成されるべき処理を手動で行っている
- 500msの固定待機は不確実（トリガー実行タイミングに依存）
- トリガーと手動作成の二重処理の可能性

**改善提案**: 
- データベーストリガーで自動作成されるようにする
- 手動作成処理を削除
- トリガーの動作を確認し、必要に応じて修正

#### 🔴 問題2: 複雑なフラグ管理
**場所**: `app/auth/signup.tsx:323-358`
```typescript
sessionStorage.setItem('signup-processing', 'true');
sessionStorage.setItem('signup-just-completed', 'true');
// 複数箇所で削除処理が散在
```

**問題**: 
- フラグが2つあり、削除タイミングが複数箇所に散在
- フラグが残ると次回起動時に影響
- 管理が複雑

**改善提案**: 
- フラグを1つに統合
- 削除処理を1箇所に集約
- または、フラグを使わず認証状態のみで判定

#### ✅ 問題3: 即座遷移と非同期更新の競合（解決済み）
**場所**: `app/auth/signup.tsx:296-348`
**状態**: ✅ **解決済み**

**修正内容**: 
- 認証状態更新を待ってから画面遷移するように変更
- セッション確認と`fetchUserProfile()`を同期的に実行
- 指数バックオフによるポーリングでセッション確立を待機

**修正後の実装**:
```typescript
// 認証状態を更新してから画面遷移する（_layout.tsxの認証チェックと競合しないようにする）
await fetchUserProfile(); // 認証状態更新を待つ
logger.debug('✅ 認証状態更新完了 - チュートリアル画面に遷移');
router.replace('/(tabs)/tutorial'); // 認証状態更新後に遷移
```

**効果**: 
- `_layout.tsx`の認証チェックと競合しない
- 認証状態が確実に更新されてから画面遷移
- 処理の順序が明確になり、バグの可能性を低減

#### ✅ 問題4: 待機時間のハードコーディング（解決済み）
**場所**: `app/auth/signup.tsx:309-336`
**状態**: ✅ **解決済み**

**修正内容**: 
- 固定待機時間（500ms、1000ms、1500ms）を削除
- 指数バックオフによるポーリングに変更
- セッション確認をポーリングで実行

**修正後の実装**:
```typescript
// 指数バックオフ: 200ms, 400ms, 800ms, 1600ms, 3200ms
const baseDelay = 200; // ベース遅延時間（ms）
while (retryCount < maxRetries) {
  const delay = baseDelay * Math.pow(2, retryCount);
  await new Promise(resolve => setTimeout(resolve, delay));
  const { data: retrySessionData } = await supabase.auth.getSession();
  if (retrySessionData.session?.user) {
    await fetchUserProfile();
    break;
  }
  retryCount++;
}
```

**効果**: 
- 固定時間待機の問題を解消
- ネットワーク状況に応じた適応的な処理
- 早く確立された場合は速やかに処理、遅い場合でも適切に待機
- ポーリングで状態を確認し、確実に処理

## 3. ログアウトフロー

### データの流れ (`hooks/useAuthAdvanced.ts`)
```
signOut()
├─ supabase.auth.signOut()
├─ AsyncStorageクリア
│  └─ auth-storage 削除
└─ 認証状態リセット
   └─ updateAuthState({ user: null, isAuthenticated: false })
```

### 問題点
現在の実装は比較的シンプルで、大きな問題は見当たらない。

## 4. 認証状態管理 (`app/_layout.tsx`)

### 問題点・余分な工程

#### ✅ 問題1: 複雑な認証チェックロジック（解決済み）
**場所**: `app/_layout.tsx:362-451`
**状態**: ✅ **解決済み**

**修正内容**: 
- 認証チェックロジックを統一（Web/ネイティブ共通）
- 変数の定義を最初に統一（重複定義を削除）
- Web環境特有の処理を最小限に（リロード時の画面維持のみ）
- 条件分岐を論理的な順序で整理
- コード行数を約30%削減（124行 → 約90行）

**修正後の構造**:
```typescript
// 1. 初期化チェック（共通）
// 2. セグメント取得（Web環境ではrefから取得）
// 3. 許可画面チェック（共通）
// 4. Web環境特有処理（リロード時の画面維持のみ）
// 5. 未認証チェック（共通）
// 6. 楽器選択チェック（共通）
// 7. 画面遷移（共通）
```

**効果**: 
- 可読性の向上: 処理の流れが明確
- 保守性の向上: 重複が減り、修正箇所が明確
- パフォーマンス: 不要な条件分岐を削減
- 一貫性: Web/ネイティブで同じロジックを使用

## 5. 余分なファイル・重複コード

### 使用されていない可能性のあるファイル
- ✅ `app/gakki-renshu/login.tsx` - **削除済み**（未使用のログイン画面）
- ✅ `hooks/useAuthSimple.ts` - **削除済み**（`useAuthAdvanced`に統合済み）
- ✅ `stores/useAuthStore.ts` - **削除済み**（`useAuthAdvanced`が標準化）

### 重複している処理
- ✅ 認証状態の管理: **統一済み**（`useAuthAdvanced`のみ使用）
- エラーハンドリング: 複数箇所で同様の処理が重複（段階的に`ErrorHandler`に統一予定）

## 6. 潜在的なバグ

### ✅ バグ1: メモリリークの可能性（適切に処理済み）
**状態**: ✅ **問題なし**

**確認結果**:
- `authStateListeners`は`useEffect`のクリーンアップ関数で適切に削除されている（`useAuthAdvanced.ts:270-272`）
- `visibilitychange`イベントリスナーも適切にクリーンアップされている（`useAuthAdvanced.ts:343-347`）
- すべてのリスナーが適切にクリーンアップされている

---

### ✅ バグ2: 競合状態（Race Condition）（適切に処理済み）
**状態**: ✅ **問題なし**

**確認結果**:
- **ログイン処理**: `isLoggingIn`フラグと`disabled`属性で複数回クリックを防いでいる（`login.tsx:460`）
- **新規登録処理**: `isLoading`フラグで制御され、ボタンと入力フィールドが無効化される（`signup.tsx:514`）
- **認証状態更新中の画面遷移**: 認証状態更新を待ってから画面遷移するため、競合しない（`signup.tsx:306, 322`）

---

### ✅ バグ3: セッション状態の不整合（適切に処理済み）
**状態**: ✅ **問題なし**

**確認結果**:
- **プロフィールが存在しない場合**: `handleAuthenticatedUser`関数でフォールバック処理がある（`useAuthAdvanced.ts:380-504`）
  - プロフィールが存在しない場合は新規作成を試みる
  - 作成に失敗した場合は基本情報のみで処理を続行
- **オフライン時のセッション状態**: ネットワークエラーを適切に処理（`useAuthAdvanced.ts:189-216`）
  - ネットワークエラーはエラーとして扱わず、未認証状態として処理
  - オフライン時でもアプリが正常に動作する

## 7. 改善提案まとめ

### 優先度: 高
1. **プロフィール作成の自動化**: データベーストリガーで処理
2. **認証状態更新待機の削除**: useEffectに任せる
3. **フラグ管理の簡素化**: フラグを減らす、削除タイミングを明確化

### 優先度: 中
4. **エラー状態の統一**: uiErrorとerrorの統合
5. **待機時間の改善**: ポーリングまたはイベントリスナー
6. **認証チェックロジックの統一**: Web/ネイティブ環境の統一

### 優先度: 低
7. **未使用ファイルの削除**: 使用されていないファイルを確認
8. **重複コードの統合**: 認証状態管理の統合

## 8. フロー図（テキストベース）

### ログインフロー
```
[ユーザー入力]
  ↓
[フォームバリデーション]
  ↓
[レート制限チェック]
  ↓
[Supabase認証]
  ↓
[セッション確認] ← ⚠️ 余分な待機ループ（2秒）
  ↓
[プロフィール取得]
  ↓
[認証状態更新]
  ↓
[画面遷移判定]
  ├─ メイン画面
  ├─ チュートリアル画面
  └─ 楽器選択画面
```

### 新規登録フロー
```
[ユーザー入力]
  ↓
[フォームバリデーション]
  ↓
[Supabase新規登録]
  ↓
[プロフィール確認] ← ⚠️ 500ms固定待機
  ↓
[プロフィール作成] ← ⚠️ 手動作成（トリガーと重複の可能性）
  ↓
[フラグ設定] ← ⚠️ 複雑なフラグ管理
  ↓
[即座遷移] ← ⚠️ 認証状態更新前に遷移
  ↓
[バックグラウンド更新] ← ⚠️ 競合の可能性
```

## 9. 結論

認証フローは機能しているが、以下の改善が必要：
- 余分な待機処理の削除
- フラグ管理の簡素化
- データベーストリガーとの重複処理の解消
- エラー状態管理の統一

これらの改善により、ログイン・新規登録の速度向上と、バグの可能性を低減できる。

