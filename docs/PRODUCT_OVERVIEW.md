# アプリ概要（ユーザー向け）

> **更新:** 2026-09-30  
> **詳細仕様:** [APP_FEATURES_LIST.md](../APP_FEATURES_LIST.md)（画面・DB・制限の正本）  
> **開発環境:** [README.md](../README.md)

## このアプリは何か

個人の楽器練習を **記録・継続** するアプリです。21 種類の楽器に対応し、練習時間・目標・録音・基礎練などを **1 人分** としてクラウドに保存します。

**提供しないもの:** 部活・楽団の共同管理、招待・出欠・共有目標・団体管理者画面。

## メイン画面（5 タブ）

タイマー → 目標 → **カレンダー（ホーム）** → チューナー → 設定

各タブでできることの一覧は [APP_FEATURES_LIST §2](../APP_FEATURES_LIST.md#2-実在機能到達可能詳細) を参照。

## 押さえておきたい機能（1 行ずつ）

| トピック | 概要 | 詳細 |
|----------|------|------|
| カレンダー | 練習記録・クイック記録・個人イベント・オフライン同期 | [§2.1](../APP_FEATURES_LIST.md#21-カレンダー--tabsindextsx) |
| 本日のおすすめ | 1 日 1 回の代表曲モーダル、8 回に 1 回の過去録音比較 | [§1.1 Daily Discovery](../APP_FEATURES_LIST.md#11-メインタブapptabs_layouttsx) |
| 目標 | 短期・長期の個人目標、サブ目標、カレンダー表示 | [§2.3](../APP_FEATURES_LIST.md#23-目標--tabsgoalstsx--add-goaltsx) |
| 学習ツール | 基礎練・ガイド・用語辞典・統計など（ヘッダーから） | [§1.2](../APP_FEATURES_LIST.md#12-instrumentheader多数画面の上部) |
| プロフィール | 所属名は **自由記述**（部活名等）。団体連携ではない | [§2.6](../APP_FEATURES_LIST.md#26-プロフィール設定--profile-settingstsx) |
| 料金 | フリーは録音・目標数等に制限、タブ下バナー広告 | [§6](../APP_FEATURES_LIST.md#6-フリープラン制限libsubscriptionlimitsts) |

## ストア・SNS 用の短い文案

キャッチコピー案: [APP_CATCHPHRASE.md](../APP_CATCHPHRASE.md)

## 認証・アカウント

Supabase Auth（**メール/パスワードのみ**。Google ログインなし）。アカウント削除は設定 → プライバシーから（RPC `delete_user_account`）。  
フロー詳細: [APP_FEATURES_LIST §1.4 / §4](../APP_FEATURES_LIST.md#14-認証初回フローapp_layouttsx)
