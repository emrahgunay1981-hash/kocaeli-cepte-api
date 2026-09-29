// ============================================================
// KOCAELİ ETKİNLİKLERİ API
// ------------------------------------------------------------
// Kaynaklar:
// 1) Kocaeli Büyükşehir Belediyesi
// 2) Kocaeli Seyret
// 3) Kocaeli Voleybol İl Temsilciliği
//
// Tek API:
// https://kocaeli-cepte-api.vercel.app/api/etkinlikler
//
// Kategori:
// - konser
// - tiyatro
// - çocuk
// - atölye
// - spor
//
// Vercel Hobby planında yeni Serverless Function oluşturmaz.
// ============================================================

const CACHE_TIME = 15 * 60 * 1000;

let cache = {
  timestamp: 0,
  data: null
};


// ============================================================
// HTML TEMİZLEME + ENTITY DECODE
// ============================================================

function decodeHtmlEntities(text) {

  if (!text) return "";

  let result = String(text);

  // Named entities
  const entities = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&uuml;": "ü",
    "&Uuml;": "Ü",
    "&ouml;": "ö",
    "&Ouml;": "Ö",
    "&ccedil;": "ç",
    "&Ccedil;": "Ç",
    "&scedil;": "ş",
    "&Scedil;": "Ş",
    "&gbreve;": "ğ",
    "&Gbreve;": "Ğ",
    "&inodot;": "ı",
    "&Idot;": "İ"
  };

  result = result.replace(
    /&[a-zA-Z0-9#]+;/g,
    entity => entities[entity] || entity
  );

  // Decimal numeric entities
  result = result.replace(
    /&#(\d+);/g,
    (match, code) => {
      try {
        return String.fromCodePoint(parseInt(code, 10));
      } catch {
        return match;
      }
    }
  );

  // Hex numeric entities
  result = result.replace(
    /&#x([0-9a-fA-F]+);/g,
    (match, code) => {
      try {
        return String.fromCodePoint(parseInt(code, 16));
      } catch {
        return match;
      }
    }
  );

  return result;
}


function cleanText(text) {

  if (!text) return "";

  let value = String(text);

  // br etiketlerini boşluk yap
  value = value.replace(/<br\s*\/?>/gi, " ");

  // HTML yorumları
  value = value.replace(/<!--[\s\S]*?-->/g, " ");

  // Script / style kaldır
  value = value.replace(/<script[\s\S]*?<\/script>/gi, " ");
  value = value.replace(/<style[\s\S]*?<\/style>/gi, " ");

  // HTML etiketleri
  value = value.replace(/<[^>]*>/g, " ");

  // HTML entity decode
  value = decodeHtmlEntities(value);

  // Fazla boşluk
  value = value.replace(/\s+/g, " ");

  return value.trim();
}


// ============================================================
// GENERIC HTML PARSER
// ============================================================

function extract(html, regex) {

  const match = html.match(regex);

  if (!match) return "";

  return cleanText(match[1]);
}


// ============================================================
// TIMEOUTLU FETCH
// ============================================================

