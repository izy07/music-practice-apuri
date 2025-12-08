# 機能フロー分析サマリー

## 概要

音楽練習アプリの全15機能について、詳細なフロー分析を実施し、余分な工程や潜在的なバグを特定しました。各機能の分析レポートは以下の通りです。

## 分析完了機能一覧

1. ✅ **認証フロー** (`FLOW_ANALYSIS_01_AUTH.md`)
2. ✅ **練習記録フロー** (`FLOW_ANALYSIS_02_PRACTICE_RECORD.md`)
3. ✅ **タイマーフロー** (`FLOW_ANALYSIS_03_TIMER.md`)
4. ✅ **目標管理フロー** (`FLOW_ANALYSIS_04_GOAL.md`)
5. ✅ **チューナーフロー** (`FLOW_ANALYSIS_05_TUNER.md`)
6. ✅ **組織管理フロー** (`FLOW_ANALYSIS_06_ORGANIZATION.md`)
7. ✅ **カレンダー表示フロー** (`FLOW_ANALYSIS_07_CALENDAR.md`)
8. ✅ **学習ツール（基礎練習）フロー** (`FLOW_ANALYSIS_08_BASIC_PRACTICE.md`)
9. ✅ **グラフ統計フロー** (`FLOW_ANALYSIS_09_STATISTICS.md`)
10. ✅ **代表曲フロー** (`FLOW_ANALYSIS_10_REPRESENTATIVE_SONGS.md`)
11. ✅ **プロフィール設定フロー** (`FLOW_ANALYSIS_11_PROFILE_SETTINGS.md`)
12. ✅ **マイライブラリフロー** (`FLOW_ANALYSIS_12_MY_LIBRARY.md`)
13. ✅ **録音ライブラリフロー** (`FLOW_ANALYSIS_13_RECORDING_LIBRARY.md`)
14. ✅ **楽器選択・変更フロー** (`FLOW_ANALYSIS_14_INSTRUMENT_SELECTION.md`)
15. ✅ **外観設定フロー** (`FLOW_ANALYSIS_15_APPEARANCE_SETTINGS.md`)

## 主要な問題点まとめ

### 優先度: 高（最重要）

1. **パスワードの平文保存** (`FLOW_ANALYSIS_06_ORGANIZATION.md`)
   - 組織作成時にパスワードの平文も保存されている
   - セキュリティ上の問題

2. **カレンダー画面のキャッシュ問題** (`FLOW_ANALYSIS_07_CALENDAR.md`)
   - 楽器変更時にキャッシュがクリアされていない
   - 古い楽器のデータがキャッシュに残る

3. **固定待機時間の使用** (複数機能)
   - タイマー完了通知: 1000ms固定待機 (`FLOW_ANALYSIS_03_TIMER.md`)
   - 楽器変更: 100ms + 800ms固定待機 (`FLOW_ANALYSIS_14_INSTRUMENT_SELECTION.md`)
   - 組織作成: 500ms固定待機（メンバーシップ確認） (`FLOW_ANALYSIS_06_ORGANIZATION.md`)
   - 開放弦の音再生: 100ms + 150ms固定待機 (`FLOW_ANALYSIS_05_TUNER.md`)
   - スクロール位置: 200ms固定待機 (`FLOW_ANALYSIS_13_RECORDING_LIBRARY.md`)

4. **Audio APIのメモリリーク** (`FLOW_ANALYSIS_05_TUNER.md`, `FLOW_ANALYSIS_13_RECORDING_LIBRARY.md`)
   - AudioContextやAudioオブジェクトのクリーンアップ不足

5. **全期間データ取得のパフォーマンス問題** (`FLOW_ANALYSIS_09_STATISTICS.md`)
   - 統計画面で全期間（1970-01-01から）のデータを一度に取得

6. **エントイトルメントの模擬値** (`FLOW_ANALYSIS_12_MY_LIBRARY.md`)
   - マイライブラリでエントイトルメントが模擬値（常にtrue）

### 優先度: 中

7. **AsyncStorageとデータベースの二重管理** (複数機能)
   - レベル設定: AsyncStorageとデータベースの両方に保存 (`FLOW_ANALYSIS_08_BASIC_PRACTICE.md`)
   - カレンダー表示目標: localStorageとデータベースの両方に保存 (`FLOW_ANALYSIS_07_CALENDAR.md`)

8. **オプショナルカラムの保存問題** (`FLOW_ANALYSIS_11_PROFILE_SETTINGS.md`)
   - プロフィール設定で年齢や所属団体などの情報がコメントアウトされている

