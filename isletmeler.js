/* ==========================================================
   ESNAF MUTFAĞI CEPTE - ÜYE İŞLETMELER
   ----------------------------------------------------------
   Esnaf Mutfağı listesi (esnaf-mutfagi.html) ve ortak sipariş
   sayfası (siparis.html) bilgileri buradan okur.

   YENİ İŞLETME EKLEMEK İÇİN:
   En alttaki işletmeyi kopyalayıp listeye yeni bir kayıt
   olarak ekleyin ve bilgilerini değiştirin.
   - id: Sadece küçük harf, rakam ve tire (örn: "ali-usta-pide").
     Sipariş adresi bununla oluşur: siparis.html?isletme=<id>
   - whatsapp: Başında 90 olacak şekilde, boşluksuz.
   - menu: Kategoriler ve ürünler. Ürün: [ad, birim, fiyat, adım]
     adım: + / - butonunun artış miktarı (adet için 1, kilo için 0.5)
   ========================================================== */

window.ISLETMELER = [
  {
    id: "duru",
    ad: "Duru El Lezzetleri",
    kisa: "DE",
    slogan: "Hijyen · Lezzet · Kalite",
    ilce: "İzmit",
    mahalle: "Yenişehir Mah.",
    adres: "Paşa Cd. Şht. Selçuk Gökdağ Sk. No:1/A, İzmit",
    etiketler: ["Börek", "Baklava", "İçli köfte", "Mantı", "Sarma"],
    aciklama: "El açması börek, tepsi baklava, içli köfte, mantı ve yaprak sarması. Ev usulü, günlük üretim.",
    whatsapp: "905078053878",
    telefonGoster: "0507 805 38 78",
    instagram: "duru.el.lezzetleri",
    harita: "https://www.google.com/maps/search/?api=1&query=Duru+El+Lezzetleri+Yeni%C5%9Fehir+%C4%B0zmit",

    teslimat: {
      eveTeslim: true,
      eveTeslimMin: 3500,   // 0 yazılırsa alt sınır olmaz
      gelAl: true
    },
    odeme: "Ödeme teslimatta nakit veya kredi kartı ile yapılır.",

    // Sayfa renkleri (işletmenin kendi renkleri)
    tema: {
      bg: "#0f0d0a", panel: "#1a1712", line: "#3a3226",
      fg: "#f3ece0", muted: "#b5a993",
      accent: "#e3c26b", accentDeep: "#b8913a"
    },

    menu: [
      ["Öne Çıkan Lezzetlerimiz", [
        ["Baklava", "tepsi (2.500 gr)", 2500, 1],
        ["El açması börek, ıspanaklı-patatesli", "tepsi (2.000 gr)", 1200, 1],
        ["El açması börek, kıymalı", "tepsi", 1500, 1],
        ["İçli köfte", "adet", 120, 1],
        ["Mantı", "kilo", 850, 0.5],
        ["Yaprak sarması", "kilo", 850, 0.5]
      ]],
      ["Tatlılar", [
        ["Trileçe", "tepsi", 1500, 1],
        ["Kabak tatlısı", "kilo", 750, 0.5],
        ["Tartolet", "kilo", 1250, 0.5]
      ]],
      ["Kek, Kurabiye, Poğaça", [
        ["Kek", "büyük kalıp", 900, 1],
        ["Islak kek", "borcam", 1000, 1],
        ["Elmalı kurabiye", "1 ölçü (30 adet)", 1200, 1],
        ["Tuzlu kurabiye", "1 ölçü", 900, 1],
        ["Sakallı poğaça", "1 ölçü (30 adet)", 1200, 1],
        ["Mayalı poğaça", "1 ölçü (30 adet)", 900, 1]
      ]],
      ["Diğer Lezzetler", [
        ["Kısır", "kilo", 850, 0.5],
        ["Mercimek köfte", "kilo", 900, 0.5],
        ["Kuru dolma", "kilo", 1000, 0.5],
        ["Gül böreği, patatesli (donuk)", "adet", 40, 1],
        ["Gül böreği, ıspanaklı (donuk)", "adet", 40, 1],
        ["Gül böreği, peynirli (donuk)", "adet", 40, 1],
        ["Gül böreği, kıymalı (donuk)", "adet", 50, 1],
        ["Fellah köfte (donuk)", "kilo", 650, 0.5]
      ]]
    ]
  }
];

