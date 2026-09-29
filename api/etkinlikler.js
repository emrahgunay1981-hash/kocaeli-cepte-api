// ============================================================
// KOCAELİ ETKİNLİKLERİ API
// ============================================================
// Kaynaklar:
//
// 1. Kocaeli Büyükşehir Belediyesi
// 2. Kocaeli Seyret
// 3. Kocaeli Voleybol İl Temsilciliği
//
// Endpoint:
// https://kocaeli-cepte-api.vercel.app/api/etkinlikler
//
// Vercel Hobby planında yeni function oluşturmaz.
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

    if (!text) {
        return "";
    }

    let result = String(text);


    const namedEntities = {

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


    result = result.replace(
        /&[a-zA-Z0-9#]+;/g,
        entity => {

            return namedEntities[entity] || entity;

        }
    );


    // Decimal entities
    result = result.replace(
        /&#(\d+);/g,
        (match, code) => {

            try {

                return String.fromCodePoint(
                    parseInt(code, 10)
                );

            }
            catch {

                return match;

            }

        }
    );


    // Hex entities
    result = result.replace(
        /&#x([0-9a-fA-F]+);/g,
        (match, code) => {

            try {

                return String.fromCodePoint(
                    parseInt(code, 16)
                );

            }
            catch {

                return match;

            }

        }
    );


    return result;

}



// ============================================================
// HTML TEMİZLEME
// ============================================================

function cleanText(text) {

    if (!text) {
        return "";
    }


    let value = String(text);


    value = value.replace(
        /<br\s*\/?>/gi,
        " "
    );


    value = value.replace(
        /<!--[\s\S]*?-->/g,
        " "
    );


    value = value.replace(
        /<script[\s\S]*?<\/script>/gi,
        " "
    );


    value = value.replace(
        /<style[\s\S]*?<\/style>/gi,
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
// HTML'DEN ALAN ÇIKAR
// ============================================================

function extract(html, regex) {

    const match =
        html.match(regex);


    if (!match) {
        return "";
    }


    return cleanText(
        match[1]
    );

}



// ============================================================
// TIMEOUTLU FETCH
// ============================================================

async function fetchWithTimeout(
    url,
    timeout = 12000
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
                `HTTP ${response.status} - ${url}`
            );

        }


        return await response.text();

    }
    finally {

        clearTimeout(timer);

    }

}



// ============================================================
// TARİHİ ISO'YA ÇEVİR
// ============================================================

function parseEventDate(dateText) {

    if (!dateText) {
        return null;
    }


    const value =
        cleanText(dateText);


    const match =
        value.match(
            /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/
        );


    if (!match) {
        return null;
    }


    const day =
        match[1].padStart(2, "0");


    const month =
        match[2].padStart(2, "0");


    const year =
        match[3];


    return `${year}-${month}-${day}`;

}



// ============================================================
// SAAT BUL
// ============================================================

