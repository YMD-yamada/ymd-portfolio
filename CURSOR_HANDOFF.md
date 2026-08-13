# CURSOR_HANDOFF

## 目的

公開HP / 申請不要の Web 制作物ポートフォリオ。SNS で紹介するときの正本。
ストア法務ハブ（personal-site）とは別。ストア申請アプリはカードから法務へリンクして呼応。

## 自動化

- CI: push / 日次 `sync-apps` → Cloudflare Pages
- エージェント: `scripts/publish-app-listing.mjs`（Web） / personal-site `--store`（申請アプリ）
- 公開リスト: `config/apps.config.json` の `selection.urls` のみが `data/apps.json` に載る
- OG: `/og.png`（SNSカード）

## 本番

https://ymd-portfolio-site.pages.dev/

ストア法務: https://personal-site-taupe-gamma.vercel.app/
