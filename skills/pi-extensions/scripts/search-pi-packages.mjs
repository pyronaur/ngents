#!/usr/bin/env node
import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";

const cachePath = join(homedir(), ".cache", "pi-extensions", "pi-packages.json");
const scriptDir = dirname(fileURLToPath(import.meta.url));
const maxAgeMs = 6 * 60 * 60 * 1000;

function parseArgs(argv) {
  const args = { query: [], type: "", limit: 20, refresh: false, cache: cachePath };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--type") args.type = argv[++index] ?? "";
    else if (arg === "--limit") args.limit = Number(argv[++index] ?? 20);
    else if (arg === "--cache") args.cache = argv[++index] ?? cachePath;
    else if (arg === "--refresh") args.refresh = true;
    else if (arg === "-h" || arg === "--help") {
      console.log("Usage: search-pi-packages.mjs [--type extension|skill|theme|prompt] [--limit n] [--refresh] [--cache path] <query...>");
      process.exit(0);
    } else args.query.push(arg);
  }
  return args;
}

async function cacheIsFresh(path) {
  try {
    await access(path, constants.R_OK);
    return Date.now() - (await stat(path)).mtimeMs < maxAgeMs;
  } catch {
    return false;
  }
}

function refreshCache(path) {
  const result = spawnSync(process.execPath, [join(scriptDir, "cache-pi-gallery.mjs"), path], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function rankPackage(pkg, terms) {
  const haystack = `${pkg.name} ${pkg.search}`.toLowerCase();
  let score = Number(pkg.downloads ?? 0) / 1000;
  for (const term of terms) {
    if (pkg.name.toLowerCase().includes(term)) score += 100;
    if (haystack.includes(term)) score += 25;
  }
  return score;
}

function excerpt(search, terms) {
  const text = search.replace(/\s+/g, " ").trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  const hit = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, hit - 60);
  return `${start > 0 ? "..." : ""}${text.slice(start, start + 180)}${start + 180 < text.length ? "..." : ""}`;
}

const args = parseArgs(process.argv.slice(2));
if (!args.query.length) {
  console.error("Missing query. Pass words to search for, e.g. `browser automation --type extension`.");
  process.exit(2);
}

if (args.refresh || !(await cacheIsFresh(args.cache))) refreshCache(args.cache);

const data = JSON.parse(await readFile(args.cache, "utf8"));
const terms = args.query.join(" ").toLowerCase().split(/\s+/).filter(Boolean);
const matches = data.packages
  .filter((pkg) => !args.type || pkg.types?.includes(args.type))
  .map((pkg) => ({ pkg, score: rankPackage(pkg, terms) }))
  .filter(({ pkg }) => terms.every((term) => `${pkg.name} ${pkg.search}`.toLowerCase().includes(term)))
  .sort((a, b) => b.score - a.score)
  .slice(0, args.limit);

for (const { pkg } of matches) {
  console.log(`${pkg.name}\t${(pkg.types ?? []).join(",")}\t${pkg.downloads ?? 0}\t${pkg.install}\t${excerpt(pkg.search ?? "", terms)}`);
}

if (!matches.length) process.exitCode = 1;
