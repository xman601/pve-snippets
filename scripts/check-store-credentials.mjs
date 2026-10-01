#!/usr/bin/env node
// Read-only check that the store publishing secrets work -- signs in to the Chrome Web
// Store and Firefox Add-ons APIs and looks up this extension, without uploading or
// publishing anything. Run by .github/workflows/check-store-credentials.yml; reads the
// same environment variables publish.yml passes to the real upload tools.

import crypto from 'node:crypto';
import fs from 'node:fs';
import chromeWebstoreUpload from 'chrome-webstore-upload';

const manifest = JSON.parse(fs.readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
const GECKO_ID = manifest.browser_specific_settings.gecko.id;
const AMO_API = 'https://addons.mozilla.org/api/v5';

function missing(names) {
  return names.filter((n) => !process.env[n]);
}

// Map the store APIs' terse errors onto the setup step that usually causes them.
function chromeHint(message) {
  if (/invalid grant/i.test(message)) {
    return 'The refresh token was rejected. It expires after 7 days while the Google OAuth app is in "Testing" -- publish the app (Audience -> Publish app), then generate a new refresh token in the OAuth Playground.';
  }
  if (/invalid_client|unauthorized_client|client.*not found/i.test(message)) {
    return 'CHROME_CLIENT_ID / CHROME_CLIENT_SECRET are wrong, or the refresh token was generated with a different OAuth client.';
  }
  if (/not found|404/i.test(message)) {
    return 'CHROME_PUBLISHER_ID is wrong (it is the ID in the Developer Dashboard URL, not the extension ID).';
  }
  if (/permission|denied|403|disabled|has not been used/i.test(message)) {
    return 'Signed in, but not allowed: the Google account that authorized the refresh token must own the listing, and the "Chrome Web Store API" must be enabled in the Cloud project.';
  }
  return null;
}

async function checkChrome() {
  const absent = missing(['CHROME_CLIENT_ID', 'CHROME_CLIENT_SECRET', 'CHROME_REFRESH_TOKEN', 'CHROME_PUBLISHER_ID', 'CHROME_EXTENSION_ID']);
  if (absent.length) throw new Error('Missing secrets: ' + absent.join(', '));

  const client = chromeWebstoreUpload({
    extensionId: process.env.CHROME_EXTENSION_ID,
    publisherId: process.env.CHROME_PUBLISHER_ID,
    clientId: process.env.CHROME_CLIENT_ID,
    clientSecret: process.env.CHROME_CLIENT_SECRET,
    refreshToken: process.env.CHROME_REFRESH_TOKEN
  });
  try {
    const token = await client.fetchToken();
    console.log('  signed in (refresh token exchanged for an access token)');
    const status = await client.get(token);
    const published = status.publishedItemRevisionStatus;
    const version = published && published.distributionChannels && published.distributionChannels[0] && published.distributionChannels[0].crxVersion;
    console.log(`  found ${status.itemId || process.env.CHROME_EXTENSION_ID}` +
      (published ? ` -- published: ${published.state}${version ? ' v' + version : ''}` : ''));
  } catch (err) {
    const hint = chromeHint(err.message);
    throw new Error(err.message + (hint ? '\n  -> ' + hint : ''));
  }
}

// AMO API auth: a short-lived HS256 JWT signed with the API secret.
// https://mozilla.github.io/addons-server/topics/api/auth.html
function amoAuthHeader() {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = b64({ alg: 'HS256', typ: 'JWT' }) + '.' +
    b64({ iss: process.env.AMO_JWT_ISSUER, jti: crypto.randomUUID(), iat, exp: iat + 60 });
  const sig = crypto.createHmac('sha256', process.env.AMO_JWT_SECRET).update(unsigned).digest('base64url');
  return 'JWT ' + unsigned + '.' + sig;
}

async function amoGet(path) {
  const res = await fetch(AMO_API + path, { headers: { Authorization: amoAuthHeader() } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}: ${body.detail || JSON.stringify(body)}`);
  return body;
}

async function checkFirefox() {
  const absent = missing(['AMO_JWT_ISSUER', 'AMO_JWT_SECRET']);
  if (absent.length) throw new Error('Missing secrets: ' + absent.join(', '));

  let profile;
  try {
    profile = await amoGet('/accounts/profile/');
  } catch (err) {
    throw new Error(err.message + '\n  -> AMO_JWT_ISSUER / AMO_JWT_SECRET are wrong or were regenerated (the issuer looks like user:12345:67).');
  }
  console.log(`  signed in as ${profile.name || profile.username}`);

  const addon = await amoGet('/addons/addon/' + encodeURIComponent(GECKO_ID) + '/');
  const authorIds = (addon.authors || []).map((a) => a.id);
  if (!authorIds.includes(profile.id)) {
    throw new Error(`Signed in, but this account is not an author of ${GECKO_ID} -- create the API key while logged in as the add-on's owner.`);
  }
  console.log(`  found ${GECKO_ID} -- current version v${addon.current_version && addon.current_version.version}, you are an author`);
}

let failed = false;
for (const [store, check] of [['Chrome Web Store', checkChrome], ['Firefox Add-ons', checkFirefox]]) {
  console.log(store + ':');
  try {
    await check();
    console.log('  OK');
  } catch (err) {
    failed = true;
    console.log('  FAILED: ' + err.message);
  }
}
process.exit(failed ? 1 : 0);
