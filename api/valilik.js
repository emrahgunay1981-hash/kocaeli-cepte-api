const SOURCES = [
  {
    type: "haber",
    title: "Valilik Haberleri",
    url: "https://www.kocaeli.gov.tr/haberler"
  },
  {
    type: "duyuru",
    title: "Valilik Duyuruları",
    url: "https://www.kocaeli.gov.tr/duyurular"
  },
  {
    type: "basin",
    title: "Basın Açıklamaları",
    url: "https://www.kocaeli.gov.tr/basin-aciklamalari"
  }
];

function cleanText(text) {
  if (!text) return "";

  return text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href) {

  if (!href) return "";

  if (href.startsWith("http")) {
    return href;
  }

  if (href.startsWith("/")) {
    return "https://www.kocaeli.gov.tr" + href;
  }

  return "https://www.kocaeli.gov.tr/" + href;
}

function parseDate(text) {

  if (!text) return "";

  const match =
    text.match(
      /(\d{1,2})[.\s]+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)[.\s]+(\d{4})/i
    );

  if (!match) return "";

  const months = {
    ocak: "01",
    şubat: "02",
    mart: "03",
    nisan: "04",
    mayıs: "05",
    haziran: "06",
    temmuz: "07",
    ağustos: "08",
    eylül: "09",
    ekim: "10",
    kasım: "11",
    aralık: "12"
  };

  const month =
    months[
      match[2].toLocaleLowerCase("tr-TR")
    ];

  if (!month) return "";

  return (
    match[3] +
    "-" +
    month +
    "-" +
    String(match[1]).padStart(2, "0")
  );
}

function parseNumericDate(text) {

  if (!text) return "";

  const match =
    text.match(
      /(\d{2})\.(\d{2})\.(\d{4})/
    );

  if (!match) return "";

  return (
    match[3] +
    "-" +
    match[2] +
    "-" +
    match[1]
  );
}

async function getSource(source) {

  try {

    const response =
      await fetch(
        source.url,
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

      console.error(
        source.title,
        response.status
      );

      return [];
    }

    const html =
      await response.text();

    const items = [];

    /*
      Tüm linkleri yakala.
    */

    const linkRegex =
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while (
      (match = linkRegex.exec(html)) !== null
    ) {

      const href =
        absoluteUrl(match[1]);

      const title =
        cleanText(match[2]);

      if (!href || !title) {
        continue;
      }

      /*
        Menü / sosyal medya / gereksiz
        bağlantıları at.
      */

      if (
        /javascript:|#|whatsapp|instagram|facebook|twitter|youtube/i.test(
          href
        )
      ) {
        continue;
      }

      if (
        title.length < 10 ||
        title.length > 250
      ) {
        continue;
      }

      /*
        Sadece Valilik içerik linkleri.
      */

      if (
        !href.includes(
          "kocaeli.gov.tr/"
        )
      ) {
        continue;
      }

      /*
        Menü bağlantılarını çıkar.
      */

      if (
        /\/haberler$|\/duyurular$|\/basin-aciklamalari$|\/iletisim$|\/yikob$/i.test(
          href
        )
      ) {
        continue;
      }

      /*
        Tarih bağlantının çevresindeki
        HTML bölümünde aranıyor.
      */

      const start =
        Math.max(
          0,
          match.index - 700
        );

      const end =
        Math.min(
          html.length,
          match.index + 700
        );

      const context =
        cleanText(
          html.slice(start, end)
        );

      let date =
        parseNumericDate(context);

      if (!date) {
        date =
          parseDate(context);
      }

      /*
        Tarih bulunamayan rastgele
        menü içeriklerini alma.
      */

      if (!date) {
        continue;
      }

      items.push({

        type:
          source.type,

        typeName:
          source.title,

        title,

        url:
          href,

        date

      });
    }

    /*
      Aynı linkleri temizle.
    */

    const seen =
      new Set();

    return items.filter(
      item => {

        if (
          seen.has(item.url)
        ) {
          return false;
        }

        seen.add(item.url);

        return true;
      }
    );

  } catch (error) {

    console.error(
      source.title,
      error.message
    );

    return [];
  }
}


export default async function handler(req, res) {

  try {

    const results =
      await Promise.all(
        SOURCES.map(
          source =>
            getSource(source)
        )
      );

    let items = [];

    results.forEach(list => {
      items.push(...list);
    });

    /*
      Aynı içeriği tekrar gösterme.
    */

    const seen =
      new Set();

    items =
      items.filter(
        item => {

          const key =
            item.url;

          if (seen.has(key)) {
            return false;
          }

          seen.add(key);

          return true;
        }
      );

    /*
      Yeniden eskiye sırala.
    */

    items.sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );

    /*
      Her kategoriden en fazla 10.
    */

    const counts = {};

    const balanced = [];

    for (const item of items) {

      if (!counts[item.type]) {
        counts[item.type] = 0;
      }

      if (
        counts[item.type] >= 10
      ) {
        continue;
      }

      counts[item.type]++;

      balanced.push(item);

      if (
        balanced.length >= 30
      ) {
        break;
      }
    }

    balanced.sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );

    res.status(200).json({

      success: true,

      updatedAt:
        new Date().toISOString(),

      count:
        balanced.length,

      items:
        balanced,

      source:
        "Kocaeli Valiliği"

    });

  } catch (error) {

    console.error(
      "Valilik API hatası:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Kocaeli Valiliği verileri alınamadı.",

      items: []

    });

  }
}
