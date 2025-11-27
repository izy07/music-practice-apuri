import { Alert } from 'react-native';

// ユーザーフレンドリーなエラーメッセージ定義
export const ErrorMessages = {
  // ネットワーク関連
  networkError: {
    title: 'ネットワークエラー',
    message: 'インターネット接続を確認してください。\nデータは安全に保存されています。',
    action: '再試行'
  },
  
  // 認証関連
  authError: {
    title: 'ログインエラー',
    message: 'メールアドレスまたはパスワードが正しくありません。\nもう一度お試しください。',
    action: '確認する'
  },
  
  // データ保存関連
  saveError: {
    title: '保存エラー',
    message: 'データの保存に失敗しました。\nしばらく時間をおいて再度お試しください。',
    action: '再試行'
  },
  
  // 録音関連
  recordingError: {
    title: '録音エラー',
    message: '録音の保存に失敗しました。\nストレージ容量を確認してください。',
    action: '確認する'
  },
  
  // 同期関連
  syncError: {
    title: '同期エラー',
    message: 'データの同期に失敗しました。\nオフライン時は自動的に再試行されます。',
    action: '了解'
  },
  
  // 楽器選択関連
  instrumentError: {
    title: '楽器選択エラー',
    message: '楽器の選択に失敗しました。\nもう一度お試しください。',
    action: '再試行'
  },
  
  // チュートリアル関連
  tutorialError: {
    title: 'チュートリアルエラー',
    message: 'チュートリアルの完了に失敗しました。\nアプリを再起動してお試しください。',
    action: '了解'
  },
  
  // 一般的なエラー
  generalError: {
    title: 'エラーが発生しました',
    message: '予期しないエラーが発生しました。\nしばらく時間をおいて再度お試しください。',
    action: '了解'
  }
};

// エラーハンドリング用のユーティリティ関数
export const showUserFriendlyError = (error: any, context: string = '') => {
  let errorMessage = ErrorMessages.generalError; // デフォルト
  
  if (error && typeof error === 'object') {
    const errorMsg = error.message?.toLowerCase() || '';
    
    if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
      errorMessage = ErrorMessages.networkError;
    } else if (errorMsg.includes('auth') || errorMsg.includes('login') || errorMsg.includes('unauthorized')) {
      errorMessage = ErrorMessages.authError;
    } else if (errorMsg.includes('recording') || errorMsg.includes('audio') || errorMsg.includes('media')) {
      errorMessage = ErrorMessages.recordingError;
    } else if (errorMsg.includes('sync') || errorMsg.includes('offline') || errorMsg.includes('database')) {
      errorMessage = ErrorMessages.syncError;
    } else if (context.includes('instrument')) {
      errorMessage = ErrorMessages.instrumentError;
    } else if (context.includes('tutorial')) {
      errorMessage = ErrorMessages.tutorialError;
    } else if (context.includes('save') || errorMsg.includes('save') || errorMsg.includes('insert') || errorMsg.includes('update')) {
      errorMessage = ErrorMessages.saveError;
    }
  }
  
  Alert.alert(
    errorMessage.title,
    errorMessage.message,
    [{ text: errorMessage.action, style: 'default' }]
  );
};

// 成功メッセージ
export const SuccessMessages = {
  instrumentSelected: (instrumentName: string) => ({
    title: '楽器選択完了',
    message: `${instrumentName}が選択されました！`
  }),
  
  practiceSaved: {
    title: '練習記録保存完了',
    message: '練習記録が保存されました。'
  },
  
  recordingSaved: {
    title: '録音保存完了',
    message: '録音が保存されました。'
  },
  
  tutorialCompleted: {
    title: 'チュートリアル完了',
    message: 'チュートリアルが完了しました！'
  }
};

export const showSuccessMessage = (messageKey: keyof typeof SuccessMessages, instrumentName?: string) => {
  const message = typeof SuccessMessages[messageKey] === 'function' 
    ? (SuccessMessages[messageKey] as any)(instrumentName)
    : SuccessMessages[messageKey];
    
  Alert.alert(message.title, message.message);
};
