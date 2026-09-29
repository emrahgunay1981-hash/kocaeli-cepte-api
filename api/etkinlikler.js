// ==========================================
// KOCAELİ CEPTE - ETKİNLİKLER API
//
// KAYNAKLAR
// 1) Kocaeli Büyükşehir Belediyesi
// 2) Kocaeli Seyret
// 3) Kocaeli Voleybol İl Temsilciliği
//
// ÖNEMLİ:
// Yeni serverless function oluşturmaz.
// Mevcut /api/etkinlikler fonksiyonu kullanılır.
// ==========================================


// ==========================================
// GENEL YARDIMCI FONKSİYONLAR
// ==========================================

function cleanText(text) {

  if (!text) return "";

  return String(text)
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
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/\s+/g, " ")
    .trim();
}


function extract(regex, str) {

  const m = str.match(regex);

  return m ? m[1].trim() : null;

}


async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {

  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {

    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timer);

    return response;

  } catch (error) {

    clearTimeout(timer);

    throw error;

  }

}


// ==========================================
// CACHE
// ==========================================

let cachedResult = null;

let cachedAt = 0;

const CACHE_TTL_MS = 15 * 60 * 1000;


// ==========================================
// KAYNAK 1
// KOCAELİ BÜYÜKŞEHİR BELEDİYESİ
// ==========================================

