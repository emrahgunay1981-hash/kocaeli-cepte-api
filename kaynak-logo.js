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

