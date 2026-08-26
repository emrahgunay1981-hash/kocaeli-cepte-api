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

    const response = await fetch(
      `${API_URL}/fixtures?team=7411&next=10&timezone=Europe/Istanbul`,
      {
        headers: {
          "x-apisports-key": apiKey,
          "Accept": "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: "Maç bilgileri alınamadı",
        detail: data
      });
    }

    return res.status(200).json({
      ok: true,
      source: "API-Football",
      team: "Kocaelispor",
      teamId: 7411,
      matches: data.response || []
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
