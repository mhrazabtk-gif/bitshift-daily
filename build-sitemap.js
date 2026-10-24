
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://bitshift-daily.pages.dev';
const KEY = 'f415bd52dd47451c8a88078c77c9ae87';

const ROOT = __dirname;
const URLS_FILE = path.join(ROOT, 'urls.txt');
const PUBLIC_DIR = path.join(ROOT, 'public');
const REDIRECTS_FILE = path.join(PUBLIC_DIR, '_redirects');
const SITEMAP_FILE = path.join(PUBLIC_DIR, 'sitemap.xml');
const KEY_FILE = path.join(PUBLIC_DIR, `${KEY}.txt`);

if (!fs.existsSync(URLS_FILE)) {
    throw new Error('urls.txt not found. Sitemap generation stopped.');
}

if (!fs.existsSync(REDIRECTS_FILE)) {
    throw new Error('public/_redirects is missing. Deployment must not continue.');
}

const redirects = fs.readFileSync(REDIRECTS_FILE, 'utf8')
    .split(/\r?\n/)
    .filter(line => line.trim() && !line.trim().startsWith('#'));

if (redirects.length > 2000) {
    throw new Error(`Redirect limit check failed: ${redirects.length} rules found.`);
}

const rawUrls = fs.readFileSync(URLS_FILE, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

const uniqueUrls = new Set();

for (const value of rawUrls) {
    let url;

    try {
        url = new URL(value);
    } catch {
        throw new Error(`Invalid URL in urls.txt: ${value}`);
    }

    if (url.origin !== DOMAIN) {
        throw new Error(`Unexpected URL domain: ${value}`);
    }

    // Normalize repeated slashes in the pathname.
    url.pathname = '/' + url.pathname.split('/').filter(Boolean).join('/');

    uniqueUrls.add(url.href);
}

if (uniqueUrls.size === 0) {
    throw new Error('No valid URLs found. Sitemap generation stopped.');
}

const now = new Date().toISOString();

const escapeXml = value => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

for (const url of uniqueUrls) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(url)}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += '    <changefreq>hourly</changefreq>\n';
    xml += '  </url>\n';
}

xml += '</urlset>\n';

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.writeFileSync(SITEMAP_FILE, xml, 'utf8');

// Make the existing IndexNow key available at the deployed site root.
if (!fs.existsSync(KEY_FILE)) {
    fs.writeFileSync(KEY_FILE, KEY, 'utf8');
}

console.log(`Sitemap generated: ${uniqueUrls.size} URLs`);
console.log(`lastmod: ${now}`);
console.log('changefreq: hourly');
console.log(`Redirect rules preserved: ${redirects.length}`);
console.log('IndexNow key file verified.');
