/**
 * モーダルのフォーカス管理ユーティリティ
 * Webプラットフォームでのaria-hidden警告を軽減するため
 */

/**
 * モーダルが開いたときに背景のフォーカス可能な要素を無効化
 */
export const disableBackgroundFocus = () => {
  if (typeof window === 'undefined') return;
  
  const focusableElements = document.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  focusableElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    if (!htmlElement.closest('[role="dialog"]') && !htmlElement.closest('[aria-modal="true"]')) {
      htmlElement.setAttribute('data-modal-disabled-tabindex', htmlElement.getAttribute('tabindex') || '');
      htmlElement.setAttribute('tabindex', '-1');
    }
  });
};

/**
 * モーダルが閉じたときに背景のフォーカス可能な要素を再有効化
 */
export const enableBackgroundFocus = () => {
  if (typeof window === 'undefined') return;
  
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

