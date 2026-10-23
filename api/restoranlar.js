// ==========================================
// KOCAELİ RESTORANLARI - GOOGLE PLACES API
// ==========================================

const ILCELER = [
  "Kocaeli", "İzmit", "Gebze", "Darıca", "Körfez", "Başiskele",
  "Kartepe", "Gölcük", "Derince", "Çayırova", "Dilovası",
  "Kandıra", "Karamürsel"
];

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: "API anahtarı sunucuda tanımlı değil."
    });
  }

  // İlçe parametresi (opsiyonel) - örn: ?ilce=İzmit
  const ilce = req.query.ilce || "Kocaeli";

  // Sadece bilinen ilçeler kabul edilir (rastgele yazıyla
  // Google'a istek attırılmasını ve önbelleğin atlatılmasını önler)
  if (!ILCELER.includes(ilce)) {
    return res.status(400).json({
      success: false,
      error: "Geçersiz ilçe."
    });
  }

  // Google tek seferde en fazla 20 sonuç verir.
  // Sonraki sayfaları nextPageToken ile alıyoruz.
  // SAYFA_SAYISI: 1 = 20 restoran, 2 = 40, 3 = 60 (en fazla)
  // 2 seçildi: 24 saat önbellekle ayda en fazla ~780 arama,
  // Google'ın ücretsiz kotası (1.000) içinde kalır.
  const SAYFA_SAYISI = 2;

  try {

    const places = [];
    const gorulen = new Set();
    let pageToken = null;

    for (let sayfa = 0; sayfa < SAYFA_SAYISI; sayfa++) {

      const body = {
        textQuery: `${ilce} restoran`,
        languageCode: "tr",
        pageSize: 20
      };

      if (pageToken) {
        body.pageToken = pageToken;
      }

      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "nextPageToken," +
              "places.id,places.displayName,places.formattedAddress," +
              "places.rating,places.userRatingCount,places.priceLevel," +
              "places.location,places.currentOpeningHours.openNow"
          },
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {

        // İlk sayfa hata verirse hata dön; sonraki sayfalarda
        // eldeki sonuçlarla devam et.
        if (sayfa === 0) {

          const errorText = await response.text();

          return res.status(response.status).json({
            success: false,
            error: "Google Places API hatası",
            detail: errorText.slice(0, 300)
          });

        }

        break;

      }

      const data = await response.json();

      (data.places || []).forEach(place => {

        if (!gorulen.has(place.id)) {
          gorulen.add(place.id);
          places.push(place);
        }

      });

      pageToken = data.nextPageToken || null;

      if (!pageToken) break;

    }

    const restaurants = places.map(place => {

      // Fotoğraflar kullanıcı sayısıyla artan masraf yaptığı için
      // ve API anahtarını sayfada açığa çıkardığı için kaldırıldı.
      const photoUrl = null;

      return {
        id: place.id,
        name: place.displayName ? place.displayName.text : "İsimsiz",
        address: place.formattedAddress || "",
        rating: place.rating || null,
        ratingCount: place.userRatingCount || 0,
        priceLevel: place.priceLevel || null,
        openNow: place.currentOpeningHours
          ? place.currentOpeningHours.openNow
          : null,
        lat: place.location ? place.location.latitude : null,
        lng: place.location ? place.location.longitude : null,
        photoUrl
      };

    });

    // 24 saat önbellek: aynı ilçeyi tekrar açanlar için Google'a
    // yeniden sorulmaz. Masraf kullanıcı sayısına bağlı olmaz.
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=172800"
    );

    return res.status(200).json({
      success: true,
      count: restaurants.length,
      restaurants,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {

    console.error("Restoran API hatası:", error);

    return res.status(500).json({
      success: false,
      count: 0,
      restaurants: [],
      error: "Restoranlar şu anda alınamadı."
    });

  }

}
