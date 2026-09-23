// api/eczaneler.js

const DISTRICTS = [
  {
    name: "Başiskele",
    slug: "basiskele"
  },
  {
    name: "Çayırova",
    slug: "cayirova"
  },
  {
    name: "Darıca",
    slug: "darica"
  },
  {
    name: "Derince",
    slug: "derince"
  },
  {
    name: "Dilovası",
    slug: "dilovasi"
  },
  {
    name: "Gebze",
    slug: "gebze"
  },
  {
    name: "Gölcük",
    slug: "golcuk"
  },
  {
    name: "İzmit",
    slug: "izmit"
  },
  {
    name: "Kandıra",
    slug: "kandira"
  },
  {
    name: "Karamürsel",
    slug: "karamursel"
  },
  {
    name: "Kartepe",
    slug: "kartepe"
  },
  {
    name: "Körfez",
    slug: "korfez"
  }
];

const BASE_URL =
  "https://www.bugunkocaeli.com.tr/kocaeli-";

function cleanText(text) {
  if (!text) return "";

  return String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

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

function getPhone(text) {
  const match = String(text).match(
    /0?\s*\(?262\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}|0?\s*\(?5\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/
  );

  return match
    ? match[0].replace(/\s+/g, " ").trim()
    : "";
}

function parsePharmacies(html, districtName) {

  const pharmacies = [];

  /*
    Bugün Kocaeli ilçe sayfalarında
    eczaneler h4 başlıkları altında bulunuyor.
  */

  const regex =
    /<h4[^>]*>([\s\S]*?)<\/h4>/gi;

  const headings = [];

  let match;

  while ((match = regex.exec(html)) !== null) {

    const name =
      cleanText(match[1]);

    if (!name) continue;

    if (!/eczane/i.test(name)) {
      continue;
    }

    headings.push({
      name,
      end: regex.lastIndex
    });
  }

  for (let i = 0; i < headings.length; i++) {

    const current =
      headings[i];

    const next =
      headings[i + 1];

    const block =
      html.slice(
        current.end,
        next
          ? next.index
          : undefined
      );

    const text =
      cleanText(block);

    if (!text) continue;

    const phone =
      getPhone(text);

    let address =
      text;

    /*
      Yol tarifi ve telefon sonrasını temizle.
    */

    address =
      address
        .replace(
          /Yol Tarifi Al[\s\S]*$/i,
          ""
        )
        .replace(
          /Telefon\s*:/gi,
          ""
        )
        .replace(
          phone,
          ""
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    /*
      İlçe adını adresin sonundan temizle.
    */

    const districtIndex =
      normalize(address).lastIndexOf(
        normalize(districtName)
      );

    if (districtIndex !== -1) {

      address =
        address.slice(
          0,
          districtIndex
        ).trim();
    }

    if (!address) {
      address =
        districtName + ", Kocaeli";
    }

    pharmacies.push({

      name:
        current.name,

      district:
        districtName,

      address,

      phone,

      map:
        getMapLink(address),

      source:
        "Bugün Kocaeli"
    });
  }

  /*
    Tekrarları temizle.
  */

  const seen =
    new Set();

  return pharmacies.filter(
    pharmacy => {

      const key =
        normalize(
          pharmacy.name
        ) +
        "|" +
        normalize(
          pharmacy.district
        );

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

async function getDistrictPharmacies(
  district
) {

  const url =
    BASE_URL +
    district.slug +
    "-nobetci-eczaneler";

  const response =
    await fetch(
      url,
      {
        method: "GET",

        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",

          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

          "Accept-Language":
            "tr-TR,tr;q=0.9,en-US;q=0.8",

          "Cache-Control":
            "no-cache"
        },

        redirect:
          "follow",

        cache:
          "no-store"
      }
    );

  if (!response.ok) {

    throw new Error(
      district.name +
      " sayfası HTTP " +
      response.status
    );
  }

  const html =
    await response.text();

  if (!html || html.length < 500) {

    throw new Error(
      district.name +
      " sayfası boş geldi."
    );
  }

  return parsePharmacies(
    html,
    district.name
  );
}

export default async function handler(
  req,
  res
) {

  try {

    const requestedDistrict =
      typeof req.query?.district === "string"
        ? req.query.district.trim()
        : "";

    let districts =
      DISTRICTS;

    /*
      İlçe istenmişse sadece
      o ilçeyi çek.
    */

    if (requestedDistrict) {

      districts =
        DISTRICTS.filter(
          district =>
            normalize(
              district.name
            ) ===
            normalize(
              requestedDistrict
            )
        );

      if (districts.length === 0) {

        return res.status(400).json({
          success: false,
          error:
            "Geçersiz ilçe.",
          pharmacies: []
        });
      }
    }

    /*
      İlçeleri sırayla çek.
    */

    const pharmacies = [];

    const errors = [];

    for (const district of districts) {

      try {

        const result =
          await getDistrictPharmacies(
            district
          );

        pharmacies.push(
          ...result
        );

      } catch (error) {

        errors.push({
          district:
            district.name,

          error:
            error?.message ||
            String(error)
        });
      }
    }

    /*
      Tekrarları temizle.
    */

    const seen =
      new Set();

    const unique =
      pharmacies.filter(
        pharmacy => {

          const key =
            normalize(
              pharmacy.name
            ) +
            "|" +
            normalize(
              pharmacy.district
            );

          if (seen.has(key)) {
            return false;
          }

          seen.add(key);

          return true;
        }
      );

    if (unique.length === 0) {

      return res.status(500).json({

        success: false,

        error:
          "Hiçbir ilçeden nöbetçi eczane alınamadı.",

        details:
          errors,

        pharmacies: []
      });
    }

    res.status(200).json({

      success: true,

      city:
        "Kocaeli",

      district:
        requestedDistrict || null,

      count:
        unique.length,

      updatedAt:
        new Date().toISOString(),

      pharmacies:
        unique,

      source:
        "Bugün Kocaeli",

      sourceUrl:
        "https://www.bugunkocaeli.com.tr/"
    });

  } catch (error) {

    console.error(
      "Nöbetçi eczane hatası:",
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
