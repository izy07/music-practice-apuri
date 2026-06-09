# コードフローとアーキテクチャ

本番挙動・競合との違い・各機能のコードフローの違いを整理し、**効率が良く根本的なエラーが起きにくい**コードを採用するための指針です。

---

## 1. 本番環境 vs 開発環境の挙動差

| 項目 | 開発環境 | 本番環境 |
|------|----------|----------|
| **判定** | `__DEV__ === true` または `NODE_ENV === 'development'` | 上記以外 |
| **キャッシュ** | 永続キャッシュ（AsyncStorage）は**無効**（古い表示ブレ防止） | 永続キャッシュ**有効** |
| **ログ** | `logger.debug` など全レベル出力 | `logger.error` のみ（テスターに詳細を見せない） |
| **Supabase** | 環境変数未設定時はローカルURL等にフォールバック可 | `EXPO_PUBLIC_SUPABASE_*` 必須、未設定で起動時エラー |
| **エラー表示** | ErrorHandler のスロットリングあり、ネットワークエラーは本番では表示しない方針 | 同左 |
| **コンソール** | Web では aria-hidden 等の警告抑制あり（開発時のみ） | 抑制なし |

**採用方針**: 環境差は `lib/cache/cachePolicy.ts`（`isDevelopmentBuild`, `shouldUsePersistentCache`）と `lib/logger.ts`（`getCurrentLogLevel`）に集約。新機能では `__DEV__` を直接多用せず、上記モジュール経由で分岐することを推奨。

---

## 2. 競合アプリとの違い（当アプリの設計上の特徴）

| 観点 | 当アプリ | 一般的な競合 |
|------|----------|--------------|
| **認証** | 1つのグローバル状態 + `useAuthAdvanced` に集約。画面は認証状態を直接触らない | 画面ごとに getSession 等を呼ぶことが多い |
| **課金/制限** | `useSubscription` → `computeEntitlement`。制限チェックは `subscriptionLimits.ts` に集約 | 画面ごとに課金APIを呼び、制限ロジックが分散しがち |
| **楽器フィルタ** | `instrumentFilter.ts` の `filterByInstrumentIdInMemory` でメモリフィルタに統一（DB問い合わせ削減） | 毎回WHEREで絞る実装が多い |
| **エラー** | `ErrorHandler.handle` + `showUserFriendlyError` でログとユーザー向けメッセージを分離 | Alert.alert を直書きすることが多い |
| **ナビゲーション** | `_layout.tsx` の useEffect で認証/楽器未選択を一元判定しリダイレクト | 各画面でリダイレクトすると競合や二重遷移が起きやすい |

**採用方針**: 認証・課金・楽器フィルタ・ナビは**共通レイヤーを経由**する。新機能では認証は `useAuthAdvanced`、課金は `useSubscription` / `subscriptionLimits`、楽器フィルタは `instrumentFilter`、画面遷移は `_layout.tsx` のロジックに任せ、画面側で独自に `router.replace` で認証ガードしない。

---

## 3. 各機能のコードフロー

### 3.1 認証フロー

```
起動
  → useAuthAdvanced (hooks/useAuthAdvanced.ts)
      → initializeAuth: getSession → handleAuthenticatedUser / 未認証処理
      → onAuthStateChange で SIGNED_IN / SIGNED_OUT を購読
  → グローバル状態更新 (updateAuthState)
  → 各コンポーネントは authState のコピーを参照

_layout.tsx (useEffect)
  → isAuthenticated, hasInstrumentSelected(), isReady, isRouterReady を参照
  → 未認証 → redirectToLogin
  → 認証済み & 楽器未選択 → router.replace('/(tabs)/tutorial')
  → 認証済み & 楽器選択済み & チュートリアル画面上 → router.replace('/(tabs)/index')
```

**ポイント**: 遷移判定は **Root の useEffect 1か所**。login/signup は「認証画面にいる間は _layout のリダイレクトをスキップ」し、ボタン押下で遷移。

