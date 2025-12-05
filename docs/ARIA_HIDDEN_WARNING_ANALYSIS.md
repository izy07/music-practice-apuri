# aria-hidden警告の根本的な分析と解決策

## 警告の内容

```
Blocked aria-hidden on an element because its descendant retained focus. 
The focus must not be hidden from assistive technology users. 
Avoid using aria-hidden on a focused element or its ancestor. 
Consider using the inert attribute instead.
```

## 問題の原因

1. **React Native Webの`Modal`コンポーネントの動作**
   - モーダルが表示されると、React Native Webは自動的に背景に`aria-hidden="true"`を設定します
   - これは、スクリーンリーダーなどの支援技術が背景のコンテンツを読み上げないようにするためです

2. **フォーカス管理の問題**
   - 背景に`aria-hidden="true"`が設定されているにもかかわらず、その中にフォーカス可能な要素が存在する
   - フォーカスがその要素に移動すると、支援技術ユーザーがその要素にアクセスできなくなる
   - これはアクセシビリティの重大な問題です

3. **現在の対策の限界**
   - `web/index.html`で`aria-hidden`の設定を監視・削除するスクリプトが実装されている
   - しかし、タイミングの問題で警告が発生する可能性がある
   - React Native Webが`aria-hidden`を設定するタイミングと、フォーカスが移動するタイミングの競合

## 根本的な解決策

### 1. `inert`属性の使用（推奨）

`inert`属性は、要素とその子孫を非対話的にし、フォーカスも受け付けません。
`aria-hidden`よりも安全で、より現代的なアプローチです。

**利点：**
- フォーカス可能な要素を自動的に無効化
- より明確なセマンティクス
- ブラウザのネイティブサポート

**実装方法：**
- モーダルが表示されているとき、背景のルート要素（例：`#root`の直接の子要素）に`inert`属性を設定
- モーダルが閉じたとき、`inert`属性を削除

### 2. フォーカストラップの適切な実装

モーダルが表示されているとき：
- 背景のすべてのフォーカス可能な要素に`tabindex="-1"`を設定
- モーダル内の最初のフォーカス可能な要素にフォーカスを移動
- モーダルが閉じたとき、元のフォーカス位置に戻す

### 3. モーダルコンポーネントの改善

- モーダルの背景オーバーレイに`aria-hidden`を設定するのではなく、背景の各要素に個別に`aria-hidden`を設定
- または、モーダルの背景オーバーレイ自体を`inert`にする

## 推奨される実装

1. **モーダル管理フックの作成**
   - モーダルの開閉状態を追跡
   - モーダルが開いているとき、背景に`inert`属性を設定
   - モーダルが閉じたとき、`inert`属性を削除

2. **既存の`modalFocusManager.ts`の拡張**
   - `inert`属性の管理機能を追加
   - フォーカストラップの改善

3. **React Native Webの`Modal`コンポーネントのラッパー作成**
   - カスタムモーダルコンポーネントを作成
   - `inert`属性の自動管理を組み込む

## 注意点

- `inert`属性は比較的新しい機能で、古いブラウザではサポートされていない可能性がある
- フォールバックとして、`aria-hidden`と`tabindex="-1"`の組み合わせを使用する必要がある場合がある
- React Native Webの`Modal`コンポーネントの内部実装に依存しているため、完全な制御が難しい場合がある

## 実装済みの解決策

### 1. `modalFocusManager.ts`の改善

- `inert`属性を使用して背景を非対話的にする機能を追加
- 複数のモーダルが同時に開いている場合に対応（カウンター方式）
- フォールバックとして`tabindex="-1"`も使用（古いブラウザ対応）

### 2. `web/index.html`のスクリプト改善

- `inert`属性が設定されている場合は、`aria-hidden`の削除をスキップ
- モーダル内の要素（`data-modal-content`属性を持つ要素）を識別
- より正確なフォーカス管理

### 3. モーダルコンポーネントの改善

- `EventModal`に`data-modal-content`属性を追加
- 他のモーダルコンポーネントも同様に更新が必要

## 今後の対応

1. **すべてのモーダルコンポーネントに`data-modal-content`属性を追加**
   - `PracticeRecordModal.tsx`
   - `QuickRecordModal.tsx`
   - `PostureCameraModal.tsx`
   - その他のモーダルコンポーネント

2. **モーダルコンポーネントで`modalFocusManager`を使用**
   - 既に`EventModal`で実装済み
   - 他のモーダルコンポーネントも同様に実装

3. **テスト**
   - モーダルが開いたときに`inert`属性が設定されることを確認
   - モーダルが閉じたときに`inert`属性が削除されることを確認
   - `aria-hidden`警告が発生しないことを確認

## 参考資料

- [WAI-ARIA仕様 - aria-hidden](https://w3c.github.io/aria/#aria-hidden)
- [HTML仕様 - inert属性](https://html.spec.whatwg.org/multipage/interaction.html#the-inert-attribute)
- [MDN - aria-hidden](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-hidden)
- [MDN - inert](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert)

