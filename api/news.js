// ==========================================
// KOCAELİ CEPTE
// GOOGLE NEWS + GERÇEK HABER GÖRSELLERİ
// ==========================================

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================

function extract(regex, str) {
  const m = str.match(regex);
  return m ? m[1].trim() : null;
}

function cleanText(str) {
  if (!str) return null;
  return str
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function normalizeImage(url) {
  if (!url) return null;
  url = url.trim();
  if (url.startsWith("//")) url = "https:" + url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;
  if (url.includes("news.google.com") || url.includes("googleusercontent.com")) return null;
  return url;
}

function timeAgo(pubDate) {
  const then = new Date(pubDate).getTime();
  if (isNaN(then)) return "";
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return "az önce";
  if (diffMin < 60) return `${diffMin} dakika önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} gün önce`;
}

// ==========================================
// GOOGLE NEWS RSS
// ==========================================

const RSS_URL = "https://news.google.com/rss/search?q=Kocaeli&hl=tr&gl=TR&ceid=TR%3Atr";

const UA = "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";

// Basit bellek-içi önbellek: aynı fonksiyon "ısınmış" haldeyken
// tekrar tekrar aynı ağır işi yapmasın diye birkaç dakika sonucu tutar.
let cachedResult = null;
let cachedAt = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 dakika
const IMAGE_RESOLVE_LIMIT = 10; // ana sayfada görünen ilk 10 haber için görsel çözülür

// ==========================================
// META GÖRSELİ BUL
// ==========================================

function findMetaImage(html) {
  let match;

  match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (match) { const image = normalizeImage(match[1]); if (image) return image; }

  match = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (match) { const image = normalizeImage(match[1]); if (image) return image; }

  match = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (match) { const image = normalizeImage(match[1]); if (image) return image; }

  match = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (match) { const image = normalizeImage(match[1]); if (image) return image; }

  match = html.match(/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i);
  if (match) { const image = normalizeImage(match[1]); if (image) return image; }

  match = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']image["']/i);
  if (match) { const image = normalizeImage(match[1]); if (image) return image; }

  match = html.match(/"image"\s*:\s*"([^"]+)"/i);
  if (match) { const image = normalizeImage(match[1]); if (image) return image; }

  match = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
  if (match) { const image = normalizeImage(match[1]); if (image) return image; }

  return null;
}

// ==========================================
// GOOGLE NEWS LİNKİNİ GERÇEK ADRESE ÇÖZ
// ==========================================
// Google News RSS linkleri artık doğrudan yönlendirme yapmıyor.
// Google'ın dahili "batchexecute" servisine sorup gerçek adresi almak gerekiyor.

async function getSignatureParams(googleNewsUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(googleNewsUrl, {
      redirect: "follow",
      headers: { "User-Agent": UA, "Accept": "text/html" },
      signal: controller.signal,
      cache: "no-store"
    });

    clearTimeout(timeout);
    if (!response.ok) return null;

    const html = await response.text();

    const idMatch = html.match(/data-n-a-id="([^"]+)"/);
    const sgMatch = html.match(/data-n-a-sg="([^"]+)"/);
    const tsMatch = html.match(/data-n-a-ts="([^"]+)"/);

    if (!idMatch || !sgMatch || !tsMatch) return null;

    return { articleId: idMatch[1], signature: sgMatch[1], timestamp: tsMatch[1] };
  } catch (error) {
    return null;
  }
}

async function decodeGoogleNewsUrls(paramsList) {
  // paramsList: [{articleId, signature, timestamp}, ...] - sırayla
  // Her isteğe kendi sıra numarası verilir ("1", "2", ...). Google cevapta
  // bu numarayı geri döndürür; böylece biri başarısız olsa bile diğer
  // adresler yanlış habere kaymaz. Sonuç dizisi, paramsList ile aynı
  // uzunluktadır; çözülemeyen yerlerde null bulunur.
  const reqs = paramsList.map((p, i) => [
    "Fbv4je",
    JSON.stringify([
      "garturlreq",
      [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0],
      p.articleId,
      Number(p.timestamp),
      p.signature
    ]),
    null,
    String(i + 1)
  ]);

  const body = "f.req=" + encodeURIComponent(JSON.stringify([reqs]));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": UA
      },
      body,
      signal: controller.signal,
      cache: "no-store"
    });

    clearTimeout(timeout);
    if (!response.ok) return [];

    const text = await response.text();
    const parts = text.split("\n\n");
    if (parts.length < 2) return [];

    const parsed = JSON.parse(parts[1]);
    const urls = new Array(paramsList.length).fill(null);

    for (const row of parsed) {
      if (!Array.isArray(row) || row[0] !== "wrb.fr") continue;

      // Cevaptaki sıra numarası hangi habere ait olduğunu söyler.
      // Numara yoksa bu satırı hiçbir habere bağlamıyoruz; yanlış
      // görsel göstermektense görselsiz göstermek daha iyi.
      const idx = Number(row[6]) - 1;
      if (!Number.isInteger(idx) || idx < 0 || idx >= urls.length) continue;
      if (typeof row[2] !== "string") continue;

      try {
        const inner = JSON.parse(row[2]);
        urls[idx] = inner[1] || null;
      } catch (e) {
        urls[idx] = null;
      }
    }

    return urls;
  } catch (error) {
    return [];
  }
}

