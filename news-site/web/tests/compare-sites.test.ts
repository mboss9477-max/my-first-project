import { createServer, type Server } from 'node:http';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  comparePageContent,
  compareSites,
  extractImageFilenames,
  extractVisibleText,
  formatReport,
  resolveStreamedHtml,
} from '../scripts/compare-sites.mjs';

const execFileAsync = (cmd: string, args: string[]) =>
  new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
    execFile(cmd, args, (error, stdout, stderr) => {
      resolve({
        stdout: String(stdout),
        stderr: String(stderr),
        exitCode: error && 'code' in error && typeof error.code === 'number' ? error.code : 0,
      });
    });
  });

describe('compare-sites comparison script', () => {
  // ---- 1. Unit Fixtures: Page comparison logic ----

  const identicalHtmlA = `
    <!DOCTYPE html>
    <html>
      <head><title>Home - CS News</title></head>
      <body>
        <header><nav><a href="/">Home</a><a href="/category/tech">Tech</a></nav></header>
        <main>
          <h1>Independent News</h1>
          <p>Reporting on technology, science and policy.</p>
          <img src="/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Flead.jpg&amp;w=1200&amp;q=75" alt="Lead">
        </main>
        <footer><p>© 2026 CS News</p></footer>
      </body>
    </html>
  `;

  const changedParagraphHtmlB = `
    <!DOCTYPE html>
    <html>
      <head><title>Home - CS News</title></head>
      <body>
        <header><nav><a href="/">Home</a><a href="/category/tech">Tech</a></nav></header>
        <main>
          <h1>Independent News</h1>
          <p>Reporting on corporate finance, stocks and markets.</p>
          <img src="/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Flead.jpg&amp;w=1200&amp;q=75" alt="Lead">
        </main>
        <footer><p>© 2026 CS News</p></footer>
      </body>
    </html>
  `;

  const missingImageHtmlB = `
    <!DOCTYPE html>
    <html>
      <head><title>Home - CS News</title></head>
      <body>
        <header><nav><a href="/">Home</a><a href="/category/tech">Tech</a></nav></header>
        <main>
          <h1>Independent News</h1>
          <p>Reporting on technology, science and policy.</p>
        </main>
        <footer><p>© 2026 CS News</p></footer>
      </body>
    </html>
  `;

  const inlineCategoryHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>Category - Tech</title></head>
      <body>
        <header><nav><a href="/">Home</a></nav></header>
        <main>
          <h1>Tech News</h1>
          <article>
            <h2>Open Hardware Standard</h2>
            <p>Engineers have announced an open specification.</p>
            <img src="/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fprod%2Fhardware-spec.jpg&amp;w=800&amp;q=75" alt="Spec">
          </article>
        </main>
        <footer><p>© 2026 CS News</p></footer>
      </body>
    </html>
  `;

  const streamedCategoryHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>Category - Tech</title></head>
      <body>
        <header><nav><a href="/">Home</a></nav></header>
        <template id="B:0"></template>
        <footer><p>© 2026 CS News</p></footer>
        <div hidden id="S:0">
          <main>
            <h1>Tech News</h1>
            <article>
              <h2>Open Hardware Standard</h2>
              <p>Engineers have announced an open specification.</p>
              <img src="/_next/image?url=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fmedia%2Ffile%2Fhardware-spec.jpg&amp;w=800&amp;q=75" alt="Spec">
            </article>
          </main>
        </div>
        <script>$RC("B:0","S:0")</script>
      </body>
    </html>
  `;

  it('treats identical pages as 0 differences', () => {
    const result = comparePageContent(identicalHtmlA, identicalHtmlA, '/');
    expect(result.passed).toBe(true);
    expect(result.textEqual).toBe(true);
    expect(result.imagesEqual).toBe(true);
    expect(result.textDiffs).toHaveLength(0);
    expect(result.imageDiffs).toHaveLength(0);
  });

  it('detects a changed paragraph between two pages', () => {
    const result = comparePageContent(identicalHtmlA, changedParagraphHtmlB, '/');
    expect(result.passed).toBe(false);
    expect(result.textEqual).toBe(false);
    expect(result.imagesEqual).toBe(true);
    expect(result.textDiffs.some((d: string) => d.includes('Reporting on technology, science and policy.'))).toBe(true);
    expect(result.textDiffs.some((d: string) => d.includes('Reporting on corporate finance, stocks and markets.'))).toBe(true);
  });

  it('detects a missing image between two pages', () => {
    const result = comparePageContent(identicalHtmlA, missingImageHtmlB, '/');
    expect(result.passed).toBe(false);
    expect(result.textEqual).toBe(true);
    expect(result.imagesEqual).toBe(false);
    expect(result.imageDiffs).toEqual(['- image: lead.jpg']);
  });

  it('treats streamed-versus-inline category pages as equal', () => {
    const result = comparePageContent(inlineCategoryHtml, streamedCategoryHtml, '/category/tech');
    expect(result.passed).toBe(true);
    expect(result.textEqual).toBe(true);
    expect(result.imagesEqual).toBe(true);
    expect(result.textDiffs).toHaveLength(0);
    expect(result.imageDiffs).toHaveLength(0);
  });

  it('treats streamed <div hidden> content without templates as equal by multiset', () => {
    const inline = `
      <div><p>Headline</p><p>Body paragraph</p><p>Footer</p></div>
    `;
    const streamed = `
      <div><p>Headline</p><p>Footer</p></div>
      <div hidden><p>Body paragraph</p></div>
    `;
    const result = comparePageContent(inline, streamed, '/streamed-fallback');
    expect(result.passed).toBe(true);
    expect(result.textEqual).toBe(true);
  });

  it('strips scripts, styles, comments, and SVGs when extracting visible text', () => {
    const dirtyHtml = `
      <script>var secret = "do not show";</script>
      <style>.hidden { display: none; }</style>
      <!-- comment -->
      <svg><path d="M10 10" /></svg>
      <h1>Clean Title &amp; Subtitle</h1>
      <noscript>Please enable JS</noscript>
    `;
    const lines = extractVisibleText(dirtyHtml);
    expect(lines).toEqual(['Clean Title & Subtitle']);
  });

  it('extracts image filenames across different host domains', () => {
    const sanityHtml = `
      <img src="/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fabc%2Fhero.jpg&amp;w=1200&amp;q=75">
      <img src="/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fabc%2Favatar.png%3Fv%3D1&amp;w=40&amp;q=75">
    `;
    const cmsHtml = `
      <img src="/_next/image?url=http%3A%2F%2Fcms.internal%2Fmedia%2Fhero.jpg&amp;w=1200&amp;q=75">
      <img src="/_next/image?url=%2Fapi%2Fmedia%2Favatar.png&amp;w=40&amp;q=75">
    `;

    const sanityImages = extractImageFilenames(sanityHtml);
    const cmsImages = extractImageFilenames(cmsHtml);

    expect([...sanityImages].sort()).toEqual(['avatar.png', 'hero.jpg']);
    expect([...cmsImages].sort()).toEqual(['avatar.png', 'hero.jpg']);
  });

  // ---- 2. Full HTTP Server Mock Tests ----

  let serverA: Server;
  let serverBIdentical: Server;
  let serverBDiffering: Server;

  let urlA: string;
  let urlBIdentical: string;
  let urlBDiffering: string;

  beforeAll(async () => {
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>http://localhost/</loc></url>
        <url><loc>http://localhost/category/tech</loc></url>
        <url><loc>http://localhost/article/test-story</loc></url>
      </urlset>`;

    serverA = createServer((req, res) => {
      const p = req.url || '/';
      if (p === '/sitemap.xml') {
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end(sitemapXml);
      } else if (p === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(identicalHtmlA);
      } else if (p === '/category/tech') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(inlineCategoryHtml);
      } else if (p === '/article/test-story' || p === '/search') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><main><h1>Story</h1><p>Content</p></main></body></html>');
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    serverBIdentical = createServer((req, res) => {
      const p = req.url || '/';
      if (p === '/sitemap.xml') {
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end(sitemapXml);
      } else if (p === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(identicalHtmlA);
      } else if (p === '/category/tech') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(streamedCategoryHtml); // Streamed vs inline: should match!
      } else if (p === '/article/test-story' || p === '/search') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><main><h1>Story</h1><p>Content</p></main></body></html>');
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    serverBDiffering = createServer((req, res) => {
      const p = req.url || '/';
      if (p === '/sitemap.xml') {
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end(sitemapXml);
      } else if (p === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(changedParagraphHtmlB); // Differing text
      } else if (p === '/category/tech') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(missingImageHtmlB); // Differing image
      } else if (p === '/article/test-story' || p === '/search') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><main><h1>Story</h1><p>Content</p></main></body></html>');
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    await Promise.all([
      new Promise<void>((r) => serverA.listen(0, '127.0.0.1', () => r())),
      new Promise<void>((r) => serverBIdentical.listen(0, '127.0.0.1', () => r())),
      new Promise<void>((r) => serverBDiffering.listen(0, '127.0.0.1', () => r())),
    ]);

    const addrA = serverA.address() as { port: number };
    const addrBIdentical = serverBIdentical.address() as { port: number };
    const addrBDiffering = serverBDiffering.address() as { port: number };

    urlA = `http://127.0.0.1:${addrA.port}`;
    urlBIdentical = `http://127.0.0.1:${addrBIdentical.port}`;
    urlBDiffering = `http://127.0.0.1:${addrBDiffering.port}`;
  });

  afterAll(async () => {
    await Promise.all([
      new Promise<void>((r) => serverA.close(() => r())),
      new Promise<void>((r) => serverBIdentical.close(() => r())),
      new Promise<void>((r) => serverBDiffering.close(() => r())),
    ]);
  });

  it('compares entire site via compareSites with 0 differences against identical/streamed origin', async () => {
    const report = await compareSites(urlA, urlBIdentical);
    expect(report.allPassed).toBe(true);
    expect(report.diffCount).toBe(0);
    expect(report.totalCount).toBe(4); // /, /category/tech, /article/test-story, /search
  });

  it('compares entire site via compareSites and detects differences on modified origin', async () => {
    const report = await compareSites(urlA, urlBDiffering);
    expect(report.allPassed).toBe(false);
    expect(report.diffCount).toBe(2); // / has changed text, /category/tech has changed text & missing image
  });

  it('executes via CLI and exits with 0 on matching origins', async () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const scriptPath = path.resolve(__dirname, '../scripts/compare-sites.mjs');

    const { stdout, exitCode } = await execFileAsync(process.execPath, [
      scriptPath,
      urlA,
      urlBIdentical,
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('ALL PAGES MATCH');
    expect(stdout).toContain('0 differences');
  });

  it('executes via CLI and exits with 1 on differing origins', async () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const scriptPath = path.resolve(__dirname, '../scripts/compare-sites.mjs');

    const { stdout, exitCode } = await execFileAsync(process.execPath, [
      scriptPath,
      urlA,
      urlBDiffering,
    ]);

    expect(exitCode).toBe(1);
    expect(stdout).toContain('page(s) differed');
    expect(stdout).toContain('Text differences:');
  });

  it('executes via CLI and exits with 2 when arguments are missing', async () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const scriptPath = path.resolve(__dirname, '../scripts/compare-sites.mjs');

    const { stderr, exitCode } = await execFileAsync(process.execPath, [scriptPath, urlA]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('Usage:');
  });
});
