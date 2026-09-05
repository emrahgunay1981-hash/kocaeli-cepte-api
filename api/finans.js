// ==========================================
// KOCAELİ CEPTE - FİNANS API (v2)
// Dolar / Euro / Gram Altın / Bitcoin
//
// GenelPara Cloudflare bot korumasına takıldığı için
// terk edildi. Bunun yerine:
// - Dolar/Euro: Frankfurter.app (Avrupa Merkez Bankası verisi)
// - Altın: GoldPrice.org (ons/USD, gram/TL'ye çevriliyor)
// - Bitcoin: CoinGecko
// ==========================================

async function fetchWithTimeout(url, timeoutMs, headers) {

  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {

    const response = await fetch(url, {
      headers: headers || {},
      signal: controller.signal
    });

    clearTimeout(timer);

    const text = await response.text();

    return { ok: response.ok, status: response.status, text: text };

  } catch (err) {

    clearTimeout(timer);

    return {
      ok: false,
      status: 0,
      text: "",
      error: String(err && err.message ? err.message : err)
    };

  }

}


export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const browserHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json"
  };

  const [usdEurResult, goldResult, btcResult] = await Promise.allSettled([

    // Dolar ve Euro -> TL (Frankfurter.app)
    fetchWithTimeout(
      "https://api.frankfurter.app/latest?from=TRY&to=USD,EUR",
      5000,
      browserHeaders
    ),

    // Altın (ons/USD) - Yahoo Finance (Gold Futures GC=F)
    fetchWithTimeout(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F",
      5000,
      browserHeaders
    ),

    // Bitcoin/USD - CoinGecko
    fetchWithTimeout(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      5000,
      browserHeaders
    )

  ]);

  const usdEur = usdEurResult.status === "fulfilled" ? usdEurResult.value : { text: "", error: "rejected" };
  const gold = goldResult.status === "fulfilled" ? goldResult.value : { text: "", error: "rejected" };
  const btc = btcResult.status === "fulfilled" ? btcResult.value : { text: "", error: "rejected" };

  let usdTry = null;
  let eurTry = null;
  let goldGramTry = null;
  let btcUsd = null;

  // ==========================================
  // DOLAR / EURO
  // Frankfurter "from=TRY&to=USD,EUR" verir:
  // rates.USD = 1 TL kaç USD eder (çok küçük bir sayı)
  // Bunu ters çevirip "1 USD kaç TL" haline getiriyoruz.
  // ==========================================

  try {

    const json = JSON.parse(usdEur.text);

    if (json && json.rates) {

      if (json.rates.USD) {
        usdTry = (1 / json.rates.USD).toFixed(2);
      }

      if (json.rates.EUR) {
        eurTry = (1 / json.rates.EUR).toFixed(2);
      }

    }

  } catch (e) {}


  // ==========================================
  // ALTIN
  // Yahoo Finance (GC=F) = 1 ons altın vadeli işlem fiyatı (USD)
  // 1 ons = 31.1034768 gram
  // gram altın (USD) = fiyat / 31.1034768
  // gram altın (TL) = gram altın (USD) * usdTry
  // ==========================================

  try {

    const json = JSON.parse(gold.text);

    const yahooPrice =
      json &&
      json.chart &&
      json.chart.result &&
      json.chart.result[0] &&
      json.chart.result[0].meta &&
      json.chart.result[0].meta.regularMarketPrice;

    if (yahooPrice && usdTry) {

      const gramUsd = yahooPrice / 31.1034768;

      goldGramTry = (gramUsd * parseFloat(usdTry)).toFixed(2);

    }

  } catch (e) {}


  // ==========================================
  // BİTCOİN
  // CoinGecko: { bitcoin: { usd: 12345 } }
  // ==========================================

  try {

    const json = JSON.parse(btc.text);

    if (json && json.bitcoin && json.bitcoin.usd) {
      btcUsd = Number(json.bitcoin.usd).toFixed(2);
    }

  } catch (e) {}


  return res.status(200).json({

    success: true,

    data: {
      usd: usdTry,
      eur: eurTry,
      gold: goldGramTry,
      btc: btcUsd
    },

    debug: {
      usdEurStatus: usdEur.status,
      goldStatus: gold.status,
      btcStatus: btc.status,
      usdEurError: usdEur.error || null,
      goldError: gold.error || null,
      btcError: btc.error || null,
      usdEurSnippet: (usdEur.text || "").slice(0, 200),
      goldSnippet: (gold.text || "").slice(0, 200),
      btcSnippet: (btc.text || "").slice(0, 200)
    },

    updatedAt: new Date().toISOString()

  });

}
