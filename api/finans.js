// ==========================================
// KOCAELİ CEPTE - FİNANS API
// Dolar / Euro / Gram Altın / Bitcoin
// GenelPara API'nin GÜNCEL veri yapısına göre düzeltildi
// ==========================================

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Gerçek bir tarayıcı gibi görünen başlıklar
  // (bot engeline takılmamak için)
  const browserHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Referer": "https://www.genelpara.com/"
  };

  try {

    const [dovizRes, altinRes, kriptoRes] = await Promise.all([
      fetch(
        "https://api.genelpara.com/json/?list=doviz&sembol=USD,EUR",
        { headers: browserHeaders }
      ),
      fetch(
        "https://api.genelpara.com/json/?list=altin&sembol=GA",
        { headers: browserHeaders }
      ),
      fetch(
        "https://api.genelpara.com/json/?list=kripto&sembol=BTC",
        { headers: browserHeaders }
      )
    ]);

    const dovizText = await dovizRes.text();
    const altinText = await altinRes.text();
    const kriptoText = await kriptoRes.text();

    let dovizJson = null;
    let altinJson = null;
    let kriptoJson = null;

    try { dovizJson = JSON.parse(dovizText); } catch (e) {}
    try { altinJson = JSON.parse(altinText); } catch (e) {}
    try { kriptoJson = JSON.parse(kriptoText); } catch (e) {}

    // ==========================================
    // FİYAT OKUMA
    // Güncel GenelPara yapısı: { data: { USD: { satis: "..." } } }
    // ==========================================

    function getPrice(json, symbol) {

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

    const usd = getPrice(dovizJson, "USD");
    const eur = getPrice(dovizJson, "EUR");
    const gold = getPrice(altinJson, "GA");
    const btc = getPrice(kriptoJson, "BTC");

    return res.status(200).json({

      success: true,

      data: {
        usd,
        eur,
        gold,
        btc
      },

      // Hata ayıklama için ham cevapları da ekliyoruz
      // (sorun devam ederse burayı inceleyeceğiz)
      debug: {
        dovizStatus: dovizRes.status,
        altinStatus: altinRes.status,
        kriptoStatus: kriptoRes.status,
        dovizRawSnippet: dovizText.slice(0, 150),
        altinRawSnippet: altinText.slice(0, 150),
        kriptoRawSnippet: kriptoText.slice(0, 150)
      },

      updatedAt: new Date().toISOString()

    });

  } catch (error) {

    console.error("Finans API hatası:", error);

    return res.status(500).json({
      success: false,
      error: "Finans verileri alınamadı: " + error.message
    });

  }

}
