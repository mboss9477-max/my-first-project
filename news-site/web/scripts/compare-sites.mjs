#!/usr/bin/env node

/**
 * compare-sites.mjs
 *
 * Compares visible text and image file sets across pages between two origins
 * (e.g. Sanity-backed live site vs CMS-backed staging/production site).
 *
 * Node 20+, zero external dependencies, uses native global fetch.
 *
 * Usage:
 *   node scripts/compare-sites.mjs <originA> <originB> [--timeout <ms>] [--paths /path1,/path2]
 */

import { fileURLToPath } from 'node:url';

export const DEFAULT_FIXED_PAGES = ['/', '/search'];
export const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Decode common HTML entities.
 */
export function unescapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Replaces React SSR Suspense template placeholders with streamed hidden div contents.
 * React streams:
 *   <template id="B:0"></template>
 *   <div hidden id="S:0">...content...</div>
 *   <script>$RC("B:0","S:0")</script>
 */
export function resolveStreamedHtml(html) {
  if (!html) return '';

  let resolved = html;

  // 1. Look for explicit $RC("B:x", "S:y") calls
  const rcMatches = [...resolved.matchAll(/\$RC\(["'](B:[^"']+)["'],\s*["'](S:[^"']+)["']\)/g)];
  for (const match of rcMatches) {
    const bId = match[1];
    const sId = match[2];

    const sDivRegex = new RegExp(`<div[^>]*?\\bid=["']${sId}["'][^>]*?>([\\s\\S]*?)<\\/div>`, 'i');
    const sMatch = resolved.match(sDivRegex);
    if (sMatch) {
      const innerContent = sMatch[1];
      const bTemplateRegex = new RegExp(`<template[^>]*?\\bid=["']${bId}["'][^>]*?>[\\s\\S]*?<\\/template>`, 'i');
      if (bTemplateRegex.test(resolved)) {
        resolved = resolved.replace(bTemplateRegex, () => innerContent);
        resolved = resolved.replace(sDivRegex, '');
      }
    }
  }

  // 2. Look for matching id="B:x" template and id="S:x" div even if $RC isn't matched
  const templateMatches = [...resolved.matchAll(/<template[^>]*?\bid=["']B:([^"']+)["'][^>]*?>[\\s\\S]*?<\/template>/gi)];
  for (const match of templateMatches) {
    const idSuffix = match[1];
    const sDivRegex = new RegExp(`<div[^>]*?\\bid=["']S:${idSuffix}["'][^>]*?>([\\s\\S]*?)<\\/div>`, 'i');
    const sMatch = resolved.match(sDivRegex);
    if (sMatch) {
      const innerContent = sMatch[1];
      resolved = resolved.replace(match[0], () => innerContent);
      resolved = resolved.replace(sDivRegex, '');
    }
  }

  return resolved;
}

/**
 * Extracts visible text lines from HTML:
 * - Resolves streamed React suspense templates if present
 * - Strips <script>, <style>, <noscript>, <svg>, and comments
 * - Keeps inner content of <div hidden> blocks that Next streams in
 * - Strips all tags and decodes HTML entities
 * - Returns array of non-empty normalized text lines
 */
export function extractVisibleText(html) {
  if (!html) return [];

  // Resolve template replacements first
  let clean = resolveStreamedHtml(html);

  // Remove <head>...</head> if present so metadata/title tags aren't confused with visible body text
  clean = clean.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, ' ');

  // Remove script, style, svg, noscript blocks
  clean = clean.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  clean = clean.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  clean = clean.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ');
  clean = clean.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ');
  clean = clean.replace(/<!--[\s\S]*?-->/g, ' ');

  // Note: <div hidden> tags are stripped by the general tag-stripping below,
  // which preserves their inner text content intact as required.

  // Replace block element endings and line breaks with newlines to preserve paragraph boundaries
  clean = clean.replace(/<\/(?:p|div|section|article|header|footer|nav|main|aside|h[1-6]|li|tr|blockquote|pre)>/gi, '\n');
  clean = clean.replace(/<(?:br|hr)\s*\/?>/gi, '\n');

  // Strip all remaining HTML tags
  clean = clean.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  clean = unescapeHtml(clean);

  // Normalize whitespace: split into lines, collapse spaces, drop empty lines
  const rawLines = clean.split('\n');
  const normalizedLines = [];

  for (const line of rawLines) {
    const trimmed = line.replace(/[ \t\r\f\v\u00a0]+/g, ' ').trim();
    if (trimmed.length > 0) {
      normalizedLines.push(trimmed);
    }
  }

  return normalizedLines;
}

/**
 * Counts frequencies of text lines (bag/multiset).
 */
export function getLineFrequencyMap(lines) {
  const map = new Map();
  for (const line of lines) {
    map.set(line, (map.get(line) || 0) + 1);
  }
  return map;
}

