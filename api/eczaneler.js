// api/eczaneler.js

const SOURCE_URL =
  "https://www.bugunkocaeli.com.tr/kocaeli-nobetci-eczaneler";

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

function getDistrict(text) {
  const normalized = normalize(text);

  for (const district of DISTRICTS) {
    if (normalized.includes(normalize(district))) {
      return district;
    }
  }

  return "";
}

function getPhone(text) {
  const match = String(text).match(
    /0?\s*\(?262\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}|0?\s*\(?5\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/
  );

  return match
    ? match[0].replace(/\s+/g, " ").trim()
    : "";
}

function getMapLink(address) {
  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(address + ", Kocaeli")
  );
}

function parsePharmacies(html) {
  const pharmacies = [];

  /*
    Bugün Kocaeli sayfasındaki eczane
    başlıklarını buluyoruz.
  */

  const headingRegex =
    /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;

  const headings = [];

  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const name = cleanText(match[1]);

    if (!name) continue;

    /*
      Eczane kelimesi olmayan başlıkları geç.
    */

    if (!/eczane/i.test(name)) continue;

    /*
      "Nöbetçi Eczaneler" gibi genel başlıkları geç.
    */

    if (/nöbetçi eczane/i.test(name)) continue;

    headings.push({
      name,
      start: match.index,
      end: headingRegex.lastIndex
    });
  }

  for (let i = 0; i < headings.length; i++) {

    const current = headings[i];

    const next = headings[i + 1];

    const block = html.slice(
      current.end,
      next ? next.start : undefined
    );

    const text = cleanText(block);

    if (!text) continue;

    /*
      İlçeyi bul.
    */

    const district = getDistrict(text);

    if (!district) continue;

    /*
      Telefonu bul.
    */

    const phone = getPhone(text);

    /*
      "Yol Tarifi Al" kısmından önceki
      bölüm adres bilgilerini içeriyor.
    */

    let address = text;

    const mapIndex = normalize(address).indexOf(
      normalize("Yol Tarifi Al")
    );

    if (mapIndex !== -1) {
      address = address.slice(0, mapIndex);
    }

    /*
      Telefonu çıkar.
    */

    if (phone) {
      address = address.replace(phone, "");
    }

    /*
      İlçe adını adresin başından çıkar.
    */

    const normalizedAddress =
      normalize(address);

    const normalizedDistrict =
      normalize(district);

    if (
      normalizedAddress.startsWith(
        normalizedDistrict
      )
    ) {
      address = address.slice(
        district.length
      );
    }

    /*
      Temizlik
    */

    address = address
      .replace(/Adres\s*:/gi, "")
      .replace(/Telefon\s*:/gi, "")
      .replace(/Yol Tarifi Al/gi, "")
      .replace(/Haritada Göster/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!address) {
      address =
        district + ", Kocaeli";
    }

    pharmacies.push({
      name: current.name,
      district,
      address,
      phone,
      map: getMapLink(address),
      source: "Bugün Kocaeli"
    });
  }

  /*
    Aynı eczanenin iki kez
    gelmesini engelle.
  */

  const seen = new Set();

  return pharmacies.filter(pharmacy => {

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
}

export default async function handler(req, res) {

  try {

    const requestedDistrict =
      typeof req.query?.district === "string"
        ? req.query.district.trim()
        : "";

    /*
      Kaynak siteye bağlan.
    */

    const response = await fetch(
      SOURCE_URL,
      {
        method: "GET",

        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",

          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

          "Accept-Language":
            "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",

          "Referer":
            "https://www.google.com/",

          "Cache-Control":
            "no-cache"
        },

        redirect: "follow",

        cache: "no-store"
      }
    );

    /*
      HTTP hatası
    */

    if (!response.ok) {

      throw new Error(
        "Kaynak site HTTP hatası: " +
        response.status +
        " " +
        response.statusText
      );
    }

    /*
      HTML'i al.
    */

    const html =
      await response.text();

    /*
      Boş cevap kontrolü
    */

    if (
      !html ||
      html.length < 1000
    ) {

      throw new Error(
        "Kaynak site boş veya eksik HTML gönderdi. Gelen veri: " +
        html.length +
        " karakter"
      );
    }

    /*
      Eczaneleri çözümle.
    */

    let pharmacies =
      parsePharmacies(html);

    /*
      Hiç eczane bulunamazsa
      gerçek teşhis bilgisini döndür.
    */

    if (pharmacies.length === 0) {

      throw new Error(
        "Kaynak sayfaya ulaşıldı ancak eczane bulunamadı. HTML uzunluğu: " +
        html.length +
        " karakter"
      );
    }

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
      Başarılı cevap
    */

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
        "Bugün Kocaeli"
    });

  } catch (error) {

    console.error(
      "Nöbetçi eczane hatası:",
      error
    );

    /*
      GERÇEK HATAYI GÖSTER
    */

    res.status(500).json({

      success: false,

      error:
        error?.message ||
        String(error),

      pharmacies: []
    });
  }
}
