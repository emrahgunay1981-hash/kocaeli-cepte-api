// ==========================================
// KOCAELİ RESTORANLARI - GOOGLE PLACES API
// ==========================================

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

  // İlçe parametresi (opsiyonel) - örn: ?ilce=izmit
  const ilce = req.query.ilce || "Kocaeli";

  try {

    // Yeni nesil Places API (Text Search) kullanıyoruz
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress," +
            "places.rating,places.userRatingCount,places.priceLevel," +
            "places.photos,places.location,places.currentOpeningHours.openNow"
        },
        body: JSON.stringify({
          textQuery: `${ilce} restoran`,
          languageCode: "tr",
          maxResultCount: 20
        })
      }
    );

    if (!response.ok) {

      const errorText = await response.text();

      return res.status(response.status).json({
        success: false,
        error: "Google Places API hatası",
        detail: errorText.slice(0, 300)
      });

    }

    const data = await response.json();

    const places = data.places || [];

    const restaurants = places.map(place => {

      let photoUrl = null;

      if (place.photos && place.photos.length > 0) {
        const photoName = place.photos[0].name;
        photoUrl =
          `https://places.googleapis.com/v1/${photoName}/media` +
          `?maxWidthPx=400&key=${apiKey}`;
      }

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

