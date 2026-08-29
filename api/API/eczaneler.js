export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://www.kocaelieo.org.tr/nobetci-eczaneler"
    );

    if (!response.ok) {
      throw new Error("Kocaeli Eczacı Odası'na ulaşılamadı");
    }

    const html = await response.text();

    const pharmacies = [];

    // Eczane kartlarını yakala
    const blocks = html.split(/<h[2-4][^>]*>/i);

    for (const block of blocks) {

      const nameMatch = block.match(
        /([^<]{2,80})\s*-\s*([A-ZÇĞİÖŞÜa-zçğıöşüİÖŞÜ\s()]+)/
      );

      if (!nameMatch) continue;

      const name = nameMatch[1]
        .replace(/[\r\n\t]+/g, " ")
        .trim();

      const district = nameMatch[2]
        .replace(/[\r\n\t]+/g, " ")
        .trim();

      // Telefon
      const phoneMatch = block.match(
        /0?262\s*[\d\s]{7,}/
      );

      const phone = phoneMatch
        ? phoneMatch[0].replace(/\s+/g, "")
        : "";

      // Nöbet tarihi
      const dutyMatch = block.match(
        /(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})\s*\/\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})/
      );

      const dutyStart = dutyMatch ? dutyMatch[1] : "";
      const dutyEnd = dutyMatch ? dutyMatch[2] : "";

      // Adres
      let text = block
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Gereksiz bölümleri temizle
      text = text
        .replace(/Navigasyona Git!/gi, "")
        .replace(/Konumu Gör/gi, "")
        .replace(/Ara/gi, "")
        .trim();

      // Çok uzun/uygunsuz kayıtları alma
      if (!name || !district) continue;

      pharmacies.push({
        name,
        district,
        address: text,
        phone,
        dutyStart,
        dutyEnd,
        source: "Türk Eczacılar Birliği 31. Bölge Kocaeli Eczacı Odası"
      });
    }

    // Aynı eczaneyi tekrar ekleme
    const unique = [];

    for (const pharmacy of pharmacies) {
      const exists = unique.some(
        x =>
          x.name.toLowerCase() === pharmacy.name.toLowerCase() &&
          x.district.toLowerCase() === pharmacy.district.toLowerCase()
      );

      if (!exists) {
        unique.push(pharmacy);
      }
    }

    res.status(200).json({
      success: true,
      source: "Kocaeli Eczacı Odası",
      updatedAt: new Date().toISOString(),
      count: unique.length,
      pharmacies: unique
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: "Nöbetçi eczane verileri alınamadı."
    });
  }
}
