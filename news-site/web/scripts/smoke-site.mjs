#!/usr/bin/env node
/**
 * Post-cutover smoke test for CS NEWS.
 * Verifies core routing, feeds, sitemaps, dynamic links, media loading,
 * and 404 behavior against a target URL.
 *
 * Usage:
 *   node scripts/smoke-site.mjs https://csnews.news
 *   node scripts/smoke-site.mjs http://localhost:3000 --timeout 5000
 *
 * Requirements: Node 20+, zero dependencies, uses global fetch.
 * Exits with 0 if all checks pass, 1 if any check fails.
 */

import { pathToFileURL } from 'node:url';

function unescapeHtml(str) {
  if (!str) return '';
  return str
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

export async function runSmokeTest(targetUrl, options = {}) {
  const timeoutMs = Number(options.timeout) || 10_000;
  const baseUrl = targetUrl.replace(/\/+$/, '');
  const results = [];

  async function fetchWithTimeout(url) {
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const response = await fetch(url, {
        signal,
        headers: { 'User-Agent': 'CSNews-SmokeTest/1.0' },
      });
      return { ok: true, response };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  }

  // 1. Root /
  let homeHtml = '';
  const homeRes = await fetchWithTimeout(`${baseUrl}/`);
  if (!homeRes.ok) {
    results.push({
      name: 'Home page (/)',
      url: `${baseUrl}/`,
      expected: '200',
      actual: 'ERR',
      passed: false,
      detail: homeRes.error,
    });
  } else {
    const status = homeRes.response.status;
    const passed = status === 200;
    homeHtml = await homeRes.response.text();
    results.push({
      name: 'Home page (/)',
      url: `${baseUrl}/`,
      expected: '200',
      actual: String(status),
      passed,
      detail: passed ? 'OK' : `Unexpected status ${status}`,
    });
  }

  // 2. /feed.xml
  const feedRes = await fetchWithTimeout(`${baseUrl}/feed.xml`);
  results.push({
    name: 'RSS feed (/feed.xml)',
    url: `${baseUrl}/feed.xml`,
    expected: '200',
    actual: feedRes.ok ? String(feedRes.response.status) : 'ERR',
    passed: feedRes.ok && feedRes.response.status === 200,
    detail: feedRes.ok
      ? (feedRes.response.status === 200 ? 'OK' : `Status ${feedRes.response.status}`)
      : feedRes.error,
  });

  // 3. /sitemap.xml
  const sitemapRes = await fetchWithTimeout(`${baseUrl}/sitemap.xml`);
  results.push({
    name: 'Sitemap (/sitemap.xml)',
    url: `${baseUrl}/sitemap.xml`,
    expected: '200',
    actual: sitemapRes.ok ? String(sitemapRes.response.status) : 'ERR',
    passed: sitemapRes.ok && sitemapRes.response.status === 200,
    detail: sitemapRes.ok
      ? (sitemapRes.response.status === 200 ? 'OK' : `Status ${sitemapRes.response.status}`)
      : sitemapRes.error,
  });

  // 4. /news-sitemap.xml
  const newsSitemapRes = await fetchWithTimeout(`${baseUrl}/news-sitemap.xml`);
  results.push({
    name: 'News sitemap (/news-sitemap.xml)',
    url: `${baseUrl}/news-sitemap.xml`,
    expected: '200',
    actual: newsSitemapRes.ok ? String(newsSitemapRes.response.status) : 'ERR',
    passed: newsSitemapRes.ok && newsSitemapRes.response.status === 200,
    detail: newsSitemapRes.ok
      ? (newsSitemapRes.response.status === 200 ? 'OK' : `Status ${newsSitemapRes.response.status}`)
      : newsSitemapRes.error,
  });

  // 5. /robots.txt
  const robotsRes = await fetchWithTimeout(`${baseUrl}/robots.txt`);
  results.push({
    name: 'Robots policy (/robots.txt)',
    url: `${baseUrl}/robots.txt`,
    expected: '200',
    actual: robotsRes.ok ? String(robotsRes.response.status) : 'ERR',
    passed: robotsRes.ok && robotsRes.response.status === 200,
    detail: robotsRes.ok
      ? (robotsRes.response.status === 200 ? 'OK' : `Status ${robotsRes.response.status}`)
      : robotsRes.error,
  });

  // 6. Article page linked from home page
  const articleHrefMatch = homeHtml.match(
    /href=["'](\/article\/[^"'\s>]+|https?:\/\/[^"'\s>]+\/article\/[^"'\s>]+)["']/i
  );
  if (!articleHrefMatch) {
    results.push({
      name: 'Linked article page',
      url: '(none found)',
      expected: '200',
      actual: 'N/A',
      passed: false,
      detail: 'No /article/ link found in home page HTML',
    });
  } else {
    const rawHref = unescapeHtml(articleHrefMatch[1]);
    const articleUrl = new URL(rawHref, baseUrl).href;
    const articleRes = await fetchWithTimeout(articleUrl);
    results.push({
      name: 'Linked article page',
      url: articleUrl,
      expected: '200',
      actual: articleRes.ok ? String(articleRes.response.status) : 'ERR',
      passed: articleRes.ok && articleRes.response.status === 200,
      detail: articleRes.ok
        ? (articleRes.response.status === 200 ? 'OK' : `Status ${articleRes.response.status}`)
        : articleRes.error,
    });
  }

  // 7. Category page linked from home page
  const categoryHrefMatch = homeHtml.match(
    /href=["'](\/category\/[^"'\s>]+|https?:\/\/[^"'\s>]+\/category\/[^"'\s>]+)["']/i
  );
  if (!categoryHrefMatch) {
    results.push({
      name: 'Linked category page',
      url: '(none found)',
      expected: '200',
      actual: 'N/A',
      passed: false,
      detail: 'No /category/ link found in home page HTML',
    });
  } else {
    const rawHref = unescapeHtml(categoryHrefMatch[1]);
    const categoryUrl = new URL(rawHref, baseUrl).href;
    const categoryRes = await fetchWithTimeout(categoryUrl);
    results.push({
      name: 'Linked category page',
      url: categoryUrl,
      expected: '200',
      actual: categoryRes.ok ? String(categoryRes.response.status) : 'ERR',
      passed: categoryRes.ok && categoryRes.response.status === 200,
      detail: categoryRes.ok
        ? (categoryRes.response.status === 200 ? 'OK' : `Status ${categoryRes.response.status}`)
        : categoryRes.error,
    });
  }

  // 8. First image on home page loads with image content type
  const imgMatch = homeHtml.match(/<img[^>]+src=["']([^"'\s>]+)["']/i);
  if (!imgMatch) {
    results.push({
      name: 'Home page primary image',
      url: '(none found)',
      expected: '200 image/*',
      actual: 'N/A',
      passed: false,
      detail: 'No <img src="..."> found in home page HTML',
    });
  } else {
    const rawSrc = unescapeHtml(imgMatch[1]);
    const imgUrl = new URL(rawSrc, baseUrl).href;
    const imgRes = await fetchWithTimeout(imgUrl);
    if (!imgRes.ok) {
      results.push({
        name: 'Home page primary image',
        url: imgUrl,
        expected: '200 image/*',
        actual: 'ERR',
        passed: false,
        detail: imgRes.error,
      });
    } else {
      const status = imgRes.response.status;
      const contentType = imgRes.response.headers.get('content-type') || '';
      const isImage = contentType.toLowerCase().startsWith('image/');
      const passed = status === 200 && isImage;
      results.push({
        name: 'Home page primary image',
        url: imgUrl,
        expected: '200 image/*',
        actual: `${status} ${contentType.split(';')[0] || '(no type)'}`,
        passed,
        detail: passed
          ? 'OK'
          : (!isImage ? `Non-image Content-Type: ${contentType}` : `Status ${status}`),
      });
    }
  }

  // 9. Non-existent made-up URL returns 404
  const madeUpPath = `/_smoke_probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const notFoundUrl = `${baseUrl}${madeUpPath}`;
  const notFoundRes = await fetchWithTimeout(notFoundUrl);
  results.push({
    name: 'Non-existent URL (404 check)',
    url: notFoundUrl,
    expected: '404',
    actual: notFoundRes.ok ? String(notFoundRes.response.status) : 'ERR',
    passed: notFoundRes.ok && notFoundRes.response.status === 404,
    detail: notFoundRes.ok
      ? (notFoundRes.response.status === 404 ? 'OK' : `Expected 404, got ${notFoundRes.response.status}`)
      : notFoundRes.error,
  });

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;
  const allPassed = failedCount === 0;

  return {
    target: baseUrl,
    allPassed,
    passedCount,
    failedCount,
    results,
  };
}

export function formatResultsTable(report) {
  const lines = [];
  lines.push(`\nSmoke Test Target: ${report.target}`);
  lines.push('='.repeat(96));
  lines.push(
    `${'Check'.padEnd(30)} ${'Status'.padEnd(8)} ${'Expected'.padEnd(14)} ${'Actual'.padEnd(18)} ${'Detail'}`
  );
  lines.push('-'.repeat(96));

  for (const r of report.results) {
    const status = r.passed ? 'PASS' : 'FAIL';
    const name = r.name.length > 29 ? r.name.slice(0, 26) + '...' : r.name;
    const expected = r.expected.slice(0, 13);
    const actual = r.actual.slice(0, 17);
    lines.push(
      `${name.padEnd(30)} ${status.padEnd(8)} ${expected.padEnd(14)} ${actual.padEnd(18)} ${r.detail}`
    );
  }

  lines.push('='.repeat(96));
  lines.push(
    `Summary: ${report.passedCount} passed, ${report.failedCount} failed (${report.allPassed ? 'ALL CHECKS PASSED' : 'SMOKE TEST FAILED'})\n`
  );
  return lines.join('\n');
}

// CLI entry point
const isDirectCli =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectCli) {
  const args = process.argv.slice(2);
  let targetUrl = '';
  let timeout = 10_000;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--timeout' && i + 1 < args.length) {
      timeout = Number(args[++i]) || timeout;
    } else if (arg.startsWith('--timeout=')) {
      timeout = Number(arg.split('=')[1]) || timeout;
    } else if (!arg.startsWith('-') && !targetUrl) {
      targetUrl = arg;
    }
  }

  if (!targetUrl) {
    console.error('Error: target URL is required.\nUsage: node scripts/smoke-site.mjs <url> [--timeout <ms>]');
    process.exit(2);
  }

  try {
    const report = await runSmokeTest(targetUrl, { timeout });
    console.log(formatResultsTable(report));
    process.exit(report.allPassed ? 0 : 1);
  } catch (err) {
    console.error('Fatal smoke test error:', err);
    process.exit(1);
  }
}
