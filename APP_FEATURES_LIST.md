# アプリ機能一覧（コードベース準拠）

> **調査日:** 2026-09-22  
> **調査方法:** `app/` 配下の全ルート、`components/`、`repositories/`、`lib/` を横断参照。旧ドキュメント・コメントは参照せず、**到達可能な UI と実際の処理**のみ記載。  
> **用途:** 機能削減の検討、機能利用ログ設計、クローズドテスト前の仕様確認。

---

## サマリー

| 区分 | 数 |
|------|-----|
| タブバー表示（メイン） | 5 |
| UI から到達可能な画面 | 約 30 |
| 到達不可（オーファン/スタブ） | 約 10 |
| UI 未実装（準備中・Alert のみ） | 3 |
| DB スキーマのみ（UI なし） | 組織・出欠・タスク関連 |

**組織機能・共有タブは存在しない。** 旧版ドキュメントの記載は誤り。

---

## 1. ナビゲーション構造

### 1.1 メインタブ（`app/(tabs)/_layout.tsx`）

左 → 右の順。中央がカレンダー。

| 順 | route | 表示名 | ファイル |
|----|-------|--------|----------|
| 1 | `timer` | タイマー | `timer.tsx` |
| 2 | `goals` | 目標 | `goals.tsx` |
| 3 | `index` | カレンダー | `index.tsx` |
| 4 | `tuner` | チューナー | `tuner.tsx` |
| 5 | `settings` | 設定 | `settings.tsx` |

- 未認証時: タブ非表示（ローディング）
- タブバー非表示: `tutorial`, `instrument-selection` 表示中
- フリープラン: 各タブ画面下部に `BottomBannerAd`（バナー広告）

### 1.2 InstrumentHeader（多数画面の上部）

| 操作 | 動作 |
|------|------|
| 楽器名タップ | **楽器の魅力モーダル**（静的テキスト）→「演奏を聞く」で `representative-songs` へ |
| 「学習ツール」タップ | 学習ツールモーダルを開く（下表） |

**学習ツールメニュー（`components/InstrumentHeader.tsx`）**

| 項目 | 遷移 | 状態 |
|------|------|------|
| 基礎練 | `/(tabs)/basic-practice` | ✅ 実装 |
| ガイド | `/(tabs)/beginner-guide` | ✅ 実装 |
| 音楽用語辞典 | `/(tabs)/music-dictionary` | ✅ 実装 |
| AI自動譜読み | なし | ❌ Alert「準備中」 |
| 譜面自動スクロール | `/(tabs)/score-auto-scroll` | ✅ 実装（ラベルは「未実装」表記） |
| グラフ・統計分析 | `/(tabs)/statistics` | ✅ 実装 |

### 1.3 設定画面メニュー（`settings.tsx`）

| メニュー | 遷移先 | 備考 |
|----------|--------|------|
| プロフィール設定 | `profile-settings` | |
| マイライブラリ | `my-library` | |
| 録音ライブラリ | `recordings-library` | |
| 楽器変更 | `main-settings` → 即 `instrument-selection` | |
| 主要機能設定 | `major-settings` | 下記サブメニュー |
| チュートリアル | **`app-guide`** | ※ `tutorial.tsx` ではない |
| 料金プラン | `pricing-plans` | |
| フィードバック | `support` | ※ `feedback.tsx` ではない |
| ログアウト | `signOut()` | |

**major-settings サブメニュー**

| 項目 | 遷移先 |
|------|--------|
| 外観設定 | `appearance-settings` |
| 通知設定 | `notification-settings` |
| プライバシー設定 | `privacy-settings` |

**privacy-settings から**

| 項目 | 遷移先 |
|------|--------|
| プライバシーポリシー | `/(tabs)/privacy-policy` |
| 利用規約 | `/(tabs)/terms-of-service` |
| 問い合わせ | メールアプリ起動（`Linking`） |
| 楽器別データ全削除 | 確認ダイアログ → DB 削除 |
| アカウント削除 | RPC `delete_user_account` |