// ==========================================
// GERÇEK HABER SAYFASINDAN GÖRSEL AL
// ==========================================

// Haber sayfasının kendi başlığını bulur (og:title ya da <title>).
function findPageTitle(html) {
  let m = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
       || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
       || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? cleanText(m[1]) : null;
}

// İki başlığın aynı haberi anlatıp anlatmadığını kaba şekilde ölçer:
// ortak anlamlı kelimelerin oranı.
// Neredeyse her haberde geçen kelimeler eşleşmeye sayılmaz.
const TITLE_STOPWORDS = new Set(["kocaeli", "için", "ile", "bir", "olan", "son", "dakika", "haber", "haberi", "haberleri"]);

function titleWords(str) {
  return new Set(
    String(str || "")
      .toLocaleLowerCase("tr-TR")
      .replace(/[^a-z0-9çğıöşü\s]/gi, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !TITLE_STOPWORDS.has(w))
  );
}

function titlesMatch(a, b) {
  const wa = titleWords(a), wb = titleWords(b);
  if (!wa.size || !wb.size) return false;
  let common = 0;
  wa.forEach(w => { if (wb.has(w)) common++; });
  return common / Math.min(wa.size, wb.size) >= 0.5;
}

// Görseli yalnızca sayfa gerçekten bu habere aitse kabul eder.
// Sayfanın başlığı okunamazsa görsel kabul edilir (eski davranış).
async function getImageForItem(item) {
  if (!item.realUrl) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(item.realUrl, {
      redirect: "follow",
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml" },
      signal: controller.signal,
      cache: "no-store"
    });

    clearTimeout(timeout);
    if (!response.ok) return null;

    const html = await response.text();
    const pageTitle = findPageTitle(html);
    if (pageTitle && !titlesMatch(pageTitle, item.title)) return null;

    return findMetaImage(html);
  } catch (error) {
    return null;
  }
}

async function getImageFromUrl(url) {
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml" },
      signal: controller.signal,
      cache: "no-store"
    });

    clearTimeout(timeout);
    if (!response.ok) return null;

    const html = await response.text();
    return findMetaImage(html);
  } catch (error) {
    return null;
  }
}

// ==========================================
// HABERLERİ AL
// ==========================================

// ==========================================
// GOOGLE NEWS
// ==========================================

async function getGoogleNews() {
  try {
    const response = await fetch(RSS_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 KocaeliCepte/1.0",
        "Accept": "application/rss+xml, application/xml, text/xml"
      },
      cache: "no-store"
    });

    if (!response.ok) throw new Error(`Google News HTTP ${response.status}`);

    const xml = await response.text();
    const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
    const items = [];

    for (const block of itemBlocks.slice(0, 20)) {
      const title = cleanText(extract(/<title>([\s\S]*?)<\/title>/i, block));
      const link = cleanText(extract(/<link>([\s\S]*?)<\/link>/i, block));
      const pubDate = cleanText(extract(/<pubDate>([\s\S]*?)<\/pubDate>/i, block));
      const source = cleanText(extract(/<source[^>]*>([\s\S]*?)<\/source>/i, block));

      if (!title || !link) continue;

      let finalTitle = title;
      let finalSource = source || "Google News";

      if (!source && title.includes(" - ")) {
        const parts = title.split(" - ");
        if (parts.length >= 2) {
          finalSource = parts[parts.length - 1].trim();
          finalTitle = parts.slice(0, -1).join(" - ").trim();
        }
      } else if (source && title.endsWith(" - " + source)) {
        // Google başlığın sonuna kaynağı da ekliyor; kaynak zaten
        // ayrıca gösterildiği için başlıktan çıkarılır.
        finalTitle = title.slice(0, -(" - " + source).length).trim();
      }

      items.push({
        title: finalTitle,
        link,
        category: "Kocaeli",
        image: null,
        time: pubDate ? timeAgo(pubDate) : "",
        pubDate,
        source: finalSource
      });
    }

    return items;
  } catch (error) {
    console.log("Google News alınamadı:", error.message);
    return [];
  }
}

