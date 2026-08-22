// KOCAELİ CEPTE - Kocaeli odaklı çoklu haber sistemi
// Tek bir haber sitesine bağlı değildir.
// Farklı Kocaeli kaynaklarının RSS akışlarını birleştirir.

function extract(regex, str) {
  const m = str.match(regex);
  return m ? m[1].trim() : null;
}

function cleanText(str) {
  if (!str) return null;

  return str
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function timeAgo(pubDate) {
  const then = new Date(pubDate).getTime();
  const now = Date.now();

  if (!then) return "";

  const diffMin = Math.floor((now - then) / 60000);

  if (diffMin < 1) return "az önce";
  if (diffMin < 60) return `${diffMin} dakika önce`;

  const diffHour = Math.floor(diffMin / 60);

  if (diffHour < 24) {
    return `${diffHour} saat önce`;
  }

  const diffDay = Math.floor(diffHour / 24);

  return `${diffDay} gün önce`;
}


// Kocaeli odaklı RSS kaynakları
const FEEDS = [

  {
    name: "Özgür Kocaeli",
    url: "https://www.ozgurkocaeli.com.tr/rss/kategori/kocaeli-haberleri"
  },

  {
    name: "Kocaeli Gazetesi",
    url: "https://www.kocaeligazetesi.com.tr/rss/kategori/gundem"
  },

  {
    name: "Kocaeli Gündem",
    url: "https://kocaeligundem.com/rss/kategori/son-dakika-kocaeli-haberler"
  },

  {
    name: "Ses Kocaeli",
    url: "https://www.seskocaeli.com/rss/kategori/kocaeli-son-dakika-haberler"
  },

  {
    name: "Kocaeli Koz",
    url: "https://www.kocaelikoz.com/rss/kategori/kocaeli-haber"
  },

  {
    name: "En Kocaeli",
    url: "https://www.enkocaeli.com/rss/kategori/son-dakika-kocaeli-haberleri"
  }

];


// RSS içindeki haberleri ayrıştır
function parseItems(xml, sourceName) {

  const itemBlocks =
    xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  return itemBlocks.map(block => {

    const title = cleanText(
      extract(
        /<title[^>]*>([\s\S]*?)<\/title>/i,
        block
      )
    );

    const link = cleanText(
      extract(
        /<link[^>]*>([\s\S]*?)<\/link>/i,
        block
      )
    );

    const pubDate = cleanText(
      extract(
        /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i,
        block
      )
    );

    const category = cleanText(
      extract(
        /<category[^>]*>([\s\S]*?)<\/category>/i,
        block
      )
    );

    let image =
      extract(/<enclosure[^>]+url=["']([^"']+)["']/i, block) ||
      extract(/<media:content[^>]+url=["']([^"']+)["']/i, block) ||
      extract(/<media:thumbnail[^>]+url=["']([^"']+)["']/i, block) ||
      null;

    return {
      title,
      link,
      category,
      image,
      pubDate,
      source: sourceName,
      time: pubDate ? timeAgo(pubDate) : ""
    };

  }).filter(item => item.title && item.link);

}


// Ana API
export default async function handler(req, res) {

  try {

    // Bütün RSS kaynaklarını aynı anda çek
    const results = await Promise.allSettled(

      FEEDS.map(async feed => {

        const response = await fetch(feed.url, {
          headers: {
            "User-Agent": "Kocaeli-Cepte/1.0"
          }
        });

        if (!response.ok) {
          throw new Error(
            `${feed.name} RSS hatası: ${response.status}`
          );
        }

        const xml = await response.text();

        return parseItems(xml, feed.name);

      })

    );


    // Başarılı kaynaklardan haberleri topla
    let items = [];

    results.forEach(result => {

      if (result.status === "fulfilled") {
        items.push(...result.value);
      }

    });


    // Tarihe göre sırala
    items.sort((a, b) => {

      const dateA = new Date(a.pubDate || 0).getTime();
      const dateB = new Date(b.pubDate || 0).getTime();

      return dateB - dateA;

    });


    // Aynı haberi farklı kaynaklar verdiyse tek göster
    const seen = new Set();

    items = items.filter(item => {

      const key = item.title
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;

    });


    // En güncel 6 haber
    items = items.slice(0, 6);


    res.status(200).json({

      ok: true,

      source: "Kocaeli Cepte Çoklu Haber",

      updated: new Date().toISOString(),

      items

    });


  } catch (err) {

    console.error("Haber API hatası:", err);

    res.status(500).json({

      ok: false,

      error: "Haberler alınamadı"

    });

  }

}
