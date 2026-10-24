
const fs = require("node:fs");
const path = require("node:path");

const HOST = "bitshift-daily.pages.dev";
const SITE = `https://${HOST}`;
const URLS_FILE = path.join(__dirname, "urls.txt");

async function main() {
  const key = process.env.INDEXNOW_KEY;

  if (!key || !/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
    throw new Error("INDEXNOW_KEY secret is missing or invalid.");
  }

  const keyLocation = `${SITE}/${key}.txt`;
  const verification = await fetch(keyLocation);

  if (!verification.ok) {
    throw new Error(
      `Key verification failed: ${keyLocation} (HTTP ${verification.status})`
    );
  }

  if ((await verification.text()).trim() !== key) {
    throw new Error("The live key file does not match INDEXNOW_KEY.");
  }

  const raw = fs.readFileSync(URLS_FILE, "utf8")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"));

  const urls = [...new Set(raw)];

  for (const value of urls) {
    const url = new URL(value);

    if (url.protocol !== "https:" || url.hostname !== HOST) {
      throw new Error(`Invalid URL for IndexNow: ${value}`);
    }
  }

  if (urls.length === 0) {
    throw new Error("No URLs available for IndexNow.");
  }

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      host: HOST,
      key,
      keyLocation,
      urlList: urls
    })
  });

  const body = await response.text();

  if (![200, 202].includes(response.status)) {
    throw new Error(
      `IndexNow failed: HTTP ${response.status}; ${body}`
    );
  }

  console.log(`IndexNow accepted ${urls.length} URLs.`);
  console.log(`HTTP ${response.status}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
