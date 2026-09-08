// ==========================================
// KOCAELİ CEPTE
// KOCAELİSPOR HABER API
// ==========================================

export default async function handler(req, res) {

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


    if (req.method !== "GET") {

        return res.status(405).json({
            success: false,
            error: "Method Not Allowed"
        });

    }


    try {

        /*
         * 1966 Kocaelispor RSS
         */

        const rssUrl =
            "https://1966kocaelispor.com/rss/";


        const response = await fetch(
            rssUrl,
            {
                headers: {
                    "User-Agent":
                        "KocaeliCepte/1.0"
                }
            }
        );


        if (!response.ok) {

            throw new Error(
                "RSS kaynağına ulaşılamadı"
            );

        }


        const xml =
            await response.text();


        /*
         * RSS içindeki item kayıtlarını bul
         */

        const items =
            xml.match(
                /<item[\s\S]*?<\/item>/gi
            ) || [];


        const news =
            items
                .map(item => {

                    function getTag(tag) {

                        const regex =
                            new RegExp(
                                `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
                                "i"
                            );

                        const match =
                            item.match(regex);

                        if (!match) {
                            return "";
                        }

                        return match[1]
                            .replace(
                                /<!\[CDATA\[([\s\S]*?)\]\]>/g,
                                "$1"
                            )
                            .trim();

                    }


                    const title =
                        getTag("title");


                    const link =
                        getTag("link");


                    const description =
                        getTag("description");


                    const pubDate =
                        getTag("pubDate");


                    const category =
                        getTag("category");


                    if (!title) {
                        return null;
                    }


                    return {

                        title: cleanHTML(title),

                        description:
                            cleanHTML(
                                description
                            ).substring(
                                0,
                                300
                            ),

                        url: link,

                        date: pubDate,

                        category:
                            cleanHTML(
                                category
                            )

                    };

                })
                .filter(Boolean)
                .slice(0, 30);


        return res.status(200).json({

            success: true,

            source:
                "1966kocaelispor.com",

            items: news,

            updatedAt:
                new Date().toISOString()

        });


    } catch (error) {

        console.error(
            "KOCAELİSPOR RSS HATASI:",
            error
        );


        return res.status(502).json({

            success: false,

            items: [],

            error:
                "Kocaelispor haberleri alınamadı.",

            updatedAt:
                new Date().toISOString()

        });

    }

}


/*
 * HTML temizleme
 */

function cleanHTML(text) {

    if (!text) {
        return "";
    }


    return String(text)

        .replace(
            /<script[\s\S]*?<\/script>/gi,
            ""
        )

        .replace(
            /<style[\s\S]*?<\/style>/gi,
            ""
        )

        .replace(
            /<[^>]+>/g,
            " "
        )

        .replace(
            /&nbsp;/gi,
            " "
        )

        .replace(
            /&amp;/gi,
            "&"
        )

        .replace(
            /&quot;/gi,
            '"'
        )

        .replace(
            /&#39;/gi,
            "'"
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}
