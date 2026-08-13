/**
 * Distinct 64×64 app icons for the public HP (no numbered placeholders).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "icons");
mkdirSync(dir, { recursive: true });

function svg(inner, bg = "#1f5c4a") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-hidden="true">
  <rect width="64" height="64" rx="14" fill="${bg}"/>
  ${inner}
</svg>
`;
}

const icons = {
  "point-palette": svg(
    `<rect x="14" y="16" width="36" height="22" rx="4" fill="#f4f7f4" opacity=".95"/>
     <rect x="18" y="22" width="28" height="4" rx="2" fill="#1f5c4a"/>
     <rect x="18" y="29" width="18" height="3" rx="1.5" fill="#7aa392"/>
     <rect x="14" y="30" width="36" height="20" rx="4" fill="#e8f0ea"/>
     <rect x="18" y="36" width="28" height="8" rx="2" fill="#1a1f1c"/>
     <rect x="20" y="38" width="3" height="4" fill="#e8f0ea"/>
     <rect x="25" y="38" width="2" height="4" fill="#e8f0ea"/>
     <rect x="29" y="38" width="4" height="4" fill="#e8f0ea"/>
     <rect x="35" y="38" width="2" height="4" fill="#e8f0ea"/>
     <rect x="39" y="38" width="3" height="4" fill="#e8f0ea"/>`,
    "#2a6b56",
  ),
  timeboard: svg(
    `<circle cx="32" cy="30" r="16" fill="#e8f0ea"/>
     <circle cx="32" cy="30" r="12" fill="#1f5c4a"/>
     <path d="M32 20v11l8 4" fill="none" stroke="#e8f0ea" stroke-width="2.6" stroke-linecap="round"/>
     <rect x="16" y="48" width="8" height="8" rx="1.5" fill="#cfe0d6"/>
     <rect x="28" y="44" width="8" height="12" rx="1.5" fill="#e8f0ea"/>
     <rect x="40" y="40" width="8" height="16" rx="1.5" fill="#f4f7f4"/>`,
    "#163d32",
  ),
  "triple-triad": svg(
    `<rect x="10" y="18" width="22" height="30" rx="3" fill="#e8f0ea" transform="rotate(-12 21 33)"/>
     <rect x="21" y="16" width="22" height="30" rx="3" fill="#f6f7f5"/>
     <rect x="32" y="18" width="22" height="30" rx="3" fill="#d5e6dc" transform="rotate(12 43 33)"/>
     <circle cx="32" cy="31" r="4" fill="#1f5c4a"/>`,
    "#245a8c",
  ),
  kuroshiro: svg(
    `<circle cx="24" cy="28" r="11" fill="#141816"/>
     <circle cx="24" cy="28" r="4" fill="#e8eef3" opacity=".15"/>
     <path d="M34 18l12 8v16l-12 8-12-8V26z" fill="#f3efe6"/>
     <path d="M34 22v24" stroke="#1f5c4a" stroke-width="1.6"/>`,
    "#2c3340",
  ),
  shortsync: svg(
    `<circle cx="22" cy="22" r="7" fill="#e8f0ea"/>
     <circle cx="42" cy="22" r="7" fill="#cfe0d6"/>
     <circle cx="32" cy="44" r="8" fill="#f4f7f4"/>
     <path d="M26 26l4 12M38 26l-4 12" stroke="#e8f0ea" stroke-width="2.4" stroke-linecap="round"/>
     <path d="M18 44h28" stroke="#9ecab8" stroke-width="2" stroke-linecap="round" opacity=".7"/>`,
    "#1b4f78",
  ),
  "kotoba-zukan": svg(
    `<path d="M12 18h18c4 0 6 2 6 6v26H18c-3 0-6-2-6-6V18z" fill="#f7f1e4"/>
     <path d="M52 18H34c-4 0-6 2-6 6v26h18c3 0 6-2 6-6V18z" fill="#efe6d2"/>
     <path d="M32 20v28" stroke="#1f5c4a" stroke-width="1.8"/>
     <text x="20" y="40" font-size="14" font-family="Georgia, serif" fill="#1f5c4a">あ</text>
     <text x="36" y="40" font-size="14" font-family="Georgia, serif" fill="#1f5c4a">ん</text>`,
    "#c45c4a",
  ),
  "daily-lucky": svg(
    `<path d="M32 14c4 8 14 10 14 20 0 8-6 16-14 18-8-2-14-10-14-18 0-10 10-12 14-20z" fill="#f4f7f4"/>
     <circle cx="26" cy="30" r="3" fill="#1f5c4a"/>
     <circle cx="38" cy="30" r="3" fill="#1f5c4a"/>
     <path d="M26 38c2.4 3 9.6 3 12 0" fill="none" stroke="#1f5c4a" stroke-width="2.2" stroke-linecap="round"/>
     <path d="M32 48v6" stroke="#e8f0ea" stroke-width="2.4" stroke-linecap="round"/>`,
    "#b4532a",
  ),
  "travel-mood": svg(
    `<rect x="16" y="26" width="32" height="22" rx="4" fill="#e8f0ea"/>
     <rect x="24" y="20" width="16" height="8" rx="2" fill="#cfe0d6"/>
     <path d="M12 34h40" stroke="#1f5c4a" stroke-width="2"/>
     <circle cx="24" cy="48" r="3" fill="#1f5c4a"/>
     <circle cx="40" cy="48" r="3" fill="#1f5c4a"/>
     <path d="M44 18l10 6-10 4z" fill="#f4f7f4"/>`,
    "#2f6f8f",
  ),
  pyon: svg(
    `<ellipse cx="32" cy="40" rx="18" ry="12" fill="#d8f0c8"/>
     <circle cx="32" cy="30" r="12" fill="#f4f7f4"/>
     <ellipse cx="24" cy="16" rx="4" ry="10" fill="#f4f7f4"/>
     <ellipse cx="40" cy="16" rx="4" ry="10" fill="#f4f7f4"/>
     <circle cx="28" cy="28" r="2" fill="#1f5c4a"/>
     <circle cx="36" cy="28" r="2" fill="#1f5c4a"/>
     <ellipse cx="32" cy="34" rx="3" ry="2" fill="#e08a8a"/>`,
    "#4a8f4a",
  ),
  fanza: svg(
    `<rect x="12" y="16" width="18" height="24" rx="3" fill="#f0e6ee"/>
     <rect x="24" y="20" width="18" height="24" rx="3" fill="#e4d4e0"/>
     <rect x="36" y="18" width="16" height="24" rx="3" fill="#f7eef4"/>
     <rect x="16" y="46" width="32" height="4" rx="2" fill="#c9a8be"/>`,
    "#4a2c40",
  ),
};

for (const [name, body] of Object.entries(icons)) {
  writeFileSync(join(dir, `${name}.svg`), body, "utf8");
}
console.log(`Wrote ${Object.keys(icons).length} icons → ${dir}`);