### 1.4 認証・初回フロー（`app/_layout.tsx`）

```
未認証 → auth/login
新規登録成功 → (tabs)/tutorial → instrument-selection → (tabs)/index
ログイン成功 + 楽器未選択 → tutorial へ
ログイン成功 + 楽器選択済 → (tabs)/index
```

| 画面 | ファイル | 到達経路 |
|------|----------|----------|
| ログイン | `auth/login.tsx` | 未認証時リダイレクト |
| 新規登録 | `auth/signup.tsx` | ログイン画面から |
| パスワードリセット | `auth/reset-password.tsx` | コールバック等 |
| OAuth コールバック | `auth/callback.tsx` | 認証リダイレクト |
| 初回チュートリアル | `(tabs)/tutorial.tsx` | 新規登録後 / 楽器未選択 |
| 利用規約（登録用） | `terms-of-service.tsx`（root） | signup から |
| プライバシー（登録用） | `privacy-policy.tsx`（root） | signup から |

---

## 2. 実在機能（到達可能・詳細）

### 2.1 カレンダー — `(tabs)/index.tsx`

**到達:** タブ「カレンダー」（route 名 `index`）

| 機能 | 内容 |
|------|------|
| 月次カレンダー | 月送り/戻し、「今」ボタン、今月合計練習時間 |
| 日付セル | 練習時間・録音・基礎練・イベントのマーカー表示（`CalendarDayCell`） |
| クイック記録 | FAB → `QuickRecordModal`（プリセット分数ワンタップ → `practice_sessions` 保存） |
| 練習記録 | 日付タップ → `PracticeRecordModal`（時間・内容・開始/終了時刻、編集/削除） |
| 録音 | `PracticeRecordModal` 内 `AudioRecorder`（**Web のみ**） |
| イベント管理 | `EventManagementSection` + `EventModal`（CRUD: title, description, location, color） |
| 短期目標バナー | `show_on_calendar=true` の短期目標を上部表示 |
| オフライン | オフライン表示、復帰時 `syncOfflinePracticeRecords` |
| 広告 | フリープラン `BottomBannerAd` |

**QuickRecordModal:** 音声入力機能は削除済み（`input_method: 'voice'` は互換のため DB に残存しうる）。

---

### 2.2 タイマー — `(tabs)/timer.tsx`

**到達:** タブ「タイマー」

| 機能 | 内容 |
|------|------|
| カウントダウンタイマー | 時間設定モーダル、開始/一時停止/リセット、円形プログレス |
| ストップウォッチ | `Stopwatch` コンポーネント |
| 設定 | 自動記録 ON/OFF、サウンド通知、バイブレーション |
| 完了時 | autoSave ON 時 → `savePracticeSessionWithIntegration` で練習記録 |
| 広告 | フリープラン `BottomBannerAd` |

---

### 2.3 目標 — `(tabs)/goals.tsx` + `add-goal.tsx`

**到達:** タブ「目標」、追加は `/add-goal`

| 機能 | 内容 |
|------|------|
| 個人目標（短期） | `personal_short` — CRUD、進捗、達成/未達成 |
| 個人目標（長期） | `personal_long` — サブ目標（追加/完了/削除）、進捗自動計算 |
| 達成済み目標 | `CompletedGoalsSection` |
| カレンダー連携 | `show_on_calendar` トグル → ホームカレンダーに短期目標表示 |
| 目標カレンダー | `GoalsCalendar` コンポーネント |
| オフライン | オフライン保存・同期 |
| フリー制限 | 楽器あたり目標 **4 個**まで（`FREE_PLAN_LIMITS.GOALS_COUNT_PER_INSTRUMENT`） |
| グループ目標 | DB 型 `group` は残存するが **UI から新規作成不可**、オフライン同期時スキップ |

---

### 2.4 チューナー — `(tabs)/tuner.tsx`

