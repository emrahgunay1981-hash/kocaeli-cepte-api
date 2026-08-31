// ==========================================
// KOCAELİ CEPTE PUANI - Kaydet ve Oku
// Upstash Redis (Vercel entegrasyonu) kullanır
// ==========================================

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ======================================
  // PUAN KAYDETME (POST)
  // ======================================

  if (req.method === "POST") {

    try {

      const { placeId, rating } = req.body;

      if (!placeId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: "Geçersiz placeId veya rating (1-5 arası olmalı)."
        });
      }

      // Toplam puan ve oy sayısını artır
      const sumKey = `rating:${placeId}:sum`;
      const countKey = `rating:${placeId}:count`;

      const newSum = await redis.incrby(sumKey, rating);
      const newCount = await redis.incr(countKey);

      const average = newSum / newCount;

      return res.status(200).json({
        success: true,
        placeId,
        average: Math.round(average * 10) / 10,
        count: newCount
      });

    } catch (error) {

      console.error("Puan kaydetme hatası:", error);

      return res.status(500).json({
        success: false,
        error: "Puan kaydedilemedi."
      });

    }

  }

  // ======================================
  // PUAN OKUMA (GET)
  // ======================================

  if (req.method === "GET") {

    try {

      const { placeIds } = req.query;

      if (!placeIds) {
        return res.status(400).json({
          success: false,
          error: "placeIds parametresi gerekli (virgülle ayrılmış liste)."
        });
      }

      const ids = placeIds.split(",");

      const results = {};

      for (const id of ids) {

        const sumKey = `rating:${id}:sum`;
        const countKey = `rating:${id}:count`;

        const sum = await redis.get(sumKey);
        const count = await redis.get(countKey);

        if (count && count > 0) {
          results[id] = {
            average: Math.round((sum / count) * 10) / 10,
            count: Number(count)
          };
        } else {
          results[id] = {
            average: 0,
            count: 0
          };
        }

      }

      return res.status(200).json({
        success: true,
        ratings: results
      });

    } catch (error) {

      console.error("Puan okuma hatası:", error);

      return res.status(500).json({
        success: false,
        error: "Puanlar okunamadı."
      });

    }

  }

  return res.status(405).json({
    success: false,
    error: "Desteklenmeyen metod."
  });

        }

