# 公開用プライバシーポリシー

アプリ内の `app/privacy-policy.tsx` と同等の内容を静的 HTML にしたものです。

## なぜ必要か

Google Play / App Store のクローズドテストでも、**誰でも開ける公開 URL** が必要です。  
このリポジトリは **private** のため、GitHub Pages（`izy07.github.io/...`）は現状 **404** になります。

## あなたがやること（どれか1つ）

1. **いちばん簡単**: [Notion](https://notion.so) や Google サイトに同じ文章を貼り、「ウェブ公開」して URL を控える  
2. **この HTML を使う**: Cloudflare Pages / Netlify / 別の **public** GitHub リポジトリに `privacy-policy.html` を置く  
3. 取得した URL を EAS Secret / `.env` に入れる:

```bash
EXPO_PUBLIC_PRIVACY_POLICY_URL=https://あなたの公開URL/privacy-policy.html
```

Play Console の「プライバシーポリシー」欄にも同じ URL を貼ってください。
