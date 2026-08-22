// KOCAELİ CEPTE
// Çoklu Kocaeli haber kaynağı
// Öncü Haber kullanılmıyor.

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

  if (isNaN(then)) return "";

  const diffMin = Math.floor((Date.now() - then) / 60000);

  if (diffMin < 1) return "az önce";

  if (diffMin < 60) {
    return `${diffMin} dakika önce`;
  }

  const diffHour = Math.floor(diffMin / 60);

  if (diffHour < 24) {
    return `${diffHour} saat önce`;
  }

  const diffDay = Math.floor(diffHour / 24);

  return `${diffDay} gün önce`;
}


const SOURCES = [

  {
    name: "Kocaeli Gazetesi",
    url: "https://www.kocaeligazetesi.com.tr/rss/haber"
  },

  {
    name: "Özgür Kocaeli",
    url: "https://www.ozgurkocaeli.com.tr/rss/haber"
  },

  {
    name: "Ses Kocaeli",
    url: "https://www.seskocaeli.com/rss/haber"
  },

  {
    name: "En Kocaeli",
    url: "https://www.enkocaeli.com/rss/haber"
  },

  {
    name: "Kocaeli Gündem",
    url: "https://kocaeligundem.com/rss/haber"
  }

];


async function getSource(source) {

  try {

    const response = await fetch(source.url);

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();

    const itemBlocks =
      xml.match(/<item[\s\S]*?<\/item>/gi) || [];


    return itemBlocks.slice(0, 10).map(block => {

      const title = cleanText(
        extract(
          /<title>([\s\S]*?)<\/title>/i,
          block
        )
      );

      const link = cleanText(
        extract(
          /<link>([\s\S]*?)<\/link>/i,
          block
        )
      );

      const pubDate = cleanText(
        extract(
          /<pubDate>([\s\S]*?)<\/pubDate>/i,
          block
        )
      );

      const category = cleanText(
        extract(
          /<category[^>]*>([\s\S]*?)<\/category>/i,
          block
        )
      );

      let image = null;

      const enclosure =
        block.match(
          /<enclosure[^>]+url=["']([^"']+)["']/i
        );

      if (enclosure) {
        image = enclosure[1];
      }


      return {

        title,

        link,

        category,

        image,

        time: pubDate
          ? timeAgo(pubDate)
          : "",

        pubDate,

        source: source.name

      };

    }).filter(item =>

      item.title &&
      item.link

    );

  } catch (error) {

    return [];

  }

}


export default async function handler(req, res) {

  try {

    const results =
      await Promise.all(
        SOURCES.map(getSource)
      );


    let items =
      results.flat();


    // Aynı haber birden fazla sitede varsa
    // başlığına göre tekrarları temizle.

    const seen = new Set();

    items = items.filter(item => {

      const key =
        item.title
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


    // En yeni haberler üstte.

    items.sort((a, b) => {

      const dateA =
        new Date(a.pubDate || 0).getTime();

      const dateB =
        new Date(b.pubDate || 0).getTime();

      return dateB - dateA;

    });


    // İlk 20 haber.

    items = items.slice(0, 20);


    res.status(200).json({

      ok: true,

      updated:
        new Date().toISOString(),

      count:
        items.length,

      sources:
        SOURCES.map(s => s.name),

      items

    });


  } catch (error) {

    res.status(500).json({

      ok: false,

      error: "Kocaeli haberleri alınamadı"

    });

  }

}
