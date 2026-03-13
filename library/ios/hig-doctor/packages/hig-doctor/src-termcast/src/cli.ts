#!/usr/bin/env bun
// cli.ts — CLI entry point for hig-doctor audit
import { audit } from "./audit";
import { writeFile } from "node:fs/promises";
import { join, resolve, basename } from "node:path";

// ── ANSI helpers ──────────────────────────────────────────────────────
const isTTY = process.stderr.isTTY ?? false;
const c = {
  reset:   isTTY ? "\x1b[0m" : "",
  bold:    isTTY ? "\x1b[1m" : "",
  dim:     isTTY ? "\x1b[2m" : "",
  green:   isTTY ? "\x1b[32m" : "",
  yellow:  isTTY ? "\x1b[33m" : "",
  red:     isTTY ? "\x1b[31m" : "",
  cyan:    isTTY ? "\x1b[36m" : "",
  magenta: isTTY ? "\x1b[35m" : "",
  blue:    isTTY ? "\x1b[34m" : "",
  white:   isTTY ? "\x1b[37m" : "",
  bgGreen: isTTY ? "\x1b[42m\x1b[30m" : "",
  bgYellow: isTTY ? "\x1b[43m\x1b[30m" : "",
  bgRed:   isTTY ? "\x1b[41m\x1b[37m" : "",
};

function scoreBadge(score: number): string {
  if (score >= 90) return `${c.bgGreen} ${score}/100 ${c.reset}`;
  if (score >= 70) return `${c.bgYellow} ${score}/100 ${c.reset}`;
  return `${c.bgRed} ${score}/100 ${c.reset}`;
}

function scoreColor(score: number): string {
  if (score >= 90) return c.green;
  if (score >= 70) return c.yellow;
  return c.red;
}

function bar(positives: number, concerns: number, total: number, width: number = 20): string {
  if (total === 0) return c.dim + "░".repeat(width) + c.reset;
  const goodW = Math.round((positives / total) * width);
  const badW = Math.round((concerns / total) * width);
  const neutralW = width - goodW - badW;
  return (
    c.green + "█".repeat(goodW) +
    c.dim + "░".repeat(Math.max(0, neutralW)) +
    c.red + "█".repeat(badW) +
    c.reset
  );
}

function spinner(): { update(msg: string): void; done(msg: string): void } {
  if (!isTTY) return { update(msg) { process.stderr.write(msg + "\n"); }, done(msg) { process.stderr.write(msg + "\n"); } };
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  let interval: ReturnType<typeof setInterval>;
  let currentMsg = "";
  const render = () => {
    process.stderr.write(`\r\x1b[K${c.cyan}${frames[i % frames.length]}${c.reset} ${currentMsg}`);
    i++;
  };
  return {
    update(msg: string) {
      currentMsg = msg;
      if (!interval) interval = setInterval(render, 80);
      render();
    },
    done(msg: string) {
      if (interval) clearInterval(interval);
      process.stderr.write(`\r\x1b[K${c.green}✓${c.reset} ${msg}\n`);
    },
  };
}

