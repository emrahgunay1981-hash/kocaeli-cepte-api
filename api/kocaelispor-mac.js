// ============================================================
// KOCAELİ CEPTE - KOCAELİSPOR MAÇ BİLGİSİ API
// ============================================================
// Kaynak: beIN SPORTS Kocaelispor fikstür sayfası.
// Maç saatleri için beIN'in takvim (ICS) dosyası denenir;
// alınamazsa maçlar saatsiz döner.
//
// Cevap:
//   siradakiMac  -> oynanmamış ilk maç (geri sayım için)
//   sonMac       -> en son oynanan maç ve skoru
//   gelecekMaclar-> sıradaki 5 maç
//   durum        -> teşhis bilgisi
// ============================================================

const FIKSTUR_URL =
    "https://beinsports.com.tr/takim/kocaelispor/fikstur";

const TAKVIM_URL =
    "https://www.beinsports.com.tr/api/calendar?t=1557&s=";

const CACHE_TIME = 30 * 60 * 1000;


// ------------------------------------------------------------
// ELLE GİRİLEN MAÇ SAATLERİ
// Takvimden saat gelmezse buradaki saat kullanılır.
// Format:  "YYYY-AA-GG": "SS:DD",
// Yeni maç saati açıklanınca buraya bir satır eklemen yeterli.
// ------------------------------------------------------------

const MANUEL_SAATLER = {
    "2026-10-11": "19:00",  // Beşiktaş - Kocaelispor
    "2026-10-18": "16:00",  // Kocaelispor - Göztepe
    "2026-10-23": "20:00",  // Alanyaspor - Kocaelispor
    "2026-10-31": "16:00",  // Kocaelispor - Ç. Rizespor
    "2026-11-07": "13:30",  // Eyüpspor - Kocaelispor
    "2026-11-21": "19:00",  // Kocaelispor - Fenerbahçe
    "2026-11-29": "13:30",  // Çorum FK - Kocaelispor
    "2026-12-06": "13:30",  // Erzurumspor FK - Kocaelispor
    "2026-12-13": "13:30",  // Kocaelispor - Gençlerbirliği
    "2026-12-21": "20:00"   // Trabzonspor - Kocaelispor
};

let cache = { timestamp: 0, data: null };


const AYLAR = {
    "ocak": 1, "şubat": 2, "mart": 3, "nisan": 4,
    "mayıs": 5, "haziran": 6, "temmuz": 7, "ağustos": 8,
    "eylül": 9, "ekim": 10, "kasım": 11, "aralık": 12
};


// ------------------------------------------------------------
// YARDIMCILAR
// ------------------------------------------------------------

function decodeEntities(text) {
    return String(text || "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(parseInt(c, 10)));
}

function cleanText(html) {
    return decodeEntities(
        String(html || "")
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]*>/g, " ")
    )
        .replace(/\s+/g, " ")
        .trim();
}

async function getir(url, timeout = 10000) {

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {

        const response = await fetch(url, {
            signal: controller.signal,
            redirect: "follow",
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
                "Accept":
                    "text/html,application/xhtml+xml,text/calendar,*/*;q=0.8",
                "Accept-Language":
                    "tr-TR,tr;q=0.9,en;q=0.8"
            }
        });

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        return await response.text();

    }
    finally {
        clearTimeout(timer);
    }
}

function iki(n) {
    return String(n).padStart(2, "0");
}

// Türkiye saatine göre bugünün tarihi (YYYY-AA-GG)
function bugunTR() {
    const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
    return d.getUTCFullYear() + "-" + iki(d.getUTCMonth() + 1) + "-" + iki(d.getUTCDate());
}


// ------------------------------------------------------------
// TAKVİM (ICS) -> { "2026-10-11": "2026-10-11T20:00:00+03:00" }
// ------------------------------------------------------------

function takvimSaatleri(ics) {

    const saatler = {};

    const olaylar =
        String(ics || "").split("BEGIN:VEVENT").slice(1);

    for (const olay of olaylar) {

        const m =
            olay.match(/DTSTART[^:\r\n]*:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)/);

        if (!m) continue;

        let tarih;

        if (m[7] === "Z") {

            // UTC -> Türkiye saati (+3)
            const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
            const tr = new Date(utc + 3 * 60 * 60 * 1000);

            tarih = {
                y: tr.getUTCFullYear(),
                ay: tr.getUTCMonth() + 1,
                g: tr.getUTCDate(),
                s: tr.getUTCHours(),
                dk: tr.getUTCMinutes()
            };

        }
        else {

            tarih = { y: +m[1], ay: +m[2], g: +m[3], s: +m[4], dk: +m[5] };

        }

        const gun =
            tarih.y + "-" + iki(tarih.ay) + "-" + iki(tarih.g);

        saatler[gun] =
            gun + "T" + iki(tarih.s) + ":" + iki(tarih.dk) + ":00+03:00";

    }

    return saatler;
}


// ------------------------------------------------------------
// FİKSTÜR SAYFASI
// ------------------------------------------------------------

