# Web 公開アプリの自動掲載と法務（エージェント向け）

ユーザーに `npm` コマンドを実行させない。エージェントまたは CI が実施する。

## 役割（混ぜない）

| サイト | URL | 用途 | 載せるもの |
|---|---|---|---|
| ポートフォリオ（このHP） | https://ymd-portfolio-site.pages.dev/ | 人向け・SNS入口 | 公開 Web 制作物すべて。ストア申請中はカードに法務リンク |
| ストア法務ハブ | https://personal-site-taupe-gamma.vercel.app/ | App Store / Play / MS Store 提出 | ストア申請アプリのみ |

正本の説明: `work-ops-hub/docs/HP_SITES.md`

## 自動掲載の仕組み

1. **CI（日次 + push）**: `scripts/sync-apps.mjs` → allowlist → Pages。
2. **エージェント**: `node scripts/publish-app-listing.mjs --name "..." --url "https://..."`
3. **ストア申請が必要なら** personal-site 側で `--store --slug ...` も実行（ハブ＋このHPの両方）。

## 埋め込み必須 URL（Web アプリフッター）

- https://ymd-portfolio-site.pages.dev/legal/privacy.html
- https://ymd-portfolio-site.pages.dev/legal/terms.html
- https://ymd-portfolio-site.pages.dev/legal/support.html

ストア提出アプリは加えて:

- https://personal-site-taupe-gamma.vercel.app/legal/privacy/
- https://personal-site-taupe-gamma.vercel.app/legal/terms/
- https://personal-site-taupe-gamma.vercel.app/support/
- https://personal-site-taupe-gamma.vercel.app/apps/<slug>/
