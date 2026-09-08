const DISTRICTS = [
  {
    key: "basiskele",
    name: "Başiskele",
    url: "https://kocaeli.eczaneleri.org/basiskele/nobetci-eczaneler.html"
  },
  {
    key: "cayirova",
    name: "Çayırova",
    url: "https://kocaeli.eczaneleri.org/cayirova/nobetci-eczaneler.html"
  },
  {
    key: "darica",
    name: "Darıca",
    url: "https://kocaeli.eczaneleri.org/darica/nobetci-eczaneler.html"
  },
  {
    key: "derince",
    name: "Derince",
    url: "https://kocaeli.eczaneleri.org/derince/nobetci-eczaneler.html"
  },
  {
    key: "dilovasi",
    name: "Dilovası",
    url: "https://kocaeli.eczaneleri.org/dilovasi/nobetci-eczaneler.html"
  },
  {
    key: "gebze",
    name: "Gebze",
    url: "https://kocaeli.eczaneleri.org/gebze/nobetci-eczaneler.html"
  },
  {
    key: "golcuk",
    name: "Gölcük",
    url: "https://kocaeli.eczaneleri.org/golcuk/nobetci-eczaneler.html"
  },
  {
    key: "izmit",
    name: "İzmit",
    url: "https://kocaeli.eczaneleri.org/izmit/nobetci-eczaneler.html"
  },
  {
    key: "kandira",
    name: "Kandıra",
    url: "https://kocaeli.eczaneleri.org/kandira/nobetci-eczaneler.html"
  },
  {
    key: "karamursel",
    name: "Karamürsel",
    url: "https://kocaeli.eczaneleri.org/karamursel/nobetci-eczaneler.html"
  },
  {
    key: "kartepe",
    name: "Kartepe",
    url: "https://kocaeli.eczaneleri.org/kartepe/nobetci-eczaneler.html"
  },
  {
    key: "korfez",
    name: "Körfez",
    url: "https://kocaeli.eczaneleri.org/korfez/nobetci-eczaneler.html"
  }
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
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeDistrict(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

function getTurkeyNow() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Europe/Istanbul"
    })
  );
}

/*
  Nöbet mantığı:

  00:00 - 08:00 arasında
  bir önceki günün akşam başlayan nöbeti devam eder.

  08:00'den sonra
  o günün akşam başlayacak nöbet listesi kullanılır.
*/

function getDutyDates() {

  const now = getTurkeyNow();

  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const hour = now.getHours();

  let dutyDate;

  if (hour < 8) {
    dutyDate = new Date(year, month, day - 1);
  } else {
    dutyDate = new Date(year, month, day);
  }

  const nextDate =
    new Date(
      dutyDate.getFullYear(),
      dutyDate.getMonth(),
      dutyDate.getDate() + 1
    );

  return {
    dutyDate,
    nextDate
  };
}

function formatTurkishDate(date) {

  const months = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık"
  ];

  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function extractDutySection(html, dutyDate) {

  const day =
    dutyDate.getDate();

  const month =
    dutyDate.getMonth() + 1;

  const year =
    dutyDate.getFullYear();

  const monthNames = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık"
  ];

  const monthName =
    monthNames[month - 1];

  /*
    Sayfalarda başlık şu yapıya benziyor:

    9 Eylül Çarşamba akşamından
    bir sonraki günün sabahına kadar
    nöbetçi eczaneler
  */

  const headingRegex =
    new RegExp(
      `${day}\\s+${escapeRegExp(monthName)}[\\s\\S]{0,150}?nöbetçi eczaneler`,
      "i"
    );

  const headingMatch =
    html.match(headingRegex);

  if (!headingMatch) {
    return html;
  }

  const start =
    headingMatch.index;

  const remaining =
    html.slice(start + headingMatch[0].length);

  /*
    Bir sonraki tarih bölümünü bul.
  */

  const nextHeading =
    remaining.match(
      /\d{1,2}\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)[\s\S]{0,150}?nöbetçi eczaneler/i
    );

  if (nextHeading) {

    return remaining.slice(
      0,
      nextHeading.index
    );

  }

  return remaining;
}

