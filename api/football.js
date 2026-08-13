const API_BASE = 'https://v3.football.api-sports.io';
const LEAGUES = new Set([71, 72, 75, 76]);

module.exports = async function handler(req, res) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return res.status(503).json({ ok: false, error: 'API_FOOTBALL_KEY não configurada' });

  const type = String(req.query.type || 'fixtures');
  const league = Number(req.query.league || 71);
  const season = Number(req.query.season || 2026);
  const page = Math.max(1, Math.min(20, Number(req.query.page || 1)));
  if (!LEAGUES.has(league)) return res.status(400).json({ ok: false, error: 'Campeonato não permitido' });

  const routes = {
    fixtures: `/fixtures?league=${league}&season=${season}&timezone=America%2FSao_Paulo`,
    standings: `/standings?league=${league}&season=${season}`,
    scorers: `/players/topscorers?league=${league}&season=${season}`,
    teams: `/teams?league=${league}&season=${season}`,
    players: `/players?league=${league}&season=${season}&page=${page}`
  };
  if (!routes[type]) return res.status(400).json({ ok: false, error: 'Consulta não suportada' });

  const ttl = type === 'fixtures' ? 900 : type === 'standings' || type === 'scorers' ? 21600 : 86400;
  try {
    const response = await fetch(API_BASE + routes[type], { headers: { 'x-apisports-key': key } });
    const payload = await response.json();
    const apiErrors = payload.errors && (Array.isArray(payload.errors) ? payload.errors.length : Object.keys(payload.errors).length)
      ? payload.errors
      : null;
    if (!response.ok || apiErrors) {
      return res.status(422).json({
        ok: false,
        error: 'A API-Football recusou esta consulta',
        detail: apiErrors || `HTTP ${response.status}`,
        request: { type, league, season }
      });
    }
    res.setHeader('Cache-Control', `s-maxage=${ttl}, stale-while-revalidate=${ttl}`);
    res.setHeader('X-API-Quota-Remaining', response.headers.get('x-ratelimit-requests-remaining') || 'unknown');
    return res.status(200).json({ ok: true, type, league, season, updatedAt: new Date().toISOString(), data: payload.response || [], paging: payload.paging || null });
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'Não foi possível atualizar os dados', detail: error.message });
  }
};
