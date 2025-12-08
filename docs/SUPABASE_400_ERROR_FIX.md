# Supabase 400エラー修正レポート

## エラーの詳細

```
GET https://uteeqkpsezbabdmritkn.supabase.co/rest/v1/goals?select=show_on_calendar&limit=1 400 (Bad Request)
```

## 根本原因

`hooks/tabs/useCalendarData.ts`の`loadShortTermGoal`関数で、`show_on_calendar`カラムが存在するかチェックするために、毎回データベースにクエリを送信していました。`show_on_calendar`カラムが存在しない場合、Supabaseは400エラーを返します。

### 問題点

1. **毎回DBクエリを実行**: カラムの存在チェックのたびにデータベースにクエリを送信
2. **エラーがコンソールに表示**: 400エラーがブラウザの開発者ツールに表示される
3. **キャッシュが未使用**: `goalRepository.ts`にはlocalStorageを使ったキャッシュ機能があるが、`useCalendarData.ts`では使用されていない

## 修正内容

### 1. localStorageを先にチェック

`useCalendarData.ts`の`loadShortTermGoal`関数を修正し、localStorageを先にチェックして、カラムが存在しないことが既に分かっている場合はDBクエリをスキップするようにしました：

```typescript
// 修正前
const { error: checkError } = await supabase
  .from('goals')
  .select('show_on_calendar')
  .limit(1);

// 修正後
// localStorageのフラグを先に確認（同期処理で即座に結果を得る）
if (typeof window !== 'undefined') {
  const flag = window.localStorage.getItem('disable_show_on_calendar');
  if (flag === '1') {
    // カラムが存在しないことが既に分かっている
    supportsShowOnCalendar = false;
  } else {
    // フラグがない場合のみDBクエリを実行
    const { error: checkError } = await supabase
      .from('goals')
      .select('show_on_calendar')
      .limit(1);
    // エラー処理...
  }
}
```

### 2. エラー時のフラグ設定

カラムが存在しないことが判明した場合、localStorageにフラグを設定して、以降のチェックをスキップするようにしました：

```typescript
if (isColumnError) {
  supportsShowOnCalendar = false;
  // フラグを設定して以降のチェックをスキップ
  try {
    window.localStorage.setItem('disable_show_on_calendar', '1');
  } catch (e) {
    // localStorageへの書き込みエラーは無視
  }
}
```

## 効果

### 修正前
- 毎回データベースにクエリを送信
- カラムが存在しない場合、毎回400エラーが発生
- ブラウザコンソールにエラーが表示される

### 修正後
- 初回チェック時のみデータベースにクエリを送信
- 以降はlocalStorageのフラグをチェックしてクエリをスキップ
- 不要なDBクエリとエラーが削減される

## 注意事項

1. **初回チェック時のエラー**: 初回チェック時には、カラムが存在しない場合、400エラーがブラウザコンソールに表示される可能性があります。これは避けられませんが、以降は表示されません。

2. **localStorageのクリア**: カラムが追加された場合は、localStorageの`disable_show_on_calendar`フラグを削除するか、アプリを再起動する必要があります。

3. **他の場所でのチェック**: `goalRepository.ts`でも同様のチェックが行われていますが、そちらは既にlocalStorageを使用しています。

## 関連ファイル

- `hooks/tabs/useCalendarData.ts` - localStorageチェックを追加
- `repositories/goalRepository.ts` - 既存のlocalStorageキャッシュ機能

## 今後の改善案

1. **共通関数の作成**: `checkShowOnCalendarSupport`関数を共通化して、両方の場所で使用する
2. **エラーハンドリングの統一**: エラーハンドリングロジックを統一して、コードの重複を削減

