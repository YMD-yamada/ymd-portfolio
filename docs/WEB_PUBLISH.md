# Web 公開アプリの自動掲載と法務（エージェント向け）

ユーザーに `npm` コマンドを実行させない。エージェントまたは CI が実施する。

## 役割

| サイト | URL | 用途 |
|---|---|---|
| ポートフォリオ | https://ymd-portfolio-site.pages.dev/ | ストア申請不要の Web 作品一覧 |
| ストア法務ハブ | https://personal-site-taupe-gamma.vercel.app/ | App Store / Play 申請用の共通法務 |

## 自動掲載の仕組み

1. **CI（日次 + push）**: `scripts/sync-apps.mjs` が GitHub / Vercel / Netlify / Render / Cloudflare の公開 URL を `data/apps.json` に取り込み → Pages デプロイ。
2. **エージェント即時登録**: `node scripts/publish-app-listing.mjs --name "..." --url "https://..."`  
   → register → commit → push → Deploy workflow。

## Web アプリ公開時にエージェントがやること

1. 本番 URL を確定する。
2. `node scripts/publish-app-listing.mjs --name "App" --url "https://..."` を実行する。
3. アプリ本体のフッターに `legal/embed-snippet.html` のリンクを入れる（プライバシー準拠の表記）。
4. 可能なら GitHub リポジトリの Website 欄に本番 URL を設定する（日次 sync が拾う）。

## 埋め込み必須 URL

- https://ymd-portfolio-site.pages.dev/legal/privacy.html
- https://ymd-portfolio-site.pages.dev/legal/terms.html
- https://ymd-portfolio-site.pages.dev/legal/support.html

ストア申請が後から必要になった場合のみ、personal-site 側の共通法務 URL も併用する。
