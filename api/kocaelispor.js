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

    const headers = {
      "x-apisports-key": apiKey,
      "Accept": "application/json"
    };

    // Geçmiş maçlar
    const lastUrl =
      `${API_URL}?team=1957&last=10&timezone=Europe/Istanbul`;

    // Gelecek maçlar
    const nextUrl =
      `${API_URL}?team=1957&next=20&timezone=Europe/Istanbul`;

    const [lastResponse, nextResponse] = await Promise.all([
      fetch(lastUrl, { headers }),
      fetch(nextUrl, { headers })
    ]);

    const lastData = await lastResponse.json();
    const nextData = await nextResponse.json();

    if (!lastResponse.ok || !nextResponse.ok) {
      return res.status(500).json({
        ok: false,
        error: "API-Football bağlantı hatası",
        detail: {
          last: lastData,
          next: nextData
        }
      });
    }

    const matches = [
      ...(lastData.response || []),
      ...(nextData.response || [])
    ];

    // Tarihe göre sırala
    matches.sort((a, b) => {
      return new Date(a.fixture.date) - new Date(b.fixture.date);
    });

    return res.status(200).json({
      ok: true,
      source: "API-Football",
      team: "Kocaelispor",
      matches
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
