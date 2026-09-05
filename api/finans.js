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
