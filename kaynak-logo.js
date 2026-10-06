// =========================================================
// KOCAELİ CEPTE - KAYNAK LOGOSU (ORTAK DOSYA)
// =========================================================
// Fotoğrafı olmayan (veya fotoğrafı açılmayan) haberlerde
// ikon yerine haberin geldiği sitenin logosunu gösterir.
// index.html, haberler.html ve sport.html bu dosyayı kullanır.
//
// YENİ KAYNAK EKLEMEK İÇİN:
// Aşağıdaki listeye şu formatta bir satır ekle:
//   "kaynağın adı (küçük harfle)": "sitesi.com.tr",
// =========================================================

const KAYNAK_SITELERI = {
  "özgür kocaeli": "ozgurkocaeli.com.tr",
  "kocaeli gazetesi": "kocaeligazetesi.com.tr",
  "kocaeli barış gazetesi": "kocaelibarisgazetesi.com",
  "kocaeli barış": "kocaelibarisgazetesi.com",
  "çağdaş kocaeli": "cagdaskocaeli.com.tr",
  "bizim yaka": "bizimyaka.com",
  "ses kocaeli": "seskocaeli.com",
  "ihlas haber ajansı": "iha.com.tr",
  "iha": "iha.com.tr",
  "demirören haber ajansı": "dha.com.tr",
  "dha": "dha.com.tr",
  "anadolu ajansı": "aa.com.tr",
  "hürriyet": "hurriyet.com.tr",
  "milliyet": "milliyet.com.tr",
  "sabah": "sabah.com.tr",
  "sözcü": "sozcu.com.tr",
  "habertürk": "haberturk.com",
  "ntv": "ntv.com.tr",
  "cnn türk": "cnnturk.com",
  "trt haber": "trthaber.com",
  "trt spor": "trtspor.com.tr",
  "yeni şafak": "yenisafak.com",
  "haber7": "haber7.com",
  "haber 7": "haber7.com",
  "mynet": "mynet.com",
  "son dakika": "sondakika.com",
  "cumhuriyet": "cumhuriyet.com.tr",
  "posta": "posta.com.tr",
  "takvim": "takvim.com.tr",
  "star": "star.com.tr",
  "a haber": "ahaber.com.tr",
  "a spor": "aspor.com.tr",
  "haber global": "haberglobal.com.tr",
  "t24": "t24.com.tr",
  "fanatik": "fanatik.com.tr",
  "fotomaç": "fotomac.com.tr",
  "ajansspor": "ajansspor.com",
  "sporx": "sporx.com"
};


// Bir metni düzenli ifade içinde güvenle kullanmak için
function kaynakRegexKacis(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


// Haberin geldiği sitenin alan adını bulur (bulamazsa "")
function kaynakSitesi(item) {

  const source =
    String(item.source || "")
      .trim()
      .toLocaleLowerCase("tr-TR");

  // 1) Kaynak adı zaten bir alan adıysa (hurriyet.com.tr gibi)
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(source)) {
    return source.replace(/^www\./, "");
  }

  if (source) {

    // 2) Tam eşleşme
    if (KAYNAK_SITELERI[source]) {
      return KAYNAK_SITELERI[source];
    }

    // 3) Kısmi eşleşme ("Kocaeli Barış Gazetesi" -> "kocaeli barış")
    //    Uzun isimler önce denenir, kelime sınırına dikkat edilir.
    const anahtarlar =
      Object.keys(KAYNAK_SITELERI)
        .sort((a, b) => b.length - a.length);

    for (const anahtar of anahtarlar) {

      const desen =
        new RegExp(
          "(^|\\s)" + kaynakRegexKacis(anahtar) + "(\\s|$)"
        );

      if (desen.test(source)) {
        return KAYNAK_SITELERI[anahtar];
      }

    }

  }

  // 4) Haberin bağlantısındaki site
  //    (Google Haberler yönlendirmesi ise kullanma)
  try {

    const host =
      new URL(item.link)
        .hostname
        .replace(/^www\./, "");

    if (!/google\./.test(host)) {
      return host;
    }

  } catch (e) {}

  return "";

}


// Sitenin logosunun adresi (bulunamazsa "")
function kaynakLogoUrl(item) {

  const site =
    kaynakSitesi(item);

  if (!site) return "";

  return (
    "https://www.google.com/s2/favicons?sz=128&domain=" +
    encodeURIComponent(site)
  );

}


