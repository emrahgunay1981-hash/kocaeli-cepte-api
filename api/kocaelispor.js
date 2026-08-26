const API_URL = "https://v3.football.api-sports.io";

export default async function handler(req, res) {
  try {
    const apiKey =
      process.env.API_FUTBOL_ANAHTAR ||
      process.env.FUTBOL_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "API anahtarı bulunamadı"
      });
    }

    const headers = {
      "x-apisports-key": apiKey,
      "Accept": "application/json"
    };

    // Türkiye Süper Lig
    // 2026/2027 sezonu
    const leagueId = 203;
    const season = 2026;

    const response = await fetch(
      `${API_URL}/fixtures?league=${leagueId}&season=${season}&timezone=Europe/Istanbul`,
      { headers }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: "Lig maçları alınamadı",
        detail: data
      });
    }

    // Ligden gelen maçların içinden Kocaelispor'u bul
    const matches = (data.response || []).filter(match => {
      const homeId = match.teams?.home?.id;
      const awayId = match.teams?.away?.id;

      return homeId === 7411 || awayId === 7411;
    });

    return res.status(200).json({
      ok: true,
      source: "API-Football",
      team: "Kocaelispor",
      teamId: 7411,
      league: "Türkiye Süper Lig",
      season: season,
      totalLeagueMatches: data.response?.length || 0,
      matches: matches
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
