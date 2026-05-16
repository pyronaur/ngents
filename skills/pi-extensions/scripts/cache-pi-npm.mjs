#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const defaultCache = join(homedir(), ".cache", "pi-extensions", "pi-packages-npm.json");
const out = process.argv[2] ?? defaultCache;
const size = 250;

async function fetchSearch(from) {
  const url = new URL("https://registry.npmjs.org/-/v1/search");
  url.searchParams.set("text", "keywords:pi-package");
  url.searchParams.set("size", String(size));
  url.searchParams.set("from", String(from));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

const first = await fetchSearch(0);
const pages = [first];
const froms = [];
for (let from = size; from < first.total; from += size) froms.push(from);

for (let i = 0; i < froms.length; i += 4) {
  pages.push(...(await Promise.all(froms.slice(i, i + 4).map(fetchSearch))));
}

const packages = pages.flatMap((page) =>
  page.objects.map(({ package: pkg, score, searchScore }) => ({
    name: pkg.name,
    version: pkg.version,
    description: pkg.description ?? "",
    keywords: pkg.keywords ?? [],
    author: typeof pkg.author === "string" ? pkg.author : pkg.author?.name ?? "",
    publisher: pkg.publisher?.username ?? "",
    links: pkg.links ?? {},
    date: pkg.date ?? null,
    score,
    searchScore,
    install: `pi install npm:${pkg.name}`,
  })),
);

await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify({ fetchedAt: new Date().toISOString(), total: first.total, count: packages.length, packages }, null, 2));
console.log(`${packages.length}/${first.total} packages -> ${out}`);
