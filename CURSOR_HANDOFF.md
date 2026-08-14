# CURSOR_HANDOFF

## 目的

公開HP。SNS入口。**個人情報・生活圏アプリは載せない。**

## 公開禁止（個人用へ）

本庄おでかけ / 会社紹介 / おかえり連絡 / juken-navi → `persona-hp-platform`（次セッション）

## UI (2026-08-13)

- カードは番号ではなく `/icons/*.svg` のイメージアイコン
- 分類: 生活・ツール / 子ども向け / ゲーム / 仕事 / ひと息 / 成人向け

## 本番

https://ymd-portfolio-site.pages.dev/  
ストア法務: https://personal-site-taupe-gamma.vercel.app/

Web アプリのフッターは `.html` なし:
https://ymd-portfolio-site.pages.dev/legal/privacy （terms / support も同様）

## Deploy (2026-08-14)

GitHub Actions `Deploy to Cloudflare Pages` は `CLOUDFLARE_API_TOKEN` が Authentication error [code: 10000] で失敗中（2026-08-13 から継続）。本番 `data/apps.json` は 2026-07-31 のまま。Cursor Usage Monitor / グンギは master に登録済み。トークン再発行後に workflow 再実行で HP に出る。

## 2026-08-14 夜（ローカル）

- グンギを掲載: https://gungi-iota.vercel.app （ゲーム／非公式）
- wrangler 未ログイン。CLOUDFLARE_API_TOKEN は GitHub secret のみ（期限切れ）。ローカルからは Pages デプロイ不可。
