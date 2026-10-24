
const fs = require("node:fs");
const path = require("node:path");

const DOMAIN = "https://bitshift-daily.pages.dev";
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

  const urls = fs.readFileSync(INPUT, "utf8")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"));

  const unique = new Set();

  for (const value of urls) {
    const url = new URL(value);

    if (url.origin !== DOMAIN) {
      throw new Error(`URL is outside the target domain: ${value}`);
    }

    if (url.search || url.hash) {
      throw new Error(`Remove query/hash from canonical URL: ${value}`);
    }

    unique.add(url.href);
  }

  if (unique.size === 0) {
    throw new Error("No URLs found in urls.txt.");
  }

  // Requested behavior: timestamp is refreshed on every hourly run.
  const lastmod = new Date().toISOString();

  const entries = [...unique].map(url => `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  fs.writeFileSync(OUTPUT, xml, "utf8");
  console.log(`Generated ${OUTPUT} with ${unique.size} URLs.`);
}

main();
