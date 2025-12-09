/**
 * モーダルのフォーカス管理ユーティリティ
 * Webプラットフォームでのaria-hidden警告を根本的に解決するため
 * 
 * 問題: React Native WebのModalコンポーネントは背景にaria-hidden="true"を設定しますが、
 * その中にフォーカス可能な要素があると警告が発生します。
 * 
 * 解決策: inert属性を使用して背景を非対話的にし、aria-hidden警告を根本的に解決します。
 */

// モーダルの開閉状態を追跡（複数のモーダルが同時に開いている場合に対応）
let modalCount = 0;
let rootElement: HTMLElement | null = null;

/**
 * ルート要素を取得（初回のみ）
 */
const getRootElement = (): HTMLElement | null => {
  if (typeof window === 'undefined') return null;
  
  if (!rootElement) {
    rootElement = document.getElementById('root') || document.body;
  }
  
  return rootElement;
};

/**
 * モーダルが開いたときに背景を非対話的にする（inert属性を使用）
 * 
 * inert属性は、要素とその子孫を非対話的にし、フォーカスも受け付けません。
 * aria-hiddenよりも安全で、より現代的なアプローチです。
 */
export const disableBackgroundFocus = () => {
  if (typeof window === 'undefined') return;
  
  modalCount++;
  
  const root = getRootElement();
  if (!root) return;
  
  // inert属性を設定（モーダルが開いている間、背景を非対話的にする）
  // inert属性は、フォーカス可能な要素を自動的に無効化するため、
  // aria-hidden警告を根本的に解決します
  if (modalCount === 1) {
    root.setAttribute('inert', '');
    
    // 背景のすべてのaria-hidden属性を即座に削除
    const removeAriaHidden = () => {
      const elementsWithAriaHidden = document.querySelectorAll('[aria-hidden="true"]');
      elementsWithAriaHidden.forEach((element) => {
        const htmlElement = element as HTMLElement;
        // モーダル内の要素は除外
        if (!htmlElement.closest('[role="dialog"]') && 
            !htmlElement.closest('[aria-modal="true"]') &&
            !htmlElement.closest('[data-modal-content]')) {
          htmlElement.removeAttribute('aria-hidden');
        }
      });
    };
    
    // 即座に削除
    removeAriaHidden();
    
    // 少し遅延して再度削除（React Native Webが設定するタイミングに対応）
    setTimeout(removeAriaHidden, 0);
    setTimeout(removeAriaHidden, 10);
    setTimeout(removeAriaHidden, 50);
    setTimeout(removeAriaHidden, 100);
    setTimeout(removeAriaHidden, 200);
    setTimeout(removeAriaHidden, 500);
    
    // MutationObserverでリアルタイムにaria-hiddenの追加を監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const target = mutation.target as HTMLElement;
          if (target.getAttribute('aria-hidden') === 'true') {
            // モーダル内の要素は除外
            if (!target.closest('[role="dialog"]') && 
                !target.closest('[aria-modal="true"]') &&
                !target.closest('[data-modal-content]')) {
              target.removeAttribute('aria-hidden');
            }
          }
        }
      });
    });
    
    // ルート要素とその子孫を監視
    if (root) {
      observer.observe(root, {
        attributes: true,
        attributeFilter: ['aria-hidden'],
        subtree: true
      });
      
      // モーダルが閉じたときにobserverを切断するため、グローバルに保存
      (window as any).__modalAriaHiddenObserver = observer;
    }
    
    // フォールバック: 古いブラウザでinertがサポートされていない場合の対策
    // 背景のフォーカス可能な要素にtabindex="-1"を設定
    const focusableElements = document.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    focusableElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      // モーダル内の要素は除外
      if (!htmlElement.closest('[role="dialog"]') && 
          !htmlElement.closest('[aria-modal="true"]') &&
          !htmlElement.closest('[data-modal-content]')) {
        htmlElement.setAttribute('data-modal-disabled-tabindex', htmlElement.getAttribute('tabindex') || '');
        htmlElement.setAttribute('tabindex', '-1');
      }
    });
  }
};

/**
 * モーダルが閉じたときに背景を再有効化
 */
export const enableBackgroundFocus = () => {
  if (typeof window === 'undefined') return;
  
  modalCount = Math.max(0, modalCount - 1);
  
  // すべてのモーダルが閉じたときのみ、背景を再有効化
  if (modalCount === 0) {
    const root = getRootElement();
    if (root) {
      root.removeAttribute('inert');
    }
    
    // MutationObserverを切断
    if ((window as any).__modalAriaHiddenObserver) {
      (window as any).__modalAriaHiddenObserver.disconnect();
      delete (window as any).__modalAriaHiddenObserver;
    }
    
    // フォールバック: 無効化したフォーカス可能な要素を再有効化
    const disabledElements = document.querySelectorAll('[data-modal-disabled-tabindex]');
    
    disabledElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const originalTabIndex = htmlElement.getAttribute('data-modal-disabled-tabindex');
      if (originalTabIndex === '') {
        htmlElement.removeAttribute('tabindex');
      } else if (originalTabIndex) {
        htmlElement.setAttribute('tabindex', originalTabIndex);
      }
      htmlElement.removeAttribute('data-modal-disabled-tabindex');
    });
  }
};

/**
 * モーダル内の最初のフォーカス可能な要素にフォーカスを移動
 */
export const focusFirstElement = (container: HTMLElement | null) => {
  if (typeof window === 'undefined' || !container) return;
  
  const firstFocusable = container.querySelector(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ) as HTMLElement;
  
  if (firstFocusable) {
    setTimeout(() => {
      firstFocusable.focus();
    }, 100);
  }
};

/**
 * モーダルの開閉状態をリセット（緊急時用）
 */
export const resetModalState = () => {
  if (typeof window === 'undefined') return;
  
  modalCount = 0;
  const root = getRootElement();
  if (root) {
    root.removeAttribute('inert');
  }
  
  // すべての無効化された要素を再有効化
  enableBackgroundFocus();
};