async function getBelediyeEtkinlikleri() {

  try {

    const response = await fetchWithTimeout(
      "https://kultursanat.kocaeli.bel.tr/etkinlik/feed/",
      {
        headers: {
          "User-Agent": "KocaeliCepte/1.0"
        }
      },
      6000
    );


    if (!response.ok) {

      console.log(
        "Belediye RSS HTTP:",
        response.status
      );

      return [];

    }


    const xml = await response.text();


    const itemBlocks =
      xml.match(/<item[\s\S]*?<\/item>/gi) || [];


    const events = itemBlocks.map(block => {

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


      const description = cleanText(

        extract(
          /<description>([\s\S]*?)<\/description>/i,
          block
        )

        ||

        extract(
          /<content:encoded>([\s\S]*?)<\/content:encoded>/i,
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
          ? new Date(pubDate).toLocaleDateString(
              "tr-TR",
              {
                day: "numeric",
                month: "long",
                year: "numeric"
              }
            )
          : "",

        location:
          "Kocaeli Büyükşehir Belediyesi",

        description:
          description
            ? description.slice(0, 200)
            : "",

        image,

        url: link,

        source:
          "Kocaeli Büyükşehir Belediyesi",

        category:
          "genel"

      };

    }).filter(event => {

      return event.title && event.link;

    });


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
// KAYNAK 2
// KOCAELİ SEYRET
// ==========================================

async function getSeyretEtkinlikleri() {

  try {

    const response = await fetchWithTimeout(

      "https://www.kocaeliseyret.com/kocaeli-etkinlikler",

      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      },

      6000

    );


    if (!response.ok) {

      console.log(
        "Kocaeli Seyret HTTP:",
        response.status
      );

      return [];

    }


    const html = await response.text();


    const events = [];


    const eventRegex =
      /<h2[^>]*>\s*([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2[^>]*>|<h3[^>]*>|<\/main>|<\/body>)/gi;


    let match;


    while (
      (match = eventRegex.exec(html)) !== null
    ) {

      const rawTitle = match[1];

      const block = match[2];


      const title =
        cleanText(rawTitle);


      if (
        !title ||
        title.length < 2
      ) {

        continue;

      }


      const linkMatch =
        block.match(

          /<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?(?:Bilet|Detay)[\s\S]*?<\/a>/i

        );


      let url =
        linkMatch
          ? linkMatch[1]
          : "";


      const blockText =
        cleanText(block);


      const dateMatch =
        blockText.match(

          /(\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+202\d[^0-9]*\d{1,2}:\d{2})/i

        );


      const date =
        dateMatch
          ? dateMatch[1]
          : "";


      let location = "";


      if (dateMatch) {

        const afterDate =
          blockText.substring(

            dateMatch.index +
            dateMatch[0].length

          );


        location =
          afterDate

            .replace(
              /Bilet Al\s*\/?\s*Detay.*/i,
              ""
            )

            .trim();

      }


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
        (
          title +
          " " +
          blockText
        ).toLocaleLowerCase("tr-TR");


      const isEvent =
        keywords.some(keyword =>
          searchText.includes(keyword)
        );


      if (
        !isEvent &&
        !url
      ) {

        continue;

      }


      if (
        url &&
        !url.startsWith("http")
      ) {

        url =
          "https://www.kocaeliseyret.com" +
          (
            url.startsWith("/")
              ? url
              : "/" + url
          );

      }


      events.push({

        title,

        date,

        location,

        description: "",

        image: null,

        url,

        link: url,

        source:
          "Kocaeli Seyret",

        category:
          "genel"

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
// KAYNAK 3
// KOCAELİ VOLEYBOL İL TEMSİLCİLİĞİ
//
// Resmi kaynak:
// https://kocaeli.voleyboliltemsilciligi.com/
//
// Sayfada:
// Tarih
// Salon
// Saat
// Ev sahibi
// Misafir
// bilgileri bulunuyor.
// ==========================================

async function getVoleybolEtkinlikleri() {

  try {

    const response = await fetchWithTimeout(

      "https://kocaeli.voleyboliltemsilciligi.com/",

      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept":
            "text/html,application/xhtml+xml"
        }
      },

      7000

    );


    if (!response.ok) {

      console.log(
        "Voleybol HTTP:",
        response.status
      );

      return [];

    }


    const html =
      await response.text();


    const events = [];


    // --------------------------------------
    // HTML satırlarını al
    // --------------------------------------

    const rows =
      html.match(
        /<tr[\s\S]*?<\/tr>/gi
      ) || [];


    let currentDate = "";

    let currentVenue = "";


    for (
      const row of rows
    ) {


      const cells =
        row.match(
          /<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi
        ) || [];


      if (
        cells.length < 3
      ) {

        continue;

      }


      const values =
        cells.map(cell =>
          cleanText(cell)
        );


      const rowText =
        values.join(" | ");


      // ------------------------------------
      // Tarih yakala
      // ------------------------------------

      const dateMatch =
        rowText.match(

          /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/

        );


      if (dateMatch) {

        const day =
          dateMatch[1].padStart(2, "0");

        const month =
          dateMatch[2].padStart(2, "0");

        const year =
          dateMatch[3];


        currentDate =
          `${day}.${month}.${year}`;

      }


      // ------------------------------------
      // Salon isimlerini yakala
      // ------------------------------------

      const venueKeywords = [

        "SPOR SALONU",
        "SALONU",
        "SPOR KOMPLEKSİ",
        "SPOR KOMPLEKSI"

      ];


      const venueIndex =
        values.findIndex(value => {

          const upper =
            value.toLocaleUpperCase("tr-TR");

          return venueKeywords.some(keyword =>
            upper.includes(keyword)
          );

        });


      if (
        venueIndex !== -1
      ) {

        const possibleVenue =
          values[venueIndex].trim();


        if (
          possibleVenue.length >= 5
        ) {

          currentVenue =
            possibleVenue;

        }

      }


      // ------------------------------------
      // Saat yakala
      // ------------------------------------

      const timeIndex =
        values.findIndex(value =>
          /^\d{1,2}:\d{2}$/.test(
            value.trim()
          )
        );


      if (
        timeIndex === -1
      ) {

        continue;

      }


      const time =
        values[timeIndex].trim();


      // ------------------------------------
      // Takımları belirle
      //
      // Sayfadaki yapıda saatten sonra
      // gelen takım alanları kullanılır.
      // ------------------------------------

      const possibleTeams =
        values
          .filter(value => {

            if (!value) {
              return false;
            }


            if (
              /^\d{1,2}:\d{2}$/.test(value)
            ) {

              return false;

            }


            if (
              /^\d{1,2}[./-]\d{1,2}[./-]20\d{2}$/
                .test(value)
            ) {

              return false;

            }


            const upper =
              value.toLocaleUpperCase("tr-TR");


            if (
              upper.includes("EV SAHİBİ") ||
              upper.includes("MİSAFİR") ||
              upper === "A" ||
              upper === "B" ||
              upper === "-"
            ) {

              return false;

            }


            if (
              upper === "IMAGE"
            ) {

              return false;

            }


            return true;

          });


      // ------------------------------------
      // Salon başlıklarının takım gibi
      // algılanmasını engelle
      // ------------------------------------

      const filteredTeams =
        possibleTeams.filter(team => {

          const upper =
            team.toLocaleUpperCase("tr-TR");


          if (
            upper.includes("SPOR SALONU") ||
            upper.includes("SALONU")
          ) {

            return false;

          }


          return true;

        });


      if (
        filteredTeams.length < 2
      ) {

        continue;

      }


      // ------------------------------------
      // İlk iki gerçek takım
      // ------------------------------------

      const homeTeam =
        filteredTeams[0];


      const awayTeam =
        filteredTeams[1];


      if (
        !homeTeam ||
        !awayTeam
      ) {

        continue;

      }


      // ------------------------------------
      // Sahte satırları engelle
      // ------------------------------------

      if (
        homeTeam.length < 2 ||
        awayTeam.length < 2
      ) {

        continue;

      }


      if (
        homeTeam.toLowerCase() ===
        awayTeam.toLowerCase()
      ) {

        continue;

      }


      // ------------------------------------
      // Etkinliği oluştur
      // ------------------------------------

      const title =
        `${homeTeam} × ${awayTeam}`;


      events.push({

        title,

        date:
          currentDate,

        time,

        location:
          currentVenue ||
          "Kocaeli",

        description:
          "Kocaeli voleybol karşılaşması",

        image:
          null,

        url:
          "https://kocaeli.voleyboliltemsilciligi.com/",

        link:
          "https://kocaeli.voleyboliltemsilciligi.com/",

        source:
          "Kocaeli Voleybol İl Temsilciliği",

        category:
          "spor",

        sport:
          "Voleybol"

      });

    }


    // --------------------------------------
    // Aynı maçların tekrarlarını temizle
    // --------------------------------------

    const unique =
      new Map();


    for (
      const event of events
    ) {

      const key = [

        event.date,

        event.time,

        event.location,

        event.title

      ]

        .join("|")

        .toLocaleLowerCase("tr-TR");


      if (
        !unique.has(key)
      ) {

        unique.set(
          key,
          event
        );

      }

    }


    return Array.from(
      unique.values()
    );


  } catch (error) {

    console.log(
      "Voleybol verisi alınamadı:",
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


  // ----------------------------------------
  // CORS
  // ----------------------------------------

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );


  // ----------------------------------------
  // OPTIONS
  // ----------------------------------------

  if (
    req.method === "OPTIONS"
  ) {

    return res
      .status(200)
      .end();

  }


  // ----------------------------------------
  // Sadece GET
  // ----------------------------------------

  if (
    req.method !== "GET"
  ) {

    return res
      .status(405)
      .json({

        success: false,

        error:
          "Sadece GET isteği destekleniyor."

      });

  }


  // ----------------------------------------
  // CACHE
  // ----------------------------------------

  if (
    cachedResult &&
    (Date.now() - cachedAt) <
      CACHE_TTL_MS
  ) {

    return res
      .status(200)
      .json(cachedResult);

  }


  try {


    // --------------------------------------
    // Üç kaynağı paralel çalıştır
    // --------------------------------------

    const [

      belediyeResult,

      seyretResult,

      voleybolResult

    ] = await Promise.allSettled([

      getBelediyeEtkinlikleri(),

      getSeyretEtkinlikleri(),

      getVoleybolEtkinlikleri()

    ]);


    const belediyeEvents =
      belediyeResult.status ===
      "fulfilled"

        ? belediyeResult.value

        : [];


    const seyretEvents =
      seyretResult.status ===
      "fulfilled"

        ? seyretResult.value

        : [];


    const voleybolEvents =
      voleybolResult.status ===
      "fulfilled"

        ? voleybolResult.value

        : [];


    // --------------------------------------
    // Hepsini birleştir
    // --------------------------------------

    let events = [

      ...belediyeEvents,

      ...seyretEvents,

      ...voleybolEvents

    ];


    // --------------------------------------
    // GENEL TEKRAR TEMİZLEME
    // --------------------------------------

    const seen =
      new Set();


    events =
      events.filter(event => {


        const title =
          (event.title || "")
            .toLocaleLowerCase("tr-TR")
            .replace(
              /[^a-z0-9çğıöşü\s×]/gi,
              ""
            )
            .replace(
              /\s+/g,
              " "
            )
            .trim();


        const key = [

          title,

          event.date || "",

          event.time || "",

          event.location || ""

        ]

          .join("|");


        if (
          seen.has(key)
        ) {

          return false;

        }


        seen.add(key);


        return true;

      });


    // --------------------------------------
    // TARİH SIRALAMA
    // --------------------------------------

    events.sort(
      (a, b) => {

        const da =
          parseEventDate(a);

        const db =
          parseEventDate(b);


        return da - db;

      }
    );


    // --------------------------------------
    // KAYNAKLAR
    // --------------------------------------

    const sources = [

      "Kocaeli Büyükşehir Belediyesi",

      "Kocaeli Seyret",

      "Kocaeli Voleybol İl Temsilciliği"

    ];


    // --------------------------------------
    // PAYLOAD
    // --------------------------------------

    const payload = {

      success: true,

      count:
        events.length,

      events,

      sources,

      updatedAt:
        new Date().toISOString()

    };


    // --------------------------------------
    // CACHE'E AL
    // --------------------------------------

    cachedResult =
      payload;

    cachedAt =
      Date.now();


    // --------------------------------------
    // JSON DÖNDÜR
    // --------------------------------------

    return res
      .status(200)
      .json(payload);


  } catch (error) {


    console.error(
      "Etkinlik API hatası:",
      error
    );


    return res
      .status(500)
      .json({

        success: false,

        count: 0,

        events: [],

        error:
          "Etkinlikler şu anda alınamadı."

      });

  }

}


// ==========================================
// TARİH SIRALAMA YARDIMCISI
// ==========================================

function parseEventDate(event) {

  if (
    !event
  ) {

    return Number.MAX_SAFE_INTEGER;

  }


  let dateText =
    event.date || "";


  // ----------------------------------------
  // 30.09.2026
  // ----------------------------------------

  let match =
    dateText.match(
      /(\d{1,2})[./-](\d{1,2})[./-](20\d{2})/
    );


  if (
    match
  ) {

    return new Date(

      Number(match[3]),

      Number(match[2]) - 1,

      Number(match[1])

    ).getTime();

  }


  // ----------------------------------------
  // Türkçe uzun tarih
  // ----------------------------------------

  const months = {

    "ocak": 0,
    "şubat": 1,
    "mart": 2,
    "nisan": 3,
    "mayıs": 4,
    "haziran": 5,
    "temmuz": 6,
    "ağustos": 7,
    "eylül": 8,
    "ekim": 9,
    "kasım": 10,
    "aralık": 11

  };


  match =
    dateText.match(

      /(\d{1,2})\s+([A-Za-zÇçĞğİıÖöŞşÜü]+)\s+(20\d{2})/i

    );


  if (
    match &&
    months[
      match[2].toLocaleLowerCase("tr-TR")
    ] !== undefined
  ) {

    return new Date(

      Number(match[3]),

      months[
        match[2].toLocaleLowerCase("tr-TR")
      ],

      Number(match[1])

    ).getTime();

  }


  return Number.MAX_SAFE_INTEGER;

}
