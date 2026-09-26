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

const RSS_URL = "https://news.google.com/rss/search?q=Kocaelispor&hl=tr&gl=TR&ceid=TR%3Atr";

const UA = "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";

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
    const timeout = setTimeout(() => controller.abort(), 7000);

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
  const reqs = paramsList.map(p => [
    "Fbv4je",
    JSON.stringify([
      "garturlreq",
      [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0],
      p.articleId,
      Number(p.timestamp),
      p.signature
    ])
  ]);

  const body = "f.req=" + encodeURIComponent(JSON.stringify([reqs]));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

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
    const urls = [];

    for (const row of parsed) {
      if (!Array.isArray(row) || row[0] !== "wrb.fr" || typeof row[2] !== "string") continue;
      try {
        const inner = JSON.parse(row[2]);
        urls.push(inner[1] || null);
      } catch (e) {
        urls.push(null);
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

async function getImageFromUrl(url) {
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

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

async function getNews() {
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

    // ======================================
    // GOOGLE NEWS LİNKLERİNİ GERÇEK ADRESE ÇÖZ
    // ======================================

    const paramsList = [];
    for (let i = 0; i < items.length; i += 5) {
      const batch = items.slice(i, i + 5);
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
          items[itemIndex].realUrl = realUrl;
        }
      });
    }

    // ======================================
    // GERÇEK HABER SAYFALARINDAN GÖRSEL ÇEK
    // ======================================

    for (let i = 0; i < items.length; i += 5) {
      const batch = items.slice(i, i + 5);
      await Promise.all(
        batch.map(async item => {
          if (item.realUrl) {
            item.image = await getImageFromUrl(item.realUrl);
          }
        })
      );
    }

    return items;
  } catch (error) {
    console.log("Google News alınamadı:", error.message);
    return [];
  }
}

// ==========================================
// API
// ==========================================

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const items = await getNews();

    const seen = new Set();
    const unique = items.filter(item => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9çğıöşü\s]/gi, "").replace(/\s+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime();
      const dateB = new Date(b.pubDate || 0).getTime();
      return dateB - dateA;
    });

    const balanced = unique.slice(0, 20);

    const sourceCount = {};
    balanced.forEach(item => {
      const source = item.source || "Bilinmiyor";
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    });

    const imageCount = balanced.filter(item => !!item.image).length;

    res.status(200).json({
      ok: true,
      updated: new Date().toISOString(),
      count: balanced.length,
      imageCount,
      sources: Object.keys(sourceCount),
      sourceCount,
      items: balanced
    });
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
