// ==========================================
// KOCAELİ ETKİNLİKLERİ - ÇOKLU KAYNAK
// 1) Kocaeli Büyükşehir Belediyesi (resmi RSS)
// 2) Kocaeli Seyret (özel etkinlikler - konser, tiyatro vs.)
// ==========================================

function cleanText(text) {
  if (!text) return "";

  return text
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extract(regex, str) {
  const m = str.match(regex);
  return m ? m[1].trim() : null;
}


// ==========================================
// KAYNAK 1: BELEDİYE RESMİ RSS
// ==========================================

async function getBelediyeEtkinlikleri() {

  try {

    const response = await fetch(
      "https://kultursanat.kocaeli.bel.tr/etkinlik/feed/",
      {
        headers: {
          "User-Agent": "KocaeliCepte/1.0"
        }
      }
    );

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();

    const itemBlocks =
      xml.match(/<item[\s\S]*?<\/item>/gi) || [];

    const events = itemBlocks.map(block => {

      const title = cleanText(
        extract(/<title>([\s\S]*?)<\/title>/i, block)
      );

      const link = cleanText(
        extract(/<link>([\s\S]*?)<\/link>/i, block)
      );

      const pubDate = cleanText(
        extract(/<pubDate>([\s\S]*?)<\/pubDate>/i, block)
      );

      const description = cleanText(
        extract(
          /<description>([\s\S]*?)<\/description>/i,
          block
        ) ||
        extract(
          /<content:encoded>([\s\S]*?)<\/content:encoded>/i,
          block
        )
      );

      // Görsel (enclosure veya media:content)
      let image = null;

      const enclosure =
        block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);

      if (enclosure) {
        image = enclosure[1];
      }

      if (!image) {
        const mediaContent =
          block.match(
            /<media:content[^>]+url=["']([^"']+)["']/i
          );

        if (mediaContent) {
          image = mediaContent[1];
        }
      }

      return {
        title,
        link,
        date: pubDate
          ? new Date(pubDate).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric"
            })
          : "",
        location: "Kocaeli Büyükşehir Belediyesi",
        description: description
          ? description.slice(0, 200)
          : "",
        image,
        url: link,
        source: "Kocaeli Büyükşehir Belediyesi"
      };

    }).filter(event => event.title && event.link);

    return events;

  } catch (error) {

    console.log(
      "Belediye RSS alınamadı:",
      error.message
    );

    return [];

  }

}


// ==========================================
// KAYNAK 2: KOCAELİ SEYRET (özel etkinlikler)
// ==========================================

async function getSeyretEtkinlikleri() {

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
      return [];
    }

    const html = await response.text();

    const events = [];

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

      const linkMatch = block.match(
        /<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?(?:Bilet|Detay)[\s\S]*?<\/a>/i
      );

      let url = linkMatch ? linkMatch[1] : "";

      const blockText = cleanText(block);

      const dateMatch = blockText.match(
        /(\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+202\d[^0-9]*\d{1,2}:\d{2})/i
      );

      const date = dateMatch ? dateMatch[1] : "";

      let location = "";

      if (dateMatch) {
        const afterDate = blockText.substring(
          dateMatch.index + dateMatch[0].length
        );

        location = afterDate
          .replace(/Bilet Al\s*\/?\s*Detay.*/i, "")
          .trim();
      }

      const keywords = [
        "konser", "tiyatro", "festival", "stand up",
        "stand-up", "sergi", "söyleşi", "seminer",
        "atölye", "gösteri", "müzik", "etkinlik"
      ];

      const searchText =
        (title + " " + blockText).toLocaleLowerCase("tr-TR");

      const isEvent = keywords.some(keyword =>
        searchText.includes(keyword)
      );

      if (!isEvent && !url) {
        continue;
      }

      if (url && !url.startsWith("http")) {
        url =
          "https://www.kocaeliseyret.com" +
          (url.startsWith("/") ? url : "/" + url);
      }

      events.push({
        title,
        date,
        location,
        description: "",
        image: null,
        url,
        link: url,
        source: "Kocaeli Seyret"
      });

    }

    return events;

  } catch (error) {

    console.log(
      "Kocaeli Seyret alınamadı:",
      error.message
    );

    return [];

  }

}


// ==========================================
// API
// ==========================================

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {

    const [belediyeEvents, seyretEvents] = await Promise.all([
      getBelediyeEtkinlikleri(),
      getSeyretEtkinlikleri()
    ]);

    let events = [...belediyeEvents, ...seyretEvents];

    // Aynı başlıklı etkinlikleri temizle
    const seen = new Set();

    events = events.filter(event => {

      const key = event.title
        .toLowerCase()
        .replace(/[^a-z0-9çğıöşü\s]/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;

    });

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
      sources: [
        "Kocaeli Büyükşehir Belediyesi",
        "Kocaeli Seyret"
      ],
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
  
