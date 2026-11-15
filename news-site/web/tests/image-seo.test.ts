import { describe, expect, it } from 'vitest';

import { displayDimensions } from '../src/sanity/image';
import robots from '../src/app/robots';
import manifest from '../src/app/manifest';
import { SITE_NAME, SITE_URL } from '../src/lib/site';

describe('displayDimensions image helper', () => {
  it('returns null when source dimensions are missing or null', () => {
    expect(displayDimensions({ dimensions: null })).toBeNull();
    expect(displayDimensions({ dimensions: undefined })).toBeNull();
  });

  it('calculates uncropped dimensions directly', () => {
    const source = {
      dimensions: { width: 1200, height: 800 },
    };
    expect(displayDimensions(source)).toEqual({ width: 1200, height: 800 });
  });

  it('accounts for Studio crop percentages on width and height', () => {
    const source = {
      dimensions: { width: 1000, height: 800 },
      crop: {
        top: 0.1,    // cuts 80px -> 720
        bottom: 0.15,// cuts 120px -> height 600
        left: 0.2,   // cuts 200px
        right: 0.1,  // cuts 100px -> width 700
      },
    };
    expect(displayDimensions(source)).toEqual({ width: 700, height: 600 });
  });

  it('caps dimensions at maxWidth preserving the cropped aspect ratio', () => {
    const source = {
      dimensions: { width: 1600, height: 800 }, // 2:1 aspect ratio
    };
    // Capping at 800px width should downscale height to 400px
    expect(displayDimensions(source, 800)).toEqual({ width: 800, height: 400 });
  });

  it('does not upscale when width is already below maxWidth', () => {
    const source = {
      dimensions: { width: 600, height: 400 },
    };
    expect(displayDimensions(source, 1200)).toEqual({ width: 600, height: 400 });
  });
});

describe('robots metadata route', () => {
  it('allows public root and disallows internal search and api paths', () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;

    expect(rules.userAgent).toBe('*');
    expect(rules.allow).toBe('/');
    expect(rules.disallow).toEqual(['/search', '/api/']);
  });

  it('includes both standard sitemap and news sitemap with configured host', () => {
    const config = robots();
    expect(config.sitemap).toEqual([
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/news-sitemap.xml`,
    ]);
    expect(config.host).toBe(SITE_URL);
  });
});

describe('manifest metadata route', () => {
  it('returns valid standalone PWA manifest configuration', () => {
    const config = manifest();
    expect(config.name).toBe(SITE_NAME);
    expect(config.short_name).toBe(SITE_NAME);
    expect(config.start_url).toBe('/');
    expect(config.display).toBe('standalone');
    expect(config.background_color).toBe('#161614');
    expect(config.theme_color).toBe('#161614');
    expect(config.icons).toEqual([
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ]);
  });
});
