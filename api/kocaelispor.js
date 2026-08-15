const SOFASCORE_URL =
  'https://www.sofascore.com/api/v1/team/3065/events/next/0';

export default async function handler(req, res) {
  try {
    const response = await fetch(SOFASCORE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Sofascore HTTP ${response.status}`);
    }

    const data = await response.json();

    const events = (data.events || [])
      .filter(event =>
        event.homeTeam?.id === 3065 ||
        event.awayTeam?.id === 3065
      )
      .map(event => ({
        id: event.id,
        date: new Date(event.startTimestamp * 1000).toISOString(),
        home: event.homeTeam?.name || '',
        away: event.awayTeam?.name || '',
        tournament: event.tournament?.name || '',
        status: event.status?.type || ''
      }));

    res.setHeader(
      'Cache-Control',
      's-maxage=300, stale-while-revalidate=1800'
    );

    return res.status(200).json({
      ok: true,
      source: 'Sofascore',
      team: 'Kocaelispor',
      teamId: 3065,
      matches: events,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      source: 'Sofascore',
      error: 'Maç verisi alınamadı',
      detail: String(error.message || error)
    });
  }
}
