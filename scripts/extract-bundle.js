#!/usr/bin/env node
/**
 * Extracts files from a "PROJECT SOURCE BUNDLE" text file and writes them to disk.
 *
 * Expected bundle shape (abbreviated):
 *
 *  ============================ PROJECT SOURCE BUNDLE =============================
 *  Root: C:\...\to-do-calendar
 *  ...
 *  ================================ 1. server.js =================================
 *
 *  Path: C:\...\to-do-calendar\server.js
 *  Size: 7791 bytes
 *  --------------------------------------------------------------------------------
 *  // file content...
 *  --------------------------------------------------------------------------------
 *
 *  =============================== 2. src\App.css ================================
 *  Path: C:\...\to-do-calendar\src\App.css
 *  Size: ...
 *  --------------------------------------------------------------------------------
 *  /* file content *\/
 *  --------------------------------------------------------------------------------
 *
 * Usage:
 *   node scripts/extract-bundle.js ./note.txt --out .
 *
 * Options:
 *   --out <dir>         Output base directory (defaults to current working directory)
 *   --dry-run           Parse and report, but do not write files
 *   --no-overwrite      If a target file exists, skip writing it
 */

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

// ----------------------- arg parsing -----------------------
const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error("Usage: node scripts/extract-bundle.js <bundle.txt> [--out <dir>] [--dry-run] [--no-overwrite]");
  process.exit(1);
}

let bundlePath = null;
let outDir = process.cwd();
let dryRun = false;
let allowOverwrite = true;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith("--") && !bundlePath) {
    bundlePath = a;
    continue;
  }
  if (a === "--out") {
    outDir = argv[i + 1] ? path.resolve(argv[i + 1]) : outDir;
    i++;
  } else if (a === "--dry-run") {
    dryRun = true;
  } else if (a === "--no-overwrite") {
    allowOverwrite = false;
  }
}

if (!bundlePath) {
  console.error("Error: bundle path is required.");
  process.exit(1);
}
bundlePath = path.resolve(bundlePath);

// ----------------------- helpers -----------------------
function normalizeSlashes(p) {
  return p.replace(/[\\/]+/g, path.sep);
}

function startsWithIgnoreCase(haystack, needle) {
  return haystack.toLowerCase().startsWith(needle.toLowerCase());
}

async function ensureDir(p) {
  await fsp.mkdir(path.dirname(p), { recursive: true });
}

// ----------------------- main -----------------------
(async () => {
  const raw = await fsp.readFile(bundlePath, "utf8");

  // Extract the declared project root from the header, if present
  // Example: Root: C:\Users\...\to-do-calendar
  const rootMatch = raw.match(/^\s*Root:\s*(.+)\s*$/m);
  const declaredRoot = rootMatch ? rootMatch[1].trim() : null;

  // Regex to capture each file block:
  // - Path: <absPath>
  // - Size: ...
  // - ----- (separator)
  // - <content> (lazy)
  // - ----- (separator)
  //
  // We use [\s\S]*? to capture content lazily until the next separator line.
  const blockRegex = /^Path:\s*(.+?)\s*\r?\n^Size:\s*.+?\r?\n^-{5,}\r?\n([\s\S]*?)\r?\n^-{5,}\r?\n/mg;

  let match;
  const results = [];

  while ((match = blockRegex.exec(raw)) !== null) {
    const absPathRaw = match[1].trim();
    const content = match[2]; // keep as-is

    // Compute a relative path from the declared Root, if possible
    let relPath;
    if (declaredRoot && startsWithIgnoreCase(absPathRaw, declaredRoot)) {
      // Remove the root prefix (plus any path separator) to get a relative path
      const cut = absPathRaw.slice(declaredRoot.length).replace(/^[/\\]/, "");
      relPath = normalizeSlashes(cut);
    } else {
      // Fallback: just use the basename (will lose subfolders if root couldn't be matched)
      relPath = path.basename(absPathRaw);
    }

    // Convert Windows backslashes to this OS's separator
    relPath = normalizeSlashes(relPath);

    const outPath = path.join(outDir, relPath);

    results.push({
      absPathRaw,
      relPath,
      outPath,
      content,
    });
  }

  if (results.length === 0) {
    console.error("No file blocks were found. Make sure the bundle matches the expected format.");
    process.exit(2);
  }

  // Write files
  let written = 0, skipped = 0;
  for (const r of results) {
    if (!allowOverwrite && fs.existsSync(r.outPath)) {
      console.log(`[skip] exists: ${r.relPath}`);
      skipped++;
      continue;
    }

    console.log(`${dryRun ? "[dry]" : "[write]"} ${r.relPath}`);
    if (!dryRun) {
      await ensureDir(r.outPath);
      await fsp.writeFile(r.outPath, r.content, "utf8");
      written++;
    }
  }

  console.log(`\nDone. Parsed ${results.length} file(s). ${dryRun ? "Dry-run only." : `Wrote ${written}, skipped ${skipped}.`}`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