/**
 * Extracts the set of image file names from HTML:
 * - Finds `/_next/image?url=...` occurrences in src or srcset
 * - Decodes the `url=` parameter
 * - Extracts filename by stripping query parameters and taking the basename
 */
export function extractImageFilenames(html) {
  if (!html) return new Set();

  const fileNames = new Set();
  const unescaped = unescapeHtml(html);

  // Find all /_next/image URLs in src/srcset or raw text
  const nextImageRegex = /\/_next\/image\?[^"'\s<>]+/g;
  const matches = unescaped.match(nextImageRegex) || [];

  for (const imgUrl of matches) {
    const queryMatch = imgUrl.match(/[?&]url=([^&]+)/);
    if (!queryMatch) continue;

    try {
      const decodedParam = decodeURIComponent(queryMatch[1]);
      const cleanPath = decodedParam.split(/[?#]/)[0];
      const filename = cleanPath.split('/').filter(Boolean).pop();
      if (filename) {
        fileNames.add(filename);
      }
    } catch {
      // Ignore malformed URI components
    }
  }

  return fileNames;
}

/**
 * Compares visible text and image file sets between two HTML documents for a given path.
 *
 * Rules:
 * - Visible text: compared after removing scripts and tags, keeping <div hidden> contents.
 *   If category pages put content inline in one build and in streamed <div hidden> in another,
 *   they are treated as equal if their multiset of text paragraphs matches.
 * - Image files: compared by file name from decoded `url=` in `/_next/image`.
 */
export function comparePageContent(htmlA, htmlB, path = '') {
  const linesA = extractVisibleText(htmlA);
  const linesB = extractVisibleText(htmlB);

  // 1. Text Comparison
  let textEqual = false;
  const textDiffs = [];

  const textA = linesA.join('\n');
  const textB = linesB.join('\n');

  if (textA === textB) {
    textEqual = true;
  } else {
    // If not strictly sequentially identical, check multiset of lines.
    // This handles the streamed-versus-inline case where Next streams
    // <div hidden> category content in a different HTML location.
    const freqA = getLineFrequencyMap(linesA);
    const freqB = getLineFrequencyMap(linesB);

    const missingInB = [];
    const extraInB = [];

    for (const [line, countA] of freqA.entries()) {
      const countB = freqB.get(line) || 0;
      if (countA > countB) {
        for (let i = 0; i < countA - countB; i++) {
          missingInB.push(line);
        }
      }
    }

    for (const [line, countB] of freqB.entries()) {
      const countA = freqA.get(line) || 0;
      if (countB > countA) {
        for (let i = 0; i < countB - countA; i++) {
          extraInB.push(line);
        }
      }
    }

    if (missingInB.length === 0 && extraInB.length === 0) {
      // Exactly the same set of paragraphs/lines: treat as equal (streamed vs inline)
      textEqual = true;
    } else {
      for (const line of missingInB) {
        textDiffs.push(`- ${line}`);
      }
      for (const line of extraInB) {
        textDiffs.push(`+ ${line}`);
      }
    }
  }

  // 2. Image Comparison
  const imagesA = extractImageFilenames(htmlA);
  const imagesB = extractImageFilenames(htmlB);

  const missingImages = [...imagesA].filter((img) => !imagesB.has(img)).sort();
  const extraImages = [...imagesB].filter((img) => !imagesA.has(img)).sort();

  const imageDiffs = [];
  for (const img of missingImages) {
    imageDiffs.push(`- image: ${img}`);
  }
  for (const img of extraImages) {
    imageDiffs.push(`+ image: ${img}`);
  }

  const imagesEqual = imageDiffs.length === 0;
  const hasDifference = !textEqual || !imagesEqual;

  return {
    path,
    passed: !hasDifference,
    textEqual,
    imagesEqual,
    textDiffs,
    imageDiffs,
    imageCountA: imagesA.size,
    imageCountB: imagesB.size,
    lineCountA: linesA.length,
    lineCountB: linesB.length,
  };
}

/**
 * Fetches page paths from /sitemap.xml of originA.
 */
export async function fetchSitemapPaths(origin, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const sitemapUrl = `${origin.replace(/\/+$/, '')}/sitemap.xml`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(sitemapUrl, {
      signal: controller.signal,
      headers: { 'user-agent': 'csnews-compare-sites/1.0' },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap from ${sitemapUrl}: status ${res.status}`);
  }

  const xml = await res.text();
  const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  const paths = new Set();

  for (const match of locMatches) {
    try {
      const locUrl = new URL(match[1].trim());
      paths.add(locUrl.pathname);
    } catch {
      // Ignore unparseable URLs
    }
  }

  return [...paths];
}

/**
 * Runs full comparison between originA and originB across all sitemap paths and fixed pages.
 */
export async function compareSites(originA, originB, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseA = originA.replace(/\/+$/, '');
  const baseB = originB.replace(/\/+$/, '');

  let pathsToCompare = options.paths;
  if (!pathsToCompare) {
    const sitemapPaths = await fetchSitemapPaths(baseA, { timeoutMs });
    const fixedPages = options.fixedPages ?? DEFAULT_FIXED_PAGES;
    const combined = new Set([...sitemapPaths, ...fixedPages]);
    pathsToCompare = [...combined].sort();
  }

  const results = [];

  for (const path of pathsToCompare) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const urlA = `${baseA}${normalizedPath}`;
    const urlB = `${baseB}${normalizedPath}`;

    let htmlA = '';
    let htmlB = '';
    let fetchError = null;

    try {
      const fetchWithTimeout = async (url) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'user-agent': 'csnews-compare-sites/1.0' },
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return await res.text();
        } finally {
          clearTimeout(timer);
        }
      };

      const [resA, resB] = await Promise.all([
        fetchWithTimeout(urlA),
        fetchWithTimeout(urlB),
      ]);
      htmlA = resA;
      htmlB = resB;
    } catch (err) {
      fetchError = err.message;
    }

    if (fetchError) {
      results.push({
        path: normalizedPath,
        passed: false,
        textEqual: false,
        imagesEqual: false,
        textDiffs: [`Fetch error: ${fetchError}`],
        imageDiffs: [],
        imageCountA: 0,
        imageCountB: 0,
        lineCountA: 0,
        lineCountB: 0,
      });
    } else {
      const comparison = comparePageContent(htmlA, htmlB, normalizedPath);
      results.push(comparison);
    }
  }

  const diffCount = results.filter((r) => !r.passed).length;
  const passedCount = results.length - diffCount;

  return {
    originA: baseA,
    originB: baseB,
    totalCount: results.length,
    passedCount,
    diffCount,
    allPassed: diffCount === 0,
    results,
  };
}

/**
 * Formats results into a clean CLI output.
 */
export function formatReport(report) {
  const lines = [];
  lines.push('');
  lines.push(`Comparing: ${report.originA} vs ${report.originB}`);
  lines.push('='.repeat(96));
  lines.push(
    `${'Path'.padEnd(45)} ${'Status'.padEnd(10)} ${'Text'.padEnd(10)} ${'Images'.padEnd(10)} Details`
  );
  lines.push('-'.repeat(96));

  for (const r of report.results) {
    const statusStr = r.passed ? 'MATCH' : 'DIFF';
    const textStr = r.textEqual ? 'OK' : 'DIFF';
    const imgStr = r.imagesEqual ? 'OK' : 'DIFF';
    const details = r.passed
      ? `(${r.lineCountA} lines, ${r.imageCountA} images)`
      : `${r.textDiffs.length} text diff(s), ${r.imageDiffs.length} image diff(s)`;

    lines.push(
      `${r.path.padEnd(45)} ${statusStr.padEnd(10)} ${textStr.padEnd(10)} ${imgStr.padEnd(10)} ${details}`
    );

    if (!r.passed) {
      if (r.textDiffs.length > 0) {
        lines.push('   Text differences:');
        for (const diff of r.textDiffs.slice(0, 10)) {
          lines.push(`     ${diff}`);
        }
        if (r.textDiffs.length > 10) {
          lines.push(`     ... and ${r.textDiffs.length - 10} more text difference(s)`);
        }
      }
      if (r.imageDiffs.length > 0) {
        lines.push('   Image differences:');
        for (const diff of r.imageDiffs) {
          lines.push(`     ${diff}`);
        }
      }
      lines.push('');
    }
  }

  lines.push('='.repeat(96));
  const summaryStr = report.allPassed
    ? `Summary: ${report.totalCount} pages compared, 0 differences (ALL PAGES MATCH)`
    : `Summary: ${report.totalCount} pages compared, ${report.diffCount} page(s) differed`;
  lines.push(summaryStr);
  lines.push('');

  return lines.join('\n');
}

// CLI Execution
const isMainModule =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, '/') === process.argv[1].replace(/\\/g, '/');

if (isMainModule) {
  const args = process.argv.slice(2);
  const positional = [];
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let customPaths = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--timeout' && i + 1 < args.length) {
      timeoutMs = parseInt(args[++i], 10);
    } else if (arg.startsWith('--timeout=')) {
      timeoutMs = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--paths' && i + 1 < args.length) {
      customPaths = args[++i].split(',').map((p) => p.trim());
    } else if (arg.startsWith('--paths=')) {
      customPaths = arg.split('=')[1].split(',').map((p) => p.trim());
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (positional.length < 2) {
    console.error('Usage: node scripts/compare-sites.mjs <originA> <originB> [--timeout <ms>] [--paths /path1,/path2]');
    process.exit(2);
  }

  const [originA, originB] = positional;

  compareSites(originA, originB, { timeoutMs, paths: customPaths })
    .then((report) => {
      console.log(formatReport(report));
      process.exit(report.allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });
}
