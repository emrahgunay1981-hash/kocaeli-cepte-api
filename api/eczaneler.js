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

  return text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
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
  const match = text.match(
    /0?\s*\(?262\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/
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
    Güncel liste bölümünü bul.
  */

  const startMatch = html.match(
    /Kocaeli\s+\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+2026[\s\S]{0,500}?nöbetçi eczane adres/i
  );

  let section = html;

  if (startMatch) {
    section = html.slice(startMatch.index);
  }

  /*
    Listenin bittiği yer.
  */

  const endMatch = section.match(
    /Her eczane gece boyunca açık olmayabilir/i
  );

  if (endMatch) {
    section = section.slice(0, endMatch.index);
  }

  /*
    Eczane başlıklarını yakala.
  */

  const headingRegex =
    /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;

  const headings = [];

  let match;

  while ((match = headingRegex.exec(section)) !== null) {

    const name =
      cleanText(match[1]);

    if (!name) continue;

    if (
      /eczane/i.test(name) &&
      !/nöbetçi eczane/i.test(name)
    ) {

      headings.push({
        name,
        start: match.index,
        end: headingRegex.lastIndex
      });

    }
  }

  for (let i = 0; i < headings.length; i++) {

    const current = headings[i];

    const next = headings[i + 1];

    const block =
      section.slice(
        current.end,
        next ? next.start : undefined
      );

    const text =
      cleanText(block);

    const district =
      getDistrict(text);

    if (!district) continue;

    const phone =
      getPhone(text);

    let address =
      text;

    if (phone) {
      address =
        address.replace(phone, "");
    }

    /*
      Gereksiz ifadeleri temizle.
    */

    address =
      address
        .replace(/Yol Tarifi Al/gi, "")
        .replace(/Haritada Göster/gi, "")
        .replace(/Ara/gi, "")
        .replace(/\s+/g, " ")
        .trim();

    /*
      Bazı sayfalarda önce ilçe,
      sonra adres geliyor.
      İlçe bilgisini adresten çıkar.
    */

    address =
      address
        .replace(
          new RegExp(
            "^" +
            district.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            ) +
            "\\s*",
            "i"
          ),
          ""
        )
        .trim();

    pharmacies.push({

      name:
        current.name,

      district,

      address:
        address ||
        district + ", Kocaeli",

      phone,

      map:
        getMapLink(
          address ||
          district
        ),

      source:
        "Bugün Kocaeli / Kocaeli Eczacı Odası verileri"

    });
  }

  /*
    Tekrarları temizle.
  */

  const seen = new Set();

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


export default async function handler(req, res) {

  try {

    const requestedDistrict =
      typeof req.query?.district === "string"
        ? req.query.district.trim()
        : "";

    const response =
      await fetch(
        SOURCE_URL,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 KocaeliCepte/1.0",
            "Accept":
              "text/html,application/xhtml+xml"
          },
          cache: "no-store"
        }
      );

    if (!response.ok) {

      throw new Error(
        "Kaynak sayfaya ulaşılamadı: " +
        response.status
      );
    }

    const html =
      await response.text();

    let pharmacies =
      parsePharmacies(html);

    /*
      İlçe seçilmişse filtrele.
    */

    if (requestedDistrict) {

      const wanted =
        normalize(
          DISTRICTS.find(
            district =>
              normalize(district) ===
              normalize(requestedDistrict)
          ) ||
          requestedDistrict
        );

      pharmacies =
        pharmacies.filter(
          pharmacy =>
            normalize(
              pharmacy.district
            ) === wanted
        );
    }

    res.status(200).json({

      success: true,

      city: "Kocaeli",

      district:
        requestedDistrict ||
        null,

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

    res.status(500).json({

      success: false,

      error:
        "Güncel nöbetçi eczane verileri alınamadı.",

      pharmacies: []

    });

  }
}
