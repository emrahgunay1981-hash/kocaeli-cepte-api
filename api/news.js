// ==========================================
// KOCAELİ CEPTE
// GOOGLE NEWS RSS HABER SİSTEMİ
// ==========================================

function extract(regex, str) {
  const m = str.match(regex);
  return m ? m[1].trim() : null;
}


// ==========================================
// METİN TEMİZLEME
// ==========================================

function cleanText(str) {

  if (!str) return null;

  return str
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();

}


// ==========================================
// TARİH
// ==========================================

function timeAgo(pubDate) {

  const then = new Date(pubDate).getTime();

  if (isNaN(then)) return "";

  const diffMin =
    Math.floor(
      (Date.now() - then) / 60000
    );

  if (diffMin < 1) {
    return "az önce";
  }

  if (diffMin < 60) {
    return `${diffMin} dakika önce`;
  }

  const diffHour =
    Math.floor(diffMin / 60);

  if (diffHour < 24) {
    return `${diffHour} saat önce`;
  }

  const diffDay =
    Math.floor(diffHour / 24);

  return `${diffDay} gün önce`;

}


// ==========================================
// GOOGLE NEWS RSS
// ==========================================

const RSS_URL =
  "https://news.google.com/rss/search?q=Kocaeli&hl=tr&gl=TR&ceid=TR%3Atr";


// ==========================================
// HABERLERİ AL
// ==========================================

async function getNews() {

  try {

    const response = await fetch(RSS_URL, {

      headers: {

        "User-Agent":
          "Mozilla/5.0 KocaeliCepte/1.0",

        "Accept":
          "application/rss+xml, application/xml, text/xml"

      },

      cache: "no-store"

    });


    if (!response.ok) {

      throw new Error(
        `Google News HTTP ${response.status}`
      );

    }


    const xml =
      await response.text();


    // RSS item'larını bul

    const itemBlocks =
      xml.match(
        /<item[\s\S]*?<\/item>/gi
      ) || [];


    const items = [];


    for (
      const block of itemBlocks
    ) {

      const title =
        cleanText(
          extract(
            /<title>([\s\S]*?)<\/title>/i,
            block
          )
        );


      const link =
        cleanText(
          extract(
            /<link>([\s\S]*?)<\/link>/i,
            block
          )
        );


      const pubDate =
        cleanText(
          extract(
            /<pubDate>([\s\S]*?)<\/pubDate>/i,
            block
          )
        );


      const source =
        cleanText(
          extract(
            /<source[^>]*>([\s\S]*?)<\/source>/i,
            block
          )
        );


      const description =
        cleanText(
          extract(
            /<description>([\s\S]*?)<\/description>/i,
            block
          )
        );


      if (!title || !link) {
        continue;
      }


      // Google News başlıklarında bazen
      // "Haber başlığı - Kaynak"
      // şeklinde kaynak bulunur.

      let finalTitle =
        title;


      let finalSource =
        source || "Google News";


      if (
        !source &&
        title.includes(" - ")
      ) {

        const parts =
          title.split(" - ");

        if (parts.length >= 2) {

          finalSource =
            parts[parts.length - 1]
              .trim();

          finalTitle =
            parts
              .slice(0, -1)
              .join(" - ")
              .trim();

        }

      }


      // Description içerisindeki ilk resmi bul

      let image = null;

      const imageMatch =
        block.match(
          /<img[^>]+src=["']([^"']+)["']/i
        );


      if (imageMatch) {

        image =
          imageMatch[1];

      }


      items.push({

        title:
          finalTitle,

        link,

        category:
          "Kocaeli",

        image,

        time:
          pubDate
            ? timeAgo(pubDate)
            : "",

        pubDate,

        source:
          finalSource

      });

    }


    return items;


  } catch (error) {

    console.log(
      "Google News alınamadı:",
      error.message
    );

    return [];

  }

}


// ==========================================
// API
// ==========================================

export default async function handler(
  req,
  res
) {

  try {

    const items =
      await getNews();


    // ======================================
    // AYNI HABERLERİ TEMİZLE
    // ======================================

    const seen =
      new Set();


    const unique =
      items.filter(item => {

        const key =
          item.title
            .toLowerCase()
            .replace(
              /[^a-z0-9çğıöşü\s]/gi,
              ""
            )
            .replace(
              /\s+/g,
              " "
            )
            .trim();


        if (seen.has(key)) {

          return false;

        }


        seen.add(key);

        return true;

      });


    // ======================================
    // TARİHE GÖRE SIRALA
    // ======================================

    unique.sort((a, b) => {

      const dateA =
        new Date(
          a.pubDate || 0
        ).getTime();


      const dateB =
        new Date(
          b.pubDate || 0
        ).getTime();


      return dateB - dateA;

    });


    // ======================================
    // İLK 20 HABER
    // ======================================

    const balanced =
      unique.slice(0, 20);


    // ======================================
    // KAYNAK SAYILARI
    // ======================================

    const sourceCount = {};


    balanced.forEach(item => {

      const source =
        item.source || "Bilinmiyor";


      sourceCount[source] =
        (sourceCount[source] || 0) + 1;

    });


    // ======================================
    // CEVAP
    // ======================================

    res.status(200).json({

      ok: true,

      updated:
        new Date().toISOString(),

      count:
        balanced.length,

      sources:
        Object.keys(sourceCount),

      sourceCount,

      items:
        balanced

    });


  } catch (error) {

    console.log(
      "NEWS API ERROR:",
      error.message
    );


    res.status(500).json({

      ok: false,

      error:
        "Kocaeli haberleri alınamadı",

      items: []

    });

  }

}
