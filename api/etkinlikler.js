export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const response = await fetch(
      "https://www.kocaeliseyret.com/kocaeli-etkinlikler",
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    if (!response.ok) {
      throw new Error("Kocaeli Seyret sayfasına ulaşılamadı.");
    }

    const html = await response.text();

    const events = [];

    // HTML etiketlerini temizle
    function cleanText(text) {
      return text
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
    }

    // h2 ile başlayan etkinlik bloklarını yakala
    const eventRegex =
      /<h2[^>]*>\s*([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2[^>]*>|<h3[^>]*>|<\/main>|<\/body>)/gi;

    let match;

    while ((match = eventRegex.exec(html)) !== null) {
      const rawTitle = match[1];
      const block = match[2];

      const title = cleanText(rawTitle);

      if (!title || title.length < 2) {
        continue;
      }

      // Bilet / detay bağlantısını bul
      const linkMatch = block.match(
        /<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?(?:Bilet|Detay)[\s\S]*?<\/a>/i
      );

      let url = "";

      if (linkMatch) {
        url = linkMatch[1];
      }

      // Tarih ve saat
      const blockText = cleanText(block);

      const dateMatch = blockText.match(
        /(\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+202\d[^0-9]*\d{1,2}:\d{2})/i
      );

      const date = dateMatch ? dateMatch[1] : "";

      // Mekan bilgisi
      let location = "";

      if (dateMatch) {
        const afterDate = blockText.substring(
          dateMatch.index + dateMatch[0].length
        );

        location = afterDate
          .replace(/Bilet Al\s*\/?\s*Detay.*/i, "")
          .trim();
      }

      // Sadece gerçek etkinlikleri al
      const keywords = [
        "konser",
        "tiyatro",
        "festival",
        "stand up",
        "stand-up",
        "sergi",
        "söyleşi",
        "seminer",
        "atölye",
        "gösteri",
        "müzik",
        "etkinlik"
      ];

      const searchText =
        (title + " " + blockText).toLocaleLowerCase("tr-TR");

      const isEvent = keywords.some(keyword =>
        searchText.includes(keyword)
      );

      if (!isEvent && !url) {
        continue;
      }

      // Göreli URL'leri tamamla
      if (url && !url.startsWith("http")) {
        url =
          "https://www.kocaeliseyret.com" +
          (url.startsWith("/") ? url : "/" + url);
      }

      events.push({
        title,
        date,
        location,
        url,
        source: "Kocaeli Seyret"
      });
    }

    // Aynı etkinlikleri temizle
    const uniqueEvents = Array.from(
      new Map(
        events.map(event => [
          `${event.title}-${event.date}-${event.location}`,
          event
        ])
      ).values()
    );

    return res.status(200).json({
      success: true,
      count: uniqueEvents.length,
      events: uniqueEvents,
      source: "Kocaeli Seyret",
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Etkinlik API hatası:", error);

    return res.status(500).json({
      success: false,
      count: 0,
      events: [],
      error: "Etkinlikler şu anda alınamadı."
    });
  }
}
