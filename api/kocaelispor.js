const API_URL = "https://v3.football.api-sports.io";

export default async function handler(req, res) {
  try {
    const apiKey =
      process.env.API_FUTBOL_ANAHTAR ||
      process.env.FUTBOL_API_KEY;

    const response = await fetch(
      `${API_URL}/fixtures?date=2026-08-29&timezone=Europe/Istanbul`,
      {
        headers: {
          "x-apisports-key": apiKey,
          "Accept": "application/json"
        }
      }
    );

    const data = await response.json();

    const matches = (data.response || []).filter(match => {
      return (
        match.teams?.home?.id === 7411 ||
        match.teams?.away?.id === 7411
      );
    });

    return res.status(200).json({
      ok: true,
      date: "2026-08-29",
      kocaelisporMatches: matches,
      totalMatchesThatDay: data.response?.length || 0
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
