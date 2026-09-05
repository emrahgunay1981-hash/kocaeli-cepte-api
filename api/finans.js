        usd,
        eur,
        gold,
        btc
      },

      // Hata ayıklama için ham cevapları da ekliyoruz
      // (sorun devam ederse burayı inceleyeceğiz)
      debug: {
        dovizStatus: dovizRes.status,
        altinStatus: altinRes.status,
        kriptoStatus: kriptoRes.status,
        dovizRawSnippet: dovizText.slice(0, 150),
        altinRawSnippet: altinText.slice(0, 150),
        kriptoRawSnippet: kriptoText.slice(0, 150)
      },

      updatedAt: new Date().toISOString()

    });

  } catch (error) {

    console.error("Finans API hatası:", error);

    return res.status(500).json({
      success: false,
      error: "Finans verileri alınamadı: " + error.message
    });

  }

}
