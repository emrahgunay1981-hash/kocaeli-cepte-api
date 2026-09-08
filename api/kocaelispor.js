// KOCAELİ CEPTE
// Kocaelispor özel haber sistemi
// 5 Kocaeli haber kaynağından beslenir.

function extract(regex, str) {
    const m = str.match(regex);
    return m ? m[1].trim() : "";
}

function cleanText(str) {
    if (!str) return "";

    return str
        .replace(/<!\[CDATA\[/gi, "")
        .replace(/\]\]>/gi, "")
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function timeAgo(pubDate) {
    const then = new Date(pubDate).getTime();

    if (isNaN(then)) return "";

    const diffMin =
        Math.floor((Date.now() - then) / 60000);

    if (diffMin < 1) return "az önce";

    if (diffMin < 60) {
        return `${diffMin} dakika önce`;
    }

    const diffHour =
        Math.floor(diffMin / 60);

    if (diffHour < 24) {
        return `${diffHour} saat önce`;
    }

    const diffDay =
        Math.floor(diffHour / 24);

    return `${diffDay} gün önce`;
}


// ==========================================
// KAYNAKLAR
// ==========================================

const SOURCES = [

    {
        name: "Kocaeli Gazetesi",
        url: "https://www.kocaeligazetesi.com.tr/rss/kategori/kocaelispor"
    },

    {
        name: "Özgür Kocaeli",
        url: "https://www.ozgurkocaeli.com.tr/rss/kategori/kocaelispor-haberleri"
    },

    {
        name: "Ses Kocaeli",
        url: "https://www.seskocaeli.com/rss/kategori/kocaeli-spor-haberleri"
    },

    {
        name: "En Kocaeli",
        url: "https://www.enkocaeli.com/rss/kategori/kocaeli-spor-haberleri"
    },

    {
        name: "Kocaeli Gündem",
        url: "https://kocaeligundem.com/rss/kategori/spor"
    }

];


// ==========================================
// KOCAELİSPOR ANAHTAR KELİMELERİ
// ==========================================

const KEYWORDS = [

    "kocaelispor",
    "kocaeli spor",
    "körfez ekibi",
    "körfez temsilcisi",
    "yeşil-siyahlı",
    "yeşil siyahlı",
    "yeşil-siyah",
    "yeşil siyah",
    "hodri meydan",
    "turka kocaeli stadyumu"

];


// ==========================================
// HABERİN KOCAELİSPOR İLE İLGİSİ
// ==========================================

function isKocaelisporNews(item) {

    const text = [
        item.title || "",
        item.description || "",
        item.category || ""
    ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

    return KEYWORDS.some(keyword =>
        text.includes(
            keyword.toLocaleLowerCase("tr-TR")
        )
    );
}


// ==========================================
// GÖRSEL BUL
// ==========================================

function getImage(block, rawDescription) {

    let image = null;


    // enclosure

    const enclosure =
        block.match(
            /<enclosure[^>]+url=["']([^"']+)["']/i
        );

    if (enclosure) {
        image = enclosure[1];
    }


    // media:content

    if (!image) {

        const media =
            block.match(
                /<media:content[^>]+url=["']([^"']+)["']/i
            );

        if (media) {
            image = media[1];
        }

    }


    // media:thumbnail

    if (!image) {

        const thumbnail =
            block.match(
                /<media:thumbnail[^>]+url=["']([^"']+)["']/i
            );

        if (thumbnail) {
            image = thumbnail[1];
        }

    }


    // description içindeki img

    if (!image && rawDescription) {

        const img =
            rawDescription.match(
                /<img[^>]+src=["']([^"']+)["']/i
            );

        if (img) {
            image = img[1];
        }

    }


    return image
        ? image.trim()
        : null;
}


// ==========================================
// KAYNAK HABERLERİNİ AL
// ==========================================

async function getSource(source) {

    try {

        const response =
            await fetch(source.url, {

                headers: {
                    "User-Agent":
                        "KocaeliCepte/1.0",
                    "Accept":
                        "application/rss+xml, application/xml, text/xml, */*"
                },

                cache: "no-store"

            });


        if (!response.ok) {

            console.log(
                "RSS hata:",
                source.name,
                response.status
            );

            return [];

        }


        const xml =
            await response.text();


        const blocks =
            xml.match(
                /<item[\s\S]*?<\/item>/gi
            ) || [];


        const items = [];


        for (
            const block of blocks.slice(0, 30)
        ) {

            const title =
                cleanText(
                    extract(
                        /<title>([\s\S]*?)<\/title>/i,
                        block
                    )
                );


            const link =
                cleanText(
                    extract(
                        /<link>([\s\S]*?)<\/link>/i,
                        block
                    )
                );


            const pubDate =
                cleanText(
                    extract(
                        /<pubDate>([\s\S]*?)<\/pubDate>/i,
                        block
                    )
                );


            const category =
                cleanText(
                    extract(
                        /<category[^>]*>([\s\S]*?)<\/category>/i,
                        block
                    )
                );


            const rawDescription =
                extract(
                    /<description>([\s\S]*?)<\/description>/i,
                    block
                ) || "";


            const description =
                cleanText(
                    rawDescription
                );


            const image =
                getImage(
                    block,
                    rawDescription
                );


            const item = {

                title,
                link,
                category,
                description,
                image,
                pubDate,

                time:
                    pubDate
                        ? timeAgo(pubDate)
                        : "",

                source:
                    source.name

            };


            if (
                item.title &&
                item.link &&
                isKocaelisporNews(item)
            ) {

                items.push(item);

            }

        }


        return items;


    } catch (error) {

        console.log(
            "RSS alınamadı:",
            source.name,
            error.message
        );

        return [];

    }

}


// ==========================================
// API
// ==========================================

export default async function handler(req, res) {


    // CORS

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


    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }


    try {


        // 5 kaynağı aynı anda çek

        const results =
            await Promise.all(
                SOURCES.map(source =>
                    getSource(source)
                )
            );


        let items = [];


        results.forEach(sourceItems => {

            items.push(
                ...sourceItems
            );

        });


        // ==================================
        // AYNI HABERLERİ TEMİZLE
        // ==================================

        const seen =
            new Set();


        items =
            items.filter(item => {

                const key =
                    item.title
                        .toLocaleLowerCase("tr-TR")
                        .replace(
                            /[^a-z0-9çğıöşü\s]/gi,
                            ""
                        )
                        .replace(
                            /\s+/g,
                            " "
                        )
                        .trim();


                if (seen.has(key)) {
                    return false;
                }


                seen.add(key);

                return true;

            });


        // ==================================
        // TARİHE GÖRE SIRALA
        // ==================================

        items.sort((a, b) => {

            const dateA =
                new Date(
                    a.pubDate || 0
                ).getTime();


            const dateB =
                new Date(
                    b.pubDate || 0
                ).getTime();


            return dateB - dateA;

        });


        // ==================================
        // KAYNAK BAŞINA MAKSİMUM 8
        // ==================================

        const sourceCount = {};

        const balanced = [];


        for (const item of items) {

            const source =
                item.source;


            if (!sourceCount[source]) {
                sourceCount[source] = 0;
            }


            if (
                sourceCount[source] >= 8
            ) {
                continue;
            }


            sourceCount[source]++;

            balanced.push(item);


            if (
                balanced.length >= 30
            ) {
                break;
            }

        }


        // ==================================
        // TEKRAR TARİHE GÖRE SIRALA
        // ==================================

        balanced.sort((a, b) => {

            const dateA =
                new Date(
                    a.pubDate || 0
                ).getTime();


            const dateB =
                new Date(
                    b.pubDate || 0
                ).getTime();


            return dateB - dateA;

        });


        // ==================================
        // SPORT.HTML FORMAT
        // ==================================

        const formatted =
            balanced.map(item => ({

                title:
                    item.title,

                description:
                    item.description,

                url:
                    item.link,

                date:
                    item.pubDate,

                time:
                    item.time,

                image:
                    item.image,

                source:
                    item.source

            }));


        // ==================================
        // CEVAP
        // ==================================

        return res.status(200).json({

            success: true,

            source:
                "5 Kocaeli haber kaynağı",

            count:
                formatted.length,

            sources:
                SOURCES.map(
                    source =>
                        source.name
                ),

            sourceCount,

            items:
                formatted,

            updatedAt:
                new Date().toISOString()

        });


    } catch (error) {

        console.error(
            "Kocaelispor API hatası:",
            error
        );


        return res.status(500).json({

            success: false,

            items: [],

            error:
                "Kocaelispor haberleri alınamadı.",

            details:
                error.message,

            updatedAt:
                new Date().toISOString()

        });

    }

}
