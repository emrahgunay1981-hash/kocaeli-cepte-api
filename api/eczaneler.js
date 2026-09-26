// api/eczaneler.js

const SOURCE_URL = "https://www.fanatik.com.tr/nobetci-eczaneler/kocaeli/";

const DISTRICTS = [
  "Başiskele", "Çayırova", "Darıca", "Derince", "Dilovası",
  "Gebze", "Gölcük", "İzmit", "Kandıra", "Karamürsel", "Kartepe", "Körfez"
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
  return String(text || "").toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .trim();
}

function getPhone(text) {
  const match = String(text).match(/0?\s*\(?262\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}|0?\s*\(?5\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

function getMapLink(address) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address + ", Kocaeli");
}

function parsePharmacies(html) {
  const text = cleanText(html);
  const districtPattern = DISTRICTS.join("|");
  // Sitede her eczane "... Eczanesi Kocaeli / <İlçe>" kalıbıyla başlıyor, ardından "Adres:" ve "Telefon:" geliyor.
  const anchorRegex = new RegExp("([^:]{2,40}?Eczanesi)\\s*Kocaeli\\s*/\\s*(" + districtPattern + ")", "g");

  const anchors = [];
  let m;
  while ((m = anchorRegex.exec(text)) !== null) {
    anchors.push({
      name: cleanText(m[1]),
      district: m[2],
      start: m.index,
      contentStart: anchorRegex.lastIndex
    });
  }

  const pharmacies = [];
  for (let i = 0; i < anchors.length; i++) {
    const current = anchors[i];
    const next = anchors[i + 1];
    const block = text.slice(current.contentStart, next ? next.start : undefined);

    const adresMatch = block.match(/Adres:\s*([\s\S]*?)\s*Telefon:/i);
    const address = adresMatch ? cleanText(adresMatch[1]) : "";
    const phone = getPhone(block);

    if (!address && !phone) continue;

    pharmacies.push({
      name: current.name,
      district: current.district,
      address: address || current.district + ", Kocaeli",
      phone,
      map: getMapLink(address || current.district),
      source: "Fanatik"
    });
  }

  const seen = new Set();
  return pharmacies.filter(pharmacy => {
    const key = normalize(pharmacy.name) + "|" + normalize(pharmacy.district);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const requestedDistrict = typeof req.query?.district === "string" ? req.query.district.trim() : "";

    const response = await fetch(SOURCE_URL, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.google.com/",
        "Cache-Control": "no-cache"
      },
      redirect: "follow",
      cache: "no-store"
    });

    if (!response.ok) throw new Error("Kaynak sayfaya ulaşılamadı: " + response.status);

    const html = await response.text();
    if (!html || html.length < 1000) throw new Error("Kaynak sayfa boş veya eksik geldi.");

    let pharmacies = parsePharmacies(html);

    if (requestedDistrict) {
      pharmacies = pharmacies.filter(p => normalize(p.district) === normalize(requestedDistrict));
    }

    res.status(200).json({ success: true, data: pharmacies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}
