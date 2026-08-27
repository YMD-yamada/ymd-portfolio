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

## Deploy (2026-08-27 更新)

`Deploy to Cloudflare Pages` は `CLOUDFLARE_API_TOKEN` の Authentication error [code: 10000] で失敗継続。**最後に成功したのは 2026-07-31**（直近 200 runs のうち以降は全部 failure）。canonical の `ymd-portfolio-site.pages.dev/data/apps.json` は `generatedAt: 2026-07-31` のまま。

- ローカルに Cloudflare 認証情報は無い（`wrangler login` 未実施、`.wrangler/config` なし、Projects 配下に実値の入った `.env` なし）。**トークン再発行は Cloudflare ダッシュボードへの本人ログインが必要**で、エージェントからは実行不可。
- workflow に `Verify Cloudflare credentials` プリフライトを追加。`user/tokens/verify` と `accounts/*/pages/projects` を先に叩き、「トークンが無効/期限切れ」と「トークンは有効だが Pages 権限が無い」を切り分けてから落ちる。ビルド前に数秒で判定するので、失敗時の CI 時間も短くなる。
- 復旧手順は RUNBOOK.md「A. Cloudflare Pages」。要点は `Account → Cloudflare Pages → Edit` を必ず入れること（Workers テンプレだけだとこの 10000 になる）。

### GitHub Pages が生きている（2026-08-27 発見）

RUNBOOK 手順 9「GitHub Pages を無効化」は未実施で、https://ymd-yamada.github.io/ymd-portfolio/ が master をそのまま配信中。

- こちらは **`generatedAt: 2026-08-26` で 13 件が最新**。つまり掲載内容自体は失われておらず、古いのは canonical の Cloudflare 側だけ。
- 一方で Cloudflare workflow が意図的に剥がしている `admin.js` / `studio-ymd-gate-73x.html` / `scripts/studio-server.mjs` が github.io では 200 で配信されている。調査した結果 `admin.js` はローカル Studio の `/api/health` を叩くだけで、リポジトリに秘密のコミットも無い（token 形式の文字列を全走査して 0 件）。実害は低いが workflow の意図とは食い違う。
- **判断待ち**: github.io は現状「唯一データが最新な公開 URL」なので、Cloudflare が復旧するまでは止めない方が安全。復旧後に GitHub Pages を Source=None にするかを決める（消す操作なので明示許可が必要）。

## 2026-08-14 夜（ローカル）

- グンギを掲載: https://gungi-iota.vercel.app （ゲーム／非公式）
- wrangler 未ログイン。CLOUDFLARE_API_TOKEN は GitHub secret のみ（期限切れ）。ローカルからは Pages デプロイ不可。
