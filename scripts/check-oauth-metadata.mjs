// Validates the static AT Protocol OAuth client metadata served at
// https://kootana.social/oauth/client-metadata.json for the Kootana native app.
// A broken document breaks app sign-in for everyone, and nothing else in CI
// reads it, so fail the build on any drift from the native-client shape.
import { readFileSync } from 'node:fs';

const SITE = 'https://kootana.social';
const PATH = '/oauth/client-metadata.json';
const REDIRECT_SCHEME = 'social.kootana'; // reverse-DNS of the client_id host

const meta = JSON.parse(readFileSync(new URL(`../public${PATH}`, import.meta.url), 'utf-8'));
const errors = [];
const expect = (cond, msg) => cond || errors.push(msg);

expect(meta.client_id === `${SITE}${PATH}`, `client_id must be ${SITE}${PATH}`);
expect(meta.client_uri === SITE, `client_uri must be ${SITE}`);
expect(meta.application_type === 'native', 'application_type must be native');
expect(meta.token_endpoint_auth_method === 'none', 'public client: token_endpoint_auth_method must be none');
expect(meta.dpop_bound_access_tokens === true, 'dpop_bound_access_tokens must be true');
expect(meta.scope?.split(' ').includes('atproto'), 'scope must include atproto');
expect(Array.isArray(meta.redirect_uris) && meta.redirect_uris.length > 0, 'redirect_uris required');
for (const uri of meta.redirect_uris ?? []) {
  // RFC 8252 private-use scheme, single slash: @atproto/oauth-client rejects `scheme://`.
  expect(uri.startsWith(`${REDIRECT_SCHEME}:/`) && !uri.startsWith(`${REDIRECT_SCHEME}://`),
    `redirect_uri ${uri} must use ${REDIRECT_SCHEME}:/path (single slash)`);
}

if (errors.length) {
  console.error(`OAuth client metadata invalid:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('OAuth client metadata OK');
