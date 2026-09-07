import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, cleanEntry, cleanName } from '../netlify/functions/scores.mjs';

// A tiny fake of @netlify/database's db.sql tagged template.
function fakeDb(rows = []) {
  const log = [];
  const sql = (strings, ...params) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    log.push({ text, params });
    return Promise.resolve(/^SELECT/i.test(text) ? rows : []);
  };
  sql.values = v => ({ values: v });
  return { sql, log };
}
const req = (method, body) => new Request('http://x/api/scores', { method, body: body === undefined ? undefined : JSON.stringify(body) });

test('cleanName strips junk and caps length', () => {
  assert.equal(cleanName('  <b>Zo ë</b>  '), 'bZo ë/b');
  assert.equal(cleanName(''), 'Anonymous');
  assert.equal(cleanName('a'.repeat(40)).length, 16);
});

test('cleanEntry validates fields', () => {
  assert.equal(cleanEntry({ id: 'abc123xyz', name: 'Zo', game: 'coin', hand: 'L', value: 7.2, pct: 2 })?.value, 7);
  assert.equal(cleanEntry({ id: 'abc123xyz', game: 'nope', hand: 'L', value: 1 }), null);
  assert.equal(cleanEntry({ id: 'bad id!', game: 'coin', hand: 'L', value: 1 }), null);
  assert.equal(cleanEntry({ id: 'abc123xyz', game: 'coin', hand: 'X', value: 1 }), null);
  assert.equal(cleanEntry({ id: 'abc123xyz', game: 'coin', hand: 'R', value: -1 }), null);
});

test('GET returns a full leaderboard shape', async () => {
  const db = fakeDb([{ game: 'coin', name: 'Zo', value: 9, hand: 'L', created_at: '2026-09-07T00:00:00Z' }]);
  const res = await createHandler(() => db)(req('GET'));
  assert.equal(res.status, 200);
  const b = await res.json();
  assert.equal(Object.keys(b.games).length, 10);
  assert.deepEqual(b.games.coin, [{ name: 'Zo', value: 9, hand: 'L', at: '2026-09-07T00:00:00.000Z' }]);
  assert.deepEqual(b.games.cat, []);
});

test('POST inserts valid entries once, accepts every submitted id, returns board', async () => {
  const db = fakeDb();
  const entries = [
    { id: 'aaaaaa1', name: 'Zo', game: 'coin', hand: 'L', value: 5, pct: 0.5 },
    { id: 'aaaaaa1', name: 'Zo', game: 'coin', hand: 'L', value: 5, pct: 0.5 },   // duplicate in batch
    { id: 'bbbbbb2', name: 'Zo', game: 'bogus', hand: 'L', value: 5 },           // invalid game
    { id: 'cccccc3', name: 'Zo', game: 'cat', hand: 'R', value: 12, pct: 0.4 },
  ];
  const res = await createHandler(() => db)(req('POST', { entries }));
  assert.equal(res.status, 200);
  const b = await res.json();
  assert.equal(b.ok, true);
  assert.deepEqual(b.accepted, ['aaaaaa1', 'aaaaaa1', 'bbbbbb2', 'cccccc3']);
  assert.ok(b.games && b.ts);
  const insert = db.log.find(q => /^INSERT/.test(q.text));
  assert.ok(insert.text.includes('ON CONFLICT (id) DO NOTHING'));
  assert.deepEqual(insert.params[0].values, [['aaaaaa1', 'Zo', 'coin', 'L', 5, 0.5], ['cccccc3', 'Zo', 'cat', 'R', 12, 0.4]]);
});

test('POST with bad JSON is a 400; db failure is a 503', async () => {
  const h = createHandler(() => fakeDb());
  const bad = await h(new Request('http://x/api/scores', { method: 'POST', body: '{nope' }));
  assert.equal(bad.status, 400);
  const broken = createHandler(() => { throw new Error('no db'); });
  assert.equal((await broken(req('GET'))).status, 503);
});