**到達:** タブ「チューナー」

| 機能 | 内容 | プラットフォーム |
|------|------|------------------|
| リアルタイムチューナー | マイク入力、音名/Hz/セント、チューニングバー | **Web のみ** |
| メトロノーム | `Metronome` コンポーネント（拍子/BPM/音量/音色） | Web 中心 |
| 開放弦・基準音 | オシレーター連続再生 | **Web のみ** |
| 音階を聞く | C3–C6 の各音再生 | **Web のみ** |
| A4 基準周波数 | 432–450Hz、`user_settings` / `saveTunerSettings` に保存 | 全 |
| 楽器別開放弦表示 | 選択楽器に応じたチューニング情報（表示のみ） | 全 |
| 移調楽器説明 | トランペット等の transposingInfo テキスト | 全 |
| 広告 | フリープラン `BottomBannerAd` | 全 |

---

### 2.5 設定ハブ — `(tabs)/settings.tsx`

上記 §1.3 参照。メール表示、ログアウト。

---

### 2.6 プロフィール設定 — `profile-settings.tsx`

**到達:** 設定 → プロフィール設定

| 機能 | 内容 |
|------|------|
| 基本情報 | ニックネーム、誕生日、音楽開始年齢 |
| 所属 | 現所属団体（テキスト） |
| 休止期間 | CRUD（`user_break_periods`） |
| 過去所属 | CRUD（`user_past_organizations`）— **個人プロフィール用。組織機能ではない** |
| 受賞歴 | CRUD（`user_awards`） |
| 演奏歴 | CRUD（`user_performances`） |
| 楽器別プロフィール | 購入日等（`user_instrument_profiles`） |
| アカウント削除 | RPC `delete_user_account` |

---

### 2.7 マイライブラリ — `my-library.tsx`

**到達:** 設定 → マイライブラリ

| 機能 | 内容 |
|------|------|
| 曲管理 | CRUD（`my_songs`） |
| ステータス | 弾きたい / 学習中 / 演奏済 / マスター |
| 楽器別フィルタ | 選択楽器で絞り込み |
| フリー制限 | 楽器あたり **10 曲**まで |

---

### 2.8 録音ライブラリ — `recordings-library.tsx`

**到達:** 設定 → 録音ライブラリ

| 機能 | 内容 | プラットフォーム |
|------|------|------------------|
| 一覧 | 種類（演奏/レッスン）、期間、検索、お気に入り | 全 |
| 再生 | インライン audio プレイヤー | **Web のみ**（ネイティブは限定的） |
| 削除 | 確認後削除 | 全 |
| フリー制限 | 楽器あたり **月 3 回**まで録音保存可 | 全 |
| リワード広告 | 上限時 `RewardedAdModal`（`AudioRecorder` 経由） | ネイティブ中心 |

---

### 2.9 楽器選択 — `instrument-selection.tsx`

**到達:** オンボーディング、`main-settings`（楽器変更）

| 機能 | 内容 |
|------|------|
| 楽器一覧 | 20 種以上（ピアノ、弦楽器、管楽器、ボーカル、指揮者等） |
| その他 | カスタム楽器名入力 |
| フリー制限 | **2 楽器**まで（`FREE_PLAN_LIMITS.MAX_INSTRUMENTS`） |
| 保存 | `user_profiles` / テーマコンテキスト更新 |

---

### 2.10 外観・通知 — `appearance-settings.tsx`, `notification-settings.tsx`

| 画面 | 機能 |
|------|------|
| 外観設定 | カスタムテーマ色、楽器テーマリセット（`AppearanceSettings`） |
| 通知設定 | 練習リマインダー / 週次サマリー Switch → `user_settings` |

---

### 2.11 使い方ガイド — `app-guide.tsx`

**到達:** 設定 → 「チュートリアル」（ラベル）  
**内容:** 折りたたみ式の機能説明（読み取り専用）。カレンダー、基礎練、目標、統計、チューナー等の説明テキスト。

