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

    // Kocaelispor'u bul
    const teamResponse = await fetch(
      `${API_URL}/teams?search=Kocaelispor`,
      { headers }
    );

    const teamData = await teamResponse.json();

    if (!teamResponse.ok) {
      return res.status(teamResponse.status).json({
        ok: false,
        error: "Takım bilgisi alınamadı",
        detail: teamData
      });
    }

    const team = (teamData.response || []).find(
      item =>
        item.team &&
        item.team.name &&
        item.team.name.toLowerCase().includes("kocaelispor")
    );

    if (!team) {
      return res.status(404).json({
        ok: false,
        error: "Kocaelispor API'de bulunamadı",
        detail: teamData
      });
    }

    const teamId = team.team.id;

    // Kocaelispor'un yaklaşan maçlarını getir
    const fixturesResponse = await fetch(
      `${API_URL}/fixtures?team=${teamId}&next=10&timezone=Europe/Istanbul`,
      { headers }
    );

    const fixturesData = await fixturesResponse.json();

    if (!fixturesResponse.ok) {
      return res.status(fixturesResponse.status).json({
        ok: false,
        error: "Maç bilgileri alınamadı",
        detail: fixturesData
      });
    }

    return res.status(200).json({
      ok: true,
      source: "API-Football",
      team: team.team.name,
      teamId: teamId,
      matches: fixturesData.response || []
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
