
const fs = require("node:fs");
const path = require("node:path");

const HOST = "bitshift-daily.pages.dev";
const SITE = `https://${HOST}`;
const URLS_FILE = path.join(__dirname, "urls.txt");

async function main() {
  const key = process.env.INDEXNOW_KEY;

  if (!key || !/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
    throw new Error("Missing or invalid INDEXNOW_KEY secret.");
  }

  if (!fs.existsSync(URLS_FILE)) {
    throw new Error("urls.txt was not found.");
  }

  const urls = fs.readFileSync(URLS_FILE, "utf8")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"));

  const uniqueUrls = [...new Set(urls)];

  for (const value of uniqueUrls) {
    const url = new URL(value);

    if (url.protocol !== "https:" || url.hostname !== HOST) {
      throw new Error(`URL does not belong to ${HOST}: ${value}`);
    }
  }

  if (uniqueUrls.length === 0) {
    throw new Error("No URLs available to submit.");
  }

  const keyLocation = `${SITE}/${key}.txt`;

  // The key file must already be accessible on the live site.
  const keyResponse = await fetch(keyLocation);

  if (!keyResponse.ok) {
    throw new Error(
      `IndexNow key file is not accessible: ${keyLocation} ` +
      `(HTTP ${keyResponse.status}).`
    );
  }

  const keyContent = (await keyResponse.text()).trim();

  if (keyContent !== key) {
    throw new Error("IndexNow key file content does not match the key.");
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
      urlList: uniqueUrls
    })
  });

  const responseText = await response.text();

  if (![200, 202].includes(response.status)) {
    throw new Error(
      `IndexNow submission failed: HTTP ${response.status} ${responseText}`
    );
  }

  console.log(`IndexNow accepted submission for ${uniqueUrls.length} URLs.`);
  console.log(`Response: HTTP ${response.status}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