function parsePharmacies(html, district) {

  const section =
    extractDutySection(
      html,
      getDutyDates().dutyDate
    );

  const pharmacies = [];

  /*
    Eczane başlıkları:

    <h3>ECZANE ADI</h3>

    veya

    <h2>ECZANE ADI</h2>
  */

  const headingRegex =
    /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;

  const headings = [];

  let match;

  while ((match = headingRegex.exec(section)) !== null) {

    const name =
      cleanText(match[1]);

    if (
      name &&
      name.length > 2 &&
      name.length < 100 &&
      !/nöbetçi|eczaneler|kocaeli/i.test(name)
    ) {

      headings.push({
        name,
        index: match.index,
        end: headingRegex.lastIndex
      });

    }
  }

  for (let i = 0; i < headings.length; i++) {

    const current =
      headings[i];

    const next =
      headings[i + 1];

    const block =
      section.slice(
        current.end,
        next ? next.index : undefined
      );

    const text =
      cleanText(block);

    /*
      Telefon
    */

    const phoneMatch =
      text.match(
        /(?:0\s*)?\(?262\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/
      );

    const phone =
      phoneMatch
        ? phoneMatch[0].trim()
        : "";

    /*
      Adres.

      Telefon ve "Yol Tarifi" gibi
      gereksiz bölümleri çıkarıyoruz.
    */

    let address =
      text
        .replace(
          /Yol Tarifi Al/gi,
          ""
        )
        .replace(
          /Haritada Göster/gi,
          ""
        );

    if (phone) {
      address =
        address.replace(
          phone,
          ""
        );
    }

    address =
      address
        .replace(
          /\b\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s*\/\s*\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\b/g,
          ""
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    /*
      Eğer başlık eczane değilse atla.
    */

    if (
      !/eczane/i.test(current.name)
    ) {
      continue;
    }

    pharmacies.push({

      name: current.name,

      district: district.name,

      address,

      phone,

      source:
        "Kocaeli Nöbetçi Eczaneleri"

    });
  }

  return pharmacies;
}

async function getDistrictPharmacies(district) {

  try {

    const response =
      await fetch(
        district.url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 KocaeliCepte/1.0",
            "Accept":
              "text/html,application/xhtml+xml"
          }
        }
      );

    if (!response.ok) {
      console.error(
        district.name,
        response.status
      );

      return [];
    }

    const html =
      await response.text();

    return parsePharmacies(
      html,
      district
    );

  } catch (error) {

    console.error(
      "Eczane alınamadı:",
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

    let selectedDistricts =
      DISTRICTS;

    if (requestedDistrict) {

      selectedDistricts =
        DISTRICTS.filter(
          district =>
            district.key ===
            requestedDistrict
        );

      if (!selectedDistricts.length) {

        return res.status(400).json({
          success: false,
          error: "Geçersiz ilçe.",
          pharmacies: []
        });

      }
    }

    /*
      Seçilen ilçeleri paralel çek.
    */

    const results =
      await Promise.all(
        selectedDistricts.map(
          getDistrictPharmacies
        )
      );

    let pharmacies = [];

    results.forEach(list => {
      pharmacies.push(...list);
    });

    /*
      Aynı eczanenin tekrar görünmesini engelle.
    */

    const unique =
      [];

    const seen =
      new Set();

    for (const pharmacy of pharmacies) {

      const key =
        (
          pharmacy.name +
          "|" +
          pharmacy.district
        )
          .toLowerCase()
          .trim();

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      unique.push(pharmacy);
    }

    const dutyDates =
      getDutyDates();

    res.status(200).json({

      success: true,

      city: "Kocaeli",

      district:
        requestedDistrict || null,

      dutyDate:
        formatTurkishDate(
          dutyDates.dutyDate
        ),

      dutyPeriod:
        `${formatTurkishDate(
          dutyDates.dutyDate
        )} akşamı → ${formatTurkishDate(
          dutyDates.nextDate
        )} sabahı`,

      updatedAt:
        new Date().toISOString(),

      count:
        unique.length,

      pharmacies:
        unique,

      source:
        "Kocaeli Nöbetçi Eczaneleri"

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
