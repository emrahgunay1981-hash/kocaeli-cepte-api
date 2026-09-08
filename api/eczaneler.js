const DISTRICTS = [
  { key: "basiskele", name: "Başiskele", api: "BAŞİSKELE" },
  { key: "cayirova", name: "Çayırova", api: "ÇAYIROVA" },
  { key: "darica", name: "Darıca", api: "DARICA" },
  { key: "derince", name: "Derince", api: "DERİNCE" },
  { key: "dilovasi", name: "Dilovası", api: "DİLOVASI" },
  { key: "gebze", name: "Gebze", api: "GEBZE" },
  { key: "golcuk", name: "Gölcük", api: "GÖLCÜK" },
  { key: "izmit", name: "İzmit", api: "İZMİT" },
  { key: "kandira", name: "Kandıra", api: "KANDIRA" },
  { key: "karamursel", name: "Karamürsel", api: "KARAMÜRSEL" },
  { key: "kartepe", name: "Kartepe", api: "KARTEPE" },
  { key: "korfez", name: "Körfez", api: "KÖRFEZ" }
];

const API_BASE =
  "https://eczane.te-robotik.com.tr/api/v1/nobetci";

function getValue(obj, keys) {
  for (const key of keys) {
    if (
      obj &&
      obj[key] !== undefined &&
      obj[key] !== null &&
      obj[key] !== ""
    ) {
      return obj[key];
    }
  }

  return "";
}

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.pharmacies)) {
    return data.pharmacies;
  }

  if (Array.isArray(data?.eczaneler)) {
    return data.eczaneler;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

function normalizePharmacy(item, district) {

  const coordinates =
    item?.konum ||
    item?.location ||
    item?.coordinates ||
    {};

  const latitude =
    getValue(item, [
      "latitude",
      "lat",
      "enlem"
    ]) ||
    getValue(coordinates, [
      "latitude",
      "lat",
      "enlem"
    ]) ||
    null;

  const longitude =
    getValue(item, [
      "longitude",
      "lng",
      "lon",
      "boylam"
    ]) ||
    getValue(coordinates, [
      "longitude",
      "lng",
      "lon",
      "boylam"
    ]) ||
    null;

  return {
    name: getValue(item, [
      "name",
      "ad",
      "eczane_adi",
      "eczaneAdi",
      "title"
    ]),

    district:
      getValue(item, [
        "district",
        "ilce"
      ]) ||
      district.name,

    address: getValue(item, [
      "address",
      "adres"
    ]),

    phone: getValue(item, [
      "phone",
      "telefon",
      "tel"
    ]),

    latitude,
    longitude,

    dutyStart: getValue(item, [
      "dutyStart",
      "duty_start",
      "baslangic"
    ]),

    dutyEnd: getValue(item, [
      "dutyEnd",
      "duty_end",
      "bitis"
    ]),

    source:
      "Nöbetçi Eczane API"
  };
}

async function getDistrictPharmacies(district) {

  const url =
    API_BASE +
    "?il=" +
    encodeURIComponent("KOCAELİ") +
    "&ilce=" +
    encodeURIComponent(district.api) +
    "&gun=bugun";

  try {

    const response =
      await fetch(url, {
        headers: {
          "Accept": "application/json"
        },
        cache: "no-store"
      });

    if (!response.ok) {

      console.error(
        district.name,
        "API:",
        response.status
      );

      return [];
    }

    const data =
      await response.json();

    const list =
      normalizeList(data);

    return list
      .map(item =>
        normalizePharmacy(
          item,
          district
        )
      )
      .filter(item =>
        item.name
      );

  } catch (error) {

    console.error(
      "İlçe alınamadı:",
      district.name,
      error.message
    );

    return [];
  }
}

export default async function handler(req, res) {

  try {

    const requestedDistrict =
      typeof req.query?.district === "string"
        ? req.query.district
            .trim()
            .toLowerCase()
        : "";

    let districts =
      DISTRICTS;

    if (requestedDistrict) {

      districts =
        DISTRICTS.filter(
          item =>
            item.key === requestedDistrict
        );

      if (!districts.length) {

        return res.status(400).json({
          success: false,
          error: "Geçersiz ilçe.",
          pharmacies: []
        });
      }
    }

    /*
      Tüm ilçeler seçildiğinde
      12 ilçeyi ayrı ayrı sorguluyoruz.
    */

    const results =
      await Promise.all(
        districts.map(
          district =>
            getDistrictPharmacies(
              district
            )
        )
      );

    let pharmacies = [];

    results.forEach(list => {
      pharmacies.push(...list);
    });

    /*
      Aynı eczaneyi iki kez gösterme.
    */

    const seen =
      new Set();

    pharmacies =
      pharmacies.filter(
        pharmacy => {

          const key =
            (
              pharmacy.name +
              "|" +
              pharmacy.district
            )
              .toLowerCase()
              .trim();

          if (seen.has(key)) {
            return false;
          }

          seen.add(key);

          return true;
        }
      );

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
        "Nöbetçi Eczane API"

    });

  } catch (error) {

    console.error(
      "Nöbetçi eczane API hatası:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Nöbetçi eczane verileri alınamadı.",

      pharmacies: []

    });
  }
}
