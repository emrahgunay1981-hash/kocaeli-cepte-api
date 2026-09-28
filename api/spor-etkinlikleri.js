// ==========================================
// KOCAELİ CEPTE
// SPOR ETKİNLİKLERİ API
// ==========================================

const VOLEYBOL_URL =
    "https://kocaeli.voleyboliltemsilciligi.com/";


// ==========================================
// HTML ENTITY TEMİZLEME
// ==========================================

function decodeHtml(text) {

    if (!text) return "";

    return text
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#(\d+);/g, (_, dec) =>
            String.fromCharCode(dec)
        )
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
            String.fromCharCode(parseInt(hex, 16))
        );
}


// ==========================================
// METİN TEMİZLEME
// ==========================================

function cleanText(text) {

    return decodeHtml(text || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


// ==========================================
// TARİH KONTROLÜ
// ==========================================

function isDate(text) {

    return /^\d{2}\.\d{2}\.\d{4}$/.test(
        cleanText(text)
    );
}


// ==========================================
// SAAT KONTROLÜ
// ==========================================

function isTime(text) {

    return /^\d{1,2}:\d{2}$/.test(
        cleanText(text)
    );
}


// ==========================================
// SALON KONTROLÜ
// ==========================================

function isSportsHall(text) {

    const value =
        cleanText(text).toLocaleUpperCase("tr-TR");

    return (
        value.includes("SPOR SALONU") ||
        value.includes("SALONU")
    );
}


// ==========================================
// VOLEYBOL TABLOSUNU ÇEK
// ==========================================

async function getVoleybol() {

    const response = await fetch(
        VOLEYBOL_URL,
        {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (compatible; KocaeliCepte/1.0)",
                "Accept":
                    "text/html,application/xhtml+xml"
            }
        }
    );


    if (!response.ok) {

        throw new Error(
            "Voleybol sitesi HTTP " +
            response.status
        );

    }


    const html =
        await response.text();


    const events = [];


    // ======================================
    // TÜM TABLOLARI BUL
    // ======================================

    const tables =
        html.match(
            /<table[\s\S]*?<\/table>/gi
        ) || [];


    for (const table of tables) {


        // ==================================
        // SADECE SPOR MÜSABAKA TABLOLARI
        // ==================================

        const tableText =
            cleanText(table)
                .toLocaleLowerCase("tr-TR");


        if (
            !tableText.includes("ev sahibi") &&
            !tableText.includes("misafir")
        ) {
            continue;
        }


        // ==================================
        // SATIRLARI BUL
        // ==================================

        const rows =
            table.match(
                /<tr[\s\S]*?<\/tr>/gi
            ) || [];


        let currentDate = "";

        let currentVenue = "";


        for (const row of rows) {


            // ==================================
            // HÜCRELER
            // ==================================

            const cells =
                row.match(
                    /<(?:td|th)[^>]*>[\s\S]*?<\/(?:td|th)>/gi
                ) || [];


            if (cells.length === 0) {
                continue;
            }


            const values =
                cells.map(cell =>
                    cleanText(cell)
                );


            // Boş hücreleri temizle
            const filtered =
                values.filter(value =>
                    value.length > 0
                );


            if (filtered.length === 0) {
                continue;
            }


            // ==================================
            // TARİH BUL
            // ==================================

            const dateIndex =
                filtered.findIndex(value =>
                    isDate(value)
                );


            if (dateIndex !== -1) {

                currentDate =
                    filtered[dateIndex];

            }


            // ==================================
            // SALON BUL
            // ==================================

            const venueIndex =
                filtered.findIndex(value =>
                    isSportsHall(value)
                );


            if (venueIndex !== -1) {

                currentVenue =
                    filtered[venueIndex];

            }


            // ==================================
            // SAAT BUL
            // ==================================

            const timeIndex =
                filtered.findIndex(value =>
                    isTime(value)
                );


            if (timeIndex === -1) {
                continue;
            }


            const time =
                filtered[timeIndex];


            // ==================================
            // TARİH YOKSA ATLA
            // ==================================

            if (!currentDate) {
                continue;
            }


            // ==================================
            // TAKIMLARI BUL
            // ==================================

            /*
             * Voleybol sitesinde takım isimleri
             * genellikle saatten sonra gelir.
             *
             * Örnek:
             *
             * 15:00
             * Gölcük Bld. Spor
             * 3
             * 0
             * İstanbul Voleybol
             */


            let afterTime =
                filtered.slice(
                    timeIndex + 1
                );


            // ==================================
            // SAYISAL SONUÇLARI TEMİZLE
            // ==================================

            afterTime =
                afterTime.filter(value => {

                    return !(
                        /^\d+$/.test(value) ||
                        value === "-" ||
                        value === "–"
                    );

                });


            // ==================================
            // GEREKSİZ KELİMELER
            // ==================================

            afterTime =
                afterTime.filter(value => {

                    const lower =
                        value.toLocaleLowerCase(
                            "tr-TR"
                        );

                    return (
                        lower !== "image" &&
                        lower !== "ev sahibi" &&
                        lower !== "misafir" &&
                        lower !== "set sonuçları"
                    );

                });


            // ==================================
            // TAKIM İSİMLERİ
            // ==================================

            if (afterTime.length < 2) {
                continue;
            }


            const homeTeam =
                afterTime[0];

            const awayTeam =
                afterTime[1];


            // ==================================
            // GEÇERSİZ VERİ KONTROLÜ
            // ==================================

            if (
                !homeTeam ||
                !awayTeam ||
                homeTeam === awayTeam
            ) {
                continue;
            }


            // ==================================
            // BAŞLIK
            // ==================================

            const title =
                homeTeam +
                " - " +
                awayTeam;


            // ==================================
            // ETKİNLİK
            // ==================================

            events.push({

                title: title,

                date: currentDate,

                time: time,

                location:
                    currentVenue ||
                    "Kocaeli Spor Salonu",

                description:
                    "Voleybol müsabakası",

                url:
                    VOLEYBOL_URL,

                source:
                    "Kocaeli Voleybol İl Temsilciliği"

            });

        }

    }


    return events;
}


// ==========================================
// TEKRAR EDEN ETKİNLİKLERİ TEMİZLE
// ==========================================

function removeDuplicates(events) {

    const map =
        new Map();


    for (const event of events) {

        const key =
            [
                event.date,
                event.time,
                event.location,
                event.title
            ]
            .join("|")
            .toLocaleLowerCase("tr-TR");


        if (!map.has(key)) {

            map.set(
                key,
                event
            );

        }

    }


    return Array.from(
        map.values()
    );

}


// ==========================================
// TARİH + SAAT SIRALAMA
// ==========================================

function sortEvents(events) {

    return events.sort(
        (a, b) => {

            const aDate =
                parseDateTime(a);

            const bDate =
                parseDateTime(b);

            return aDate - bDate;

        }
    );

}


// ==========================================
// TARİHİ DATE'E ÇEVİR
// ==========================================

function parseDateTime(event) {

    if (!event.date) {
        return 9999999999999;
    }


    const parts =
        event.date.split(".");


    if (parts.length !== 3) {
        return 9999999999999;
    }


    const day =
        parseInt(parts[0], 10);

    const month =
        parseInt(parts[1], 10);

    const year =
        parseInt(parts[2], 10);


    let hour = 0;

    let minute = 0;


    if (event.time) {

        const timeParts =
            event.time.split(":");

        hour =
            parseInt(
                timeParts[0],
                10
            ) || 0;

        minute =
            parseInt(
                timeParts[1],
                10
            ) || 0;

    }


    return new Date(
        year,
        month - 1,
        day,
        hour,
        minute
    ).getTime();

}


// ==========================================
// API
// ==========================================

export default async function handler(
    req,
    res
) {

    try {


        // ==================================
        // CACHE
        // ==================================

        res.setHeader(
            "Cache-Control",
            "s-maxage=300, stale-while-revalidate=600"
        );


        // ==================================
        // VOLEYBOL
        // ==================================

        const voleybol =
            await getVoleybol();


        // ==================================
        // DUPLICATE TEMİZLE
        // ==================================

        let events =
            removeDuplicates(
                voleybol
            );


        // ==================================
        // SIRALA
        // ==================================

        events =
            sortEvents(
                events
            );


        // ==================================
        // SONUÇ
        // ==================================

        return res.status(200).json({

            success: true,

            count:
                events.length,

            sources: [

                {
                    name:
                        "Kocaeli Voleybol İl Temsilciliği",

                    url:
                        VOLEYBOL_URL
                }

            ],

            events:
                events

        });


    } catch (error) {


        console.error(
            "SPOR ETKİNLİKLERİ API HATASI:",
            error
        );


        return res.status(500).json({

            success: false,

            count: 0,

            events: [],

            error:
                "Spor etkinlikleri alınamadı."

        });

    }

}
