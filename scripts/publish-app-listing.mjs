#!/usr/bin/env node
/**
 * Agent-owned: register a Web app on the portfolio and publish (no user commands).
 *
 * Usage (agent):
 *   node scripts/publish-app-listing.mjs --name "My App" --url "https://my-app.vercel.app"
 *   node scripts/publish-app-listing.mjs --name "My App" --url "https://..." --audience kid
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function arg(flag, fallback = "") {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function sh(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", shell: true, cwd: ROOT });
}

const name = arg("--name");
const url = arg("--url");
const description = arg("--description", "");
const audience = arg("--audience", "normal");
const category = arg("--category", "公開中");
const skipPush = process.argv.includes("--skip-push");

if (!name || !url) {
  console.error("Required: --name and --url");
  process.exit(1);
}

const register = [
  "node",
  JSON.stringify(join(ROOT, "scripts", "register-app.mjs")),
  "--name",
  JSON.stringify(name),
  "--url",
  JSON.stringify(url),
  "--audience",
  JSON.stringify(audience),
  "--category",
  JSON.stringify(category),
];
if (description) {
  register.push("--description", JSON.stringify(description));
}
sh(register.join(" "));

if (!skipPush) {
  sh("git add -A");
  try {
    sh(
      `git -c user.email="ymd.hude@gmail.com" -c user.name="ymd" commit -m ${JSON.stringify(`Register ${name} on portfolio`)}`,
    );
  } catch {
    console.log("Nothing to commit (already registered).");
  }
  sh("git push");
  try {
    sh('gh workflow run "Deploy to Cloudflare Pages" --repo YMD-yamada/ymd-portfolio');
  } catch (e) {
    console.warn("Could not trigger Pages workflow (push may still deploy):", e.message || e);
  }
}

console.log("Done. Portfolio listing published by agent.");
console.log("Legal (embed in each Web app footer):");
console.log("  https://ymd-portfolio-site.pages.dev/legal/privacy.html");
console.log("  https://ymd-portfolio-site.pages.dev/legal/terms.html");
console.log("  https://ymd-portfolio-site.pages.dev/legal/support.html");
