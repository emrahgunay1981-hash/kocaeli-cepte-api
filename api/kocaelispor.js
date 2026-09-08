// ==========================================
// KOCAELİ CEPTE
// KOCAELİSPOR HABER API
// Kaynak: 1966kocaelispor.com
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

        // 1966 Kocaelispor'un sitelere ekleme haber akışı
        const url =
            "https://1966kocaelispor.com/sitene-ekle/manset.php";

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (compatible; KocaeliCepte/1.0)",
                "Accept":
                    "text/html,application/xhtml+xml"
            }
        });

        if (!response.ok) {
            throw new Error(
                "Kocaelispor haber kaynağına ulaşılamadı"
            );
        }

        const html = await response.text();

        // Haber bağlantılarını yakala
        const links = [];

        const regex =
            /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

        let match;

        while ((match = regex.exec(html)) !== null) {

            let href = match[1];
            let title = match[2];

            // HTML temizle
            title = cleanHTML(title);

            // Gereksiz / boş bağlantıları geç
            if (!title || title.length < 8) {
                continue;
            }

            // Menü ve gereksiz bağlantıları filtrele
            const lowerTitle =
                title.toLocaleLowerCase("tr-TR");

            const ignored = [
                "ana sayfa",
                "üye ol",
                "üye girişi",
                "iletişim",
                "rss",
                "sitene ekle",
                "haber ara",
                "günün haberleri",
                "haber arşivi",
                "genel",
                "gündem",
                "süper lig",
                "yönetim",
                "futbolcular",
                "antrenörler",
                "taraftar",
                "başkanlar",
                "altyapı",
                "tff"
            ];

            if (
                ignored.some(word =>
                    lowerTitle === word
                )
            ) {
                continue;
            }

            // Link göreceliyse tam URL yap
            if (href.startsWith("/")) {
                href =
                    "https://1966kocaelispor.com" +
                    href;
            }

            if (
                !href.startsWith(
                    "https://1966kocaelispor.com/"
                )
            ) {
                continue;
            }

            // Aynı haberi ikinci kez ekleme
            const exists =
                links.some(item =>
                    item.url === href
                );

            if (exists) {
                continue;
            }

            links.push({
                title: title,
                url: href,
                description: "",
                date: "",
                source: "1966 Kocaelispor"
            });

            // En fazla 20 haber
            if (links.length >= 20) {
                break;
            }
        }

        if (links.length === 0) {

            return res.status(502).json({
                success: false,
                items: [],
                error:
                    "Kocaelispor haberleri bulunamadı.",
                updatedAt:
                    new Date().toISOString()
            });

        }

        return res.status(200).json({

            success: true,

            source:
                "1966kocaelispor.com",

            items: links,

            updatedAt:
                new Date().toISOString()

        });

    } catch (error) {

        console.error(
            "KOCAELİSPOR API HATASI:",
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


// ==========================================
// HTML TEMİZLEME
// ==========================================

function cleanHTML(text) {

    if (!text) {
        return "";
    }

    return String(text)

        // Script
        .replace(
            /<script[\s\S]*?<\/script>/gi,
            ""
        )

        // Style
        .replace(
            /<style[\s\S]*?<\/style>/gi,
            ""
        )

        // HTML etiketleri
        .replace(
            /<[^>]+>/g,
            " "
        )

        // HTML karakterleri
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
            /&#x27;/gi,
            "'"
        )

        .replace(
            /&ouml;/gi,
            "ö"
        )

        .replace(
            /&Ouml;/g,
            "Ö"
        )

        .replace(
            /&uuml;/gi,
            "ü"
        )

        .replace(
            /&Uuml;/g,
            "Ü"
        )

        .replace(
            /&ccedil;/gi,
            "ç"
        )

        .replace(
            /&Ccedil;/g,
            "Ç"
        )

        .replace(
            /&scedil;/gi,
            "ş"
        )

        .replace(
            /&Scedil;/g,
            "Ş"
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();
    }
