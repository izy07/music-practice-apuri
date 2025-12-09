# コードレビュー: InstrumentThemeContext.tsx

## レビュー日
2025年1月

## 概要
楽器テーマ管理を行うReact Contextコンポーネントのコードレビュー

---

## 🔴 重大な問題（Critical Issues）

### 1. 欠落しているインポート
**問題**: `supabase`がインポートされていないにも関わらず使用されている

**該当箇所**: 
- Line 171: `supabase.auth.onAuthStateChange`が使用されているが、インポートされていない

**影響**: 
- 実行時エラーが発生する
- アプリケーションがクラッシュする可能性がある

**修正提案**:
```typescript
import { supabase } from '@/lib/supabase';
```

---

### 2. サーバー同期の不整合
**問題**: `setSelectedInstrument`がローカルストレージのみを更新し、サーバーを更新していない

**該当箇所**: 
```388:396:music-practice/components/InstrumentThemeContext.tsx
  const setSelectedInstrument = React.useCallback(async (instrumentId: string) => {
    try {
      setSelectedInstrumentState(instrumentId);
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.selectedInstrument), instrumentId);
    } catch (error) {
      logger.error('楽器選択保存エラー:', error);
      ErrorHandler.handle(error, '楽器選択保存', false);
    }
  }, [getKey]);
```

**影響**: 
- ユーザーが楽器を変更しても、サーバーに反映されない
- 他のデバイスで同期されない
- `hydrateFromServer`との競合状態が発生する可能性

**修正提案**:
```typescript
const setSelectedInstrument = React.useCallback(async (instrumentId: string) => {
  try {
    // まずローカル状態を更新
    setSelectedInstrumentState(instrumentId);
    await AsyncStorage.setItem(getKey(STORAGE_KEYS.selectedInstrument), instrumentId);
    
    // サーバーにも同期
    const { user } = await getCurrentUser();
    if (user) {
      const { updateSelectedInstrument } = await import('@/repositories/userRepository');
      const result = await updateSelectedInstrument(user.id, instrumentId);
      if (!result.success) {
        logger.warn('サーバー同期失敗（ローカル保存は成功）:', result.error);
        // オプション: エラーをユーザーに通知するか、バックグラウンドでリトライ
      }
    }
  } catch (error) {
    logger.error('楽器選択保存エラー:', error);
    ErrorHandler.handle(error, '楽器選択保存', false);
  }
}, [getKey]);
```

---

## 🟡 重要な問題（Major Issues）

### 3. コメントアウトされたコード
**問題**: 不要なコメントアウトコードが残っている

**該当箇所**: 
```91:106:music-practice/components/InstrumentThemeContext.tsx
  // 色設定の変更を強制的に反映させる（無限ループを防ぐため削除）
  // useEffect(() => {
  //   const forceThemeUpdate = async () => {
  //     if (selectedInstrument) {
  //       // 現在選択されている楽器のテーマを強制的に更新
  //       const currentInstrument = dbInstruments.find(inst => inst.id === selectedInstrument);
  //       if (currentInstrument) {
  //         console.log('Force updating theme for:', currentInstrument.name, 'background:', currentInstrument.background);
  //         // テーマの強制更新をトリガー
  //         setDbInstruments(prev => [...prev]);
  //       }
  //     }
  //   };
    
  //   forceThemeUpdate();
  // }, [dbInstruments, selectedInstrument]);
```

**影響**: 
- コードの可読性が低下
- メンテナンスが困難
- 将来の混乱の原因

**修正提案**: 
このコメントアウトコードを削除するか、必要に応じて適切な実装に置き換える

---

### 4. 初期化時の非同期処理の問題
**問題**: `loadInstrumentsFromDB()`が`await`なしで呼ばれている

**該当箇所**: 
```367:372:music-practice/components/InstrumentThemeContext.tsx
        } else {
          // 認証されていない場合は、ローカルデータのみ読み込み（楽器データはデフォルトを使用）
          await loadStoredData();
          // デフォルト楽器を設定（loadInstrumentsFromDBは認証チェックでデフォルトを設定する）
          loadInstrumentsFromDB();
        }
```

**影響**: 
- エラーハンドリングが不十分
- 競合状態が発生する可能性

**修正提案**: 
```typescript
} else {
  await loadStoredData();
  await loadInstrumentsFromDB(); // awaitを追加
}
```

