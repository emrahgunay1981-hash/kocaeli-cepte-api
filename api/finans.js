// ==========================================
// KOCAELİ CEPTE
// FİNANS API
// Dolar / Euro / Gram Altın / Bitcoin
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


  // OPTIONS
  if (req.method === "OPTIONS") {

    return res
      .status(200)
      .end();

  }


  try {

    // ==========================================
    // GENELPARA API
    // ==========================================

    const [
      dovizRes,
      altinRes,
      kriptoRes
    ] = await Promise.all([

      fetch(
        "https://api.genelpara.com/json/?list=doviz&sembol=USD,EUR",
        {
          headers: {
            "User-Agent": "KocaeliCepte/1.0",
            "Accept": "application/json"
          }
        }
      ),

      fetch(
        "https://api.genelpara.com/json/?list=altin&sembol=GA",
        {
          headers: {
            "User-Agent": "KocaeliCepte/1.0",
            "Accept": "application/json"
          }
        }
      ),

      fetch(
        "https://api.genelpara.com/json/?list=kripto&sembol=BTC",
        {
          headers: {
            "User-Agent": "KocaeliCepte/1.0",
            "Accept": "application/json"
          }
        }
      )

    ]);


    // ==========================================
    // HTTP KONTROLÜ
    // ==========================================

    if (!dovizRes.ok) {

      throw new Error(
        "Döviz API bağlantısı başarısız: " +
        dovizRes.status
      );

    }


    if (!altinRes.ok) {

      throw new Error(
        "Altın API bağlantısı başarısız: " +
        altinRes.status
      );

    }


    if (!kriptoRes.ok) {

      throw new Error(
        "Kripto API bağlantısı başarısız: " +
        kriptoRes.status
      );

    }


    // ==========================================
    // JSON VERİLERİ
    // ==========================================

    const doviz =
      await dovizRes.json();

    const altin =
      await altinRes.json();

    const kripto =
      await kriptoRes.json();


    // ==========================================
    // FİYAT OKUMA
    // ==========================================

    function getPrice(data, symbol) {

      if (!data) {
        return null;
      }


      // GenelPara güncel yapısı:
      // data.data.USD
      // data.data.EUR
      // data.data.GA
      // data.data.BTC

      const root =
        data.data || data;


      const item =
        root[symbol];


      if (!item) {
        return null;
      }


      // Öncelik satış fiyatı
      const values = [

        item.satis,

        item.Satis,

        item["satış"],

        item.fiyat,

        item.Fiyat,

        item.price,

        item.Price,

        item.last,

        item.Last,

        item.close,

        item.Close,

        item.alis,

        item.Alis,

        item["alış"]

      ];


      for (
        const value of values
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


    // ==========================================
    // FİYATLAR
    // ==========================================

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


    // ==========================================
    // KONTROL
    // ==========================================

    console.log(
      "FINANS:",
      {
        usd,
        eur,
        gold,
        btc
      }
    );


    // ==========================================
    // CEVAP
    // ==========================================

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
