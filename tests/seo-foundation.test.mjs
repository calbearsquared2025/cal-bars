import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const robotsText = await readFile(new URL('../robots.txt', import.meta.url), 'utf8');
const sitemapXml = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');

test('homepage exposes stable search metadata without changing current-game social metadata', () => {
  assert.match(indexHtml, /<title>Cal Golden Bars \| Find Cal Bars &amp; Watch Parties<\/title>/);
  assert.match(
    indexHtml,
    /<meta name="description" content="Find Cal Bars, Watch Parties, and fan-added places where Cal fans gather on game day\. Explore the map and find your Cal crowd\.">/
  );
  assert.match(indexHtml, /<link rel="canonical" href="https:\/\/calgoldenbars\.com\/">/);
  assert.match(indexHtml, /<!-- CGB current-game social metadata: start -->/);
  assert.match(indexHtml, /<meta property="og:url" content="https:\/\/calgoldenbars\.com\/">/);
});

test('homepage includes valid WebSite structured data', () => {
  const match = indexHtml.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, 'expected homepage JSON-LD');
  const structuredData = JSON.parse(match[1]);

  assert.equal(structuredData['@context'], 'https://schema.org');
  assert.equal(structuredData['@type'], 'WebSite');
  assert.equal(structuredData.name, 'Cal Golden Bars');
  assert.equal(structuredData.url, 'https://calgoldenbars.com/');
  assert.match(structuredData.description, /Cal Bars, Watch Parties/);
});

test('robots and sitemap expose the canonical homepage to crawlers', () => {
  assert.match(robotsText, /^User-agent: \*$/m);
  assert.match(robotsText, /^Allow: \/$/m);
  assert.match(robotsText, /^Sitemap: https:\/\/calgoldenbars\.com\/sitemap\.xml$/m);

  assert.match(sitemapXml, /<loc>https:\/\/calgoldenbars\.com\/<\/loc>/);
  assert.doesNotMatch(sitemapXml, /\/share\//);
});
