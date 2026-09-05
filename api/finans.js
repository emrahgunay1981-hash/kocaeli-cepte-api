// ==========================================
// KOCAELİ CEPTE - FİNANS API
// Dolar / Euro / Gram Altın / Bitcoin
// ==========================================

async function fetchWithTimeout(url, timeoutMs = 7000) {

  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "KocaeliCepte/1.0"
      },
      signal: controller.signal
    });

    const text = await response.text();

    clearTimeout(timer);

    return {
      ok: response.ok,
      status: response.status,
      text: text
    };

  } catch (error) {

    clearTimeout(timer);

    return {
      ok: false,
      status: 0,
      text: "",
      error: error?.message || "Bağlantı hatası"
    };

  }

}


// ==========================================
// JSON GÜVENLİ OKUMA
// ==========================================

function parseJSON(text) {

  try {

    if (!text) {
      return null;
    }

    return JSON.parse(text);

  } catch (error) {

    return null;

  }

}


// ==========================================
// ANA API
// ==========================================

export default async function handler(req, res) {

  // ==========================================
  // CORS
  // ==========================================

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

  // ==========================================
  // OPTIONS
  // ==========================================

  if (req.method === "OPTIONS") {

    return res.status(200).end();

  }


  // ==========================================
  // SADECE GET
  // ==========================================

  if (req.method !== "GET") {

    return res.status(405).json({
      success: false,
      error: "Method Not Allowed"
    });

  }


  // ==========================================
  // DIŞ SERVİSLER
  // ==========================================

  const results = await Promise.allSettled([

    // ------------------------------------------
    // 1 - DOLAR / EURO
    // Frankfurter / ECB referans kuru
    // ------------------------------------------

    fetchWithTimeout(
      "https://api.frankfurter.app/latest?from=USD&to=TRY,EUR",
      7000
    ),

    // ------------------------------------------
    // 2 - ALTIN
    // Yahoo Finance - Gold Futures
    // ------------------------------------------

    fetchWithTimeout(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d",
      7000
    ),

    // ------------------------------------------
    // 3 - BITCOIN
    // CoinGecko
    // ------------------------------------------

    fetchWithTimeout(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      7000
    )

  ]);


  // ==========================================
  // SONUÇLARI AL
  // ==========================================

  const currencyResult =
    results[0]?.status === "fulfilled"
      ? results[0].value
      : {
          ok: false,
          status: 0,
          text: ""
        };


  const goldResult =
    results[1]?.status === "fulfilled"
      ? results[1].value
      : {
          ok: false,
          status: 0,
          text: ""
        };


  const btcResult =
    results[2]?.status === "fulfilled"
      ? results[2].value
      : {
          ok: false,
          status: 0,
          text: ""
        };


  // ==========================================
  // DEĞERLER
  // ==========================================

  let usdTry = null;
  let eurTry = null;
  let goldGramTry = null;
  let btcUsd = null;


  // ==========================================
  // DOLAR / EURO
  //
  // Frankfurter:
  //
  // 1 USD = X TRY
  // 1 USD = X EUR
  //
  // Bu nedenle:
  //
  // USD/TRY = rates.TRY
  //
  // EUR/TRY =
  // USD/TRY ÷ USD/EUR
  // ==========================================

  try {

    const json = parseJSON(currencyResult.text);

    if (
      json &&
      json.rates
    ) {

      // DOLAR
      if (
        typeof json.rates.TRY === "number" &&
        json.rates.TRY > 0
      ) {

        usdTry =
          Number(json.rates.TRY).toFixed(2);

      }


      // EURO
      if (
        typeof json.rates.EUR === "number" &&
        json.rates.EUR > 0 &&
        usdTry
      ) {

        eurTry =
          (
            Number(usdTry) /
            Number(json.rates.EUR)
          ).toFixed(2);

      }

    }

  } catch (error) {

    console.error(
      "Döviz verisi okunamadı:",
      error
    );

  }


  // ==========================================
  // ALTIN
  //
  // Yahoo GC=F
  //
  // 1 ons = 31.1034768 gram
  //
  // Gram altın USD =
  // Ons fiyatı / 31.1034768
  //
  // Gram altın TL =
  // Gram USD × Dolar/TL
  // ==========================================

  try {

    const json = parseJSON(goldResult.text);

    const yahooPrice =
      json?.chart?.result?.[0]?.meta?.regularMarketPrice;


    if (
      typeof yahooPrice === "number" &&
      yahooPrice > 0 &&
      usdTry
    ) {

      const gramUsd =
        yahooPrice / 31.1034768;


      goldGramTry =
        (
          gramUsd *
          Number(usdTry)
        ).toFixed(2);

    }

  } catch (error) {

    console.error(
      "Altın verisi okunamadı:",
      error
    );

  }


  // ==========================================
  // BITCOIN
  // ==========================================

  try {

    const json = parseJSON(
      btcResult.text
    );


    const bitcoinPrice =
      json?.bitcoin?.usd;


    if (
      typeof bitcoinPrice === "number" &&
      bitcoinPrice > 0
    ) {

      btcUsd =
        bitcoinPrice.toFixed(2);

    }

  } catch (error) {

    console.error(
      "Bitcoin verisi okunamadı:",
      error
    );

  }


  // ==========================================
  // EN AZ BİR VERİ GELDİ Mİ?
  // ==========================================

  const hasData =
    usdTry !== null ||
    eurTry !== null ||
    goldGramTry !== null ||
    btcUsd !== null;


  // ==========================================
  // HİÇ VERİ GELMEDİYSE
  // ==========================================

  if (!hasData) {

    return res.status(502).json({

      success: false,

      data: {
        usd: null,
        eur: null,
        gold: null,
        btc: null
      },

      error:
        "Finans servislerinden veri alınamadı.",

      updatedAt:
        new Date().toISOString()

    });

  }


  // ==========================================
  // BAŞARILI CEVAP
  // ==========================================

  return res.status(200).json({

    success: true,

    data: {

      usd: usdTry,

      eur: eurTry,

      gold: goldGramTry,

      btc: btcUsd

    },

    updatedAt:
      new Date().toISOString()

  });

}
