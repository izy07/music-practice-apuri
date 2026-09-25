import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function extractSections(tsPath, exportName) {
  const source = fs.readFileSync(tsPath, 'utf8');
  const match = source.match(new RegExp(`export const ${exportName}[\\s\\S]*?= \\[([\\s\\S]*?)\\];`));
  if (!match) {
    throw new Error(`Could not parse ${exportName} from ${tsPath}`);
  }

  const sections = [];
  const blockRegex = /\{\s*title:\s*'([^']*)',\s*paragraphs:\s*\[([\s\S]*?)\]\s*,?\s*\}/g;
  let block;
  while ((block = blockRegex.exec(match[1])) !== null) {
    const title = block[1];
    const paragraphs = [...block[2].matchAll(/'((?:\\'|[^'])*)'/g)].map((m) =>
      m[1].replace(/\\'/g, "'")
    );
    sections.push({ title, paragraphs });
  }
  return sections;
}

const lastUpdatedMatch = fs
  .readFileSync(path.join(root, 'lib/legal/types.ts'), 'utf8')
  .match(/LEGAL_LAST_UPDATED = '([^']+)'/);
const lastUpdated = lastUpdatedMatch?.[1] ?? '';

const sections = extractSections(
  path.join(root, 'lib/legal/privacyPolicySections.ts'),
  'PRIVACY_POLICY_SECTIONS'
);

const body = sections
  .map((section) => {
    const title = `<h2>${section.title}</h2>`;
    const paragraphs = section.paragraphs.map((p) => `<p>${p}</p>`).join('\n');
    return `${title}\n${paragraphs}`;
  })
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>プライバシーポリシー | Music Practice</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.7; color: #212121; max-width: 720px; margin: 0 auto; padding: 24px 16px 64px; background: #fafafa; }
    h1 { font-size: 1.4rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.15rem; margin-top: 2rem; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.35rem; }
    p { margin: 0.55rem 0; color: #333; }
    .meta { color: #757575; font-size: 0.9rem; margin-bottom: 1.5rem; }
  </style>
</head>
<body>
<h1>音楽練習支援アプリケーション「Music Practice」</h1>
<p class="meta">最終更新日: ${lastUpdated}</p>
${body}
<p>以上</p>
</body>
</html>
`;

const outPath = path.join(root, 'docs/public/privacy-policy.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