async function fetchWithTimeout(url, timeout = 12000) {

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeout
  );

  try {

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} - ${url}`
      );
    }

    return await response.text();

  } finally {

    clearTimeout(timer);

  }
}


// ============================================================
// TARİH DÖNÜŞTÜRME
// ============================================================

function parseEventDate(dateText) {

  if (!dateText) return null;

  const value = cleanText(dateText);

  let match = value.match(
    /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/
  );

  if (!match) return null;

  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];

  return `${year}-${month}-${day}`;
}


// ============================================================
// SAAT BUL
// ============================================================

function findTime(values) {

  for (const value of values) {

    const clean = cleanText(value);

    const match = clean.match(
      /\b([01]?\d|2[0-3]):([0-5]\d)\b/
    );

    if (match) {

      return (
        match[1].padStart(2, "0") +
        ":" +
        match[2]
      );

    }
  }

  return "";
}


// ============================================================
// TARİH BUL
// ============================================================

function findDate(values) {

  for (const value of values) {

    const clean = cleanText(value);

    const match = clean.match(
      /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/
    );

    if (match) {

      return `${match[1].padStart(2, "0")}.${match[2].padStart(2, "0")}.${match[3]}`;

    }
  }

  return "";
}


// ============================================================
// SALON BUL
// ============================================================

function findVenue(values) {

  const venuePatterns = [

    /SPOR SALONU/i,
    /SALONU/i,
    /SPOR KOMPLEKSİ/i,
    /SPOR KOMPLEKSI/i,
    /SPOR TESİSLERİ/i,
    /SPOR TESISLERI/i,
    /SPOR MERKEZİ/i,
    /SPOR MERKEZI/i,
    /KAPALI SPOR/i

  ];

  for (const value of values) {

    const clean = cleanText(value);

    if (!clean) continue;

    if (
      venuePatterns.some(
        pattern => pattern.test(clean)
      )
    ) {
      return clean;
    }
  }

  return "";
}


// ============================================================
// TAKIM ADI MI?
// ============================================================

function looksLikeTeam(value) {

  if (!value) return false;

  let text = cleanText(value);

  if (!text) return false;

  // Çok kısa şeyleri alma
  if (text.length < 3) return false;

  // Tarih
  if (
    /\b\d{1,2}[./-]\d{1,2}[./-]20\d{2}\b/.test(text)
  ) {
    return false;
  }

  // Saat
  if (
    /\b\d{1,2}:\d{2}\b/.test(text)
  ) {
    return false;
  }

  // Salon
  if (
    /SPOR SALONU|SPOR KOMPLEKSİ|SPOR KOMPLEKSI|SPOR TESİSLERİ|SPOR TESISLERI|KAPALI SPOR/i.test(text)
  ) {
    return false;
  }

  // Sadece ayraç
  if (
    /^(vs|v|x|-|–|—)$/i.test(text)
  ) {
    return false;
  }

  // Gereksiz başlıklar
  if (
    /^(tarih|saat|salon|yer|takım|takim|maç|mac|kategori)$/i.test(text)
  ) {
    return false;
  }

  return true;
}


// ============================================================
// VOLEYBOL TAKIMLARINI BUL
// ============================================================

function findTeams(values, venue, time, date) {

  const candidates = [];

  for (let value of values) {

    value = cleanText(value);

    if (!value) continue;

    // Tarih içeriyorsa at
    if (
      date &&
      value.includes(date)
    ) {
      continue;
    }

    // Saat içeriyorsa at
    if (
      time &&
      value.includes(time)
    ) {
      continue;
    }

    // Salon ise at
    if (
      venue &&
      value === venue
    ) {
      continue;
    }

    // Genel takım kontrolü
    if (!looksLikeTeam(value)) {
      continue;
    }

    // Çok uzun genel açıklamaları alma
    if (value.length > 100) {
      continue;
    }

    candidates.push(value);
  }


  // ----------------------------------------------------------
  // Aynı takım iki kere geldiyse temizle
  // ----------------------------------------------------------

  const unique = [];

  for (const candidate of candidates) {

    if (
      !unique.some(
        item =>
          item.toLowerCase() === candidate.toLowerCase()
      )
    ) {
      unique.push(candidate);
    }

  }


  // İlk iki gerçek takım
  return unique.slice(0, 2);
}


// ============================================================
// KOCAELİ BÜYÜKŞEHİR BELEDİYESİ
// ============================================================

async function getBelediyeEtkinlikleri() {

  const url =
    "https://kultursanat.kocaeli.bel.tr/etkinlik/feed/";

  try {

    const xml =
      await fetchWithTimeout(url);

    const items =
      xml.match(/<item[\s\S]*?<\/item>/gi) || [];

    const events = [];

    for (const item of items) {

      const title =
        extract(
          item,
          /<title[^>]*>([\s\S]*?)<\/title>/i
        );

      const description =
        extract(
          item,
          /<description[^>]*>([\s\S]*?)<\/description>/i
        );

      const link =
        extract(
          item,
          /<link[^>]*>([\s\S]*?)<\/link>/i
        );

      const pubDate =
        extract(
          item,
          /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i
        );

      if (!title) continue;

      let category = "genel";

      const text =
        `${title} ${description}`.toLowerCase();

      if (
        /konser|müzik|muzik/.test(text)
      ) {
        category = "konser";
      }
      else if (
        /tiyatro|sahne/.test(text)
      ) {
        category = "tiyatro";
      }
      else if (
        /çocuk|cocuk/.test(text)
      ) {
        category = "çocuk";
      }
      else if (
        /atölye|atolye/.test(text)
      ) {
        category = "atölye";
      }

      events.push({

        title,

        description,

        link,

        date: pubDate,

        time: "",

        venue: "",

        category,

        sport: "",

        source: "Kocaeli Büyükşehir Belediyesi"

      });

    }

    return events;

  }
  catch (error) {

    console.error(
      "Belediye etkinlikleri alınamadı:",
      error.message
    );

    return [];

  }
}


// ============================================================
// KOCAELİ SEYRET
// ============================================================

async function getSeyretEtkinlikleri() {

  const url =
    "https://www.kocaeliseyret.com/kocaeli-etkinlikler";

  try {

    const html =
      await fetchWithTimeout(url);

    const events = [];

    // Kart benzeri alanları yakalamaya çalış
    const blocks =
      html.match(
        /<(?:article|div|li)[^>]*>[\s\S]*?<\/(?:article|div|li)>/gi
      ) || [];


    for (const block of blocks) {

      const title =
        extract(
          block,
          /<(?:h1|h2|h3|h4|h5|a)[^>]*>([\s\S]*?)<\/(?:h1|h2|h3|h4|h5|a)>/i
        );

      if (!title) continue;

      const lower =
        title.toLowerCase();

      // Çok genel / menü başlıklarını ele
      if (
        title.length < 3 ||
        /etkinlikler|ana sayfa|haberler|iletişim|iletisim/i.test(title)
      ) {
        continue;
      }

      const description =
        cleanText(block);

      const hrefMatch =
        block.match(
          /href=["']([^"']+)["']/i
        );

      let link =
        hrefMatch
          ? hrefMatch[1]
          : "";

      if (
        link &&
        link.startsWith("/")
      ) {
        link =
          "https://www.kocaeliseyret.com" +
          link;
      }

      let category = "genel";

      if (
        /konser|müzik|muzik/.test(lower)
      ) {
        category = "konser";
      }
      else if (
        /tiyatro/.test(lower)
      ) {
        category = "tiyatro";
      }
      else if (
        /çocuk|cocuk/.test(lower)
      ) {
        category = "çocuk";
      }
      else if (
        /atölye|atolye/.test(lower)
      ) {
        category = "atölye";
      }

      events.push({

        title,

        description,

        link,

        date: "",

        time: "",

        venue: "",

        category,

        sport: "",

        source: "Kocaeli Seyret"

      });

    }

    return events;

  }
  catch (error) {

    console.error(
      "Kocaeli Seyret alınamadı:",
      error.message
    );

    return [];

  }
}


// ============================================================
// KOCAELİ VOLEYBOL İL TEMSİLCİLİĞİ
// ============================================================

async function getVoleybolEtkinlikleri() {

  const url =
    "https://kocaeli.voleyboliltemsilciligi.com/";

  try {

    const html =
      await fetchWithTimeout(url);

    const rows =
      html.match(
        /<tr\b[^>]*>[\s\S]*?<\/tr>/gi
      ) || [];

    const events = [];

    let currentDate = "";
    let currentVenue = "";


    // ----------------------------------------------------------
    // TABLO SATIRLARI
    // ----------------------------------------------------------

    for (const row of rows) {

      const cells =
        row.match(
          /<t[dh]\b[^>]*>[\s\S]*?<\/t[dh]>/gi
        ) || [];

      if (!cells.length) continue;

      const values =
        cells
          .map(cleanText)
          .filter(Boolean);

      if (!values.length) continue;

      const rowText =
        values.join(" | ");


      // --------------------------------------------------------
      // TARİH
      // --------------------------------------------------------

      const dateMatch =
        rowText.match(
          /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/
        );

      if (dateMatch) {

        currentDate =
          `${dateMatch[1].padStart(2, "0")}.${dateMatch[2].padStart(2, "0")}.${dateMatch[3]}`;

      }


      // --------------------------------------------------------
      // SALON
      // --------------------------------------------------------

      const venue =
        findVenue(values);

      if (venue) {

        currentVenue = venue;

      }


      // --------------------------------------------------------
      // SAAT
      // --------------------------------------------------------

      const time =
        findTime(values);

      if (!time) {

        // Bu satır maç satırı değil
        continue;

      }


      // --------------------------------------------------------
      // TARİH YOKSA SATIRDAKİ TARİHİ KULLAN
      // --------------------------------------------------------

      const date =
        findDate(values) ||
        currentDate;


      if (!date) {

        continue;

      }


      // --------------------------------------------------------
      // SALON YOKSA ÖNCEKİ SALONU KULLAN
      // --------------------------------------------------------

      const finalVenue =
        venue ||
        currentVenue ||
        "";


      // --------------------------------------------------------
      // TAKIMLAR
      // --------------------------------------------------------

      const teams =
        findTeams(
          values,
          finalVenue,
          time,
          date
        );


      // En az iki takım şart
      if (teams.length < 2) {

        continue;

      }


      const homeTeam =
        teams[0];

      const awayTeam =
        teams[1];


      // Güvenlik
      if (
        !homeTeam ||
        !awayTeam
      ) {
        continue;
      }


      // Aynı takım iki taraf olmasın
      if (
        homeTeam.toLowerCase() ===
        awayTeam.toLowerCase()
      ) {
        continue;
      }


      // --------------------------------------------------------
      // BAŞLIK
      // --------------------------------------------------------

      const title =
        `${homeTeam} × ${awayTeam}`;


      // --------------------------------------------------------
      // TARİH ISO
      // --------------------------------------------------------

      const isoDate =
        parseEventDate(date);


      // --------------------------------------------------------
      // ETKİNLİK
      // --------------------------------------------------------

      events.push({

        title,

        description:
          `${homeTeam} - ${awayTeam} Kocaeli voleybol karşılaşması`,

        date,

        isoDate,

        time,

        venue: finalVenue,

        category: "spor",

        sport: "Voleybol",

        homeTeam,

        awayTeam,

        link: url,

        source:
          "Kocaeli Voleybol İl Temsilciliği"

      });

    }


    // ----------------------------------------------------------
    // DUPLICATE TEMİZLE
    // ----------------------------------------------------------

    const unique =
      [];

    const seen =
      new Set();


    for (const event of events) {

      const key =
        [
          event.date,
          event.time,
          event.venue,
          event.homeTeam,
          event.awayTeam
        ]
          .join("|")
          .toLowerCase();

      if (
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);

      unique.push(event);

    }


    // ----------------------------------------------------------
    // TARİH + SAAT SIRALAMA
    // ----------------------------------------------------------

    unique.sort(
      (a, b) => {

        const aKey =
          `${a.isoDate || "9999-99-99"} ${a.time || "99:99"}`;

        const bKey =
          `${b.isoDate || "9999-99-99"} ${b.time || "99:99"}`;

        return aKey.localeCompare(bKey);

      }
    );


    return unique;

  }
  catch (error) {

    console.error(
      "Voleybol etkinlikleri alınamadı:",
      error.message
    );

    return [];

  }
}


// ============================================================
// ANA API
// ============================================================

export default async function handler(req, res) {

  // ----------------------------------------------------------
  // CORS
  // ----------------------------------------------------------

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


  if (
    req.method === "OPTIONS"
  ) {

    return res.status(200).end();

  }


  // ----------------------------------------------------------
  // CACHE
  // ----------------------------------------------------------

  const now =
    Date.now();

  if (
    cache.data &&
    now - cache.timestamp <
      CACHE_TIME
  ) {

    return res.status(200).json(
      cache.data
    );

  }


  // ----------------------------------------------------------
  // TÜM KAYNAKLARI AYNI ANDA ÇALIŞTIR
  // ----------------------------------------------------------

  const results =
    await Promise.allSettled([

      getBelediyeEtkinlikleri(),

      getSeyretEtkinlikleri(),

      getVoleybolEtkinlikleri()

    ]);


  // ----------------------------------------------------------
  // SONUÇLARI TOPLA
  // ----------------------------------------------------------

  let allEvents =
    [];


  for (
    const result of results
  ) {

    if (
      result.status === "fulfilled" &&
      Array.isArray(result.value)
    ) {

      allEvents =
        allEvents.concat(
          result.value
        );

    }

  }


  // ----------------------------------------------------------
  // DUPLICATE ETKİNLİKLERİ TEMİZLE
  // ----------------------------------------------------------

  const uniqueEvents =
    [];

  const seen =
    new Set();


  for (
    const event of allEvents
  ) {

    const key =
      [
        event.title,
        event.date,
        event.time,
        event.venue,
        event.source
      ]
        .join("|")
        .toLowerCase()
        .trim();


    if (
      seen.has(key)
    ) {
      continue;
    }


    seen.add(key);

    uniqueEvents.push(
      event
    );

  }


  // ----------------------------------------------------------
  // GENEL SIRALAMA
  // ----------------------------------------------------------

  uniqueEvents.sort(
    (a, b) => {

      const aDate =
        a.isoDate ||
        parseEventDate(a.date) ||
        "9999-99-99";

      const bDate =
        b.isoDate ||
        parseEventDate(b.date) ||
        "9999-99-99";

      const aTime =
        a.time ||
        "99:99";

      const bTime =
        b.time ||
        "99:99";


      return `${aDate} ${aTime}`
        .localeCompare(
          `${bDate} ${bTime}`
        );

    }
  );


  // ----------------------------------------------------------
  // KAYNAK SAYILARI
  // ----------------------------------------------------------

  const sourceCounts =
    {};

  for (
    const event of uniqueEvents
  ) {

    const source =
      event.source ||
      "Bilinmeyen";

    sourceCounts[source] =
      (sourceCounts[source] || 0) + 1;

  }


  // ----------------------------------------------------------
  // CEVAP
  // ----------------------------------------------------------

  const response = {

    success: true,

    count:
      uniqueEvents.length,

    events:
      uniqueEvents,

    sources:
      sourceCounts,

    updatedAt:
      new Date().toISOString()

  };


  // ----------------------------------------------------------
  // CACHE'E AL
  // ----------------------------------------------------------

  cache = {

    timestamp: now,

    data: response

  };


  return res.status(200).json(
    response
  );

}
