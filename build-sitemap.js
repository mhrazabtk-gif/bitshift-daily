
const fs = require("node:fs");
const path = require("node:path");

const HOST = "bitshift-daily.pages.dev";
const ORIGIN = `https://${HOST}`;
const INPUT = path.join(__dirname, "urls.txt");
const OUTPUT = path.join(__dirname, "sitemap.xml");

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function main() {
  if (!fs.existsSync(INPUT)) {
    throw new Error("urls.txt is missing.");
  }

  const lines = fs.readFileSync(INPUT, "utf8")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"));

  const urls = new Set();

  for (const line of lines) {
    let url;

    try {
      url = new URL(line);
    } catch {
      throw new Error(`Invalid URL in urls.txt: ${line}`);
    }

    if (url.origin !== ORIGIN) {
      throw new Error(`URL must belong to ${HOST}: ${line}`);
    }

    if (url.search || url.hash) {
      throw new Error(`Remove query strings and fragments: ${line}`);
    }

    urls.add(url.href);
  }

  if (urls.size === 0) {
    throw new Error("No URLs found in urls.txt.");
  }

  // One UTC timestamp for this hourly sitemap generation.
  const lastmod = new Date().toISOString();

  const entries = [...urls].map(url => `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  fs.writeFileSync(OUTPUT, xml, "utf8");

  console.log(`Generated sitemap.xml with ${urls.size} URLs.`);
  console.log(`lastmod: ${lastmod}`);
}

main();
