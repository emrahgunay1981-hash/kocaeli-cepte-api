// ==========================================
// FİNANS VERİLERİ - Dolar, Euro, Altın, BTC
// GenelPara API'yi sunucu tarafında çeker
// (tarayıcıdan doğrudan çağrılamıyor - CORS engeli var)
// ==========================================

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {

    const [dovizRes, altinRes, kriptoRes] = await Promise.all([
      fetch("https://api.genelpara.com/json/?list=doviz&sembol=USD,EUR", {
        headers: { "User-Agent": "KocaeliCepte/1.0" }
      }),
      fetch("https://api.genelpara.com/json/?list=altin&sembol=GA", {
        headers: { "User-Agent": "KocaeliCepte/1.0" }
      }),
      fetch("https://api.genelpara.com/json/?list=kripto&sembol=BTC", {
        headers: { "User-Agent": "KocaeliCepte/1.0" }
      })
    ]);

    const dovizText = await dovizRes.text();
    const altinText = await altinRes.text();
    const kriptoText = await kriptoRes.text();

    let doviz = null;
    let altin = null;
    let kripto = null;

    try { doviz = JSON.parse(dovizText); } catch (e) {}
    try { altin = JSON.parse(altinText); } catch (e) {}
    try { kripto = JSON.parse(kriptoText); } catch (e) {}

    return res.status(200).json({
      success: true,
      doviz,
      altin,
      kripto,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {

    console.error("Finans API hatası:", error);

    return res.status(500).json({
      success: false,
      error: "Finans verileri alınamadı."
    });

  }

}
