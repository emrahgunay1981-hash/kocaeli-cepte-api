// Kocaeli Öncü (kocaelioncu.com) RSS beslemesinden güncel haberleri çeker.
// Basit regex tabanlı XML ayrıştırma kullanıyoruz (ek paket kurulumu gerektirmesin diye).

function extract(regex, str) {
  const m = str.match(regex);
  return m ? m[1].trim() : null;
}

function timeAgo(pubDate) {
  const then = new Date(pubDate).getTime();
  const now = Date.now();
  const diffMin = Math.floor((now - then) / 60000);

  if (diffMin < 1) return "az önce";
  if (diffMin < 60) return `${diffMin} dakika önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} gün önce`;
}

export default async function handler(req, res) {
  try {
    const xml = await fetch("https://www.kocaelioncu.com/rss").then(r => r.text());

    const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

    const items = itemBlocks.slice(0, 6).map(block => {
      const title = extract(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/, block);
      const link = extract(/<link>([\s\S]*?)<\/link>/, block);
      const pubDate = extract(/<pubDate>([\s\S]*?)<\/pubDate>/, block);
      const category = extract(/<category>([\s\S]*?)<\/category>/, block);
      const image = extract(/<enclosure url="([^"]*)"/, block);

      return {
        title,
        link,
        category,
        image,
        time: pubDate ? timeAgo(pubDate) : null,
      };
    }).filter(item => item.title && item.link);

    res.status(200).json({ ok: true, source: "kocaelioncu.com", items });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Haberler alınamadı" });
  }
}
