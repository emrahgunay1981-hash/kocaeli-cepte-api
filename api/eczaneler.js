// api/eczaneler.js

const API_URL =
  "https://eczaneadresi.com/api/public/v1/duty-pharmacies";

const DISTRICTS = [
  "Başiskele",
  "Çayırova",
  "Darıca",
  "Derince",
  "Dilovası",
  "Gebze",
  "Gölcük",
  "İzmit",
  "Kandıra",
  "Karamürsel",
  "Kartepe",
  "Körfez"
];

function normalize(text) {
  return String(text || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

function getMapLink(address) {
  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(address + ", Kocaeli")
  );
}

function findDistrict(pharmacy) {
  const text = normalize(
    [
      pharmacy.district,
      pharmacy.address,
      pharmacy.name
    ].join(" ")
  );

  for (const district of DISTRICTS) {
    if (text.includes(normalize(district))) {
      return district;
    }
  }

  return "";
}

export default async function handler(req, res) {

  try {

    const requestedDistrict =
      typeof req.query?.district === "string"
        ? req.query.district.trim()
        : "";

    const url =
      API_URL +
      "?city=kocaeli&limit=200";

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent":
          "KocaeliCepte/1.0"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        "Eczane API HTTP hatası: " +
        response.status
      );
    }

    const data = await response.json();

    if (
      !data ||
      !Array.isArray(data.pharmacies)
    ) {
      throw new Error(
        "API geçerli eczane verisi döndürmedi."
      );
    }

    let pharmacies =
      data.pharmacies.map(pharmacy => {

        const district =
          findDistrict(pharmacy);

        const address =
          pharmacy.address ||
          district + ", Kocaeli";

        const phone =
          pharmacy.phone ||
          pharmacy.telephone ||
          "";

        return {
          name:
            pharmacy.name || "Eczane",

          district,

          address,

          phone,

          map:
            pharmacy.latitude &&
            pharmacy.longitude
              ? "https://www.google.com/maps/dir/?api=1&destination=" +
                encodeURIComponent(
                  pharmacy.latitude +
                  "," +
                  pharmacy.longitude
                )
              : getMapLink(address),

          source:
            "Eczane Adresi"
        };
      });

    /*
      Sadece Kocaeli ilçeleri
    */

    pharmacies =
      pharmacies.filter(
        pharmacy =>
          pharmacy.district !== ""
      );

    /*
      İlçe filtresi
    */

    if (requestedDistrict) {

      pharmacies =
        pharmacies.filter(
          pharmacy =>
            normalize(
              pharmacy.district
            ) ===
            normalize(
              requestedDistrict
            )
        );
    }

    /*
      Aynı eczaneyi iki kez gösterme
    */

    const seen = new Set();

    pharmacies =
      pharmacies.filter(pharmacy => {

        const key =
          normalize(pharmacy.name) +
          "|" +
          normalize(pharmacy.district);

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);

        return true;
      });

    res.status(200).json({

      success: true,

      city: "Kocaeli",

      district:
        requestedDistrict || null,

      count:
        pharmacies.length,

      updatedAt:
        new Date().toISOString(),

      pharmacies,

      source:
        "Eczane Adresi",

      sourceUrl:
        "https://eczaneadresi.com/"
    });

  } catch (error) {

    console.error(
      "Nöbetçi eczane API hatası:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        error?.message ||
        String(error),

      pharmacies: []
    });
  }
}
