#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const defaultCache = join(homedir(), ".cache", "pi-extensions", "pi-packages.json");
const out = process.argv[2] ?? defaultCache;

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function parseCards(html) {
  const cards = [];
  for (const match of html.matchAll(/<article\b[^>]*data-package-card="true"[^>]*>/g)) {
    const tag = match[0];
    const attrs = Object.fromEntries(
      Array.from(tag.matchAll(/\s(data-package-[\w-]+)="([^"]*)"/g), ([, key, value]) => [
        key.replace("data-package-", "").replaceAll("-", "_"),
        decodeHtml(value),
      ]),
    );
    if (!attrs.name) continue;
    cards.push({
      name: attrs.name,
      search: attrs.search ?? "",
      types: attrs.types ? attrs.types.split(/\s+/).filter(Boolean) : [],
      downloads: Number(attrs.downloads ?? 0),
      date: attrs.date ? new Date(Number(attrs.date)).toISOString() : null,
      sortName: attrs.sort_name ?? attrs.name,
      url: `https://pi.dev/packages/${encodeURIComponent(attrs.name).replace("%2F", "/")}`,
      install: `pi install npm:${attrs.name}`,
    });
  }
  return cards;
}

async function fetchPage(page) {
  const url = new URL("https://pi.dev/packages");
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "downloads");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

function maxPage(html) {
  const pages = Array.from(html.matchAll(/[?&]page=(\d+)/g), ([, page]) => Number(page));
  return Math.max(1, ...pages);
}

const firstHtml = await fetchPage(1);
const pageCount = maxPage(firstHtml);
const htmlPages = [firstHtml];
const pages = Array.from({ length: pageCount - 1 }, (_, index) => index + 2);

for (let i = 0; i < pages.length; i += 6) {
  htmlPages.push(...(await Promise.all(pages.slice(i, i + 6).map(fetchPage))));
}

const byName = new Map();
for (const pkg of htmlPages.flatMap(parseCards)) {
  if (!byName.has(pkg.name)) byName.set(pkg.name, pkg);
}
const all = Array.from(byName.values());

await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify({ fetchedAt: new Date().toISOString(), count: all.length, packages: all }, null, 2));
console.log(`${all.length} packages -> ${out}`);
