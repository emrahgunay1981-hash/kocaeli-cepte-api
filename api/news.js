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

  const then =
    new Date(pubDate).getTime();

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
// GÖRSEL BUL
// ==========================================

function extractImage(block) {

  let image = null;


  // 1 — media:content

  let match =
    block.match(
      /<media:content[^>]+url=["']([^"']+)["']/i
    );

  if (match) {
    image = match[1];
  }


  // 2 — media:thumbnail

  if (!image) {

    match =
      block.match(
        /<media:thumbnail[^>]+url=["']([^"']+)["']/i
      );

    if (match) {
      image = match[1];
    }

  }


  // 3 — enclosure

  if (!image) {

    match =
      block.match(
        /<enclosure[^>]+url=["']([^"']+)["']/i
      );

    if (match) {
      image = match[1];
    }

  }


  // 4 — description içindeki img

  if (!image) {

    const description =
      extract(
        /<description>([\s\S]*?)<\/description>/i,
        block
      );

    if (description) {

      match =
        description.match(
          /<img[^>]+src=["']([^"']+)["']/i
        );

      if (match) {
        image = match[1];
      }

    }

  }


  // 5 — description içinde data-src

  if (!image) {

    const description =
      extract(
        /<description>([\s\S]*?)<\/description>/i,
        block
      );

    if (description) {

      match =
        description.match(
          /data-src=["']([^"']+)["']/i
        );

      if (match) {
        image = match[1];
      }

    }

  }


  return image || null;

}


// ==========================================
// HABERLERİ AL
// ==========================================

async function getNews() {

  try {

    const response =
      await fetch(
        RSS_URL,
        {
          headers: {

            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",

            "Accept":
              "application/rss+xml, application/xml, text/xml"

          },

          cache: "no-store"

        }
      );


    if (!response.ok) {

      throw new Error(
        `Google News HTTP ${response.status}`
      );

    }


    const xml =
      await response.text();


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


      // ====================================
      // GÖRSEL
      // ====================================

      const image =
        extractImage(block);


      // ====================================
      // BAŞLIK / KAYNAK
      // ====================================

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
        item.source ||
        "Bilinmiyor";


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
