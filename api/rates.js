// Dolar, Euro, BTC ve Altın için canlı veri çeker.
// BIST 100 için şimdilik ücretsiz/anahtarsız güvenilir bir kaynak yok,
// bu yüzden o ayrı bir aşamada (bir API anahtarı ile) eklenecek.

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

async function getFx(base) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const [latest, past] = await Promise.all([
    fetch(`https://api.frankfurter.app/latest?from=${base}&to=TRY`).then(r => r.json()),
    fetch(`https://api.frankfurter.app/${fmtDate(weekAgo)}?from=${base}&to=TRY`).then(r => r.json()),
  ]);

  const value = latest && latest.rates ? latest.rates.TRY : null;
  const pastValue = past && past.rates ? past.rates.TRY : null;
  const changePct = (value && pastValue) ? ((value - pastValue) / pastValue) * 100 : null;

  return { value, changePct };
}

async function getBtc() {
  const data = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true"
  ).then(r => r.json());

  const value = data && data.bitcoin ? data.bitcoin.usd : null;
  const changePct = data && data.bitcoin ? data.bitcoin.usd_24h_change : null;
  return { value, changePct };
}

async function getAltin() {
  const data = await fetch("https://finans.truncgil.com/today.json").then(r => r.json());
  const entry = data && (data["gram-altin"] || data["GRAM ALTIN"] || data["GRAM-ALTIN"]);
  if (!entry) return { value: null, changePct: null };

  const value = entry.Selling ?? entry.Satış ?? entry.satis ?? entry.Buying ?? entry.Alış ?? null;

  let changePct = null;
  const rawChange = entry.Change ?? entry.Değişim ?? entry.degisim ?? null;
  if (typeof rawChange === "number") {
    changePct = rawChange;
  } else if (typeof rawChange === "string") {
    const parsed = parseFloat(rawChange.replace("%", "").replace(",", "."));
    changePct = isNaN(parsed) ? null : parsed;
  }

  return { value: value ? Number(value) : null, changePct };
}

export default async function handler(req, res) {
  try {
    const [usd, eur, btc, altin] = await Promise.all([
      getFx("USD").catch(() => ({ value: null, changePct: null })),
      getFx("EUR").catch(() => ({ value: null, changePct: null })),
      getBtc().catch(() => ({ value: null, changePct: null })),
      getAltin().catch(() => ({ value: null, changePct: null })),
    ]);

    const rates = [
      { code: "USD", name: "DOLAR", value: usd.value, changePct: usd.changePct },
      { code: "EUR", name: "EURO", value: eur.value, changePct: eur.changePct },
      { code: "BTC", name: "BTC/USDT", value: btc.value, changePct: btc.changePct },
      { code: "ALTIN", name: "ALTIN", value: altin.value, changePct: altin.changePct },
    ];

    res.status(200).json({ ok: true, updated: new Date().toISOString(), rates });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Kur verileri alınamadı" });
  }
}
