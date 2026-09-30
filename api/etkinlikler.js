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
// TIMEOUTLU FETCH
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
// TARİHİ ISO'YA ÇEVİR
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
// GENEL ETKİNLİKLER
// KOCAELİ BÜYÜKŞEHİR BELEDİYESİ
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


        for (
            const item of items
        ) {

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


            if (!title) {
                continue;
            }


            const lower =
                (
                    title +
                    " " +
                    description
                )
                    .toLocaleLowerCase(
                        "tr-TR"
                    );


            let category =
                "genel";


            if (
                /konser|müzik|muzik|dj|şarkıcı|sarkici/.test(
                    lower
                )
            ) {

                category =
                    "konser";

            }

            else if (
                /tiyatro|sahne|müzikali|muzikali/.test(
                    lower
                )
            ) {

                category =
                    "tiyatro";

            }

            else if (
                /çocuk|cocuk/.test(
                    lower
                )
            ) {

                category =
                    "çocuk";

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

    const url =
        "https://www.kocaeliseyret.com/kocaeli-etkinlikler";


    try {

        const html =
            await fetchWithTimeout(url);


        const events = [];


        const headingRegex =
            /<(h2|h3|h4)\b[^>]*>([\s\S]*?)<\/\1>/gi;


        const matches =
            [...html.matchAll(
                headingRegex
            )];


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

            "spor"

        ];


        for (
            let i = 0;
            i < matches.length;
            i++
        ) {

            const title =
                cleanText(
                    matches[i][2]
                );


            if (!title) {
                continue;
            }


            const lowerTitle =
                title.toLocaleLowerCase(
                    "tr-TR"
                );


            if (
                ignoredTitles.includes(
                    lowerTitle
                )
            ) {

                continue;

            }


            const start =
                matches[i].index +
                matches[i][0].length;


            const end =
                i + 1 < matches.length
                    ? matches[i + 1].index
                    : html.length;


            const block =
                html.substring(
                    start,
                    end
                );


            const blockText =
                cleanText(block);


            const dateTime =
                blockText.match(
                    /(\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+20\d{2})\s*,?\s*[A-Za-zÇĞİÖŞÜçğıöşü]+\s+(\d{1,2}:\d{2})/i
                );


            if (!dateTime) {
                continue;
            }


            const date =
                dateTime[1];


            const time =
                dateTime[2];


            let afterDate =
                blockText.substring(
                    dateTime.index +
                    dateTime[0].length
                );


            afterDate =
                afterDate
                    .replace(
                        /^[\s|•\-–—:]+/,
                        ""
                    )
                    .trim();


            let venue = "";


            const venueParts =
                afterDate.split(
                    /Bilet\s*Al|Detay|Biletix|Satın\s*Al/i
                );


            if (
                venueParts[0]
            ) {

                venue =
                    cleanText(
                        venueParts[0]
                    );

            }


            if (
                venue.length > 180
            ) {

                venue = "";

            }


            const links =
                [
                    ...block.matchAll(
                        /<a\b[^>]*href=["']([^"']+)["']/gi
                    )
                ];


            let link = "";


            for (
                const item of links
            ) {

                const candidate =
                    item[1];


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


            if (
                !link &&
                links.length
            ) {

                link =
                    links[0][1];

            }


            if (
                link &&
                link.startsWith("/")
            ) {

                link =
                    "https://www.kocaeliseyret.com" +
                    link;

            }


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

                sport:
                    "",

                link,

                source:
                    "Kocaeli Seyret"

            });

        }


        // Duplicate temizle

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
            "Kocaeli Seyret:",
            error.message
        );


        return [];

    }

}


// ============================================================
// VOLEYBOL
// ============================================================

