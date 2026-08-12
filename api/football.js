const API_BASE = 'https://v3.football.api-sports.io';
const ALLOWED_LEAGUES = new Set([71, 73, 13, 39, 140, 2]);

module.exports = async function handler(req, res) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return res.status(503).json({ ok: false, demo: true, error: 'API_FOOTBALL_KEY não configurada' });

  const type = String(req.query.type || 'fixtures');
  try {
    if (type === 'fixtures') {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : new Date().toISOString().slice(0, 10);
      const response = await fetch(`${API_BASE}/fixtures?date=${date}&timezone=America%2FSao_Paulo`, { headers: { 'x-apisports-key': key } });
      if (!response.ok) throw new Error(`API respondeu ${response.status}`);
      const payload = await response.json();
      const fixtures = (payload.response || []).filter(item => ALLOWED_LEAGUES.has(item.league?.id) || item.teams?.home?.name === 'Brazil' || item.teams?.away?.name === 'Brazil');
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
      return res.status(200).json({ ok: true, updatedAt: new Date().toISOString(), fixtures });
    }

    return res.status(400).json({ ok: false, error: 'Consulta não suportada' });
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'Não foi possível consultar os dados esportivos', detail: error.message });
  }
};
