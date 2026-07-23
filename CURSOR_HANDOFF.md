# CURSOR_HANDOFF

## 目的

申請不要の Web 制作物ポートフォリオ。ストア法務ハブ（personal-site）とは別。

## 自動化

- CI: push / 日次 `sync-apps` → Cloudflare Pages
- エージェント: `scripts/publish-app-listing.mjs`（register → push → deploy）
- 法務: `/legal/privacy|terms|support.html`、カード表記、`legal/embed-snippet.html`

## 本番

https://ymd-portfolio-site.pages.dev/
