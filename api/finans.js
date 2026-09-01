// ==========================================
// KOCAELİ CEPTE
// FİNANS API
// Dolar / Euro / Gram Altın / Bitcoin
// ==========================================

export default async function handler(req, res) {

  // CORS
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


  // OPTIONS
  if (req.method === "OPTIONS") {

    return res
      .status(200)
      .end();

  }


  try {

    // ======================================
    // API'LER
    // ======================================

    const [
      dovizRes,
      altinRes,
      kriptoRes
    ] = await Promise.all([

      fetch(
        "https://api.genelpara.com/json/?list=doviz&sembol=USD,EUR",
        {
          headers: {
            "User-Agent":
              "KocaeliCepte/1.0"
          }
        }
      ),

      fetch(
        "https://api.genelpara.com/json/?list=altin&sembol=GA",
        {
          headers: {
            "User-Agent":
              "KocaeliCepte/1.0"
          }
        }
      ),

      fetch(
        "https://api.genelpara.com/json/?list=kripto&sembol=BTC",
        {
          headers: {
            "User-Agent":
              "KocaeliCepte/1.0"
          }
        }
      )

    ]);


    // ======================================
    // HTTP KONTROL
    // ======================================

    if (
      !dovizRes.ok ||
      !altinRes.ok ||
      !kriptoRes.ok
    ) {

      throw new Error(
        "GenelPara bağlantısı başarısız"
      );

    }


    // ======================================
    // JSON
    // ======================================

    const doviz =
      await dovizRes.json();

    const altin =
      await altinRes.json();

    const kripto =
      await kriptoRes.json();


    // ======================================
    // GÜVENLİ FİYAT OKUMA
    // ======================================

    function getPrice(data, symbol) {

      if (!data) {
        return null;
      }


      // Önce data alanı
      const root =
        data.data || data;


      const item =
        root[symbol];


      if (!item) {
        return null;
      }


      const possibleValues = [

        item.satis,

        item.Satis,

        item["satış"],

        item.alis,

        item.Alis,

        item["alış"],

        item.fiyat,

        item.Fiyat,

        item.price,

        item.Price,

        item.last,

        item.Last,

        item.close,

        item.Close

      ];


      for (
        const value
        of possibleValues
      ) {

        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {

          return value;

        }

      }


      return null;

    }


    // ======================================
    // VERİLER
    // ======================================

    const usd =
      getPrice(
        doviz,
        "USD"
      );


    const eur =
      getPrice(
        doviz,
        "EUR"
      );


    const gold =
      getPrice(
        altin,
        "GA"
      );


    const btc =
      getPrice(
        kripto,
        "BTC"
      );


    // ======================================
    // CEVAP
    // ======================================

    return res
      .status(200)
      .json({

        success: true,

        data: {

          usd: usd,

          eur: eur,

          gold: gold,

          btc: btc

        },

        updatedAt:
          new Date().toISOString()

      });

  }


  catch (error) {

    console.error(
      "Finans API hatası:",
      error
    );


    return res
      .status(500)
      .json({

        success: false,

        error:
          "Finans verileri alınamadı."

      });

  }

}