### 3.2 課金・エンタイトルメントフロー

```
useSubscription (hooks/useSubscription.ts)
  → loadSubscription: getuser → ensureSubscription(user.id) → computeEntitlement(sub)
  → 解約検知: adjustAllDataOnDowngrade / 再課金検知: restoreHiddenSongsOnUpgrade
  → setEntitlement / setError / setErrorMessage

画面（例: recordings-library, goals）
  → useSubscription() で loading, entitlement, error, errorMessage, refreshSubscription を取得
  → loading 中はローディングUI、subscriptionError 時はエラーUI + 再試行ボタン
  → 制限チェック: checkMyLibraryLimit, checkDailyRecordingLimit 等 (lib/subscriptionLimits.ts)
```

**ポイント**: 課金状態は **useSubscription 1本**。制限チェックは **subscriptionLimits** の関数に集約し、画面はその結果だけを信じる。

### 3.3 データ取得フロー（画面ごとの違い）

| 画面 | データ取得 | ローディング | エラー表示 |
|------|------------|--------------|------------|
| **goals** | goalRepository + useFocusEffect で loadGoals | ローカル loading state | Alert.alert 直書き多数 |
| **my-library** | supabase.from + filterByInstrumentIdInMemory | loading state | Alert.alert / ErrorHandler 混在 |
| **recordings-library** | useSubscription + 録音一覧取得 | entitlementLoading \|\| loading | subscriptionError 時は専用エラーUI + 再試行 |
| **statistics** | getPracticeSessionsByDateRange + useMemo で集計 | 親のデータ依存 | Alert.alert |
| **index (カレンダー)** | loadPracticeData, loadTotalPracticeTime, loadRecordingsData | 内部 state | エラーは logger のみ（無視） |
| **beginner-guide** | 外部データ + キャッシュ | loadError state | ErrorHandler.handle + キャッシュフォールバック |

**問題点**:  
- エラー表示が **Alert.alert 直書き** と **ErrorHandler.handle + showUserFriendlyError** で混在。  
- データ取得が「画面内の async 関数」と「リポジトリを直接叩く」の二通りあり、**ローディング/エラー/再試行**のパターンが統一されていない。

### 3.4 エラーハンドリングフロー

```
推奨フロー:
  1. 例外 or エラーオブジェクトを catch
  2. ErrorHandler.handle(error, 'コンテキスト名', showToUser)
     → ログ出力 + （showToUser 時）showUserFriendlyError で Alert
  3. 画面固有のエラー（バリデーション等）は Alert.alert でも可。ただし文言はユーザー向けに統一

現状:
  - 多くの画面が Alert.alert('エラー', error.message) を直接使用
  - ErrorHandler は「ログ＋スロットリング＋ネットワークエラー非表示」を担当。showToUser=false の場合は Alert しない
```

**採用方針**: サーバー/ネットワーク系のエラーは **ErrorHandler.handle(..., true)** で共通表示。画面固有のバリデーションや確認ダイアログは Alert.alert のままでも可。文言は `errorMessages.ts` に寄せて徐々に統一。

### 3.5 ナビゲーション・リダイレクト

- **決定箇所**: `app/_layout.tsx` の useEffect（segments, isAuthenticated, hasInstrumentSelected, isReady, isRouterReady に依存）。
- **補助**: `useAuthNavigation` の `decideNavigationTarget` は「遷移先の決定」のみ。実際の `router.replace` は _layout で実行。
- **認証画面**: auth/login, auth/signup にいる間は _layout のリダイレクトをスキップし、ログイン/登録成功時に `router.replace` で index または tutorial へ。

**採用方針**: 認証・楽器未選択に起因するリダイレクトは **_layout 以外で行わない**。画面側は「遷移したい」場合は `router.push` のみ使い、ガードは Root に任せる。

---

## 4. 効率化と根本エラー防止のための推奨パターン

