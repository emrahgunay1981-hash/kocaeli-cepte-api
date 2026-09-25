// ==========================================
// KOCAELİ CEPTE
// GOOGLE NEWS + GERÇEK HABER GÖRSELLERİ
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
// GÖRSEL URL'SİNİ TEMİZLE
// ==========================================

function normalizeImage(url) {

  if (!url) return null;

  url = url.trim();

  if (
    url.startsWith("//")
  ) {
    return "https:" + url;
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  return null;

}


// ==========================================
// META TAG'DEN GÖRSEL BUL
// ==========================================

function findMetaImage(html, type) {

  let match;


  // property="og:image" content="..."

  match = html.match(
    new RegExp(
      `<meta[^>]+property=["']${type}["'][^>]+content=["']([^"']+)["']`,
      "i"
    )
  );

  if (match) {
    return normalizeImage(match[1]);
  }


  // content="..." property="og:image"

  match = html.match(
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${type}["']`,
      "i"
    )
  );

  if (match) {
    return normalizeImage(match[1]);
  }


  return null;

}


// ==========================================
// GERÇEK HABER SAYFASINDAN GÖRSEL AL
// ==========================================

async function getArticleImage(url) {

  if (!url) return null;


  try {

    const controller =
      new AbortController();


    const timeout =
      setTimeout(
        () => controller.abort(),
        2500
      );


    const response =
      await fetch(
        url,
        {
          redirect: "follow",

          headers: {

            "User-Agent":
              "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",

            "Accept":
              "text/html,application/xhtml+xml"

          },

          signal:
            controller.signal,

          cache:
            "no-store"

        }
      );


    clearTimeout(timeout);


    if (!response.ok) {
      return null;
    }


    const html =
      await response.text();


    // 1 — Open Graph

    let image =
      findMetaImage(
        html,
        "og:image"
      );


    if (image) {
      return image;
    }


    // 2 — Twitter

    image =
      findMetaImage(
        html,
        "twitter:image"
      );


    if (image) {
      return image;
    }


    // 3 — itemprop=image

    let match =
      html.match(
        /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i
      );


    if (match) {
      image =
        normalizeImage(
          match[1]
        );

      if (image) {
        return image;
      }
    }


    // content önce gelirse

    match =
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']image["']/i
      );


    if (match) {

      image =
        normalizeImage(
          match[1]
        );

      if (image) {
        return image;
      }

    }


    // 4 — JSON-LD image

    match =
      html.match(
        /"image"\s*:\s*"([^"]+)"/i
      );


    if (match) {

      image =
        normalizeImage(
          match[1]
        );

      if (image) {
        return image;
      }

    }


    return null;


  } catch (error) {

    return null;

  }

}


// ==========================================
// RSS İÇİNDEN GÖRSEL BUL
// ==========================================

function getRSSImage(block) {

  let match;


  // media:content

  match =
    block.match(
      /<media:content[^>]+url=["']([^"']+)["']/i
    );

  if (match) {

    return normalizeImage(
      match[1]
    );

  }


  // media:thumbnail

  match =
    block.match(
      /<media:thumbnail[^>]+url=["']([^"']+)["']/i
    );

  if (match) {

    return normalizeImage(
      match[1]
    );

  }


  // enclosure

  match =
    block.match(
      /<enclosure[^>]+url=["']([^"']+)["']/i
    );

  if (match) {

    return normalizeImage(
      match[1]
    );

  }


  // description içindeki img

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

      return normalizeImage(
        match[1]
      );

    }

  }


  return null;

}


// ==========================================
// GOOGLE NEWS HABERLERİNİ AL
// ==========================================

async function getNews() {

  try {

    const response =
      await fetch(
        RSS_URL,
        {
          headers: {

            "User-Agent":
              "Mozilla/5.0 KocaeliCepte/1.0",

            "Accept":
              "application/rss+xml, application/xml, text/xml"

          },

          cache:
            "no-store"

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
      const block of itemBlocks.slice(0, 20)
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


      if (!title || !link) {
        continue;
      }


      let finalTitle =
        title;

      let finalSource =
        source || "Google News";


      // Başlıkta kaynak varsa ayır

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


      // Önce RSS görselini kontrol et

      let image =
        getRSSImage(block);


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


    // ======================================
    // GERÇEK SAYFALARDAN GÖRSEL AL
    // ======================================

    await Promise.all(

      items.map(
        async item => {

          // RSS'te zaten görsel varsa
          // tekrar siteye gitme

          if (item.image) {
            return;
          }


          const image =
            await getArticleImage(
              item.link
            );


          if (image) {

            item.image =
              image;

          }

        }
      )

    );


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
    // TEKRARLAYAN HABERLERİ TEMİZLE
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
    // 20 HABER
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

      imageCount:
        balanced.filter(
          item => !!item.image
        ).length,

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
