// ============================================================
// KOCAELİ CEPTE - ETKİNLİKLER API
// ============================================================

const CACHE_TIME = 15 * 60 * 1000;

let cache = {
    timestamp: 0,
    data: null
};


// ============================================================
// HTML ENTITY ÇÖZÜMLEME
// ============================================================

function decodeHtmlEntities(text) {

    if (!text) return "";

    const entities = {
        "&nbsp;": " ",
        "&amp;": "&",
        "&quot;": '"',
        "&apos;": "'",
        "&#39;": "'",
        "&lt;": "<",
        "&gt;": ">",
        "&uuml;": "ü",
        "&Uuml;": "Ü",
        "&ouml;": "ö",
        "&Ouml;": "Ö",
        "&ccedil;": "ç",
        "&Ccedil;": "Ç",
        "&scedil;": "ş",
        "&Scedil;": "Ş",
        "&gbreve;": "ğ",
        "&Gbreve;": "Ğ",
        "&inodot;": "ı",
        "&Idot;": "İ"
    };

    text = text.replace(
        /&[a-zA-Z0-9#]+;/g,
        entity => entities[entity] || entity
    );

    text = text.replace(
        /&#(\d+);/g,
        (_, code) => {
            try {
                return String.fromCodePoint(
                    parseInt(code, 10)
                );
            } catch {
                return _;
            }
        }
    );

    text = text.replace(
        /&#x([0-9a-fA-F]+);/g,
        (_, code) => {
            try {
                return String.fromCodePoint(
                    parseInt(code, 16)
                );
            } catch {
                return _;
            }
        }
    );

    return text;
}


// ============================================================
// TEMİZ METİN
// ============================================================

function cleanText(text) {

    if (!text) return "";

    let value = String(text);

    value = value.replace(
        /<script[\s\S]*?<\/script>/gi,
        " "
    );

    value = value.replace(
        /<style[\s\S]*?<\/style>/gi,
        " "
    );

    value = value.replace(
        /<br\s*\/?>/gi,
        " "
    );

    value = value.replace(
        /<[^>]*>/g,
        " "
    );

    value = decodeHtmlEntities(value);

    value = value.replace(
        /\s+/g,
        " "
    );

    return value.trim();
}


// ============================================================
// FETCH
// ============================================================

async function fetchWithTimeout(
    url,
    timeout = 15000
) {

    const controller =
        new AbortController();

    const timer =
        setTimeout(
            () => controller.abort(),
            timeout
        );

    try {

        const response =
            await fetch(
                url,
                {
                    signal:
                        controller.signal,

                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36",

                        "Accept":
                            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                    }
                }
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        return await response.text();

    }
    finally {

        clearTimeout(timer);

    }
}


// ============================================================
// TARİH
// ============================================================

function parseEventDate(dateText) {

    if (!dateText) return null;

    const value =
        cleanText(dateText);

    const match =
        value.match(
            /(\d{1,2})[./-](\d{1,2})[./-](20\d{2})/
        );

    if (!match) return null;

    return (
        match[3] +
        "-" +
        match[2].padStart(2, "0") +
        "-" +
        match[1].padStart(2, "0")
    );
}


// ============================================================
// BELEDİYE ETKİNLİKLERİ
// ============================================================

async function getBelediyeEtkinlikleri() {

    const url =
        "https://kultursanat.kocaeli.bel.tr/etkinlik/feed/";

    try {

        const xml =
            await fetchWithTimeout(url);

        const items =
            xml.match(
                /<item[\s\S]*?<\/item>/gi
            ) || [];

        const events = [];

        for (const item of items) {

            const title =
                cleanText(
                    (
                        item.match(
                            /<title[^>]*>([\s\S]*?)<\/title>/i
                        ) || []
                    )[1] || ""
                );

            const description =
                cleanText(
                    (
                        item.match(
                            /<description[^>]*>([\s\S]*?)<\/description>/i
                        ) || []
                    )[1] || ""
                );

            const link =
                cleanText(
                    (
                        item.match(
                            /<link[^>]*>([\s\S]*?)<\/link>/i
                        ) || []
                    )[1] || ""
                );

            const pubDate =
                cleanText(
                    (
                        item.match(
                            /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i
                        ) || []
                    )[1] || ""
                );

            if (!title) continue;

            const lower =
                (
                    title +
                    " " +
                    description
                ).toLocaleLowerCase(
                    "tr-TR"
                );

            let category =
                "genel";

            if (
                /konser|müzik|muzik|dj|şarkıcı|sarkici/.test(lower)
            ) {

                category = "konser";

            }
            else if (
                /tiyatro|sahne|müzikali|muzikali/.test(lower)
            ) {

                category = "tiyatro";

            }
            else if (
                /çocuk|cocuk/.test(lower)
            ) {

                category = "çocuk";

            }

            events.push({

                title,

                description,

                link,

                date: pubDate,

                time: "",

                venue: "",

                category,

                sport: "",

                source:
                    "Kocaeli Büyükşehir Belediyesi"

            });

        }

        return events;

    }
    catch (error) {

        console.error(
            "Belediye etkinlikleri:",
            error.message
        );

        return [];

    }
}


// ============================================================
// KOCAELİ SEYRET
// ============================================================

async function getSeyretEtkinlikleri() {
    const urls = [
        "https://kocaeliseyret.com/kocaeli-etkinlikler",
        "https://www.kocaeliseyret.com/kocaeli-etkinlikler"
    ];

    let html = null;
    let usedUrl = null;

    for (const url of urls) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(url, {
                method: "GET",
                signal: controller.signal,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
                    "Accept":
                        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
                }
            });

            clearTimeout(timeout);

            if (!response.ok) {
                console.log(`Kocaeli Seyret: HTTP ${response.status} - ${url}`);
                continue;
            }

            html = await response.text();
            usedUrl = url;

            if (html && html.length > 1000) {
                break;
            }

        } catch (error) {
            console.log(
                `Kocaeli Seyret bağlantı hatası: ${url} - ${error.message}`
            );
        }
    }

    if (!html) {
        console.log("Kocaeli Seyret: hiçbir kaynak erişilebilir değil");
        return [];
    }

    try {
        const events = [];

        // HTML entity temizleme
        const decode = (text) => {
            if (!text) return "";

            return text
                .replace(/&nbsp;/gi, " ")
                .replace(/&amp;/gi, "&")
                .replace(/&quot;/gi, '"')
                .replace(/&#39;/gi, "'")
                .replace(/&apos;/gi, "'")
                .replace(/&lt;/gi, "<")
                .replace(/&gt;/gi, ">")
                .replace(/&#(\d+);/g, (_, n) =>
                    String.fromCharCode(Number(n))
                )
                .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
                    String.fromCharCode(parseInt(n, 16))
                );
        };

        const clean = (text) => {
            return decode(
                text
                    .replace(/<script[\s\S]*?<\/script>/gi, " ")
                    .replace(/<style[\s\S]*?<\/style>/gi, " ")
                    .replace(/<[^>]+>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
            );
        };

        /*
         * Kocaeli Seyret etkinlikleri genellikle h2/h3/h4
         * başlıkları altında bulunuyor.
         *
         * Her başlığın kendisi ve bir sonraki başlığa kadar
         * olan bölüm birlikte inceleniyor.
         */
        const headingRegex =
            /<(h2|h3|h4)[^>]*>([\s\S]*?)<\/\1>/gi;

        const headings = [];
        let match;

        while ((match = headingRegex.exec(html)) !== null) {
            const title = clean(match[2]);

            if (!title) continue;

            headings.push({
                title,
                start: match.index,
                end: headingRegex.lastIndex
            });
        }

        for (let i = 0; i < headings.length; i++) {
            const current = headings[i];

            const nextStart =
                i + 1 < headings.length
                    ? headings[i + 1].start
                    : html.length;

            const sectionHtml = html.slice(
                current.end,
                nextStart
            );

            const sectionText = clean(sectionHtml);

            /*
             * Tarih örnekleri:
             * 30 Eylül 2026
             * 2 Ekim 2026
             * 3 Ekim 2026
             */
            const dateMatch = sectionText.match(
                /(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(\d{4})/i
            );

            if (!dateMatch) continue;

            /*
             * Saat örnekleri:
             * 17:30
             * 18:00
             * 19:15
             */
            const timeMatch = sectionText.match(
                /\b([01]?\d|2[0-3]):([0-5]\d)\b/
            );

            if (!timeMatch) continue;

            const dateText = dateMatch[0];

            /*
             * Menü / navigasyon / kategori başlıklarını
             * etkinlik olarak almamak için bazı kontroller.
             */
            const ignoredTitles = [
                "Ana Sayfa",
                "Etkinlikler",
                "Kocaeli Etkinlikleri",
                "Kategoriler",
                "İletişim",
                "Hakkımızda",
                "Blog",
                "Tüm Etkinlikler",
                "Yaklaşan Etkinlikler"
            ];

            if (
                ignoredTitles.some(
                    x => current.title.toLowerCase() === x.toLowerCase()
                )
            ) {
                continue;
            }

            if (current.title.length < 3) continue;

            /*
             * Etkinlik linkini başlığın bulunduğu bölgeden almaya çalış.
             */
            const linkMatch = sectionHtml.match(
                /<a[^>]+href=["']([^"']+)["'][^>]*>/i
            );

            let link = "https://kocaeliseyret.com/kocaeli-etkinlikler";

            if (linkMatch) {
                let href = decode(linkMatch[1]).trim();

                if (href.startsWith("/")) {
                    href = "https://kocaeliseyret.com" + href;
                }

                if (
                    href.startsWith("http://") ||
                    href.startsWith("https://")
                ) {
                    link = href;
                }
            }

            /*
             * Mekân bilgisini yakalamaya çalış.
             */
            let venue = "";

            const venuePatterns = [
                /(?:Mekan|Mekân|Yer|Salon|Adres)\s*[:\-]\s*([^|•\n]+)/i,
                /(?:Etkinlik Yeri)\s*[:\-]\s*([^|•\n]+)/i
            ];

            for (const pattern of venuePatterns) {
                const venueMatch = sectionText.match(pattern);

                if (venueMatch) {
                    venue = venueMatch[1]
                        .replace(/\s+/g, " ")
                        .trim();

                    if (venue.length > 100) {
                        venue = venue.substring(0, 100);
                    }

                    break;
                }
            }

            /*
             * Tarih + saat bilgisinden JS Date oluştur.
             */
            const aylar = {
                Ocak: 0,
                Şubat: 1,
                Mart: 2,
                Nisan: 3,
                Mayıs: 4,
                Haziran: 5,
                Temmuz: 6,
                Ağustos: 7,
                Eylül: 8,
                Ekim: 9,
                Kasım: 10,
                Aralık: 11
            };

            const ayAdi =
                dateMatch[2]
                    .charAt(0)
                    .toUpperCase() +
                dateMatch[2].slice(1).toLowerCase();

            const day = Number(dateMatch[1]);
            const year = Number(dateMatch[3]);
            const month = aylar[ayAdi];

            if (month === undefined) continue;

            const hour = Number(timeMatch[1]);
            const minute = Number(timeMatch[2]);

            const eventDate = new Date(
                year,
                month,
                day,
                hour,
                minute
            );

            if (isNaN(eventDate.getTime())) continue;

            /*
             * Geçmiş etkinlikleri alma.
             */
            if (eventDate < new Date()) {
                continue;
            }

            /*
             * Aynı etkinliğin tekrar eklenmesini engelle.
             */
            const duplicateKey =
                `${current.title}-${dateText}-${timeMatch[0]}`
                    .toLowerCase();

            if (
                events.some(
                    e =>
                        e.duplicateKey === duplicateKey
                )
            ) {
                continue;
            }

            events.push({
                title: current.title,
                description: sectionText.substring(0, 500),
                date: eventDate.toISOString(),
                dateText,
                time: timeMatch[0],
                venue,
                category: "kültür",
                source: "Kocaeli Seyret",
                link,
                duplicateKey
            });
        }

        console.log(
            `Kocaeli Seyret: ${events.length} etkinlik bulundu (${usedUrl})`
        );

        return events.map(event => {
            const copy = { ...event };
            delete copy.duplicateKey;
            return copy;
        });

    } catch (error) {
        console.log(
            `Kocaeli Seyret parser hatası: ${error.message}`
        );

        return [];
    }
}


// ============================================================
// VOLEYBOL YARDIMCILARI
// ============================================================

function looksLikeTeam(value) {

    if (!value) return false;

    const text =
        cleanText(value);

    if (text.length < 3) return false;

    if (
        /^\d+\s*[A-ZÇĞİÖŞÜ]{1,5}$/i.test(text)
    ) {
        return false;
    }

    if (
        /^\d+[A-ZÇĞİÖŞÜ]{1,5}$/i.test(text)
    ) {
        return false;
    }

    if (
        /\b\d{1,2}:\d{2}\b/.test(text)
    ) {
        return false;
    }

    if (
        /SPOR SALONU|SPOR KOMPLEKSİ|SPOR KOMPLEKSI/i.test(text)
    ) {
        return false;
    }

    if (
        /^(tarih|saat|salon|yer|takım|takim|maç|mac|kategori|lig)$/i.test(text)
    ) {
        return false;
    }

    return true;
}


function findTime(values) {

    for (const value of values) {

        const match =
            cleanText(value).match(
                /\b([01]?\d|2[0-3]):([0-5]\d)\b/
            );

        if (match) {

            return (
                match[1].padStart(2, "0") +
                ":" +
                match[2]
            );

        }

    }

    return "";
}


function findDate(values) {

    for (const value of values) {

        const match =
            cleanText(value).match(
                /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/
            );

        if (match) {

            return (
                match[1].padStart(2, "0") +
                "." +
                match[2].padStart(2, "0") +
                "." +
                match[3]
            );

        }

    }

    return "";
}


function findVenue(values) {

    for (const value of values) {

        const text =
            cleanText(value);

        if (
            /SPOR SALONU|SPOR KOMPLEKSİ|SPOR KOMPLEKSI|SPOR TESİSLERİ|SPOR TESISLERI|KAPALI SPOR/i.test(
                text
            )
        ) {

            return text;

        }

    }

    return "";
}


function findTeams(
    values,
    venue,
    time,
    date
) {

    const teams = [];

    for (const value of values) {

        const text =
            cleanText(value);

        if (!looksLikeTeam(text)) continue;

        if (
            venue &&
            text === venue
        ) {
            continue;
        }

        if (
            time &&
            text.includes(time)
        ) {
            continue;
        }

        if (
            date &&
            text.includes(date)
        ) {
            continue;
        }

        if (
            !teams.some(
                item =>
                    item.toLocaleLowerCase(
                        "tr-TR"
                    ) ===
                    text.toLocaleLowerCase(
                        "tr-TR"
                    )
            )
        ) {

            teams.push(text);

        }

    }

    return teams.slice(0, 2);
}


// ============================================================
// VOLEYBOL
// ============================================================

async function getVoleybolEtkinlikleri() {

    const url =
        "https://kocaeli.voleyboliltemsilciligi.com/";

    try {

        const html =
            await fetchWithTimeout(
                url
            );

        const rows =
            html.match(
                /<tr\b[^>]*>[\s\S]*?<\/tr>/gi
            ) || [];

        const events = [];

        let currentDate = "";

        let currentVenue = "";

        for (const row of rows) {

            const cells =
                row.match(
                    /<t[dh]\b[^>]*>[\s\S]*?<\/t[dh]>/gi
                ) || [];

            if (!cells.length) continue;

            const values =
                cells
                    .map(cleanText)
                    .filter(Boolean);

            if (!values.length) continue;

            const rowText =
                values.join(" | ");

            const dateMatch =
                rowText.match(
                    /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/
                );

            if (dateMatch) {

                currentDate =
                    `${dateMatch[1].padStart(2, "0")}.${dateMatch[2].padStart(2, "0")}.${dateMatch[3]}`;

            }

            const venue =
                findVenue(values);

            if (venue) {

                currentVenue =
                    venue;

            }

            const time =
                findTime(values);

            if (!time) continue;

            const date =
                findDate(values) ||
                currentDate;

            if (!date) continue;

            const finalVenue =
                venue ||
                currentVenue ||
                "";

            const teams =
                findTeams(
                    values,
                    finalVenue,
                    time,
                    date
                );

            if (teams.length < 2) continue;

            const homeTeam =
                teams[0];

            const awayTeam =
                teams[1];

            if (
                homeTeam.toLocaleLowerCase(
                    "tr-TR"
                ) ===
                awayTeam.toLocaleLowerCase(
                    "tr-TR"
                )
            ) {
                continue;
            }

            events.push({

                title:
                    `${homeTeam} × ${awayTeam}`,

                description:
                    `${homeTeam} - ${awayTeam} Kocaeli voleybol karşılaşması`,

                date,

                isoDate:
                    parseEventDate(date),

                time,

                venue:
                    finalVenue,

                category:
                    "spor",

                sport:
                    "Voleybol",

                homeTeam,

                awayTeam,

                link:
                    url,

                source:
                    "Kocaeli Voleybol İl Temsilciliği"

            });

        }

        const unique = [];

        const seen =
            new Set();

        for (const event of events) {

            const key =
                [
                    event.date,
                    event.time,
                    event.venue,
                    event.homeTeam,
                    event.awayTeam
                ]
                    .join("|")
                    .toLocaleLowerCase(
                        "tr-TR"
                    );

            if (seen.has(key)) continue;

            seen.add(key);

            unique.push(event);

        }

        return unique;

    }
    catch (error) {

        console.error(
            "Voleybol:",
            error.message
        );

        return [];

    }
}


// ============================================================
// BASKETBOL
// ============================================================
// TBF'nin genel sayfaları (ana sayfa, /ligler) fikstür bilgisi
// içermiyor - onlar sadece tanıtım/duyuru sayfaları. Bu yüzden
// Kocaeli'nin Basketbol Süper Ligi takımı Glint Körfez Basket
// için Flashscore'un takım sayfasını kullanıyoruz. O sayfa,
// "Sonraki maçlar: 04.10. Fenerbahçe - Korfez Basket, ..."
// şeklinde düz metin bir özet cümlesi içeriyor; onu ayrıştırıyoruz.
// Erişim engellenir veya sayfa yapısı değişirse tüm API'yi
// bozmadan sessizce boş döner.
// ============================================================

const BASKETBOL_TAKIMLARI = [

    {

        adi: "Glint Körfez Basket",

        url:
            "https://www.flashscore.com.tr/takim/korfez-basket/pbAAjuKU/",

        eslesmeAnahtari:
            /korfez|körfez/i

    }

    // İleride başka bir Kocaeli takımı (ör. Çayırova
    // Belediyesi) eklenmek istenirse buraya aynı formatta
    // bir kayıt daha eklenebilir.

];


function parseFlashscoreSonrakiMaclar(
    cleanedText,
    team
) {

    const helpMatch =
        cleanedText.match(
            /Sonraki maçlar\s*:\s*(.+?)(?:\s+Daha fazlası|\s+FUTBOL|\s+Diğer Sporlar|\s+Livescore|$)/i
        );

    if (!helpMatch) return [];

    const raw =
        helpMatch[1];

    // "04.10. Fenerbahçe - Korfez Basket" gibi parçalara ayır.
    const parts =
        raw.match(
            /\d{1,2}\.\s*\d{1,2}\.\s*[^,]+?(?:-\s*[^,]+)?(?=,\s*\d{1,2}\.\s*\d{1,2}\.|$)/g
        ) || [];

    const now =
        new Date();

    const currentYear =
        now.getFullYear();

    const currentMonth =
        now.getMonth() + 1;

    const events = [];

    for (const part of parts) {

        const match =
            part.match(
                /(\d{1,2})\.\s*(\d{1,2})\.\s*(.+?)\s*-\s*(.+)/
            );

        if (!match) continue;

        const day =
            match[1].padStart(2, "0");

        const month =
            match[2].padStart(2, "0");

        const monthNum =
            parseInt(match[2], 10);

        const year =
            monthNum < currentMonth
                ? currentYear + 1
                : currentYear;

        const teamA =
            cleanText(match[3]);

        const teamB =
            cleanText(match[4]);

        if (!teamA || !teamB) continue;

        const homeIsKocaeli =
            team.eslesmeAnahtari.test(
                teamA
            );

        const opponent =
            homeIsKocaeli
                ? teamB
                : teamA;

        events.push({

            title:
                `${teamA} × ${teamB}`,

            description:
                `${team.adi} - ${opponent} basketbol karşılaşması`,

            date:
                `${day}.${month}.${year}`,

            isoDate:
                `${year}-${month}-${day}`,

            time: "",

            venue:
                homeIsKocaeli
                    ? "Kocaeli"
                    : `Deplasman (${teamA})`,

            category:
                "spor",

            sport:
                "Basketbol",

            homeTeam:
                teamA,

            awayTeam:
                teamB,

            link:
                team.url,

            source:
                "Flashscore"

        });

    }

    return events;

}


async function getBasketbolEtkinlikleri() {

    const events = [];

    for (const team of BASKETBOL_TAKIMLARI) {

        try {

            const html =
                await fetchWithTimeout(
                    team.url,
                    15000
                );

            const cleaned =
                cleanText(html);

            const teamEvents =
                parseFlashscoreSonrakiMaclar(
                    cleaned,
                    team
                );

            events.push(
                ...teamEvents
            );

        }
        catch (error) {

            // Bir takımın kaynağı engellenirse/başarısız
            // olursa tüm API'yi bozma, sessizce atla.
            console.warn(
                "Basketbol kaynağı erişilemedi (" +
                team.adi +
                "):",
                error.message
            );

            continue;

        }

    }

    const unique = [];

    const seen =
        new Set();

    for (const event of events) {

        const key =
            [
                event.date,
                event.homeTeam,
                event.awayTeam
            ]
                .join("|")
                .toLocaleLowerCase(
                    "tr-TR"
                );

        if (seen.has(key)) continue;

        seen.add(key);

        unique.push(event);

    }

    return unique;

}


// ============================================================
// TÜM ETKİNLİKLER
// ============================================================

async function getAllEvents() {

    const results =
        await Promise.allSettled([

            getBelediyeEtkinlikleri(),

            getSeyretEtkinlikleri(),

            getVoleybolEtkinlikleri(),

            getBasketbolEtkinlikleri()

        ]);

    const events = [];

    for (const result of results) {

        if (
            result.status === "fulfilled" &&
            Array.isArray(result.value)
        ) {

            events.push(
                ...result.value
            );

        }

    }

    // --------------------------------------------------------
    // DUPLICATE TEMİZLE
    // --------------------------------------------------------

    const unique = [];

    const seen =
        new Set();

    for (const event of events) {

        const key =
            [
                event.title || "",
                event.date || "",
                event.time || "",
                event.venue || ""
            ]
                .join("|")
                .toLocaleLowerCase(
                    "tr-TR"
                );

        if (seen.has(key)) continue;

        seen.add(key);

        unique.push(event);

    }

    // --------------------------------------------------------
    // TARİHE GÖRE SIRALA
    // --------------------------------------------------------

    unique.sort(
        (a, b) => {

            const dateA =
                a.isoDate ||
                parseEventDate(a.date) ||
                "9999-12-31";

            const dateB =
                b.isoDate ||
                parseEventDate(b.date) ||
                "9999-12-31";

            const timeA =
                a.time || "23:59";

            const timeB =
                b.time || "23:59";

            return (
                `${dateA} ${timeA}`
            ).localeCompare(
                `${dateB} ${timeB}`
            );

        }
    );

    return unique;

}


// ============================================================
// API HANDLER
// ============================================================

module.exports = async function handler(
    req,
    res
) {

    // --------------------------------------------------------
    // CORS
    // --------------------------------------------------------

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    if (
        req.method === "OPTIONS"
    ) {

        return res
            .status(200)
            .end();

    }

    if (
        req.method !== "GET"
    ) {

        return res
            .status(405)
            .json({

                success: false,

                error:
                    "Method Not Allowed"

            });

    }

    // --------------------------------------------------------
    // CACHE
    // --------------------------------------------------------

    const now =
        Date.now();

    if (
        cache.data &&
        now - cache.timestamp < CACHE_TIME
    ) {

        return res
            .status(200)
            .json({

                success: true,

                count:
                    cache.data.events.length,

                events:
                    cache.data.events,

                sources:
                    cache.data.sources,

                updatedAt:
                    cache.timestamp,

                cached:
                    true

            });

    }

    try {

        const events =
            await getAllEvents();

        // ----------------------------------------------------
        // KAYNAK SAYILARI
        // ----------------------------------------------------

        const sourceCounts = {};

        for (const event of events) {

            const source =
                event.source ||
                "Bilinmeyen";

            sourceCounts[source] =
                (
                    sourceCounts[source] ||
                    0
                ) + 1;

        }

        // ----------------------------------------------------
        // CACHE
        // ----------------------------------------------------

        cache = {

            timestamp:
                now,

            data: {

                events,

                sources:
                    sourceCounts

            }

        };

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res
            .status(200)
            .json({

                success: true,

                count:
                    events.length,

                events,

                sources:
                    sourceCounts,

                updatedAt:
                    now,

                cached:
                    false

            });

    }
    catch (error) {

        console.error(
            "Etkinlikler API:",
            error
        );

        // Eski başarılı veri varsa
        // onu göstermeye devam et.

        if (cache.data) {

            return res
                .status(200)
                .json({

                    success: true,

                    count:
                        cache.data.events.length,

                    events:
                        cache.data.events,

                    sources:
                        cache.data.sources,

                    updatedAt:
                        cache.timestamp,

                    cached:
                        true,

                    warning:
                        "Güncel veriler alınamadı."

                });

        }

        return res
            .status(500)
            .json({

                success: false,

                error:
                    "Etkinlikler alınamadı."

            });

    }

};