function findTime(values) {

    for (
        const value of values
    ) {

        const clean =
            cleanText(value);


        const match =
            clean.match(
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



// ============================================================
// TARİH BUL
// ============================================================

function findDate(values) {

    for (
        const value of values
    ) {

        const clean =
            cleanText(value);


        const match =
            clean.match(
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



// ============================================================
// SALON BUL
// ============================================================

function findVenue(values) {

    const venuePatterns = [

        /SPOR SALONU/i,

        /SALONU/i,

        /SPOR KOMPLEKSİ/i,

        /SPOR KOMPLEKSI/i,

        /SPOR TESİSLERİ/i,

        /SPOR TESISLERI/i,

        /SPOR MERKEZİ/i,

        /SPOR MERKEZI/i,

        /KAPALI SPOR/i

    ];


    for (
        const value of values
    ) {

        const clean =
            cleanText(value);


        if (!clean) {
            continue;
        }


        if (
            venuePatterns.some(
                pattern =>
                    pattern.test(clean)
            )
        ) {

            return clean;

        }

    }


    return "";

}



// ============================================================
// VOLEYBOL TAKIM KONTROLÜ
// ============================================================

function looksLikeTeam(value) {

    if (!value) {
        return false;
    }


    const text =
        cleanText(value);


    if (!text) {
        return false;
    }


    if (text.length < 3) {
        return false;
    }


    // --------------------------------------------------------
    // Lig kodlarını alma
    // Örn: 2LK, 1LK, 2BK
    // --------------------------------------------------------

    if (
        /^\d+\s*[A-ZÇĞİÖŞÜ]{1,5}$/.test(text)
    ) {

        return false;

    }


    if (
        /^\d+[A-ZÇĞİÖŞÜ]{1,5}$/.test(text)
    ) {

        return false;

    }


    // Tarih
    if (
        /\b\d{1,2}[./-]\d{1,2}[./-]20\d{2}\b/.test(text)
    ) {

        return false;

    }


    // Saat
    if (
        /\b\d{1,2}:\d{2}\b/.test(text)
    ) {

        return false;

    }


    // Salon
    if (
        /SPOR SALONU|SPOR KOMPLEKSİ|SPOR KOMPLEKSI|SPOR TESİSLERİ|SPOR TESISLERI|KAPALI SPOR/i.test(text)
    ) {

        return false;

    }


    // Tablo başlıkları
    if (
        /^(tarih|saat|salon|yer|takım|takim|maç|mac|kategori|lig)$/i.test(text)
    ) {

        return false;

    }


    // Ayraçlar
    if (
        /^(vs|v|x|-|–|—)$/i.test(text)
    ) {

        return false;

    }


    return true;

}



// ============================================================
// VOLEYBOL TAKIMLARINI BUL
// ============================================================

function findTeams(
    values,
    venue,
    time,
    date
) {

    const candidates = [];


    for (
        let value of values
    ) {

        value =
            cleanText(value);


        if (!value) {
            continue;
        }


        // Tarih
        if (
            date &&
            value.includes(date)
        ) {

            continue;

        }


        // Saat
        if (
            time &&
            value.includes(time)
        ) {

            continue;

        }


        // Salon
        if (
            venue &&
            value === venue
        ) {

            continue;

        }


        if (
            !looksLikeTeam(value)
        ) {

            continue;

        }


        if (value.length > 100) {

            continue;

        }


        candidates.push(
            value
        );

    }


    // --------------------------------------------------------
    // Aynı kayıtları temizle
    // --------------------------------------------------------

    const unique = [];


    for (
        const candidate of candidates
    ) {

        if (
            !unique.some(
                item =>
                    item.toLocaleLowerCase("tr-TR") ===
                    candidate.toLocaleLowerCase("tr-TR")
            )
        ) {

            unique.push(
                candidate
            );

        }

    }


    return unique.slice(
        0,
        2
    );

}



// ============================================================
// KOCAELİ BÜYÜKŞEHİR BELEDİYESİ
// ============================================================

async function getBelediyeEtkinlikleri() {

    const url =
        "https://kultursanat.kocaeli.bel.tr/etkinlik/feed/";


    try {

        const xml =
            await fetchWithTimeout(
                url
            );


        const items =
            xml.match(
                /<item[\s\S]*?<\/item>/gi
            ) || [];


        const events = [];


        for (
            const item of items
        ) {

            const title =
                extract(
                    item,
                    /<title[^>]*>([\s\S]*?)<\/title>/i
                );


            const description =
                extract(
                    item,
                    /<description[^>]*>([\s\S]*?)<\/description>/i
                );


            const link =
                extract(
                    item,
                    /<link[^>]*>([\s\S]*?)<\/link>/i
                );


            const pubDate =
                extract(
                    item,
                    /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i
                );


            if (!title) {
                continue;
            }


            const text =
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
                /konser|müzik|muzik/.test(
                    text
                )
            ) {

                category =
                    "konser";

            }

            else if (
                /tiyatro|sahne/.test(
                    text
                )
            ) {

                category =
                    "tiyatro";

            }

            else if (
                /çocuk|cocuk/.test(
                    text
                )
            ) {

                category =
                    "çocuk";

            }

            else if (
                /atölye|atolye/.test(
                    text
                )
            ) {

                category =
                    "atölye";

            }


            events.push({

                title,

                description,

                link,

                date:
                    pubDate,

                time:
                    "",

                venue:
                    "",

                category,

                sport:
                    "",

                source:
                    "Kocaeli Büyükşehir Belediyesi"

            });

        }


        return events;

    }
    catch (error) {

        console.error(
            "Belediye etkinlikleri alınamadı:",
            error.message
        );


        return [];

    }

}



// ============================================================
// KOCAELİ SEYRET
// ============================================================
// Buradaki önemli düzeltme:
// Sayfanın tamamını <div> olarak taramıyoruz.
// Gerçek etkinlik başlıklarını h2/h3/h4
// seviyelerinden yakalıyoruz.
// Böylece site menülerinin etkinlik sanılması engelleniyor.
// ============================================================

async function getSeyretEtkinlikleri() {

    const url =
        "https://www.kocaeliseyret.com/kocaeli-etkinlikler";


    try {

        const html =
            await fetchWithTimeout(
                url
            );


        const events = [];


        // ----------------------------------------------------
        // H2 / H3 / H4 başlıklarını yakala
        // ----------------------------------------------------

        const headingRegex =
            /<(h2|h3|h4)\b[^>]*>([\s\S]*?)<\/\1>/gi;


        const matches =
            [...html.matchAll(
                headingRegex
            )];


        for (
            let i = 0;
            i < matches.length;
            i++
        ) {

            const match =
                matches[i];


            const title =
                cleanText(
                    match[2]
                );


            if (!title) {
                continue;
            }


            // ------------------------------------------------
            // Çok genel başlıkları ele
            // ------------------------------------------------

            const lowerTitle =
                title.toLocaleLowerCase(
                    "tr-TR"
                );


            const ignoredTitles = [

                "içeriğe geç",

                "hava durumu",

                "gezilecek yerler",

                "bilet al / detay",

                "etkinlikler",

                "anasayfa",

                "ana sayfa",

                "ulaşım",

                "şehir & yaşam",

                "kocaeli seyret",

                "haberler",

                "spor",

                "hava durumu"

            ];


            if (
                ignoredTitles.includes(
                    lowerTitle
                )
            ) {

                continue;

            }


            // ------------------------------------------------
            // Başlıktan sonraki alanı al
            // ------------------------------------------------

            const start =
                match.index +
                match[0].length;


            const end =
                i + 1 <
                matches.length

                    ? matches[i + 1].index

                    : html.length;


            const block =
                html.substring(
                    start,
                    end
                );


            const blockText =
                cleanText(
                    block
                );


            // ------------------------------------------------
            // TARİH + SAAT
            //
            // Örnek:
            // 17 Eylül 2026, Perşembe 17:30
            // ------------------------------------------------

            const dateTimeMatch =
                blockText.match(
                    /(\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+20\d{2})\s*,?\s*[A-Za-zÇĞİÖŞÜçğıöşü]+\s+(\d{1,2}:\d{2})/i
                );


            if (!dateTimeMatch) {

                continue;

            }


            const date =
                dateTimeMatch[1];


            const time =
                dateTimeMatch[2];


            // ------------------------------------------------
            // TARİH SONRASI BÖLÜM
            // ------------------------------------------------

            let afterDate =
                blockText.substring(
                    dateTimeMatch.index +
                    dateTimeMatch[0].length
                );


            afterDate =
                afterDate
                    .replace(
                        /^[\s|•\-–—:]+/,
                        ""
                    )
                    .trim();


            // ------------------------------------------------
            // MEKAN
            // ------------------------------------------------

            let venue = "";


            /*
             * Kocaeli Seyret kayıtlarında tarih/saatten
             * sonra genellikle mekan gelir.
             *
             * Çok uzun metinleri mekan olarak kabul etmiyoruz.
             */

            if (
                afterDate
            ) {

                const venueParts =
                    afterDate
                        .split(
                            /(?:Bilet\s*Al|Detay|Biletix|Satın\s*Al)/i
                        );


                venue =
                    cleanText(
                        venueParts[0]
                    );


                venue =
                    venue
                        .replace(
                            /^[|•\-–—:]+/,
                            ""
                        )
                        .trim();

            }


            if (
                venue.length > 180
            ) {

                venue = "";

            }


            // ------------------------------------------------
            // DETAY / BİLET LİNKİ
            // ------------------------------------------------

            const linkMatches =
                [
                    ...block.matchAll(
                        /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi
                    )
                ];


            let link =
                "";


            for (
                const linkMatch
                of linkMatches
            ) {

                const candidate =
                    linkMatch[1];


                if (
                    !candidate
                ) {
                    continue;
                }


                if (
                    /bilet|detay|etkinlik|event/i.test(
                        candidate
                    )
                ) {

                    link =
                        candidate;

                    break;

                }

            }


            // İlk uygun link yoksa ilk link
            if (
                !link &&
                linkMatches.length
            ) {

                link =
                    linkMatches[0][1];

            }


            // ------------------------------------------------
            // RELATIVE LINK
            // ------------------------------------------------

            if (
                link &&
                link.startsWith("/")
            ) {

                link =
                    "https://www.kocaeliseyret.com" +
                    link;

            }


            // ------------------------------------------------
            // KATEGORİ
            // ------------------------------------------------

            let category =
                "genel";


            if (
                /konser|müzik|muzik|dj|şarkıcı|sarkici|sanatçı|sanatci/.test(
                    lowerTitle
                )
            ) {

                category =
                    "konser";

            }

            else if (
                /tiyatro|müzikali|muzikali|stand up|stand-up|gösteri|gosteri/.test(
                    lowerTitle
                )
            ) {

                category =
                    "tiyatro";

            }

            else if (
                /çocuk|cocuk/.test(
                    lowerTitle
                )
            ) {

                category =
                    "çocuk";

            }

            else if (
                /atölye|atolye/.test(
                    lowerTitle
                )
            ) {

                category =
                    "atölye";

            }


            // ------------------------------------------------
            // SPOR KONTROLÜ
            // ------------------------------------------------

            let sport =
                "";


            if (
                /voleybol|basketbol|hentbol|futsal|spor salonu|spor kompleksi/.test(
                    lowerTitle
                )
            ) {

                category =
                    "spor";


                sport =
                    "Spor";

            }


            // ------------------------------------------------
            // GERÇEK ETKİNLİĞİ EKLE
            // ------------------------------------------------

            events.push({

                title,

                description:
                    venue
                        ? `${title} - ${venue}`
                        : title,

                date,

                time,

                venue,

                category,

                sport,

                link,

                source:
                    "Kocaeli Seyret"

            });

        }


        // ----------------------------------------------------
        // DUPLICATE TEMİZLE
        // ----------------------------------------------------

        const unique = [];

        const seen =
            new Set();


        for (
            const event of events
        ) {

            const key =
                [
                    event.title,
                    event.date,
                    event.time,
                    event.venue
                ]
                    .join("|")
                    .toLocaleLowerCase(
                        "tr-TR"
                    );


            if (
                seen.has(key)
            ) {

                continue;

            }


            seen.add(key);

            unique.push(
                event
            );

        }


        return unique;

    }
    catch (error) {

        console.error(
            "Kocaeli Seyret alınamadı:",
            error.message
        );


        return [];

    }

}



// ============================================================
// KOCAELİ VOLEYBOL İL TEMSİLCİLİĞİ
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


        let currentDate =
            "";


        let currentVenue =
            "";


        // ----------------------------------------------------
        // TABLOLARI TARA
        // ----------------------------------------------------

        for (
            const row of rows
        ) {

            const cells =
                row.match(
                    /<t[dh]\b[^>]*>[\s\S]*?<\/t[dh]>/gi
                ) || [];


            if (!cells.length) {
                continue;
            }


            const values =
                cells
                    .map(cleanText)
                    .filter(Boolean);


            if (!values.length) {
                continue;
            }


            const rowText =
                values.join(
                    " | "
                );


            // ------------------------------------------------
            // TARİH
            // ------------------------------------------------

            const dateMatch =
                rowText.match(
                    /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/
                );


            if (dateMatch) {

                currentDate =
                    `${dateMatch[1].padStart(2, "0")}.${dateMatch[2].padStart(2, "0")}.${dateMatch[3]}`;

            }


            // ------------------------------------------------
            // SALON
            // ------------------------------------------------

            const venue =
                findVenue(
                    values
                );


            if (venue) {

                currentVenue =
                    venue;

            }


            // ------------------------------------------------
            // SAAT
            // ------------------------------------------------

            const time =
                findTime(
                    values
                );


            if (!time) {

                continue;

            }


            // ------------------------------------------------
            // TARİH
            // ------------------------------------------------

            const date =
                findDate(
                    values
                ) ||
                currentDate;


            if (!date) {

                continue;

            }


            // ------------------------------------------------
            // SALON
            // ------------------------------------------------

            const finalVenue =
                venue ||
                currentVenue ||
                "";


            // ------------------------------------------------
            // TAKIMLAR
            // ------------------------------------------------

            const teams =
                findTeams(
                    values,
                    finalVenue,
                    time,
                    date
                );


            if (
                teams.length < 2
            ) {

                continue;

            }


            const homeTeam =
                teams[0];


            const awayTeam =
                teams[1];


            if (
                !homeTeam ||
                !awayTeam
            ) {

                continue;

            }


            if (
                homeTeam.toLocaleLowerCase("tr-TR") ===
                awayTeam.toLocaleLowerCase("tr-TR")
            ) {

                continue;

            }


            // ------------------------------------------------
            // BAŞLIK
            // ------------------------------------------------

            const title =
                `${homeTeam} × ${awayTeam}`;


            // ------------------------------------------------
            // ISO TARİH
            // ------------------------------------------------

            const isoDate =
                parseEventDate(
                    date
                );


            // ------------------------------------------------
            // ETKİNLİK
            // ------------------------------------------------

            events.push({

                title,

                description:
                    `${homeTeam} - ${awayTeam} Kocaeli voleybol karşılaşması`,

                date,

                isoDate,

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


        // ----------------------------------------------------
        // DUPLICATE
        // ----------------------------------------------------

        const unique = [];

        const seen =
            new Set();


        for (
            const event of events
        ) {

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


            if (
                seen.has(key)
            ) {

                continue;

            }


            seen.add(key);

            unique.push(
                event
            );

        }


        // ----------------------------------------------------
        // TARİH + SAAT SIRALAMA
        // ----------------------------------------------------

        unique.sort(
            (a, b) => {

                const aKey =
                    `${a.isoDate || "9999-99-99"} ${a.time || "99:99"}`;


                const bKey =
                    `${b.isoDate || "9999-99-99"} ${b.time || "99:99"}`;


                return aKey.localeCompare(
                    bKey
                );

            }
        );


        return unique;

    }
    catch (error) {

        console.error(
            "Voleybol etkinlikleri alınamadı:",
            error.message
        );


        return [];

    }

}



// ============================================================
// ANA API
// ============================================================

export default async function handler(
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


    // --------------------------------------------------------
    // CACHE
    // --------------------------------------------------------

    const now =
        Date.now();


    if (
        cache.data &&
        now - cache.timestamp <
        CACHE_TIME
    ) {

        return res
            .status(200)
            .json(
                cache.data
            );

    }


    // --------------------------------------------------------
    // KAYNAKLARI AYNI ANDA ÇALIŞTIR
    // --------------------------------------------------------

    const results =
        await Promise.allSettled([

            getBelediyeEtkinlikleri(),

            getSeyretEtkinlikleri(),

            getVoleybolEtkinlikleri()

        ]);


    // --------------------------------------------------------
    // SONUÇLARI BİRLEŞTİR
    // --------------------------------------------------------

    let allEvents =
        [];


    for (
        const result of results
    ) {

        if (
            result.status ===
                "fulfilled" &&
            Array.isArray(
                result.value
            )
        ) {

            allEvents =
                allEvents.concat(
                    result.value
                );

        }

    }


    // --------------------------------------------------------
    // GENEL DUPLICATE
    // --------------------------------------------------------

    const uniqueEvents =
        [];


    const seen =
        new Set();


    for (
        const event of allEvents
    ) {

        const key =
            [
                event.title,
                event.date,
                event.time,
                event.venue,
                event.source
            ]
                .join("|")
                .toLocaleLowerCase(
                    "tr-TR"
                )
                .trim();


        if (
            seen.has(key)
        ) {

            continue;

        }


        seen.add(key);

        uniqueEvents.push(
            event
        );

    }


    // --------------------------------------------------------
    // TARİH + SAAT SIRALAMA
    // --------------------------------------------------------

    uniqueEvents.sort(
        (a, b) => {

            const aDate =
                a.isoDate ||
                parseEventDate(
                    a.date
                ) ||
                "9999-99-99";


            const bDate =
                b.isoDate ||
                parseEventDate(
                    b.date
                ) ||
                "9999-99-99";


            const aTime =
                a.time ||
                "99:99";


            const bTime =
                b.time ||
                "99:99";


            return (
                `${aDate} ${aTime}`
            ).localeCompare(
                `${bDate} ${bTime}`
            );

        }
    );


    // --------------------------------------------------------
    // KAYNAK SAYILARI
    // --------------------------------------------------------

    const sourceCounts =
        {};


    for (
        const event of uniqueEvents
    ) {

        const source =
            event.source ||
            "Bilinmeyen";


        sourceCounts[source] =
            (
                sourceCounts[source] ||
                0
            ) + 1;

    }


    // --------------------------------------------------------
    // CEVAP
    // --------------------------------------------------------

    const response = {

        success:
            true,

        count:
            uniqueEvents.length,

        events:
            uniqueEvents,

        sources:
            sourceCounts,

        updatedAt:
            new Date().toISOString()

    };


    // --------------------------------------------------------
    // CACHE
    // --------------------------------------------------------

    cache = {

        timestamp:
            now,

        data:
            response

    };


    return res
        .status(200)
        .json(
            response
        );

}
