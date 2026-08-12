const API_BASE = 'https://v3.football.api-sports.io';
const BRAZIL_LEAGUES = new Set([71, 72, 75, 76]);

module.exports = async function handler(req, res) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return res.status(503).json({ ok: false, demo: true, error: 'API não configurada' });

  const type = String(req.query.type || 'fixtures');
  const league = Number(req.query.league || 71);
  const season = Number(req.query.season || 2026);
  if (['teams', 'players'].includes(type) && !BRAZIL_LEAGUES.has(league)) {
    return res.status(400).json({ ok: false, error: 'Campeonato não permitido' });
  }

  let endpoint;
  let cache = 's-maxage=600, stale-while-revalidate=1200';
  if (type === 'teams') {
    endpoint = `/teams?league=${league}&season=${season}`;
    cache = 's-maxage=604800, stale-while-revalidate=86400';
  } else if (type === 'players') {
    const page = Math.max(1, Math.min(10, Number(req.query.page || 1)));
    endpoint = `/players?league=${league}&season=${season}&page=${page}`;
    cache = 's-maxage=86400, stale-while-revalidate=21600';
  } else {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : new Date().toISOString().slice(0, 10);
    endpoint = `/fixtures?date=${date}&timezone=America%2FSao_Paulo`;
  }

  try {
    const response = await fetch(API_BASE + endpoint, { headers: { 'x-apisports-key': key } });
    if (!response.ok) throw new Error(`API respondeu ${response.status}`);
    const payload = await response.json();
    res.setHeader('Cache-Control', cache);
    res.setHeader('X-API-Quota-Remaining', response.headers.get('x-ratelimit-requests-remaining') || 'unknown');
    return res.status(200).json({ ok: true, type, updatedAt: new Date().toISOString(), data: payload.response || [], paging: payload.paging || null });
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'Falha ao consultar dados esportivos', detail: error.message });
  }
};
