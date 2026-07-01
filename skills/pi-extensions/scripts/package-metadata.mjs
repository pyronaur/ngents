#!/usr/bin/env node

function parseArgs(argv) {
  const args = { packages: [], json: false };
  for (const arg of argv) {
    if (arg === "--json") args.json = true;
    else if (arg === "-h" || arg === "--help") {
      console.log("Usage: package-metadata.mjs [--json] <package...>");
      process.exit(0);
    } else args.packages.push(arg);
  }
  return args;
}

function packageUrl(name) {
  return `https://registry.npmjs.org/${encodeURIComponent(name)}`;
}

function normalizeRepositoryUrl(repository) {
  const raw = typeof repository === "string" ? repository : repository?.url;
  if (!raw) return "";

  return raw
    .replace(/^git\+/, "")
    .replace(/^git:\/\/github\.com\//, "https://github.com/")
    .replace(/^ssh:\/\/git@github\.com\//, "https://github.com/")
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "");
}

async function fetchMetadata(name) {
  const response = await fetch(packageUrl(name));
  if (!response.ok) {
    return { name, error: `${response.status} ${response.statusText}` };
  }

  const packument = await response.json();
  const latestVersion = packument["dist-tags"]?.latest;
  const latest = latestVersion ? packument.versions?.[latestVersion] : undefined;
  const repository = normalizeRepositoryUrl(latest?.repository ?? packument.repository);
  return {
    name,
    version: latestVersion ?? packument.version ?? "",
    description: latest?.description ?? packument.description ?? "",
    repository,
    homepage: latest?.homepage ?? packument.homepage ?? "",
    npm: `https://www.npmjs.com/package/${encodeURIComponent(name)}`,
  };
}

const args = parseArgs(process.argv.slice(2));
if (!args.packages.length) {
  console.error("Missing package name.");
  process.exit(2);
}

const results = await Promise.all(args.packages.map(fetchMetadata));

if (args.json) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const result of results) {
    if (result.error) {
      console.log(`${result.name}\tERROR\t${result.error}`);
    } else {
      console.log(`${result.name}\t${result.version}\t${result.repository}\t${result.homepage}\t${result.npm}`);
    }
  }
}

if (results.some((result) => result.error)) process.exitCode = 1;
