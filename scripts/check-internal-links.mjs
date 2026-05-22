#!/usr/bin/env node

import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "dist");
const site = new URL(process.argv[3] ?? "https://decort.tech");
const siteOrigin = site.origin;

const skippedProtocols = new Set(["data:", "javascript:", "mailto:", "tel:"]);

const htmlFiles = await findHtmlFiles(root);
const idCache = new Map();
const failures = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const links = extractLinks(html);

  for (const rawLink of links) {
    const target = resolveInternalLink(rawLink, file);
    if (!target) continue;

    checked += 1;

    const targetFile = await resolveTargetFile(target.pathname);
    if (!targetFile) {
      failures.push(`${relative(file)} -> ${rawLink} (missing target)`);
      continue;
    }

    if (target.hash && targetFile.endsWith(".html")) {
      const ids = await getIds(targetFile);
      const fragment = decodeURIComponent(target.hash.slice(1));
      if (!ids.has(fragment)) {
        failures.push(`${relative(file)} -> ${rawLink} (missing fragment)`);
      }
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`Found ${failures.length} broken internal link(s):\n`);
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  `Checked ${checked} internal link(s) across ${htmlFiles.length} HTML file(s).\n`
);

async function findHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(entry => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return findHtmlFiles(entryPath);
      if (entry.isFile() && entry.name.endsWith(".html")) return [entryPath];
      return [];
    })
  );

  return files.flat();
}

function extractLinks(html) {
  const links = [];
  const tagPattern = /<(?:a|area|link|script|img|source)\b[^>]*>/gi;
  const attributePattern = /\s(?:href|src)=["']([^"']+)["']/i;
  const canonicalPattern = /\srel=["'][^"']*\bcanonical\b[^"']*["']/i;

  let match;
  while ((match = tagPattern.exec(html))) {
    const tag = match[0];
    if (/^<link\b/i.test(tag) && canonicalPattern.test(tag)) continue;

    const attribute = attributePattern.exec(tag);
    if (attribute) links.push(attribute[1]);
  }

  return links;
}

function resolveInternalLink(rawLink, sourceFile) {
  const trimmed = rawLink.trim();
  if (!trimmed || trimmed.startsWith("{")) return null;

  const parsedProtocol = /^[a-z][a-z0-9+.-]*:/i
    .exec(trimmed)?.[0]
    .toLowerCase();
  if (parsedProtocol && skippedProtocols.has(parsedProtocol)) return null;

  const pageUrl = new URL(fileRoute(sourceFile), siteOrigin);
  const url = new URL(trimmed, pageUrl);

  if (url.origin !== siteOrigin) return null;
  if (!url.pathname && !url.hash) return null;

  return url;
}

async function resolveTargetFile(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const withoutLeadingSlash = decodedPath.replace(/^\/+/, "");
  const candidates = [];

  if (decodedPath.endsWith("/")) {
    candidates.push(path.join(root, withoutLeadingSlash, "index.html"));
  } else {
    candidates.push(path.join(root, withoutLeadingSlash));
    candidates.push(path.join(root, withoutLeadingSlash, "index.html"));
    candidates.push(path.join(root, `${withoutLeadingSlash}.html`));
  }

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }

  return null;
}

async function getIds(file) {
  const cached = idCache.get(file);
  if (cached) return cached;

  const html = await readFile(file, "utf8");
  const ids = new Set();
  const idPattern = /\s(?:id|name)=["']([^"']+)["']/gi;

  let match;
  while ((match = idPattern.exec(html))) {
    ids.add(match[1]);
  }

  idCache.set(file, ids);
  return ids;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function fileRoute(file) {
  const relativePath = path.relative(root, file).split(path.sep).join("/");

  if (relativePath === "index.html") return "/";
  if (relativePath.endsWith("/index.html")) {
    return `/${relativePath.slice(0, -"index.html".length)}`;
  }

  return `/${relativePath}`;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}
