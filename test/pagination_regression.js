/**
 * Pagination completeness regression test (LIVE Graph integration).
 *
 * Reproduces the rcox@patriotconsultingtech.com / 30-day comparison where the cloud
 * Outlook connector returned 141 emails but the local MCP truncated at one page.
 *
 * This hits the REAL Microsoft Graph API using the cached (DPAPI-encrypted) token and
 * a non-interactive refresh, so it requires:
 *   - a valid token cache at ~/.office-mcp-tokens.json
 *   - OFFICE_CLIENT_ID / OFFICE_CLIENT_SECRET / OFFICE_TENANT_ID (loaded from .env below)
 *
 * It is intentionally NOT a jest test (lives in test/, not tests/) so `npm test`
 * (mock mode) does not pick it up. Run manually:
 *   node test/pagination_regression.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { handleEmailSearch } = require('../email/search');

// --- Test contract (anchored to the cloud connector's authoritative count) ---
const SENDER = 'rcox@patriotconsultingtech.com';
const START_DATE = '2026-05-09';        // 30-day window
const EXPECTED_FLOOR = 141;             // authoritative count from the cloud Outlook connector
const EARLIEST_MUST_BE_ON_OR_BEFORE = new Date('2026-05-12T23:59:59Z');
const LATEST_MUST_BE_ON_OR_AFTER = new Date('2026-06-05T00:00:00Z');

function fail(msg) {
  console.error(`\n❌ FAIL: ${msg}`);
  process.exitCode = 1;
}

(async () => {
  console.error('=== Pagination regression: mail search exhaustion ===');
  console.error(`Sender:      ${SENDER}`);
  console.error(`Start date:  ${START_DATE} (exhaust-all default cap)`);
  console.error(`Floor:       >= ${EXPECTED_FLOOR} (cloud connector authoritative count)\n`);

  let result;
  try {
    result = await handleEmailSearch({
      from: SENDER,
      startDate: START_DATE,
      _format: false   // structured { count, emails } for assertions
    });
  } catch (err) {
    fail(`handleEmailSearch threw: ${err.message}`);
    return;
  }

  // Pre-fix code ignores _format and returns a formatted/error text block instead of
  // structured data — surface that clearly as a failure.
  if (!result || !Array.isArray(result.emails)) {
    const text = result?.content?.[0]?.text;
    fail('handler did not return structured { emails } (expected with _format:false).');
    if (text) console.error(`   Handler returned text instead:\n   ${text.split('\n').slice(0, 3).join('\n   ')}`);
    return;
  }

  const { count, emails, truncated } = result;
  const ids = emails.map(e => e.id);
  const dates = emails
    .map(e => new Date(e.receivedDateTime))
    .filter(d => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);
  const earliest = dates[0];
  const latest = dates[dates.length - 1];

  console.error('--- Results ---');
  console.error(`Total returned: ${count}`);
  console.error(`Earliest:       ${earliest ? earliest.toISOString() : 'n/a'}`);
  console.error(`Latest:         ${latest ? latest.toISOString() : 'n/a'}`);
  console.error(`Truncated:      ${truncated ? 'yes (hit cap)' : 'no (fully exhausted)'}\n`);

  // 1) Count floor
  if (count >= EXPECTED_FLOOR) {
    console.error(`✅ count ${count} >= floor ${EXPECTED_FLOOR}`);
  } else {
    fail(`count ${count} < expected floor ${EXPECTED_FLOOR} (pagination still truncating)`);
  }

  // 2) No duplicate message IDs
  const uniqueCount = new Set(ids).size;
  if (uniqueCount === ids.length) {
    console.error(`✅ no duplicate message IDs (${uniqueCount} unique)`);
  } else {
    fail(`found ${ids.length - uniqueCount} duplicate message ID(s) across pages`);
  }

  // 3) Results span the full date range
  if (!earliest || !latest) {
    fail('no parseable receivedDateTime values to verify date span');
  } else {
    if (earliest <= EARLIEST_MUST_BE_ON_OR_BEFORE) {
      console.error(`✅ earliest ${earliest.toISOString()} is on/before ${EARLIEST_MUST_BE_ON_OR_BEFORE.toISOString()}`);
    } else {
      fail(`earliest ${earliest.toISOString()} is AFTER ${EARLIEST_MUST_BE_ON_OR_BEFORE.toISOString()} (early window missing)`);
    }
    if (latest >= LATEST_MUST_BE_ON_OR_AFTER) {
      console.error(`✅ latest ${latest.toISOString()} is on/after ${LATEST_MUST_BE_ON_OR_AFTER.toISOString()}`);
    } else {
      fail(`latest ${latest.toISOString()} is BEFORE ${LATEST_MUST_BE_ON_OR_AFTER.toISOString()} (recent window missing)`);
    }
  }

  console.error('\n=== Summary ===');
  console.error(`actual count: ${count}   expected floor: ${EXPECTED_FLOOR}   => ${count >= EXPECTED_FLOOR ? 'PASS' : 'FAIL'}`);
  console.error(process.exitCode === 1 ? '\n❌ REGRESSION TEST FAILED' : '\n✅ REGRESSION TEST PASSED');
})().catch(err => {
  fail(`unexpected error: ${err.stack || err.message}`);
});
