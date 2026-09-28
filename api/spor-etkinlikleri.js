// ==========================================
// KOCAELİ CEPTE
// SPOR ETKİNLİKLERİ API
// ==========================================

const VOLEYBOL_URL =
    "https://kocaeli.voleyboliltemsilciligi.com/";


function temizle(text) {
    if (!text) return "";

    return String(text)
        .replace(/<[^>]*>/g, " ")
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


function tarihMi(text) {
    return /^\d{2}\.\d{2}\.\d{4}$/.test(text);
}


function saatMi(text) {
    return /^\d{1,2}:\d{2}$/.test(text);
}


function salonMu(text) {

    const t = temizle(text)
        .toLocaleUpperCase("tr-TR");

    return (
        t.includes("SPOR SALONU") ||
        t.includes("SALONU")
    );
}


async function voleybolGetir() {

    const response = await fetch(
        VOLEYBOL_URL,
        {
            headers: {
                "User-Agent":
                    "Mozilla/5.0",
                "Accept":
                    "text/html"
            }
        }
    );

    if (!response.ok) {
        throw new Error(
            "Voleybol sitesi HTTP " +
            response.status
        );
    }

    const html = await response.text();

    const events = [];

    // Sayfadaki tabloları bul
    const tables =
        html.match(
            /<table[\s\S]*?<\/table>/gi
        ) || [];


    for (const table of tables) {

        const tableText =
            temizle(table)
                .toLocaleLowerCase("tr-TR");


        // Spor tablosu değilse geç
        if (
            !tableText.includes("ev sahibi") &&
            !tableText.includes("misafir")
        ) {
            continue;
        }


        const rows =
            table.match(
                /<tr[\s\S]*?<\/tr>/gi
            ) || [];


        let currentDate = "";
        let currentVenue = "";


        for (const row of rows) {

            const cells =
                row.match(
                    /<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi
                ) || [];


            if (!cells.length) {
                continue;
            }


            const values =
                cells.map(temizle);


            // Tarih varsa güncel tarihi değiştir
            for (const value of values) {

                if (tarihMi(value)) {
                    currentDate = value;
                    break;
                }

            }


            // Salon varsa güncel salonu değiştir
            for (const value of values) {

                if (salonMu(value)) {
                    currentVenue = value;
                    break;
                }

            }


            // Saat bul
            const timeIndex =
                values.findIndex(saatMi);


            if (timeIndex === -1) {
                continue;
            }


            if (!currentDate) {
                continue;
            }


            const time =
                values[timeIndex];


            // Saatten sonraki dolu hücreleri al
            const after =
                values
                    .slice(timeIndex + 1)
                    .filter(x => x);


            /*
             * Örnek:
             *
             * 12:00
             * Cadence Boya Gölcük İhsaniye
             * ...
             * Büyük Kartepe Spor
             *
             * İlk ve son takım bilgisini alıyoruz.
             */

            if (after.length < 2) {
                continue;
            }


            const homeTeam =
                after[0];


            const awayTeam =
                after[after.length - 1];


            // Sonuç / teknik bilgiler takım sanılmasın
            if (
                /^\d+$/.test(homeTeam) ||
                /^\d+$/.test(awayTeam)
            ) {
                continue;
            }


            if (
                homeTeam.length < 2 ||
                awayTeam.length < 2
            ) {
                continue;
            }


            if (
                homeTeam.toLocaleLowerCase("tr-TR")
                ===
                awayTeam.toLocaleLowerCase("tr-TR")
            ) {
                continue;
            }


            events.push({

                title:
                    homeTeam +
                    " - " +
                    awayTeam,

                date:
                    currentDate,

                time:
                    time,

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
// TEKRARLARI TEMİZLE
// ==========================================

function tekrarSil(events) {

    const map = new Map();


    for (const event of events) {

        const key =
            [
                event.date,
                event.time,
                event.location,
                event.title
            ].join("|");


        if (!map.has(key)) {
            map.set(key, event);
        }

    }


    return Array.from(map.values());
}


// ==========================================
// TARİH SIRALAMA
// ==========================================

function tarihDegeri(event) {

    if (!event.date) {
        return 9999999999999;
    }


    const p =
        event.date.split(".");


    if (p.length !== 3) {
        return 9999999999999;
    }


    const day =
        Number(p[0]);

    const month =
        Number(p[1]);

    const year =
        Number(p[2]);


    const time =
        (event.time || "00:00")
        .split(":");


    const hour =
        Number(time[0]) || 0;

    const minute =
        Number(time[1]) || 0;


    return new Date(
        year,
        month - 1,
        day,
        hour,
        minute
    ).getTime();
}


// ==========================================
// VERCEL API
// ==========================================

module.exports = async function handler(
    req,
    res
) {

    try {

        res.setHeader(
            "Cache-Control",
            "s-maxage=300, stale-while-revalidate=600"
        );


        const voleybol =
            await voleybolGetir();


        let events =
            tekrarSil(voleybol);


        events.sort(
            (a, b) =>
                tarihDegeri(a) -
                tarihDegeri(b)
        );


        return res.status(200).json({

            success: true,

            count:
                events.length,

            source:
                "Kocaeli Voleybol İl Temsilciliği",

            events:
                events

        });


    } catch (error) {

        console.error(
            "SPOR API HATASI:",
            error
        );


        return res.status(500).json({

            success: false,

            count: 0,

            events: [],

            error:
                error.message ||
                "Spor etkinlikleri alınamadı."

        });

    }

};