---

### 2.12 初回チュートリアル — `tutorial.tsx`

**到達:** 新規登録後、楽器未選択時  
**内容:** 多段スライド、通知許可リクエスト、`instrument-selection` へ誘導。

---

### 2.13 料金プラン — `pricing-plans.tsx`

**到達:** 設定 → 料金プラン

| 機能 | 内容 |
|------|------|
| プラン表示 | フリー / プレミアム月額 / 年額 |
| 購入 | **`mockPurchase`**（開発用）→ `user_subscriptions` 書き込み |
| 本番 IAP | **未接続**（App Store / Google Play 課金は未実装） |

---

### 2.14 サポート — `support.tsx`

**到達:** 設定 → フィードバック

| 機能 | 内容 |
|------|------|
| Google フォーム | 外部リンク |
| アプリシェア | `Share` / Web `navigator.share` |
| Twitter | 外部リンク |
| App Store レビュー | 外部リンク |

---

### 2.15 基礎練 — `basic-practice.tsx`

**到達:** InstrumentHeader → 学習ツール → 基礎練

| 機能 | 内容 |
|------|------|
| 練習メニュー | 楽器別 × レベル別（初級/中級/マスター） |
| データソース | DB `practice_menus` + 静的フォールバック（`_instrumentSpecificMenus.ts`） |
| 詳細モーダル | 練習内容、YouTube URL、コツ |
| 「練習した！」 | `practice_sessions` に保存 |
| 姿勢カメラ | `PostureCameraModal` |

---

### 2.16 ガイド — `beginner-guide.tsx`

**到達:** InstrumentHeader → 学習ツール → ガイド

| 機能 | 内容 |
|------|------|
| 楽器別ガイド | 静的 `instrumentGuides.ts`（用語、持ち方、お手入れ等） |
| YouTube リンク | 外部ブラウザ |
| 姿勢カメラ | `PostureCameraModal` |

---

### 2.17 音楽用語辞典 — `music-dictionary.tsx`

**到達:** InstrumentHeader → 学習ツール → 音楽用語辞典

| 機能 | 内容 |
|------|------|
| カテゴリ閲覧 | 静的 `musicTermsData` |
| 検索 | 用語名検索 |
| カスタム用語 | ユーザー CRUD（`music_terms`） |

---

### 2.18 統計 — `statistics.tsx`

**到達:** InstrumentHeader → 学習ツール → グラフ・統計分析

| 機能 | 内容 |
|------|------|
| タブ | 日別 / 統計 |
| グラフ | 週/月/年、連続練習日、曜日パターン |
| フィルタ | 日付範囲 |
| 詳細 | 練習記録詳細モーダル |
| データ | `practice_sessions`（`statisticsRepository`） |

---

### 2.19 譜面自動スクロール — `score-auto-scroll.tsx`

**到達:** InstrumentHeader → 学習ツール → 譜面自動スクロール（ラベル「未実装」だが画面は実装あり）

| 機能 | 内容 | プラットフォーム |
|------|------|------------------|
| URL 入力 | リモート PDF を Google Docs Viewer 経由表示 | 全 |
| 自動スクロール | 速度調整、開始/停止 | 全 |
| ローカル PDF | DocumentPicker | **ネイティブ** |
| Google Drive | OAuth + ファイル選択 | **ネイティブ**（Web 不可） |

---

### 2.20 代表曲 — `representative-songs.tsx`

**到達:** InstrumentHeader → 楽器名 → 魅力モーダル → 「演奏を聞く」

| 機能 | 内容 |
|------|------|
| 代表曲一覧 | DB `representative_songs` + 静的フォールバック |
| 外部リンク | YouTube / Spotify |
| お気に入り | ユーザー CRUD（`user_favorite_songs`） |

---

### 2.21 認証 — `auth/login.tsx`, `auth/signup.tsx`

