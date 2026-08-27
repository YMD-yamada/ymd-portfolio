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

## Deploy — 復旧済み (2026-08-27)

**2026-07-31 から 8/27 まで約 4 週間デプロイが止まっていたが復旧。** run 33065614083 が全ステップ成功し、`ymd-portfolio-site.pages.dev/data/apps.json` は `generatedAt: 2026-08-27T11:02:42Z` / 13 件。watt-watch・グンギ・Usageboard for Cursor が公開 URL に載った。`/legal/privacy` `/legal/terms` `/legal/support` も 200。

経緯（同種の再発時に読む）:

- wrangler は `Authentication error [code: 10000]` しか返さず、期限切れなのか Pages 権限不足なのか区別できなかった。ローカルに Cloudflare 認証情報も無く（`wrangler login` 未実施、`.wrangler/config` なし、Projects 配下に実値入り `.env` なし）、エージェント側では再発行不可だった。
- workflow に `Verify Cloudflare credentials` プリフライトを追加。`user/tokens/verify` → `accounts/*/pages/projects` の順に叩いて、ビルド前に切り分ける。失敗が 36s → 9s に短縮。
- **原因確定 (run 33046967522)**: `{"success":false,"errors":[{"code":1000,"message":"Invalid API Token"}]}` = トークン自体の失効。権限を足しても直らないので新規発行が唯一の道だった。人間がトークンを再発行して secret を更新 → 復旧。
- 新トークンには `Account → Cloudflare Pages → Edit` が必須。Workers テンプレだけだと今度は 10000 になる（RUNBOOK.md「A. Cloudflare Pages」）。

### Studio 除外は正しく効いている

`admin.js` / `studio-ymd-gate-73x.html` / `scripts/studio-server.mjs` はキャッシュ回避付きで叩くと全て 404 フォールバックを返す。キャッシュ無しの素の GET だと `admin.js` が 200 に見えるが、これは `s-maxage=604800` の CDN ヒット（失敗期間中の探索でエッジに乗った旧デプロイの残骸）。7 日で消える。

### GitHub Pages が二重に生きている（未処理）

RUNBOOK 手順 9「GitHub Pages を無効化」は未実施で、https://ymd-yamada.github.io/ymd-portfolio/ が master をそのまま配信中。

- Cloudflare が止まっていた間はこちらだけが最新データを配信していた（結果的に救いになった）。
- ただし github.io は master 生配信なので、Cloudflare 側で剥がしている `admin.js` / studio gate / `studio-server.mjs` が 200 で出る。調査済み: `admin.js` はローカル Studio の `/api/health` を叩くだけで、リポジトリに秘密のコミットも無い（トークン形式の文字列を全走査して 0 件）。実害は低い。
- **判断待ち**: Cloudflare が復旧したので Source=None にして URL を一本化できる。消す操作なので明示許可が必要。canonical を変えるわけではないので SEO 上はむしろ望ましい。

## 2026-08-14 夜（ローカル）

- グンギを掲載: https://gungi-iota.vercel.app （ゲーム／非公式）
- wrangler 未ログイン。CLOUDFLARE_API_TOKEN は GitHub secret のみ（期限切れ）。ローカルからは Pages デプロイ不可。