async function resolveGoogleImages(itemsForImages) {
  const paramsList = [];
  for (let i = 0; i < itemsForImages.length; i += 5) {
    const batch = itemsForImages.slice(i, i + 5);
    const results = await Promise.all(batch.map(item => getSignatureParams(item.link)));
    results.forEach((params, idx) => { paramsList[i + idx] = params; });
  }

  const validIndexes = [];
  const validParams = [];
  paramsList.forEach((params, idx) => {
    if (params) {
      validIndexes.push(idx);
      validParams.push(params);
    }
  });

  if (validParams.length > 0) {
    const decodedUrls = await decodeGoogleNewsUrls(validParams);
    decodedUrls.forEach((realUrl, i) => {
      const itemIndex = validIndexes[i];
      if (itemIndex !== undefined && realUrl) {
        itemsForImages[itemIndex].realUrl = realUrl;
      }
    });
  }

  for (let i = 0; i < itemsForImages.length; i += 5) {
    const batch = itemsForImages.slice(i, i + 5);
    await Promise.all(
      batch.map(async item => {
        if (item.realUrl) {
          item.image = await getImageForItem(item);
        }
      })
    );
  }
}

const BLOCKED_SOURCES = ["haberler.com", "haberler"];
function isBlockedItem(item) {
  const s = String(item.source || "").toLocaleLowerCase("tr-TR").trim();
  const t = String(item.title || "").toLocaleLowerCase("tr-TR");
  return BLOCKED_SOURCES.some(b => s === b || s.includes("haberler.com") || t.endsWith("- " + b));
}

async function getNews() {

  const rawItems = await getGoogleNews();

  // ======================================
  // ÖNCE TEKİLLEŞTİR VE TARİHE GÖRE SIRALA
  // (görsel çözme adımı, gerçekten en üstte
  // görünecek haberleri hedeflesin diye bu
  // sıralama görsel aramadan ÖNCE yapılıyor)
  // ======================================

  const seen = new Set();
  const googleItems = rawItems.filter(item => {
    if (isBlockedItem(item)) return false;
    const key = item.title.toLowerCase().replace(/[^a-z0-9çğıöşü\s]/gi, "").replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  googleItems.sort((a, b) => {
    const dateA = new Date(a.pubDate || 0).getTime();
    const dateB = new Date(b.pubDate || 0).getTime();
    return dateB - dateA;
  });

  // ======================================
  // GOOGLE NEWS LİNKLERİNİ GERÇEK ADRESE ÇÖZ
  // Bu işlem tek başına yavaş kaynaklarda çok uzayabildiği
  // için sabit bir üst süre sınırı içinde çalıştırılır;
  // süre dolarsa görselsiz de olsa haberler döner, fonksiyon
  // hiçbir zaman zaman aşımıyla çökmez.
  // ======================================

  const itemsForImages = googleItems.slice(0, IMAGE_RESOLVE_LIMIT);

  await Promise.race([
    resolveGoogleImages(itemsForImages),
    new Promise(resolve => setTimeout(resolve, 8000))
  ]);

  return googleItems;
}

// ==========================================
// API
// ==========================================

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (cachedResult && (Date.now() - cachedAt) < CACHE_TTL_MS) {
    res.status(200).json(cachedResult);
    return;
  }

  try {
    const items = await getNews();

    // items zaten tekilleştirilmiş ve tarihe göre sıralanmış
    // halde gelir (getNews içinde, görsel çözmeden önce yapıldı)
    const balanced = items.slice(0, 20);

    const sourceCount = {};
    balanced.forEach(item => {
      const source = item.source || "Bilinmiyor";
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    });

    const imageCount = balanced.filter(item => !!item.image).length;

    const payload = {
      ok: true,
      updated: new Date().toISOString(),
      count: balanced.length,
      imageCount,
      sources: Object.keys(sourceCount),
      sourceCount,
      items: balanced
    };

    cachedResult = payload;
    cachedAt = Date.now();

    res.status(200).json(payload);
  } catch (error) {
    console.log("NEWS API ERROR:", error.message);
    res.status(500).json({
      ok: false,
      error: "Kocaeli haberleri alınamadı",
      count: 0,
      imageCount: 0,
      items: []
    });
  }
}