| 機能 | 状態 |
|------|------|
| メール/パスワードログイン | ✅ |
| メール/パスワード新規登録 | ✅ |
| Google ログイン | ❌ UI あり、Alert「未実装です」 |
| パスワード再設定（ログイン画面から） | ❌ Alert「未実装です」（`reset-password.tsx` は別ルートで存在） |

---

## 3. 到達不可・スタブ・オーファン

| ファイル | 状態 | 理由 |
|----------|------|------|
| `app/calendar.tsx` | スタブ | 実カレンダーは `(tabs)/index` |
| `app/attendance.tsx` | スタブ | 組織機能なし |
| `app/tasks.tsx` | スタブ | 組織機能なし |
| `app/splash.tsx` | 未統合 | `_layout` フローに未接続 |
| `gakki-renshu/signup.tsx` | レガシー | 現行は `auth/signup` |
| `gakki-renshu/forgot-password.tsx` | レガシー | リンクなし |
| `(tabs)/note-training.tsx` | プレースホルダ | 「開発中」のみ。**どこからもリンクなし** |
| `(tabs)/feedback.tsx` | オーファン | 設定は `support` へ。feedback は Google Form 自動 open のみ |
| `(tabs)/help-support.tsx` | オーファン | **router リンクなし** |
| `(tabs)/legal-info.tsx` | オーファン | **router リンクなし**（privacy-settings が代替） |
| `organization-dashboard` 等 | **ファイル不存在** | `_layout.tsx` に条件分岐の残骸のみ |

---

## 4. UI 上「準備中・未実装」と明示されているもの

| 場所 | 内容 |
|------|------|
| InstrumentHeader | AI 自動譜読み → Alert「準備中」 |
| InstrumentHeader | 譜面自動スクロール → ラベル「(未実装)」 |
| `note-training.tsx` | 「この機能は現在開発中です」 |
| `auth/login.tsx` | Google ログイン / パスワード再設定 →「未実装です」 |
| `index.tsx` | DB テーブル不存在時 →「練習記録機能は準備中です」 |

---

## 5. 旧ドキュメントにあって存在しないもの

| 旧記載 | 現状 |
|--------|------|
| **組織管理**（dashboard / settings / share タブ） | ルート・UI なし。DB テーブルのみ |
| **出欠管理（attendance）** | スタブ画面のみ |
| **タスク管理（tasks）** | スタブ画面のみ |
| **Events 専用タブ** | カレンダー内イベント管理に統合 |
| **音符ゲーム（note-training）** | 到達不可 + プレースホルダ |
| **help-support / legal-info** | 実装あるが未リンク |
| **feedback 専用ルート** | settings → `support` が実入口 |
| **Google OAuth ログイン** | Alert のみ |
| **本番 In-App Purchase** | `mockPurchase` のみ |
| **音声入力（STT）** | 削除済み |
| **グループ目標** | DB 型残存、UI 非対応 |

---

## 6. フリープラン制限（`lib/subscriptionLimits.ts`）

| 項目 | 制限（楽器あたり / 全体） |
|------|---------------------------|
| 録音保存 | 月 **3 回** / 楽器 |
| 目標数 | **4 個** / 楽器 |
| マイライブラリ | **10 曲** / 楽器 |
| 使用楽器数 | **2 種類**まで |

プレミアム: `user_subscriptions.is_active` + `mockPurchase` または手動 SQL 更新（クローズドテスト用ガイド参照）。

---

## 7. 広告・課金

| 種別 | 実装 | 備考 |
|------|------|------|
| バナー広告 | `BottomBannerAd` | フリープラン、主要タブ画面 |
| リワード広告 | `RewardedAdModal` | 録音上限時（`AudioRecorder`） |
| サブスク課金 | `mockPurchase` | 本番ストア課金は未接続 |

---

## 8. プラットフォーム制限

