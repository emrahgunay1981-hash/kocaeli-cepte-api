export default async function handler(req, res) {
  const rssUrl = "https://www.aspor.com.tr/rss/kocaelispor.xml";

  try {
    const response = await fetch(rssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, */*"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`RSS bağlantı hatası: ${response.status}`);
    }

    const xml = await response.text();

    if (!xml || !xml.includes("<item")) {
      throw new Error("RSS içeriği bulunamadı.");
    }

    const items = [];

    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

    for (const item of itemMatches.slice(0, 20)) {
      const getTag = (tag) => {
        const regex = new RegExp(
          `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
          "i"
        );

        const match = item.match(regex);

        if (!match) return "";

        return match[1]
          .replace(/<!\[CDATA\[/gi, "")
          .replace(/\]\]>/gi, "")
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .trim();
      };

      const title = getTag("title");
      const link = getTag("link");
      const description = getTag("description");
      const pubDate = getTag("pubDate");

      if (!title || !link) continue;

      items.push({
        title,
        description,
        url: link,
        date: pubDate
      });
    }

    return res.status(200).json({
      success: true,
      source: "A Spor",
      items,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Kocaelispor RSS hatası:", error);

    return res.status(500).json({
      success: false,
      items: [],
      error: "Kocaelispor haberleri alınamadı.",
      details: error.message,
      updatedAt: new Date().toISOString()
    });
  }
}
