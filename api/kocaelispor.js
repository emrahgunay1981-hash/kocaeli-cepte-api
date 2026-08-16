const API_URL = "https://v3.football.api-sports.io/fixtures";

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

    const url =
      `${API_URL}?team=1957&next=10&timezone=Europe/Istanbul`;

    const response = await fetch(url, {
  6    headers: {
        "x-apisports-key": apiKey,
        "Accept": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: "API-Football hatası",
        detail: data
      });
    }

    return res.status(200).json({
      ok: true,
      source: "API-Football",
      team: "Kocaelispor",
      matches: data.response || []
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