| 機能 | Web | Android / iOS |
|------|-----|---------------|
| チューナー（マイク） | ✅ | ❌ Alert |
| 開放弦・音階再生 | ✅ | ❌ |
| 録音（AudioRecorder） | ✅ | ❌ Alert |
| 録音再生（ライブラリ） | ✅ フル | 限定的 |
| メトロノーム | ✅ フル | 部分（Web 分岐多） |
| 譜面 Drive 連携 | ❌ | ✅ |
| 譜面ローカル PDF | 限定的 | ✅ |
| オフライン検知 | `online/offline` イベント | 限定的 |

**クローズドテスト（Android）向け注意:** チューナー・録音・再生のコア体験は **Web 向け実装が中心**。Android 実機ではカレンダー・目標・タイマー・基礎練・統計等が主な検証対象になる。

---

## 9. DB テーブル — 到達 UI から実際に使用

| テーブル | 使用機能 |
|----------|----------|
| `user_profiles` | 認証、プロフィール、楽器選択 |
| `instruments` | 楽器テーマ、選択、代表曲 |
| `practice_sessions` | カレンダー、QuickRecord、PracticeRecord、タイマー、基礎練、統計 |
| `recordings` | 録音、録音ライブラリ、Storage `recordings` |
| `goals` / `sub_goals` | 目標、add-goal |
| `events` | カレンダーイベント |
| `my_songs` | マイライブラリ |
| `user_settings` | 外観、通知、チューナー設定 |
| `tutorial_progress` | チュートリアル進捗 |
| `practice_menus` | 基礎練 |
| `music_terms` | 用語辞典（カスタム） |
| `user_instrument_profiles` | 基礎練レベル、プロフィール |
| `user_subscriptions` | 料金プラン |
| `user_past_organizations` | プロフィール「過去所属」（組織機能ではない） |
| `user_break_periods` | 休止期間 |
| `user_awards` | 受賞 |
| `user_performances` | 演奏歴 |
| `representative_songs` | 代表曲 |
| `user_favorite_songs` | 代表曲お気に入り |
| `user_push_tokens` | 通知 |

### スキーマのみ（到達 UI なし）

`organizations`, `user_group_memberships`, `practice_schedules`, `tasks`, `attendance_records`, `feedback`

---

## 10. 機能利用ログ設計用 — feature_id 一覧（実在のみ）

機能削減検討・ログ実装時に使う ID 案。

### 画面（screen_view）

```
calendar, timer, goals, tuner, settings,
basic_practice, beginner_guide, music_dictionary, statistics, score_auto_scroll,
profile_settings, my_library, recordings_library, instrument_selection,
major_settings, appearance_settings, notification_settings, privacy_settings,
app_guide, tutorial, pricing_plans, support, representative_songs, add_goal,
auth_login, auth_signup
```

### 主要アクション（action）— 例

```
calendar.quick_record_save, calendar.practice_record_save, calendar.event_create,
timer.complete, timer.save_to_calendar,
goals.create, goals.complete,
tuner.start_listening, tuner.metronome_switch,
basic_practice.complete, learning_tools.open,
my_library.song_add, recordings_library.play,
pricing.purchase_attempt, instrument.change
```

**ログ対象外:** `organization_*`, `tasks`, `attendance`, `note_training`（到達不可）, `help-support`, `legal-info`, `feedback`（オーファン）

---

## 11. 調査上の注意（コードとドキュメントの乖離）

- `APP_FEATURES_LIST.md`（旧版）は組織機能・share タブ等を記載していたが、**2026-09-22 時点のコードベースには存在しない**。
- `_layout.tsx` の `isInOrgGroup` は削除候補のデッドコード。
- `InstrumentHeader` の `handleInstrumentPress` → `instrument-selection` は定義のみ（楽器名タップは魅力モーダル）。
- 設定の「チュートリアル」は `tutorial.tsx` ではなく **`app-guide.tsx`** へ遷移する。

---

*このファイルはコード調査に基づくソース・オブ・トゥルースとする。機能追加・削除時は本ファイルを更新すること。*
