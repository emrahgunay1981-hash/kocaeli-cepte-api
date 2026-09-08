// KOCAELİ CEPTE
// Kocaelispor haber sistemi
// Anasayfadaki 5 Kocaeli haber kaynağından
// Kocaelispor haberlerini otomatik filtreler.
// Haber görsellerini de almaya çalışır.


function extract(regex, str) {

    const m = str.match(regex);

    return m ? m[1].trim() : null;
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

    const then =
        new Date(pubDate).getTime();

    if (isNaN(then)) {
        return "";
    }

    const diffMin =
        Math.floor(
            (Date.now() - then) / 60000
        );

    if (diffMin < 1) {
        return "az önce";
    }

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
// KOCAELİ HABER KAYNAKLARI
// ==========================================

const SOURCES = [

    {
        name: "Kocaeli Gazetesi",
        url: "https://www.kocaeligazetesi.com.tr/rss/haber"
    },

    {
        name: "Özgür Kocaeli",
        url: "https://www.ozgurkocaeli.com.tr/rss/haber"
    },

    {
        name: "Ses Kocaeli",
        url: "https://www.seskocaeli.com/rss/haber"
    },

    {
        name: "En Kocaeli",
        url: "https://www.enkocaeli.com/rss/haber"
    },

    {
        name: "Kocaeli Gündem",
        url: "https://kocaeligundem.com/rss/haber"
    }

];


// ==========================================
// KOCAELİSPOR KELİMELERİ
// ==========================================

const KOCAELISPOR_KEYWORDS = [

    "kocaelispor",
    "kocaeli spor",
    "körfez ekibi",
    "körfez temsilcisi",
    "yeşil-siyahlı",
    "yeşil siyahlı",
    "yeşil-siyah",
    "yeşil siyah"

];


// ==========================================
// HABER KOCAELİSPOR İLE İLGİLİ Mİ?
// ==========================================

function isKocaelisporNews(item) {

    const text = [

        item.title || "",
        item.description || "",
        item.category || ""

    ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");


    return KOCAELISPOR_KEYWORDS.some(
        keyword =>
            text.includes(
                keyword.toLocaleLowerCase("tr-TR")
            )
    );
}


// ==========================================
// HABER GÖRSELİNİ BUL
// ==========================================

function getImage(block, description) {

    let image = null;


    // 1. enclosure
    const enclosure =
        block.match(
            /<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i
        );

    if (enclosure) {
        image = enclosure[1];
    }


    // 2. media:content
    if (!image) {

        const mediaContent =
            block.match(
                /<media:content[^>]+url=["']([^"']+)["'][^>]*>/i
            );

        if (mediaContent) {
            image = mediaContent[1];
        }

    }


    // 3. media:thumbnail
    if (!image) {

        const mediaThumbnail =
            block.match(
                /<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*>/i
            );

        if (mediaThumbnail) {
            image = mediaThumbnail[1];
        }

    }


    // 4. description içindeki img
    if (!image && description) {

        const img =
            description.match(
                /<img[^>]+src=["']([^"']+)["']/i
            );

        if (img) {
            image = img[1];
        }

    }


    // 5. og:image benzeri veri varsa
    if (!image && description) {

        const imageMatch =
            description.match(
                /(?:image|imageurl|thumbnail)["'\s:=]+["']?(https?:\/\/[^"'\s>]+)/i
            );

        if (imageMatch) {
            image = imageMatch[1];
        }

    }


    if (!image) {
        return null;
    }


    return image.trim();

}


// ==========================================
// TEK KAYNAKTAN HABERLERİ AL
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


        const itemBlocks =
            xml.match(
                /<item[\s\S]*?<\/item>/gi
            ) || [];


        const items = itemBlocks

            .slice(0, 15)

            .map(block => {


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


                // HTML içeren açıklamayı
                // görsel bulmadan önce alıyoruz.

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


                return {

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

            })


            .filter(item =>

                item.title &&
                item.link &&
                isKocaelisporNews(item)

            );


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

        return res
            .status(200)
            .end();

    }


    try {


        // ==================================
        // TÜM KAYNAKLARI AYNI ANDA ÇEK
        // ==================================

        const results =
            await Promise.all(
                SOURCES.map(source =>
                    getSource(source)
                )
            );


        let items = [];


        results.forEach(
            sourceItems => {

                items.push(
                    ...sourceItems
                );

            }
        );


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
        // EN FAZLA 5 HABER / KAYNAK
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
                sourceCount[source] >= 5
            ) {

                continue;

            }


            sourceCount[source]++;

            balanced.push(item);


            if (
                balanced.length >= 20
            ) {

                break;

            }

        }


        // ==================================
        // SON SIRALAMA
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
                "Kocaeli haber kaynakları",

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
