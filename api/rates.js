// Dolar, Euro ve BTC için canlı veri çeker.
// Frankfurter (ECB) ve Binance herkese açık, ücretsiz API'ler - anahtar gerekmiyor.
// Altın ve BIST 100 için şimdilik ücretsiz/anahtarsız güvenilir bir kaynak yok,
// bu yüzden onlar ayrı bir aşamada (bir API anahtarı ile) eklenecek.

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  try {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const [usdSeries, eurSeries, btc24h] = await Promise.all([
      fetch(`https://api.frankfurter.dev/v2/${fmtDate(weekAgo)}..${fmtDate(today)}?base=USD&symbols=TRY`)
        .then(r => r.json()),
      fetch(`https://api.frankfurter.dev/v2/${fmtDate(weekAgo)}..${fmtDate(today)}?base=EUR&symbols=TRY`)
        .then(r => r.json()),
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT`)
        .then(r => r.json()),
    ]);

    function seriesChange(series, code) {
      const dates = Object.keys(series.rates || {}).sort();
      if (dates.length === 0) return { value: null, changePct: null };
      const last = dates[dates.length - 1];
      const first = dates[0];
      const lastVal = series.rates[last][code];
      const firstVal = series.rates[first][code];
      const changePct = firstVal ? ((lastVal - firstVal) / firstVal) * 100 : null;
      return { value: lastVal, changePct };
    }

    const usd = seriesChange(usdSeries, "TRY");
    const eur = seriesChange(eurSeries, "TRY");

    const rates = [
      {
        code: "USD",
        name: "DOLAR",
        value: usd.value,
        changePct: usd.changePct,
      },
      {
        code: "EUR",
        name: "EURO",
        value: eur.value,
        changePct: eur.changePct,
      },
      {
        code: "BTC",
        name: "BTC/USDT",
        value: btc24h.lastPrice ? Number(btc24h.lastPrice) : null,
        changePct: btc24h.priceChangePercent ? Number(btc24h.priceChangePercent) : null,
      },
    ];

    res.status(200).json({ ok: true, updated: new Date().toISOString(), rates });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Kur verileri alınamadı" });
  }
}