### 4.1 データ取得（新規・リファクタ時）

1. **単一責任**: 一覧取得は **リポジトリ** にまとめる。画面は「呼び出し・loading/error 状態・再試行」に専念する。
2. **状態の型**: `loading`, `error`, `data` を必ず持ち、エラー時は `error` を set し、画面で「エラー時はメッセージ＋再試行」を表示する。
3. **共通パターン**: `lib/errorHandlingHelpers.ts` の **`runWithLoadState`** を使うと、`loadFn` 実行前後に `setLoading(true/false)` と `setError(null/error)` をまとめて行え、失敗時は `ErrorHandler.handle` に委譲できる。再試行時は同じ `loadFn` を再度渡せばよい。
4. **再試行**: エラー画面に「再試行」ボタンを付け、同じ load 関数を再度実行する。
5. **キャッシュ**: 一覧などは `cachePolicy.shouldUsePersistentCache()` に従い、開発ではオフ・本番ではオンを維持する。

### 4.2 エラー表示

1. **サーバー/ネットワーク/DB**: `ErrorHandler.handle(error, '操作名', true)` を使う。ユーザー向け文言は `errorMessages.ts` / `getUserFriendlyMessage` に寄せる。
2. **バリデーション**: Alert.alert で問題ない。文言は短く明確に。
3. **スルー禁止**: エラーを catch したら「ログだけ」にせず、ユーザーには **メッセージ or 再試行** のどちらかで必ず伝える。

### 4.3 認証・課金・楽器

1. **認証**: 状態は `useAuthAdvanced` のみ。`supabase.auth.getUser()` を画面で直接叩かない。
2. **課金**: 状態と制限は `useSubscription` と `subscriptionLimits` に集約。画面は `isPremiumUser` や `checkXxxLimit` の結果を信じる。
3. **楽器**: フィルタは `filterByInstrumentIdInMemory` 等の共通関数を使う。DB に instrument_id が無い環境でも TypeScript 側で一貫してフィルタする。

### 4.4 ナビゲーション

1. **認証ガード**: _layout の useEffect に任せ、画面では `router.replace` で未認証を飛ばさない。
2. **深いリンク・404**: GitHub Pages 等のリダイレクト復元は _layout 内で一度だけ行う。

---

## 5. まとめ

- **本番と開発の差**はキャッシュ・ログ・Supabase 必須化に集約済み。新機能はここを変えずに乗せる。
- **競合との違い**は認証/課金/楽器/エラー/ナビを「共通レイヤー経由」にしている点。ここを崩さないようにする。
- **コードフローの違い**は、特に「データ取得」と「エラー表示」で画面ごとにばらつきがある。上記の推奨パターンで揃えると、効率が良く根本的なエラー（無言失敗・二重遷移・制限漏れ）が起きにくくなる。

新規画面やリファクタ時は、このドキュメントの「推奨パターン」を参照し、既存の共通モジュール（ErrorHandler, useAuthAdvanced, useSubscription, instrumentFilter, _layout のリダイレクト）をできるだけ流用することを推奨する。

---

## 6. 適用済みリファクタ（推奨フローへの移行）

- **エラー表示の統一**: サーバー/DB/ネットワーク系の失敗は `ErrorHandler.handle(error, context, true)` に統一。`Alert.alert('エラー', ...)` の二重表示を削除。対象: goals, my-library, statistics, add-goal, tuner, tutorial, representative-songs, profile-settings, index など。
- **統計画面**: 練習記録取得失敗時に `loadError` を set し、「データの読み込みに失敗しました」+「再試行」ボタンを表示。再試行で `fetchPracticeRecords(true)` を実行。
- **カレンダー画面**: `refreshPracticeData` の catch で `ErrorHandler.handle` を呼び、エラーを握りつぶさないように変更。
- **バリデーション・確認ダイアログ**: 入力チェック（例: 目標タイトル未入力）や認証必須メッセージは従来どおり `Alert.alert` のまま。
