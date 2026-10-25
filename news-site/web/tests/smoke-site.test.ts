import { createServer, type Server } from 'node:http';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runSmokeTest } from '../scripts/smoke-site.mjs';

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

describe('smoke-site verification script', () => {
  let healthyServer: Server;
  let healthyUrl: string;

  let brokenServer: Server;
  let brokenUrl: string;

  beforeAll(async () => {
    // 1. Healthy fixture server
    healthyServer = createServer((req, res) => {
      const url = req.url || '/';

      if (url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html>
<head><title>Test News</title></head>
<body>
  <header>
    <a href="/category/business">Business</a>
  </header>
  <main>
    <article>
      <h2><a href="/article/sample-headline">Sample Article</a></h2>
      <img src="/assets/photo.jpg" alt="Photo" />
    </article>
  </main>
</body>
</html>`);
        return;
      }

      if (url === '/feed.xml') {
        res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
        res.end('<rss version="2.0"><channel><title>Test Feed</title></channel></rss>');
        return;
      }

      if (url === '/sitemap.xml') {
        res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
        res.end('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
        return;
      }

      if (url === '/news-sitemap.xml') {
        res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
        res.end('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
        return;
      }

      if (url === '/robots.txt') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('User-Agent: *\nAllow: /\n');
        return;
      }

      if (url === '/article/sample-headline') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Sample Article</h1>');
        return;
      }

      if (url === '/category/business') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Business Section</h1>');
        return;
      }

      if (url === '/assets/photo.jpg') {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(Buffer.from([0xff, 0xd8, 0xff, 0xe0])); // Minimal JPEG magic bytes
        return;
      }

      // Default 404
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    });

    await new Promise<void>((resolve) => {
      healthyServer.listen(0, '127.0.0.1', () => {
        const addr = healthyServer.address();
        if (typeof addr === 'object' && addr) {
          healthyUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });

    // 2. Broken fixture server
    brokenServer = createServer((req, res) => {
      const url = req.url || '/';

      if (url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html>
<body>
  <a href="/category/failing-category">Category</a>
  <a href="/article/failing-story">Article</a>
  <img src="/broken-image.png" alt="Broken" />
</body>
</html>`);
        return;
      }

      // Missing sitemap
      if (url === '/sitemap.xml') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Missing sitemap');
        return;
      }

      // Broken article endpoint
      if (url === '/article/failing-story') {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }

      // Broken image returns HTML instead of image
      if (url === '/broken-image.png') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html>Error loading image</html>');
        return;
      }

      // Broken 404: returns 200 for everything (soft-404)
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('Soft 404 OK');
    });

    await new Promise<void>((resolve) => {
      brokenServer.listen(0, '127.0.0.1', () => {
        const addr = brokenServer.address();
        if (typeof addr === 'object' && addr) {
          brokenUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => healthyServer.close(() => resolve()));
    await new Promise<void>((resolve) => brokenServer.close(() => resolve()));
  });

  it('passes all 9 checks on a healthy server', async () => {
    const report = await runSmokeTest(healthyUrl);
    expect(report.allPassed).toBe(true);
    expect(report.passedCount).toBe(9);
    expect(report.failedCount).toBe(0);
    expect(report.results.every((r) => r.passed)).toBe(true);
  });

  it('detects multiple failures on a broken server (missing sitemap, 500 article, non-image content type, soft 404)', async () => {
    const report = await runSmokeTest(brokenUrl);
    expect(report.allPassed).toBe(false);
    expect(report.failedCount).toBeGreaterThanOrEqual(4);

    const sitemapResult = report.results.find((r) => r.name.includes('Sitemap (/sitemap.xml)'));
    expect(sitemapResult?.passed).toBe(false);

    const articleResult = report.results.find((r) => r.name.includes('Linked article page'));
    expect(articleResult?.passed).toBe(false);
    expect(articleResult?.actual).toBe('500');

    const imageResult = report.results.find((r) => r.name.includes('Home page primary image'));
    expect(imageResult?.passed).toBe(false);

    const notFoundResult = report.results.find((r) => r.name.includes('404 check'));
    expect(notFoundResult?.passed).toBe(false);
    expect(notFoundResult?.actual).toBe('200');
  });

  it('fails gracefully when home page has no article or category links', async () => {
    const emptyServer = createServer((req, res) => {
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body>No links here</body></html>');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    });

    await new Promise<void>((resolve) => emptyServer.listen(0, '127.0.0.1', () => resolve()));
    const emptyPort = (emptyServer.address() as { port: number }).port;

    try {
      const report = await runSmokeTest(`http://127.0.0.1:${emptyPort}`);
      expect(report.allPassed).toBe(false);

      const articleCheck = report.results.find((r) => r.name.includes('Linked article page'));
      expect(articleCheck?.passed).toBe(false);
      expect(articleCheck?.detail).toContain('No /article/ link found');

      const categoryCheck = report.results.find((r) => r.name.includes('Linked category page'));
      expect(categoryCheck?.passed).toBe(false);
      expect(categoryCheck?.detail).toContain('No /category/ link found');
    } finally {
      await new Promise<void>((resolve) => emptyServer.close(() => resolve()));
    }
  });

  it('fails gracefully when server is completely unreachable', async () => {
    // Port 1 is almost universally closed
    const report = await runSmokeTest('http://127.0.0.1:1', { timeout: 1000 });
    expect(report.allPassed).toBe(false);
    expect(report.failedCount).toBe(9);
  });

  it('runs as CLI and exits with code 0 on healthy target', async () => {
    const scriptPath = path.resolve(__dirname, '../scripts/smoke-site.mjs');
    const { stdout, exitCode } = await execFileAsync(process.execPath, [scriptPath, healthyUrl]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('ALL CHECKS PASSED');
    expect(stdout).toContain('Summary: 9 passed, 0 failed');
  });

  it('runs as CLI and exits with code 1 on broken target', async () => {
    const scriptPath = path.resolve(__dirname, '../scripts/smoke-site.mjs');
    const { stdout, exitCode } = await execFileAsync(process.execPath, [scriptPath, brokenUrl]);
    expect(exitCode).toBe(1);
    expect(stdout).toContain('SMOKE TEST FAILED');
  });

  it('runs as CLI and exits with code 2 when URL argument is missing', async () => {
    const scriptPath = path.resolve(__dirname, '../scripts/smoke-site.mjs');
    const { stderr, exitCode } = await execFileAsync(process.execPath, [scriptPath]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('Error: target URL is required');
  });
});
