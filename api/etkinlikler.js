export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://www.kocaeli.bel.tr/etkinlikler/"
    );

    if (!response.ok) {
      throw new Error("Kocaeli etkinlik sayfasına ulaşılamadı.");
    }

    const html = await response.text();

    const events = [];

    // Etkinlik sayfasındaki bağlantıları yakala
    const linkRegex =
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      const rawTitle = match[2];

      const title = rawTitle
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();

      // Etkinlik bağlantısı olabilecek içerikleri al
      if (
        title.length > 3 &&
        (
          url.includes("etkinlik") ||
          title.toLowerCase().includes("konser") ||
          title.toLowerCase().includes("tiyatro") ||
          title.toLowerCase().includes("sergi") ||
          title.toLowerCase().includes("festival") ||
          title.toLowerCase().includes("etkinlik") ||
          title.toLowerCase().includes("söyleşi") ||
          title.toLowerCase().includes("seminer") ||
          title.toLowerCase().includes("atölye")
        )
      ) {
        const fullUrl = url.startsWith("http")
          ? url
          : "https://www.kocaeli.bel.tr" +
            (url.startsWith("/") ? url : "/" + url);

        events.push({
          title,
          url: fullUrl,
          source: "Kocaeli Büyükşehir Belediyesi"
        });
      }
    }

    // Aynı etkinlikleri temizle
    const uniqueEvents = Array.from(
      new Map(
        events.map(event => [event.url, event])
      ).values()
    );

    return res.status(200).json({
      success: true,
      count: uniqueEvents.length,
      events: uniqueEvents,
      source: "Kocaeli Büyükşehir Belediyesi",
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      count: 0,
      events: [],
      error: "Etkinlikler şu anda alınamadı."
    });
  }
}
