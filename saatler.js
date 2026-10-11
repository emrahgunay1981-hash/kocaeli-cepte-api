/* ==========================================================
   ESNAF MUTFAĞI CEPTE - ÇALIŞMA SAATLERİ
   ----------------------------------------------------------
   Her işletmenin id'sine göre çalışma saatleri burada yazılır.
   Günler: pzt sal car per cum cmt paz
   - ["09:00","22:00"]  -> o gün tek aralık
   - [["09:00","15:00"],["18:00","23:00"]] -> iki aralık
   - ["18:00","02:00"]  -> gece yarısını geçen kapanış (02:00'ye kadar)
   - null               -> o gün kapalı
   id'si burada olmayan işletme her zaman açık sayılır.
   ========================================================== */
window.SAATLER = {
  // Duru siparişe göre çalıştığı için burada yok: her zaman sipariş alır.
  // Örnek (saatli bir işletme için):
  // "ali-usta-pide": {
  //   pzt: ["10:00","22:00"], sal: ["10:00","22:00"], car: ["10:00","22:00"],
  //   per: ["10:00","22:00"], cum: ["10:00","23:00"], cmt: ["10:00","23:00"],
  //   paz: null
  // }
};

(function () {
  const GUN = ["paz","pzt","sal","car","per","cum","cmt"];
  const GUN_AD = ["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
  const pad = n => String(n).padStart(2, "0");
  const hhmm = m => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  const dk = h => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };

  // Türkiye saatine göre şu an (cihaz saati yanlış bölgede olsa da doğru çalışır)
  function tr(d) {
    const p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d || new Date()).forEach(x => p[x.type] = x.value);
    const y = +p.year, m = +p.month, g = +p.day, dak = +p.hour * 60 + +p.minute;
    return { y, m, g, dak, gun: new Date(Date.UTC(y, m - 1, g)).getUTCDay(), ts: Date.UTC(y, m - 1, g, 0, dak) };
  }

  const tablo = i => (window.SAATLER || {})[i.id] || i.saatler || null;

  function araliklar(t, gun) {
    const s = t[GUN[gun]];
    if (!s) return [];
    return (Array.isArray(s[0]) ? s : [s]).slice().sort((a, b) => dk(a[0]) - dk(b[0]));
  }

  // O an açıksa kapanış dakikasını (gün başından) döndürür, kapalıysa null
  function acikKapanis(t, gun, dak) {
    for (const [o, c] of araliklar(t, gun)) {
      const O = dk(o), C = dk(c);
      if (C > O) { if (dak >= O && dak < C) return C; }
      else if (dak >= O) return 1440 + C;
    }
    for (const [o, c] of araliklar(t, (gun + 6) % 7)) {
      const O = dk(o), C = dk(c);
      if (C <= O && dak < C) return C;
    }
    return null;
  }

  function sonrakiAcilis(t, gun, dak) {
    for (let k = 0; k < 8; k++) {
      const g = (gun + k) % 7;
      for (const [o] of araliklar(t, g)) {
        if (k > 0 || dk(o) > dak) {
          return (k === 0 ? "Bugün " : k === 1 ? "Yarın " : GUN_AD[g] + ", ") + o;
        }
      }
    }
    return null;
  }

  function gunYazi(t, gun) {
    const a = araliklar(t, gun);
    return a.length ? a.map(([o, c]) => o + "–" + c).join(" / ") : "Kapalı";
  }

  window.Saatler = {
    // Kart rozeti için: {tur: acik|yakinda|kapali, kapali, metin}
    durum(i, d) {
      const t = tablo(i);
      if (!t) return { tur: "acik", kapali: false, metin: "Açık" };
      const n = tr(d), c = acikKapanis(t, n.gun, n.dak);
      if (c !== null) {
        const kapanis = hhmm(c % 1440);
        return c - n.dak <= 30
          ? { tur: "yakinda", kapali: false, metin: "Yakında kapanıyor · " + kapanis }
          : { tur: "acik", kapali: false, metin: "Açık · " + kapanis + "'e kadar" };
      }
      const s = sonrakiAcilis(t, n.gun, n.dak);
      return { tur: "kapali", kapali: true, metin: "Şu an kapalı" + (s ? " · Açılış: " + s : "") };
    },
    bugun(i, d) {
      const t = tablo(i);
      return t ? "Bugün: " + gunYazi(t, tr(d).gun) : "";
    },
    // Seçilen teslim tarihi/saati için: {ok, mesaj}
    kontrol(i, tarih, saat) {
      if (!tarih || !saat) return { ok: true };
      const [y, m, g] = tarih.split("-").map(Number);
      const dak = dk(saat), n = tr();
      if (Date.UTC(y, m - 1, g, 0, dak) < n.ts) return { ok: false, mesaj: "Geçmiş bir saat seçtiniz" };
      const t = tablo(i);
      if (!t) return { ok: true };
      const gun = new Date(Date.UTC(y, m - 1, g)).getUTCDay();
      if (acikKapanis(t, gun, dak) !== null) return { ok: true };
      const a = araliklar(t, gun);
      return { ok: false, mesaj: a.length
        ? "Seçtiğiniz saatte işletme kapalı (açık: " + gunYazi(t, gun) + ")"
        : "Seçtiğiniz gün işletme kapalı, başka gün seçin" };
    }
  };
})();
