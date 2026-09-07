// /api/scores — global high scores backed by Netlify Database (Postgres).
//
//   GET  /api/scores            -> { games: { <gameId>: [ {name,value,hand,at}, ... top 10 ] }, ts }
//   POST /api/scores            <- { entries: [ {id,name,game,hand,value,pct,at}, ... ] }
//                               -> same leaderboard shape + { ok, accepted: [ids] }
//
// Writes are idempotent (client-generated ids + ON CONFLICT DO NOTHING) so the
// client can retry or re-send via sendBeacon without ever double counting.
import { getDatabase } from '@netlify/database';

export const GAME_IDS = ['coin', 'dart', 'coupon', 'weed', 'pancake', 'sushi', 'cat', 'balloon', 'bee', 'candy'];
const TOP_N = 10, MAX_ENTRIES = 50, MAX_NAME = 16, MAX_VALUE = 100000;

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

export function cleanName(v) {
  const s = String(v ?? '').replace(/[\x00-\x1f\x7f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  return s || 'Anonymous';
}
export function cleanEntry(e) {
  if (!e || typeof e !== 'object') return null;
  const id = String(e.id ?? '').slice(0, 40);
  const game = String(e.game ?? '');
  const hand = e.hand === 'L' ? 'L' : e.hand === 'R' ? 'R' : null;
  const value = Math.round(Number(e.value));
  const pct = Math.max(0, Math.min(1, Number(e.pct) || 0));
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(id) || !GAME_IDS.includes(game) || !hand || !Number.isFinite(value) || value < 0 || value > MAX_VALUE) return null;
  return { id, name: cleanName(e.name), game, hand, value, pct };
}

// The migration in netlify/database/migrations creates this table on deploy;
// this is a belt-and-braces fallback so a fresh database never 500s.
let ensured = null;
function ensureTable(db) {
  return ensured ??= db.sql`CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, game TEXT NOT NULL, hand CHAR(1) NOT NULL,
    value INTEGER NOT NULL, pct REAL NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
    .then(() => true).catch(err => { ensured = null; throw err; });
}

export async function leaderboard(db) {
  const rows = await db.sql`
    SELECT game, name, value, hand, created_at FROM (
      SELECT game, name, value, hand, created_at,
             ROW_NUMBER() OVER (PARTITION BY game ORDER BY value DESC, created_at ASC) AS rn
      FROM scores
    ) ranked WHERE rn <= ${TOP_N}
    ORDER BY game, rn`;
  const games = {};
  for (const id of GAME_IDS) games[id] = [];
  for (const r of rows) (games[r.game] ??= []).push({ name: r.name, value: Number(r.value), hand: r.hand, at: new Date(r.created_at).toISOString() });
  return { games, ts: Date.now() };
}

export function createHandler(getDb) {
  return async (req) => {
    try {
      const db = getDb();
      await ensureTable(db);
      if (req.method === 'GET') return json(await leaderboard(db));
      if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

      let body; try { body = JSON.parse(await req.text()); } catch { return json({ error: 'bad json' }, 400); }
      const raw = Array.isArray(body?.entries) ? body.entries.slice(0, MAX_ENTRIES) : [];
      const seen = new Set(), rows = [];
      for (const e of raw) { const c = cleanEntry(e); if (c && !seen.has(c.id)) { seen.add(c.id); rows.push(c); } }
      if (rows.length) {
        const values = db.sql.values(rows.map(r => [r.id, r.name, r.game, r.hand, r.value, r.pct]));
        await db.sql`INSERT INTO scores (id, name, game, hand, value, pct) VALUES ${values} ON CONFLICT (id) DO NOTHING`;
      }
      // Every submitted id is "accepted": stored, already stored, or invalid-and-discarded.
      const accepted = raw.map(e => (e && typeof e.id === 'string') ? e.id : null).filter(Boolean);
      return json({ ok: true, accepted, ...(await leaderboard(db)) });
    } catch (err) {
      console.error('scores error', err);
      return json({ error: 'database unavailable' }, 503);
    }
  };
}

export default createHandler(() => getDatabase());
export const config = { path: '/api/scores' };
