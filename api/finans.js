// ==========================================
// KOCAELİ CEPTE - FİNANS API
// Dolar / Euro / Gram Altın / Bitcoin
// Her istek ayrı korumalı - biri çökerse diğerleri etkilenmez
// ==========================================

const browserHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Referer": "https://www.genelpara.com/"
};


async function fetchWithTimeout(url, timeoutMs) {

  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {

    const response = await fetch(url, {
      headers: browserHeaders,
      signal: controller.signal
    });

    clearTimeout(timer);

    const text = await response.text();

    return { ok: response.ok, status: response.status, text: text };

  } catch (err) {

    clearTimeout(timer);

    return { ok: false, status: 0, text: "", error: String(err && err.message ? err.message : err) };

  }

}


function getPrice(rawText, symbol) {

  if (!rawText) return null;

  let json = null;

  try {
    json = JSON.parse(rawText);
  } catch (e) {
    return null;
  }

  if (!json) return null;

  const root = json.data || json;

  const item = root[symbol];

  if (!item) return null;

  const raw =
    item.satis ||
    item.Satis ||
    item.alis ||
    item.Alis ||
    item.fiyat ||
    item.price ||
    item.last ||
    item.close;

  return raw || null;

}


export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const results = await Promise.allSettled([
    fetchWithTimeout("https://api.genelpara.com/json/?list=doviz&sembol=USD,EUR", 5000),
    fetchWithTimeout("https://api.genelpara.com/json/?list=altin&sembol=GA", 5000),
    fetchWithTimeout("https://api.genelpara.com/json/?list=kripto&sembol=BTC", 5000)
  ]);

  const dovizResult = results[0].status === "fulfilled" ? results[0].value : { text: "", error: "rejected" };
  const altinResult = results[1].status === "fulfilled" ? results[1].value : { text: "", error: "rejected" };
  const kriptoResult = results[2].status === "fulfilled" ? results[2].value : { text: "", error: "rejected" };

  const usd = getPrice(dovizResult.text, "USD");
  const eur = getPrice(dovizResult.text, "EUR");
  const gold = getPrice(altinResult.text, "GA");
  const btc = getPrice(kriptoResult.text, "BTC");

  return res.status(200).json({

    success: true,

    data: {
      usd,
      eur,
      gold,
      btc
    },

    debug: {
      dovizStatus: dovizResult.status,
      altinStatus: altinResult.status,
      kriptoStatus: kriptoResult.status,
      dovizError: dovizResult.error || null,
      altinError: altinResult.error || null,
      kriptoError: kriptoResult.error || null,
      dovizSnippet: (dovizResult.text || "").slice(0, 200),
      altinSnippet: (altinResult.text || "").slice(0, 200),
      kriptoSnippet: (kriptoResult.text || "").slice(0, 200)
    },

    updatedAt: new Date().toISOString()

  });

}