function kaynakHtmlKacis(text) {

  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// Fotoğraf yerine gösterilecek kutu:
// logo varsa logo, yoksa ikon (varsayılan 📰)
function logoKutusuHtml(item, className, icon) {

  const ikon =
    icon || "📰";

  const logo =
    kaynakLogoUrl(item);

  if (!logo) {
    return `<div class="${className}">${ikon}</div>`;
  }

  return `
    <div class="${className} logo-fallback">
      <img
        src="${kaynakHtmlKacis(logo)}"
        alt=""
        loading="lazy"
        data-icon="${kaynakHtmlKacis(ikon)}"
        onerror="var p=this.parentNode; p.classList.remove('logo-fallback'); p.textContent=this.dataset.icon;"
      >
    </div>
  `;

}


// Haber fotoğrafı açılmazsa yerine logo kutusunu koyar.
// Kullanım: <img ... data-source="..." data-link="..."
//   data-fallback-class="..." data-icon="📰"
//   onerror="resimAcilmadi(this)">
function resimAcilmadi(img) {

  const item = {
    source: img.dataset.source,
    link: img.dataset.link
  };

  const kutu =
    document.createElement("div");

  kutu.innerHTML =
    logoKutusuHtml(
      item,
      img.dataset.fallbackClass,
      img.dataset.icon
    ).trim();

  img.replaceWith(
    kutu.firstElementChild
  );

}


// =========================================================
// AYNI HABERİ TEKRAR GÖSTERME
// =========================================================
// Farklı gazeteler aynı olayı neredeyse aynı başlıkla
// verebiliyor ("Beşiktaş, Kocaelispor maçı hazırlıklarını
// sürdürdü - Ajansspor" ve "... - Sözcü" gibi). Bu fonksiyon
// başlıkları karşılaştırır, benzer olanlardan sadece birini
// bırakır. Fotoğraflı olanı tercih eder.
//
// BENZERLIK_ESIGI: 0 ile 1 arası. Büyüdükçe sadece çok benzer
// başlıklar elenir. Fazla haber kayboluyorsa 0.7 yap.
// =========================================================

const BENZERLIK_ESIGI = 0.6;

const ONEMSIZ_KELIMELER = new Set([
  "bir", "ve", "ile", "için", "icin", "da", "de", "bu", "şu",
  "olan", "oldu", "gibi", "daha", "çok", "son", "dakika"
]);


function baslikKelimeleri(title) {

  let text =
    String(title || "");

  // Sondaki " - Kaynak Adı" kısmını at
  const dashIndex =
    text.lastIndexOf(" - ");

  if (dashIndex > 20) {
    text = text.slice(0, dashIndex);
  }

  const kelimeler =
    text
      .toLocaleLowerCase("tr-TR")
      .replace(/[^a-zçğıöşü0-9\s]/gi, " ")
      .split(/\s+/)
      .filter(k => k.length >= 3 && !ONEMSIZ_KELIMELER.has(k))
      // Türkçe ekleri yok saymak için kelimenin ilk 5 harfi
      // ("maçı" / "maçının", "kocaelispor'da" / "kocaelispor")
      .map(k => k.slice(0, 5));

  return new Set(kelimeler);

}


function baslikBenzerligi(a, b) {

  if (!a.size || !b.size) return 0;

  let ortak = 0;

  a.forEach(k => {
    if (b.has(k)) ortak++;
  });

  return ortak / (a.size + b.size - ortak);

}


function benzerHaberleriTemizle(items) {

  if (!Array.isArray(items)) return [];

  const sonuc = [];

  for (const item of items) {

    const kelimeler =
      baslikKelimeleri(item.title);

    let ayniIndex = -1;

    for (let i = 0; i < sonuc.length; i++) {

      if (
        baslikBenzerligi(kelimeler, sonuc[i]._kelimeler) >=
        BENZERLIK_ESIGI
      ) {
        ayniIndex = i;
        break;
      }

    }

    if (ayniIndex === -1) {

      sonuc.push({ ...item, _kelimeler: kelimeler });

    }
    else if (!sonuc[ayniIndex].image && item.image) {

      // Öncekinde fotoğraf yoksa, fotoğraflı olanı tut
      // (listedeki yeri değişmez)
      sonuc[ayniIndex] = { ...item, _kelimeler: kelimeler };

    }

  }

  return sonuc.map(item => {
    const temiz = { ...item };
    delete temiz._kelimeler;
    return temiz;
  });

}


// =========================================================
// ESKİ HABERLERİ GİZLE
// =========================================================
// HABER_EN_FAZLA_GUN: Kaç günden eski haberler gizlensin.
// Sakin günlerde sayfa boş kalmasın diye, kalan haber sayısı
// HABER_EN_AZ_SAYI'nın altına düşerse süre YEDEK_GUN'e uzatılır.
// Tarihi hiç anlaşılamayan haberler gizlenmez.
// =========================================================

const HABER_EN_FAZLA_GUN = 3;
const YEDEK_GUN = 7;
const HABER_EN_AZ_SAYI = 5;


// Haberin kaç gün önce yayımlandığını bulur (bulamazsa null)
function haberKacGunOnce(item) {

  const simdi = Date.now();
  const GUN = 24 * 60 * 60 * 1000;

  // 1) Gerçek tarih alanları
  for (const alan of [item.pubDate, item.isoDate, item.date]) {

    if (!alan) continue;

    const t = new Date(alan).getTime();

    if (!isNaN(t)) {
      return (simdi - t) / GUN;
    }

  }

  // 2) "4 saat önce", "2 hafta önce", "dün" gibi yazılar
  const yazi =
    String(item.time || "")
      .toLocaleLowerCase("tr-TR");

  if (!yazi) return null;

  if (yazi.includes("az önce") || yazi.includes("şimdi")) return 0;
  if (yazi.includes("dün")) return 1;

  const m =
    yazi.match(/(\d+)\s*(saniye|dakika|saat|gün|hafta|ay|yıl)/);

  if (!m) return null;

  const sayi = parseInt(m[1], 10);

  const carpan = {
    "saniye": 1 / 86400,
    "dakika": 1 / 1440,
    "saat": 1 / 24,
    "gün": 1,
    "hafta": 7,
    "ay": 30,
    "yıl": 365
  }[m[2]];

  return sayi * carpan;

}


function guncelHaberler(items) {

  if (!Array.isArray(items)) return [];

  const filtrele = gunSiniri =>
    items.filter(item => {
      const gun = haberKacGunOnce(item);
      return gun === null || gun <= gunSiniri;
    });

  const sonuc =
    filtrele(HABER_EN_FAZLA_GUN);

  if (sonuc.length >= HABER_EN_AZ_SAYI) {
    return sonuc;
  }

  return filtrele(YEDEK_GUN);

}