9. **イベント受信方法の不統一** (`FLOW_ANALYSIS_14_INSTRUMENT_SELECTION.md`)
   - 楽器変更イベントの受信方法が画面によって異なる

10. **リトライロジックの複雑さ** (`FLOW_ANALYSIS_06_ORGANIZATION.md`, `FLOW_ANALYSIS_14_INSTRUMENT_SELECTION.md`)
    - 組織作成や楽器選択で複雑なリトライロジック

### 優先度: 低

11. **未使用関数の存在** (`FLOW_ANALYSIS_10_REPRESENTATIVE_SONGS.md`)
    - `getFallbackSongs()`関数が定義されているが使用されていない

12. **カラーピッカー機能の未実装** (`FLOW_ANALYSIS_15_APPEARANCE_SETTINGS.md`)
    - 外観設定でカラーピッカー機能が未実装

13. **データのハードコード** (複数機能)
    - 練習メニュー: コード内にハードコード (`FLOW_ANALYSIS_08_BASIC_PRACTICE.md`)
    - プリセットパレット: コード内にハードコード (`FLOW_ANALYSIS_15_APPEARANCE_SETTINGS.md`)

## 改善提案の優先順位

### 最優先（セキュリティ・データ整合性）

1. **パスワードの平文保存を削除** (`FLOW_ANALYSIS_06_ORGANIZATION.md`)
   - `password`カラムに平文を保存しない（`password_hash`のみ）

2. **カレンダー画面のキャッシュクリア** (`FLOW_ANALYSIS_07_CALENDAR.md`)
   - キャッシュキーに楽器IDを含める、または楽器変更時にクリア

### 高優先度（パフォーマンス・信頼性）

3. **固定待機時間の削除** (複数機能)
   - Promiseベースで処理の完了を待つ
   - または、状態更新の完了を確認

4. **Audio APIのメモリリーク解消** (`FLOW_ANALYSIS_05_TUNER.md`, `FLOW_ANALYSIS_13_RECORDING_LIBRARY.md`)
   - `useEffect`のクリーンアップ関数でクリーンアップ

5. **全期間データ取得の最適化** (`FLOW_ANALYSIS_09_STATISTICS.md`)
   - 必要な期間のみ取得（例: 最近1年分）

6. **エントイトルメントの実際の値取得** (`FLOW_ANALYSIS_12_MY_LIBRARY.md`)
   - `useSubscription`フックを使用

### 中優先度（コード品質・保守性）

7. **AsyncStorageとデータベースの統一** (複数機能)
   - データベースを唯一の情報源にする

8. **オプショナルカラムの保存有効化** (`FLOW_ANALYSIS_11_PROFILE_SETTINGS.md`)
   - マイグレーション実行後にコメントを解除

9. **イベント受信方法の統一** (`FLOW_ANALYSIS_14_INSTRUMENT_SELECTION.md`)
   - すべての画面で`window.addEventListener('instrumentChanged')`を使用

10. **リトライロジックの簡素化** (複数機能)
    - 共通化または簡素化

## 解決済み問題

以下の問題は既に解決済みです：

1. ✅ **完了検出の簡素化** (`FLOW_ANALYSIS_03_TIMER.md`)
2. ✅ **完了状態リセットの統一** (`FLOW_ANALYSIS_03_TIMER.md`)
3. ✅ **タイマー完了検出の競合状態の解決** (`FLOW_ANALYSIS_03_TIMER.md`)
4. ✅ **timerPresetRefの同期問題の解決** (`FLOW_ANALYSIS_03_TIMER.md`)
5. ✅ **AsyncStorageキーの統一** (`FLOW_ANALYSIS_03_TIMER.md`)
6. ✅ **カレンダー更新イベントの改善** (`FLOW_ANALYSIS_03_TIMER.md`)
7. ✅ **練習時間計算の改善** (`FLOW_ANALYSIS_03_TIMER.md`)
8. ✅ **代表曲データの重複問題** (`FLOW_ANALYSIS_10_REPRESENTATIVE_SONGS.md`)

## 次のステップ

1. 最優先の改善項目（セキュリティ・データ整合性）から着手
2. 高優先度の改善項目（パフォーマンス・信頼性）を順次実装
3. 中優先度の改善項目（コード品質・保守性）は継続的に改善

各機能の詳細な分析結果は、個別のレポートファイルを参照してください。