---

### 5. `resetToInstrumentTheme`のロジック問題
**問題**: `defaultInstruments`を使用しているが、`dbInstruments`を使うべき

**該当箇所**: 
```444:466:music-practice/components/InstrumentThemeContext.tsx
  const resetToInstrumentTheme = React.useCallback(async () => {
    try {
      setCustomThemeState(null);
      setIsCustomTheme(false);
      await AsyncStorage.removeItem(getKey(STORAGE_KEYS.customTheme));
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.isCustomTheme), 'false');
      
      // 楽器選択がある場合は、テーマを強制的に更新
      if (selectedInstrument) {
        // データベースの楽器情報を更新
        const defaultInstruments = instrumentService.getDefaultInstruments();
        const updatedInstrument = defaultInstruments.find(inst => inst.id === selectedInstrument);
        if (updatedInstrument) {
          setDbInstruments(prev => prev.map(inst => 
            inst.id === selectedInstrument ? updatedInstrument : inst
          ));
        }
      }
    } catch (error) {
      logger.error('Theme reset error:', error);
      ErrorHandler.handle(error, 'テーマリセット', false);
    }
  }, [selectedInstrument, getKey]);
```

**影響**: 
- データベースから取得した最新の楽器情報（名前など）が無視される
- ユーザーがカスタマイズした楽器名が失われる可能性

**修正提案**: 
```typescript
const resetToInstrumentTheme = React.useCallback(async () => {
  try {
    setCustomThemeState(null);
    setIsCustomTheme(false);
    await AsyncStorage.removeItem(getKey(STORAGE_KEYS.customTheme));
    await AsyncStorage.setItem(getKey(STORAGE_KEYS.isCustomTheme), 'false');
    
    // 楽器選択がある場合は、dbInstrumentsから取得（データベースの最新情報を使用）
    if (selectedInstrument) {
      const instrument = dbInstruments.find(inst => inst.id === selectedInstrument);
      if (instrument) {
        // 既にdbInstrumentsに含まれているので、特別な更新は不要
        // currentThemeのuseMemoが自動的に更新される
      }
    }
  } catch (error) {
    logger.error('Theme reset error:', error);
    ErrorHandler.handle(error, 'テーマリセット', false);
  }
}, [selectedInstrument, dbInstruments, getKey]);
```

---

### 6. 複雑なuseEffectの依存関係
**問題**: `hydrateFromServer`のuseEffectが複雑で、依存関係が多岐にわたる

**該当箇所**: 
```108:232:music-practice/components/InstrumentThemeContext.tsx
  useEffect(() => {
    let cancelled = false;
    let subscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;
    // ... 長い処理 ...
  }, [selectedInstrument, currentUserId, getKey]);
```

**影響**: 
- 予期しない再実行が発生する可能性
- パフォーマンスの問題
- デバッグが困難

**修正提案**: 
- `hydrateFromServer`関数を`useCallback`でメモ化
- 依存関係を最小限に抑える
- 認証状態の変更と初期化を分離することを検討

---

## 🟢 軽微な問題（Minor Issues）

### 7. 型定義の改善
**問題**: `subscription`の型が複雑で読みにくい

**該当箇所**: 
```111:111:music-practice/components/InstrumentThemeContext.tsx
    let subscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;
```

**修正提案**: 
```typescript
type AuthSubscription = ReturnType<typeof supabase.auth.onAuthStateChange>;
let subscription: AuthSubscription | null = null;
```

---

### 8. エラーハンドリングの一貫性
**問題**: 一部のエラー処理で`cancelled`チェックが不足している

**該当箇所**: 
複数箇所で、非同期処理後の`cancelled`チェックが不十分

**修正提案**: 
すべての非同期処理後に`if (cancelled) return;`を追加

---

### 9. 無駄なuseMemoのコメント
**問題**: `currentTheme`のuseMemo内に無意味なコメントがある

**該当箇所**: 
```423:427:music-practice/components/InstrumentThemeContext.tsx
    if (instrument) {
      // テーマが正常に適用されている
    } else {
      // デフォルトテーマを使用
    }
```

**修正提案**: 
不要なコメントを削除

---

### 10. デフォルト値のフォールバック
**問題**: `useInstrumentTheme`フックのフォールバック実装で空の関数を使用

