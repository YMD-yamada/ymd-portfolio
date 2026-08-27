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

### GitHub Pages は廃止 (2026-08-27)

方針: **公開先は汎用ホスティングのみ。GitHub はソース管理専用。** GitHub Pages は昔のテストの名残なので使わない（オペレータ指示）。

配信中だった 6 リポジトリを無効化し、全て 404 を確認:

| リポ | 代替の本番 |
|---|---|
| ymd-portfolio | Cloudflare Pages（canonical） |
| Igo-vs-Shogi | https://kuroshiro-omega.vercel.app （黒白侵攻） |
| kids-mini-games | https://kids-mini-games.vercel.app |
| triptune | https://bucolic-biscuit-c637b0.netlify.app （気分で旅行先。title/h1 とも TripTune で同一と確認） |
| basketball-scoreboard | なし（2026-04 の試作） |
| TechMatch | なし（2025-04 の試作） |

- github.io は master 生配信だったため、Cloudflare 側で剥がしている `admin.js` / studio gate / `studio-server.mjs` が 200 で出ていた。これも同時に解消。
- 無効化は Pages 設定の解除だけで、コンテンツは git に残っている。再開したければ API 一発で戻せる。
- `Professor`（群馬大学 吉原利忠教授の研究紹介ページ）だけは第三者向けの実ページで代替ホストが無いため保留中。判断待ち。

## 2026-08-14 夜（ローカル）

- グンギを掲載: https://gungi-iota.vercel.app （ゲーム／非公式）
- wrangler 未ログイン。CLOUDFLARE_API_TOKEN は GitHub secret のみ（期限切れ）。ローカルからは Pages デプロイ不可。
