export default async function handler(req, res) {
  try {

    const district =
      typeof req.query?.district === "string"
        ? req.query.district.trim().toLowerCase()
        : "";

    let url =
      "https://eczaneadresi.com/api/public/v1/duty-pharmacies?city=kocaeli&limit=200";

    if (district) {
      url += `&district=${encodeURIComponent(district)}`;
    }

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(
        `Eczane API hata kodu: ${response.status}`
      );
    }

    const data = await response.json();

    const pharmacies = Array.isArray(data.pharmacies)
      ? data.pharmacies
      : [];

    const result = pharmacies.map((pharmacy) => ({
      name: pharmacy.name || "",
      district:
        pharmacy.district ||
        pharmacy.cityDistrict ||
        "",
      address:
        pharmacy.address ||
        "",
      phone:
        pharmacy.phone ||
        "",
      latitude:
        pharmacy.latitude ??
        pharmacy.lat ??
        null,
      longitude:
        pharmacy.longitude ??
        pharmacy.lng ??
        null,
      dutyStart:
        pharmacy.dutyStart ||
        pharmacy.duty_start ||
        "",
      dutyEnd:
        pharmacy.dutyEnd ||
        pharmacy.duty_end ||
        "",
      source: "Eczane Adresi"
    }));

    res.status(200).json({
      success: true,
      city: "Kocaeli",
      district: district || null,
      count: result.length,
      updatedAt: new Date().toISOString(),
      pharmacies: result
    });

  } catch (error) {

    console.error("Eczane API hatası:", error);

    res.status(500).json({
      success: false,
      error: "Nöbetçi eczane verileri alınamadı.",
      pharmacies: []
    });
  }
}
