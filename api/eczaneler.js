// api/eczaneler.js

const SOURCE_URL = "https://www.bugunkocaeli.com.tr/kocaeli-nobetci-eczaneler";
// Kaynak site Vercel'in IP aralığını 403 ile engelliyor; bu yüzden bir proxy üzerinden istek atıyoruz.
const PROXY_URL = "https://api.allorigins.win/raw?url=" + encodeURIComponent(SOURCE_URL);

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

function getDistrict(text) {
  const normalized = normalize(text);
  for (const district of DISTRICTS) {
    if (normalized.includes(normalize(district))) return district;
  }
  return "";
}

function getPhone(text) {
  const match = String(text).match(/0?\s*\(?262\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

function getMapLink(address) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address + ", Kocaeli");
}

function parsePharmacies(html) {
  const pharmacies = [];
  const headingRegex = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  const headings = [];
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const name = cleanText(match[1]);
    if (!name) continue;
    if (/eczane/i.test(name) && !/nöbetçi eczane/i.test(name)) {
      headings.push({ name, start: match.index, end: headingRegex.lastIndex });
    }
  }

  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    const next = headings[i + 1];
    const block = html.slice(current.end, next ? next.start : undefined);
    const text = cleanText(block);
    const district = getDistrict(text);
    if (!district) continue;

    const phone = getPhone(text);
    let address = text;
    if (phone) address = address.replace(phone, "");
    address = address.replace(/Yol Tarifi Al/gi, "").replace(/Haritada Göster/gi, "").replace(/Ara/gi, "").replace(/\*/g, " ").replace(/\s+/g, " ").trim();

    address = address.replace(/Her eczane gece boyunca açık olmayabilir[\s\S]*$/i, "").trim();

    pharmacies.push({
      name: current.name,
      district,
      address: address || district + ", Kocaeli",
      phone,
      map: getMapLink(address || district),
      source: "Bugün Kocaeli"
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
  try {
    const requestedDistrict = typeof req.query?.district === "string" ? req.query.district.trim() : "";

    const response = await fetch(PROXY_URL, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
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