**該当箇所**: 
```50:70:music-practice/components/InstrumentThemeContext.tsx
export const useInstrumentTheme = () => {
  const context = useContext(InstrumentThemeContext);
  if (!context) {
    // コンテキストが利用できない場合はデフォルト値を返す
    const defaultInstruments = instrumentService.getDefaultInstruments();
    const defaultContext: InstrumentThemeContextType = {
      selectedInstrument: '',
      setSelectedInstrument: async () => {},
      currentTheme: defaultInstruments[0] || defaultTheme,
      practiceSettings: defaultPracticeSettings,
      updatePracticeSettings: async () => {},
      isCustomTheme: false,
      setCustomTheme: async () => {},
      resetToInstrumentTheme: async () => {},
      dbInstruments: defaultInstruments,
    };
    logger.warn('useInstrumentTheme used outside InstrumentThemeProvider, using default values');
    return defaultContext;
  }
  return context;
};
```

**影響**: 
- 開発時のデバッグが困難（警告のみ）
- 本番環境で問題を発見しにくい

**修正提案**: 
開発環境ではエラーを投げる、またはより明確な警告を出す

---

## 📊 パフォーマンスに関する懸念

### 11. 不要な再レンダリング
**問題**: `value`オブジェクトが毎回新しいインスタンスとして作成される可能性

**該当箇所**: 
```468:478:music-practice/components/InstrumentThemeContext.tsx
  const value: InstrumentThemeContextType = {
    selectedInstrument,
    setSelectedInstrument,
    currentTheme,
    practiceSettings,
    updatePracticeSettings,
    isCustomTheme,
    setCustomTheme,
    resetToInstrumentTheme,
    dbInstruments,
  };
```

**修正提案**: 
`useMemo`でメモ化することを検討
```typescript
const value = useMemo<InstrumentThemeContextType>(() => ({
  selectedInstrument,
  setSelectedInstrument,
  currentTheme,
  practiceSettings,
  updatePracticeSettings,
  isCustomTheme,
  setCustomTheme,
  resetToInstrumentTheme,
  dbInstruments,
}), [
  selectedInstrument,
  setSelectedInstrument,
  currentTheme,
  practiceSettings,
  updatePracticeSettings,
  isCustomTheme,
  setCustomTheme,
  resetToInstrumentTheme,
  dbInstruments,
]);
```

---

## 🔒 セキュリティに関する懸念

### 12. ストレージキーのスコープ
**現状**: ユーザーIDでスコープされているため、適切

**確認事項**: 
- 他のユーザーのデータにアクセスできないことを確認済み

---

## ✅ 良い点

1. **エラーハンドリング**: 適切にエラーハンドリングが実装されている
2. **クリーンアップ処理**: useEffectでクリーンアップが適切に行われている
3. **型安全性**: TypeScriptの型定義が適切に使用されている
4. **ログ**: デバッグ用のログが適切に記録されている
5. **サービス層の使用**: ビジネスロジックがサービス層に分離されている
6. **デフォルト値**: フォールバック値が適切に定義されている

---

## 📝 改善優先度

| 優先度 | 問題 | 影響度 | 修正工数 |
|--------|------|--------|----------|
| 🔴 P0 | 1. supabaseインポート欠落 | 高 | 低 |
| 🔴 P0 | 2. サーバー同期の不整合 | 高 | 中 |
| 🟡 P1 | 3. コメントアウトコード | 中 | 低 |
| 🟡 P1 | 4. 初期化時のawait欠落 | 中 | 低 |
| 🟡 P1 | 5. resetToInstrumentThemeのロジック | 中 | 低 |
| 🟡 P2 | 6. useEffectの複雑さ | 中 | 高 |
| 🟢 P3 | 7-12. 軽微な改善 | 低 | 低〜中 |

---

## 🎯 推奨される修正順序

1. **即座に修正**: 問題1（supabaseインポート）
2. **早急に修正**: 問題2（サーバー同期）
3. **次回リリース前に修正**: 問題3-5
4. **リファクタリング時に改善**: 問題6、11

---

## 📚 参考資料

- React Context ベストプラクティス
- React Hooks 依存関係の管理
- AsyncStorage の適切な使用方法

---

レビュー実施者: AI リードエンジニア
レビュー対象ファイル: `components/InstrumentThemeContext.tsx`
レビュー日: 2025年1月




