const API_URL = "https://www.sofascore.com/api/v1";

export default async function handler(req, res) {
  try {
    // Önce Süper Lig sezonlarını al
    const seasonsResponse = await fetch(
      `${API_URL}/unique-tournament/52/seasons`
    );

    if (!seasonsResponse.ok) {
      throw new Error(
        `SofaScore seasons HTTP ${seasonsResponse.status}`
      );
    }

    const seasonsData = await seasonsResponse.json();

    const seasons = seasonsData.seasons || [];

    // 2026/27 sezonunu bul
    const season = seasons.find(
      s =>
        s.year === "26/27" ||
        s.name?.includes("26/27")
    );

    if (!season) {
      return res.status(404).json({
        ok: false,
        error: "2026/27 Süper Lig sezonu bulunamadı.",
        seasons
      });
    }

    // Şimdi gerçek puan durumunu çek
    const standingsResponse = await fetch(
      `${API_URL}/unique-tournament/52/season/${season.id}/standings/total`
    );

    if (!standingsResponse.ok) {
      throw new Error(
        `SofaScore standings HTTP ${standingsResponse.status}`
      );
    }

    const standingsData = await standingsResponse.json();

    return res.status(200).json({
      ok: true,
      tournament: "Trendyol Süper Lig",
      season: {
        id: season.id,
        name: season.name,
        year: season.year
      },
      standings: standingsData
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
