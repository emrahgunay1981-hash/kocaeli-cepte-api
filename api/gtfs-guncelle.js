// ==========================================
// KOCAELİ CEPTE - TOPLU TAŞIMA VERİSİ İŞLEME
// Belediyenin resmi GTFS (zip) dosyasını indirir,
// açar, okur ve Redis'e kaydeder.
//
// Bu API elle tetiklenir (örn. günde 1 kez),
// kullanıcılar bunu doğrudan çağırmaz.
// ==========================================

import { Redis } from "@upstash/redis";
import JSZip from "jszip";
import Papa from "papaparse";

const redis = Redis.fromEnv();

const GTFS_URL =
  "http://kocaeli.bel.tr/webfiles/userfiles/files/birimler/bilgi-islem-dairesi-baskanligi/kocaeli-gtfs.zip";

function parseCsv(text) {

  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true
  });

  return result.data;

}

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {

    // ==========================================
    // 1. GTFS ZIP DOSYASINI İNDİR
    // ==========================================

    const response = await fetch(GTFS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {

      return res.status(500).json({
        success: false,
        step: "download",
        error: "GTFS dosyası indirilemedi (HTTP " + response.status + ")"
      });

    }

    const arrayBuffer = await response.arrayBuffer();

    // ==========================================
    // 2. ZIP'İ AÇ
    // ==========================================

    const zip = await JSZip.loadAsync(arrayBuffer);

    const fileNames = Object.keys(zip.files);

    // ==========================================
    // 3. GEREKLİ DOSYALARI OKU
    // ==========================================

    async function readGtfsFile(name) {

      const file = zip.file(name);

      if (!file) return [];

      const text = await file.async("string");

      return parseCsv(text);

    }

    const routes = await readGtfsFile("routes.txt");
    const stops = await readGtfsFile("stops.txt");
    const trips = await readGtfsFile("trips.txt");
    const stopTimes = await readGtfsFile("stop_times.txt");

    // ==========================================
    // 4. HAT BAŞINA DURAK LİSTESİ OLUŞTUR
    // (basitleştirilmiş: her hat için, bir örnek
    // seferin sırasıyla geçtiği duraklar)
    // ==========================================

    // route_id -> route bilgisi
    const routeMap = {};
    routes.forEach(r => {
      routeMap[r.route_id] = {
        id: r.route_id,
        shortName: r.route_short_name || "",
        longName: r.route_long_name || ""
      };
    });

    // trip_id -> route_id
    const tripToRoute = {};
    trips.forEach(t => {
      tripToRoute[t.trip_id] = t.route_id;
    });

    // stop_id -> durak bilgisi
    const stopMap = {};
    stops.forEach(s => {
      stopMap[s.stop_id] = {
        id: s.stop_id,
        name: s.stop_name || "",
        lat: s.stop_lat || null,
        lng: s.stop_lon || null
      };
    });

    // Her hat için BİR örnek trip seçip, o trip'in
    // duraklarını sırayla topluyoruz.
    const routeFirstTrip = {};

    trips.forEach(t => {

      if (!routeFirstTrip[t.route_id]) {
        routeFirstTrip[t.route_id] = t.trip_id;
      }

    });

    // trip_id -> [ { stop_id, sequence, time } ]
    const tripStops = {};

    stopTimes.forEach(st => {

      if (!tripStops[st.trip_id]) {
        tripStops[st.trip_id] = [];
      }

      tripStops[st.trip_id].push({
        stopId: st.stop_id,
        sequence: parseInt(st.stop_sequence) || 0,
        time: st.arrival_time || st.departure_time || ""
      });

    });

    Object.keys(tripStops).forEach(tripId => {
      tripStops[tripId].sort((a, b) => a.sequence - b.sequence);
    });

    // Sonuç: her hat için durak listesi + saatler
    const linesData = [];

    Object.keys(routeFirstTrip).forEach(routeId => {

      const tripId = routeFirstTrip[routeId];
      const stopsForTrip = tripStops[tripId] || [];

      const routeInfo = routeMap[routeId] || {
        id: routeId,
        shortName: routeId,
        longName: ""
      };

      linesData.push({
        routeId,
        shortName: routeInfo.shortName,
        longName: routeInfo.longName,
        stops: stopsForTrip.map(s => ({
          name: stopMap[s.stopId] ? stopMap[s.stopId].name : s.stopId,
          time: s.time
        }))
      });

    });

    // ==========================================
    // 5. REDIS'E KAYDET
    // ==========================================

    await redis.set("gtfs:lines", JSON.stringify(linesData));
    await redis.set("gtfs:updatedAt", new Date().toISOString());

    return res.status(200).json({

      success: true,

      summary: {
        totalFilesInZip: fileNames.length,
        routesFound: routes.length,
        stopsFound: stops.length,
        tripsFound: trips.length,
        stopTimesFound: stopTimes.length,
        linesProcessed: linesData.length
      },

      // İlk 2 hattı örnek olarak gösteriyoruz
      // (her şeyin doğru okunduğunu kontrol etmek için)
      sample: linesData.slice(0, 2),

      updatedAt: new Date().toISOString()

    });

  } catch (error) {

    console.error("GTFS işleme hatası:", error);

    return res.status(500).json({
      success: false,
      step: "processing",
      error: error.message || String(error)
    });

  }

}