function fiksturuAyikla(html) {

    // Sezon: "2026/2027"
    const sezon = html.match(/(20\d{2})\s*\/\s*(20\d{2})/);
    const ilkYil = sezon ? +sezon[1] : new Date().getFullYear();
    const ikinciYil = sezon ? +sezon[2] : ilkYil + 1;

    const satirlar =
        html.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];

    const maclar = [];

    for (const satir of satirlar) {

        const link =
            (satir.match(/href=["']([^"']*\/mac-merkezi\/[^"']+)["']/i) || [])[1];

        if (!link) continue;

        const hucreler =
            satir.match(/<td\b[\s\S]*?<\/td>/gi) || [];

        if (hucreler.length < 4) continue;

        const tarihYazi = cleanText(hucreler[0]);
        const evSahibi = cleanText(hucreler[1]);
        const skorYazi = cleanText(hucreler[2]);
        const deplasman = cleanText(hucreler[3]);

        const logo = h =>
            (h.match(/<img[^>]+src=["']([^"']+\/img\/teams\/[^"']+)["']/i) || [])[1] || "";

        const t =
            tarihYazi.match(/(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)/);

        if (!t || !evSahibi || !deplasman) continue;

        const ay = AYLAR[t[2].toLocaleLowerCase("tr-TR")];

        if (!ay) continue;

        const yil = ay >= 7 ? ilkYil : ikinciYil;

        const tarih =
            yil + "-" + iki(ay) + "-" + iki(t[1]);

        const skor =
            skorYazi.match(/^(\d+)\s*-\s*(\d+)/);

        const kocaeliEvde =
            /kocaelispor/i.test(evSahibi);

        let sonuc = "";

        if (skor) {

            const biz = kocaeliEvde ? +skor[1] : +skor[2];
            const onlar = kocaeliEvde ? +skor[2] : +skor[1];

            sonuc =
                biz > onlar ? "G" : biz < onlar ? "M" : "B";

        }

        maclar.push({
            tarih,
            gunYazi: tarihYazi.replace(/\s*MS.*$/i, "").trim(),
            saat: "",
            baslangic: "",
            evSahibi,
            deplasman,
            evSahibiLogo: logo(hucreler[1]),
            deplasmanLogo: logo(hucreler[3]),
            kocaeliEvde,
            rakip: kocaeliEvde ? deplasman : evSahibi,
            oynandi: !!skor,
            skor: skor ? skor[1] + " - " + skor[2] : "",
            sonuc,
            link: link.startsWith("/") ? "https://beinsports.com.tr" + link : link
        });

    }

    maclar.sort((a, b) => a.tarih.localeCompare(b.tarih));

    return { maclar, ilkYil };
}


async function verileriTopla() {

    const html = await getir(FIKSTUR_URL);

    const { maclar, ilkYil } = fiksturuAyikla(html);

    // Saatleri takvimden dene
    let saatDurumu = "takvim denenmedi";

    try {

        const ics = await getir(TAKVIM_URL + ilkYil, 8000);
        const saatler = takvimSaatleri(ics);
        let eslesen = 0;

        for (const mac of maclar) {

            if (saatler[mac.tarih]) {
                mac.baslangic = saatler[mac.tarih];
                mac.saat = saatler[mac.tarih].slice(11, 16);
                eslesen++;
            }

        }

        saatDurumu = "takvimden " + eslesen + " maç saati";

    }
    catch (error) {

        saatDurumu = "takvim hata: " + error.message;

    }

    // Takvimden gelmeyen saatleri elle girilen listeden tamamla
    let manuel = 0;

    for (const mac of maclar) {

        if (!mac.saat && MANUEL_SAATLER[mac.tarih]) {
            mac.saat = MANUEL_SAATLER[mac.tarih];
            mac.baslangic = mac.tarih + "T" + mac.saat + ":00+03:00";
            manuel++;
        }

    }

    saatDurumu += ", elle " + manuel + " maç saati";

    const bugun = bugunTR();

    const oynanan = maclar.filter(m => m.oynandi);

    const gelecek =
        maclar.filter(m => !m.oynandi && m.tarih >= bugun);

    return {
        siradakiMac: gelecek[0] || null,
        sonMac: oynanan[oynanan.length - 1] || null,
        gelecekMaclar: gelecek.slice(0, 5),
        durum:
            maclar.length + " maç, " +
            oynanan.length + " oynanmış, " +
            saatDurumu
    };
}


// ------------------------------------------------------------
// API
// ------------------------------------------------------------

module.exports = async function handler(req, res) {

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    const now = Date.now();

    if (cache.data && now - cache.timestamp < CACHE_TIME) {
        return res.status(200).json({
            success: true,
            ...cache.data,
            updatedAt: cache.timestamp,
            cached: true
        });
    }

    try {

        const data = await verileriTopla();

        cache = { timestamp: now, data };

        return res.status(200).json({
            success: true,
            ...data,
            updatedAt: now,
            cached: false
        });

    }
    catch (error) {

        console.error("Kocaelispor maç API:", error);

        if (cache.data) {
            return res.status(200).json({
                success: true,
                ...cache.data,
                updatedAt: cache.timestamp,
                cached: true,
                warning: "Güncel veri alınamadı."
            });
        }

        return res.status(500).json({
            success: false,
            error: "Maç bilgisi alınamadı.",
            durum: "hata: " + error.message
        });

    }

};