function looksLikeTeam(value) {

    if (!value) return false;


    const text =
        cleanText(value);


    if (
        text.length < 3
    ) {

        return false;

    }


    // 2LK / 1LK / 2BK gibi lig kodlarını engelle

    if (
        /^\d+\s*[A-ZÇĞİÖŞÜ]{1,5}$/i.test(
            text
        )
    ) {

        return false;

    }


    if (
        /^\d+[A-ZÇĞİÖŞÜ]{1,5}$/i.test(
            text
        )
    ) {

        return false;

    }


    if (
        /\b\d{1,2}:\d{2}\b/.test(
            text
        )
    ) {

        return false;

    }


    if (
        /SPOR SALONU|SPOR KOMPLEKSİ|SPOR KOMPLEKSI/i.test(
            text
        )
    ) {

        return false;

    }


    if (
        /^(tarih|saat|salon|yer|takım|takim|maç|mac|kategori|lig)$/i.test(
            text
        )
    ) {

        return false;

    }


    return true;
}


// ============================================================
// SAAT BUL
// ============================================================

function findTime(values) {

    for (
        const value of values
    ) {

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


// ============================================================
// TARİH BUL
// ============================================================

function findDate(values) {

    for (
        const value of values
    ) {

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


// ============================================================
// SALON BUL
// ============================================================

function findVenue(values) {

    for (
        const value of values
    ) {

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


// ============================================================
// TAKIMLARI BUL
// ============================================================

function findTeams(
    values,
    venue,
    time,
    date
) {

    const teams = [];


    for (
        const value of values
    ) {

        const text =
            cleanText(value);


        if (
            !looksLikeTeam(text)
        ) {

            continue;

        }


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

            teams.push(
                text
            );

        }

    }


    return teams.slice(
        0,
        2
    );

}


// ============================================================
// VOLEYBOL ETKİNLİKLERİ
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


            const dateMatch =
                rowText.match(
                    /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/
                );


            if (
                dateMatch
            ) {

                currentDate =
                    `${dateMatch[1].padStart(2, "0")}.${dateMatch[2].padStart(2, "0")}.${dateMatch[3]}`;

            }


            const venue =
                findVenue(
                    values
                );


            if (venue) {

                currentVenue =
                    venue;

            }


            const time =
                findTime(
                    values
                );


            if (!time) {
                continue;
            }


            const date =
                findDate(
                    values
                ) ||
                currentDate;


            if (!date) {
                continue;
            }


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
                    parseEventDate(
                        date
                    ),

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


        // Duplicate

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
// TBF kaynaklarından Kocaeli bağlantılı maçları bulur.
// ============================================================

async function getBasketbolEtkinlikleri() {

    const urls = [

        "https://www.tbf.org.tr/",

        "https://www.tbf.org.tr/ligler"

    ];


    const kocaeliTeams = [

        "Biotekno Körfez Basket",

        "Glint Körfez Basket",

        "Kocaeli Büyükşehir Belediye Kağıt Spor",

        "Kocaeli Büyükşehir Belediye Kağıtspor",

        "Kocaeli BBSK",

        "Çayırova Belediyesi",

        "Darıca Basketbol Feneri",

        "Körfez Basket"

    ];


    const kocaeliVenues = [

        "Şehit Polis Recep Topaloğlu Spor Salonu",

        "Gebze Spor Salonu",

        "Hergeleci İbrahim Spor Salonu",

        "Şampiyon Hasan Gemici Spor Salonu",

        "Derince Spor Salonu",

        "Kandıra Spor Salonu",

        "Çayırova Spor Salonu",

        "Darıca Spor Salonu",

        "Kocaeli Atatürk Spor Salonu"

    ];


    const events = [];


    try {

        for (
            const url of urls
        ) {

            let html = "";


            try {

                html =
                    await fetchWithTimeout(
                        url,
                        20000
                    );

            }
            catch {

                continue;

            }


            if (!html) {
                continue;
            }


            // ------------------------------------------------
            // A) HTML içindeki açık tarih/saatleri ara
            // ------------------------------------------------

            const datePatterns = [

                /(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\s*(?:[-|,]|\s)+\s*(\d{1,2}):(\d{2})/g,

                /(20\d{2})-(\d{2})-(\d{2})[^0-9]{0,30}(\d{1,2}):(\d{2})/g

            ];


            for (
                const dateRegex
                of datePatterns
            ) {

                const matches =
                    [
                        ...html.matchAll(
                            dateRegex
                        )
                    ];


                for (
                    const match
                    of matches
                ) {

                    let day;
                    let month;
                    let year;
                    let hour;
                    let minute;


                    if (
                        match[0].includes("-") &&
                        /^\d{4}-/.test(
                            match[0]
                        )
                    ) {

                        year =
                            match[1];

                        month =
                            match[2];

                        day =
                            match[3];

                        hour =
                            match[4];

                        minute =
                            match[5];

                    }
                    else {

                        day =
                            match[1];

                        month =
                            match[2];

                        year =
                            match[3];

                        hour =
                            match[4];

                        minute =
                            match[5];

                    }


                    const date =
                        `${day.padStart(2, "0")}.${month.padStart(2, "0")}.${year}`;


                    const isoDate =
                        `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;


                    const time =
                        `${hour.padStart(2, "0")}:${minute}`;


                    // ------------------------------------------------
                    // Tarihin etrafındaki HTML alanı
                    // ------------------------------------------------

                    const start =
                        Math.max(
                            0,
                            match.index - 2500
                        );


                    const end =
                        Math.min(
                            html.length,
                            match.index + 3500
                        );


                    const block =
                        html.substring(
                            start,
                            end
                        );


                    const blockText =
                        cleanText(
                            block
                        );


                    const lowerBlock =
                        blockText.toLocaleLowerCase(
                            "tr-TR"
                        );


                    // ------------------------------------------------
                    // Kocaeli takımı veya salonu var mı?
                    // ------------------------------------------------

                    const team =
                        kocaeliTeams.find(
                            item =>
                                lowerBlock.includes(
                                    item.toLocaleLowerCase(
                                        "tr-TR"
                                    )
                                )
                        );


                    const venue =
                        kocaeliVenues.find(
                            item =>
                                lowerBlock.includes(
                                    item.toLocaleLowerCase(
                                        "tr-TR"
                                    )
                                )
                        );


                    if (
                        !team &&
                        !venue
                    ) {

                        continue;

                    }


                    // ------------------------------------------------
                    // Linkleri bul
                    // ------------------------------------------------

                    const linkRegex =
                        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


                    const candidates = [];


                    for (
                        const linkMatch
                        of block.matchAll(
                            linkRegex
                        )
                    ) {

                        const linkText =
                            cleanText(
                                linkMatch[2]
                            );


                        if (!linkText) {
                            continue;
                        }


                        if (
                            linkText.length < 3
                        ) {
                            continue;
                        }


                        if (
                            /ana sayfa|haberler|ligler|puan durumu|fikstür|takımlar|takimlar|canlı|canli/i.test(
                                linkText
                            )
                        ) {

                            continue;

                        }


                        candidates.push({

                            text:
                                linkText,

                            href:
                                linkMatch[1]

                        });

                    }


                    // ------------------------------------------------
                    // Takımları seç
                    // ------------------------------------------------

                    const possibleTeams =
                        [];


                    for (
                        const candidate
                        of candidates
                    ) {

                        let name =
                            cleanText(
                                candidate.text
                            );


                        if (
                            !name
                        ) {
                            continue;
                        }


                        if (
                            name.length > 80
                        ) {
                            continue;
                        }


                        if (
                            /\d{1,2}:\d{2}/.test(
                                name
                            )
                        ) {
                            continue;
                        }


                        if (
                            /basketbol|lig|fikstür|puan|türkiye basketbol federasyonu/i.test(
                                name
                            ) &&
                            !kocaeliTeams.some(
                                teamName =>
                                    name
                                        .toLocaleLowerCase(
                                            "tr-TR"
                                        )
                                        .includes(
                                            teamName.toLocaleLowerCase(
                                                "tr-TR"
                                            )
                                        )
                            )
                        ) {

                            continue;

                        }


                        if (
                            !possibleTeams.some(
                                item =>
                                    item.name
                                        .toLocaleLowerCase(
                                            "tr-TR"
                                        ) ===
                                    name
                                        .toLocaleLowerCase(
                                            "tr-TR"
                                        )
                            )
                        ) {

                            possibleTeams.push({

                                name,

                                href:
                                    candidate.href

                            });

                        }

                    }


                    // ------------------------------------------------
                    // Kocaeli takımını bul
                    // ------------------------------------------------

                    let homeTeam = "";
                    let awayTeam = "";
                    let link = "https://www.tbf.org.tr/";


                    const kocaeliIndex =
                        possibleTeams.findIndex(
                            candidate =>
                                kocaeliTeams.some(
                                    kocaeliTeam =>
                                        candidate.name
                                            .toLocaleLowerCase(
                                                "tr-TR"
                                            )
                                            .includes(
                                                kocaeliTeam
                                                    .toLocaleLowerCase(
                                                        "tr-TR"
                                                    )
                                            )
                                )
                        );


                    if (
                        kocaeliIndex >= 0
                    ) {

                        homeTeam =
                            possibleTeams[
                                kocaeliIndex
                            ].name;


                        if (
                            possibleTeams[
                                kocaeliIndex
                            ].href
                        ) {

                            link =
                                possibleTeams[
                                    kocaeliIndex
                                ].href;

                        }


                        for (
                            let j = 0;
                            j < possibleTeams.length;
                            j++
                        ) {

                            if (
                                j === kocaeliIndex
                            ) {
                                continue;
                            }


                            const candidate =
                                possibleTeams[j].name;


                            if (
                                candidate
                                    .toLocaleLowerCase(
                                        "tr-TR"
                                    )
                                    .includes(
                                        "basketbol"
                                    )
                            ) {
                                continue;
                            }


                            awayTeam =
                                candidate;

                            break;

                        }

                    }


                    // ------------------------------------------------
                    // Takım adı düz metinde bulunuyorsa
                    // ------------------------------------------------

                    if (
                        !homeTeam
                    ) {

                        const known =
                            kocaeliTeams.find(
                                item =>
                                    lowerBlock.includes(
                                        item.toLocaleLowerCase(
                                            "tr-TR"
                                        )
                                    )
                            );


                        if (known) {

                            homeTeam =
                                known;

                        }

                    }


                    // ------------------------------------------------
                    // Rakip bulunamazsa kaydı oluşturma
                    // ------------------------------------------------

                    if (
                        !homeTeam ||
                        !awayTeam
                    ) {

                        continue;

                    }


                    // ------------------------------------------------
                    // Salon yoksa Kocaeli
                    // ------------------------------------------------

                    const finalVenue =
                        venue ||
                        "Kocaeli";


                    // ------------------------------------------------
                    // Relative link
                    // ------------------------------------------------

                    if (
                        link.startsWith("/")
                    ) {

                        link =
                            "https://www.tbf.org.tr" +
                            link;

                    }


                    // ------------------------------------------------
                    // Duplicate
                    // ------------------------------------------------

                    const exists =
                        events.some(
                            event =>
                                event.date === date &&
                                event.time === time &&
                                event.homeTeam === homeTeam &&
                                event.awayTeam === awayTeam
                        );


                    if (
                        exists
                    ) {

                        continue;

                    }


                    // ------------------------------------------------
                    // EKLE
                    // ------------------------------------------------

                    events.push({

                        title:
                            `${homeTeam} × ${awayTeam}`,

                        description:
                            `${homeTeam} - ${awayTeam} basketbol