// ── Score calculation ─────────────────────────────────────────────────
function computeScore(totalPositives: number, totalConcerns: number, totalPatterns: number, categoryCount: number): number {
  if (totalPositives + totalConcerns + totalPatterns === 0) return 0;
  // Base score from positive ratio
  const total = totalPositives + totalConcerns;
  if (total === 0) return 50; // Only neutral patterns, no opinion
  const positiveRatio = totalPositives / total;
  // Scale: 100% positives = 100, 0% = 20, linear in between
  let score = Math.round(20 + positiveRatio * 80);
  // Bonus for breadth: covering more categories is good (up to +5)
  score = Math.min(100, score + Math.min(5, Math.floor(categoryCount / 2)));
  return Math.max(0, Math.min(100, score));
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter(a => a.startsWith("--")));
  const positional = args.filter(a => !a.startsWith("--"));

  const directory = positional[0] || process.cwd();
  const skillsDir = positional[1];

  if (flags.has("--help") || flags.has("-h")) {
    process.stdout.write(`
${c.bold}hig-doctor audit${c.reset} — Apple HIG compliance audit

${c.bold}Usage:${c.reset}
  ${c.cyan}bun run audit${c.reset} <directory> [skills-dir] [options]

${c.bold}Arguments:${c.reset}
  directory    Path to the project to audit ${c.dim}(default: cwd)${c.reset}
  skills-dir   Path to skills directory ${c.dim}(auto-detected)${c.reset}

${c.bold}Options:${c.reset}
  --export     Write full audit markdown to <directory>/hig-audit.md
  --stdout     Print full audit markdown to stdout ${c.dim}(pipe-friendly)${c.reset}
  --json       Print results as JSON
  --help, -h   Show this help

${c.bold}Examples:${c.reset}
  ${c.dim}# Audit a Next.js project${c.reset}
  bun run audit ./my-nextjs-app

  ${c.dim}# Audit a SwiftUI project and export report${c.reset}
  bun run audit ./MyApp --export

  ${c.dim}# Pipe raw markdown for AI evaluation${c.reset}
  bun run audit ./MyApp --stdout | pbcopy

`);
    process.exit(0);
  }

  const s = spinner();
  const appName = basename(resolve(directory));
  s.update(`Scanning ${c.bold}${appName}${c.reset}...`);

  const result = await audit(directory, skillsDir);
  const { categories, scanResult, allMatches, markdown } = result;

  s.done(`Scanned ${c.bold}${scanResult.codeFiles.length}${c.reset} code + ${c.bold}${scanResult.styleFiles.length}${c.reset} style files`);

  // ── --stdout mode ───────────────────────────────────────────────
  if (flags.has("--stdout")) {
    process.stdout.write(markdown);
    process.exit(0);
  }

  // ── --export mode ───────────────────────────────────────────────
  if (flags.has("--export")) {
    const outPath = join(resolve(directory), "hig-audit.md");
    await writeFile(outPath, markdown);
    process.stderr.write(`${c.green}✓${c.reset} Audit exported to ${c.bold}${outPath}${c.reset}\n`);
    process.exit(0);
  }

  // ── --json mode ─────────────────────────────────────────────────
  if (flags.has("--json")) {
    const totalConcerns = categories.reduce((s, c) => s + c.concerns, 0);
    const totalPositives = categories.reduce((s, c) => s + c.positives, 0);
    const totalPatterns = categories.reduce((s, c) => s + c.patterns, 0);
    const score = computeScore(totalPositives, totalConcerns, totalPatterns, categories.length);
    const totalFiles = scanResult.codeFiles.length + scanResult.styleFiles.length;
    const totalDetections = totalConcerns + totalPositives + totalPatterns;
    const detectionsPerFile = totalFiles > 0 ? totalDetections / totalFiles : 0;
    const lowDensity = detectionsPerFile < 4 && totalDetections < 500;
    process.stdout.write(JSON.stringify({
      score,
      lowDensity,
      frameworks: scanResult.frameworks,
      files: { code: scanResult.codeFiles.length, style: scanResult.styleFiles.length, config: scanResult.configFiles.length },
      totals: { concerns: totalConcerns, positives: totalPositives, patterns: totalPatterns },
      categories: categories.map(cat => ({
        name: cat.label,
        skill: cat.skillName,
        detections: cat.matches.length,
        concerns: cat.concerns,
        positives: cat.positives,
        patterns: cat.patterns,
        files: cat.files,
      })),
    }, null, 2));
    process.exit(0);
  }

  // ── Default: rich summary ───────────────────────────────────────
  const totalConcerns = categories.reduce((s, cat) => s + cat.concerns, 0);
  const totalPositives = categories.reduce((s, cat) => s + cat.positives, 0);
  const totalPatterns = categories.reduce((s, cat) => s + cat.patterns, 0);
  const totalDetections = allMatches.length;
  const score = computeScore(totalPositives, totalConcerns, totalPatterns, categories.length);

  const w = process.stdout.columns || 72;
  const lineW = Math.min(w, 72);
  const sep = c.dim + "─".repeat(lineW) + c.reset;

  // Header
  process.stdout.write("\n");
  process.stdout.write(`  ${c.bold}HIG Audit: ${appName}${c.reset}  ${scoreBadge(score)}\n`);
  process.stdout.write(`  ${c.dim}${scanResult.frameworks.join(", ")} · ${totalDetections} detections · ${scanResult.codeFiles.length + scanResult.styleFiles.length} files${c.reset}\n`);
  process.stdout.write("\n");
  process.stdout.write(`  ${sep}\n`);

  // Category rows
  const labelW = 24;
  const countW = 5;

  for (const cat of categories) {
    const total = cat.matches.length;
    const label = cat.label.length > labelW ? cat.label.slice(0, labelW - 1) + "…" : cat.label.padEnd(labelW);
    const count = String(total).padStart(countW);

    let detail = "";
    if (cat.concerns > 0 && cat.positives > 0) {
      detail = `  ${c.green}${cat.positives} good${c.reset} ${c.red}${cat.concerns} concern${cat.concerns > 1 ? "s" : ""}${c.reset}`;
    } else if (cat.concerns > 0) {
      detail = `  ${c.red}${cat.concerns} concern${cat.concerns > 1 ? "s" : ""}${c.reset}`;
    } else if (cat.positives > 0) {
      detail = `  ${c.green}${cat.positives} good${c.reset}`;
    }

    const vizBar = bar(cat.positives, cat.concerns, total);
    process.stdout.write(`  ${c.white}${label}${c.reset} ${c.dim}${count}${c.reset}  ${vizBar}${detail}\n`);
  }

  process.stdout.write(`  ${sep}\n`);

  // Totals row
  process.stdout.write(`  ${"Totals".padEnd(labelW)} ${String(totalDetections).padStart(countW)}  `);
  if (totalPositives > 0) process.stdout.write(`${c.green}${totalPositives} good${c.reset}  `);
  if (totalConcerns > 0) process.stdout.write(`${c.red}${totalConcerns} concerns${c.reset}  `);
  if (totalPatterns > 0) process.stdout.write(`${c.dim}${totalPatterns} patterns${c.reset}`);
  process.stdout.write("\n");

  // Score interpretation
  process.stdout.write("\n");
  const sc = scoreColor(score);
  const totalFiles = scanResult.codeFiles.length + scanResult.styleFiles.length;
  const detectionsPerFile = totalFiles > 0 ? totalDetections / totalFiles : 0;
  const isLowDensity = detectionsPerFile < 4 && totalDetections < 500;

  if (isLowDensity) {
    process.stdout.write(`  ${c.yellow}Low UI density${c.reset} — Few HIG-relevant patterns detected (${detectionsPerFile.toFixed(1)}/file).\n`);
    process.stdout.write(`  ${c.dim}This project may not be UI-focused. Scores are less meaningful with sparse data.${c.reset}\n`);
  } else if (score >= 90) {
    process.stdout.write(`  ${sc}Excellent${c.reset} — Strong HIG compliance across the board.\n`);
  } else if (score >= 70) {
    process.stdout.write(`  ${sc}Good${c.reset} — Solid foundation with room for improvement.\n`);
  } else if (score >= 50) {
    process.stdout.write(`  ${sc}Needs work${c.reset} — Several HIG areas need attention.\n`);
  } else {
    process.stdout.write(`  ${sc}Poor${c.reset} — Significant HIG violations found.\n`);
  }

  // Footer
  process.stdout.write(`\n  ${c.dim}Run with --export for a full report, or --stdout to pipe to an AI.${c.reset}\n\n`);
}

main().catch((e) => {
  console.error(`${c.red}Error:${c.reset} ${e.message}`);
  process.exit(1);
});
