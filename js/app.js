(function () {
  const PRAYER_META = [
    { key: "imsak", label: "Imsak", congregational: false },
    { key: "fajr", label: "Subuh", congregational: true },
    { key: "sunrise", label: "Syuruq", congregational: false },
    { key: "dhuha", label: "Dhuha", congregational: false },
    { key: "dhuhr", label: "Dzuhur", congregational: true },
    { key: "asr", label: "Ashar", congregational: true },
    { key: "maghrib", label: "Maghrib", congregational: true },
    { key: "isha", label: "Isya", congregational: true }
  ];

  const state = {
    config: null,
    content: null,
    loc: { lat: -6.2088, lng: 106.8456, label: "Lokasi bawaan", source: "default" },
    times: null,
    quoteIndex: 0,
    panelIndex: 0,
    mode: "idle",
    activePrayer: null,
    iqamahUntil: null,
    prayerUntil: null
  };

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function fmtClock(d) {
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function fmtHM(d) {
    if (!d) return "--:--";
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function visiblePrayers() {
    const d = state.config.display;
    return PRAYER_META.filter(function (p) {
      if (p.key === "imsak") return d.showImsak !== false;
      if (p.key === "sunrise") return d.showSunrise !== false;
      if (p.key === "dhuha") return d.showDhuha !== false;
      return true;
    });
  }

  function congregational() {
    return PRAYER_META.filter(function (p) {
      return p.congregational;
    });
  }

  function computeTimes(now) {
    const p = state.config.prayer;
    return PrayEngine.compute(
      now,
      state.loc.lat,
      state.loc.lng,
      p.method || "kemenag",
      p.asr || "standard",
      p.adjustments || {}
    );
  }

  function nextCongregational(now) {
    const list = congregational();
    for (let i = 0; i < list.length; i++) {
      const t = state.times[list[i].key];
      if (t && t.getTime() - now.getTime() >= -45000) return { meta: list[i], time: t };
    }
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const nextTimes = computeTimes(tomorrow);
    return { meta: list[0], time: nextTimes.fajr, tomorrow: true };
  }

  function currentWindow(now) {
    const lead = (state.config.prayer.countdownHighlightMinutes || 20) * 60000;
    const next = nextCongregational(now);
    const diff = next.time.getTime() - now.getTime();

    if (state.mode === "prayer" && state.prayerUntil && now < state.prayerUntil) {
      return { kind: "prayer", prayer: state.activePrayer, remain: state.prayerUntil - now };
    }
    if (state.mode === "iqamah" && state.iqamahUntil && now < state.iqamahUntil) {
      return { kind: "iqamah", prayer: state.activePrayer, remain: state.iqamahUntil - now };
    }
    if (diff <= 0 && diff > -15000) {
      enterAdzan(next.meta);
      return { kind: "adzan", prayer: next.meta, remain: 0 };
    }
    if (diff > 0 && diff <= lead) {
      return { kind: "soon", prayer: next.meta, time: next.time, remain: diff };
    }
    return { kind: "idle", prayer: next.meta, time: next.time, remain: diff, tomorrow: next.tomorrow };
  }

  function enterAdzan(meta) {
    if (state.activePrayer && state.activePrayer.key === meta.key && state.mode !== "idle") return;
    state.activePrayer = meta;
    state.mode = "adzan";
    const iqMin = (state.config.prayer.iqamah && state.config.prayer.iqamah[meta.key]) || 10;
    state.iqamahUntil = new Date(Date.now() + iqMin * 60000);
    showOverlay("adzan", meta);
    setTimeout(function () {
      if (state.mode === "adzan") {
        state.mode = "iqamah";
        showOverlay("iqamah", meta);
      }
    }, 45000);
  }

  function tickIqamahToPrayer() {
    const dur = (state.config.prayer.prayerDuration || 15) * 60000;
    state.mode = "prayer";
    state.prayerUntil = new Date(Date.now() + dur);
    showOverlay("prayer", state.activePrayer);
  }

  function clearModes() {
    state.mode = "idle";
    state.activePrayer = null;
    state.iqamahUntil = null;
    state.prayerUntil = null;
    hideOverlay();
  }

  function showOverlay(kind, meta) {
    const overlay = els.overlay;
    overlay.classList.add("is-on");
    overlay.dataset.kind = kind;
    els.overlayEyebrow.textContent =
      kind === "adzan" ? "Waktu sholat telah masuk" : kind === "iqamah" ? "Menuju iqamah" : "Sedang sholat";
    els.overlayTitle.textContent = meta.label;
    els.overlayHint.textContent =
      kind === "adzan"
        ? "Matikan nada dering. Siapkan diri menuju shaf."
        : kind === "iqamah"
        ? "Rapatkan dan luruskan shaf."
        : "Mohon jaga ketenangan.";
  }

  function hideOverlay() {
    els.overlay.classList.remove("is-on");
  }

  function formatRemain(ms) {
    if (ms < 0) ms = 0;
    const s = Math.floor(ms / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (hh > 0) return pad(hh) + ":" + pad(mm) + ":" + pad(ss);
    return pad(mm) + ":" + pad(ss);
  }

  function renderClock(now) {
    els.clock.textContent = fmtClock(now);
    els.gregorian.textContent = PrayEngine.formatGregorian(now);
    els.hijri.textContent = PrayEngine.formatHijri(now);
  }

  function renderTimes(now, windowInfo) {
    const box = els.times;
    box.innerHTML = "";
    visiblePrayers().forEach(function (p) {
      const t = state.times[p.key];
      const row = document.createElement("div");
      row.className = "time-row";
      const isNext = windowInfo.prayer && windowInfo.prayer.key === p.key && windowInfo.kind !== "prayer";
      const passed = t && t.getTime() <= now.getTime() && !(isNext && windowInfo.kind !== "idle");
      if (isNext && (windowInfo.kind === "soon" || windowInfo.kind === "adzan" || windowInfo.kind === "iqamah")) {
        row.classList.add("is-next");
      }
      if (passed && windowInfo.kind === "idle") row.classList.add("is-passed");
      row.innerHTML =
        '<span class="time-name">' +
        p.label +
        "</span><span class=\"time-val\">" +
        fmtHM(t) +
        "</span>";
      box.appendChild(row);
    });
  }

  function renderHero(windowInfo) {
    const hero = els.hero;
    hero.dataset.kind = windowInfo.kind;
    if (windowInfo.kind === "iqamah") {
      els.heroKicker.textContent = "Iqamah " + windowInfo.prayer.label;
      els.heroCount.textContent = formatRemain(windowInfo.remain);
      els.heroLabel.textContent = "Hitung mundur iqamah";
    } else if (windowInfo.kind === "soon") {
      els.heroKicker.textContent = "Waktu " + windowInfo.prayer.label + " sebentar lagi";
      els.heroCount.textContent = formatRemain(windowInfo.remain);
      els.heroLabel.textContent = "Hitung mundur menuju " + windowInfo.prayer.label;
    } else if (windowInfo.kind === "adzan") {
      els.heroKicker.textContent = "Adzan";
      els.heroCount.textContent = windowInfo.prayer.label;
      els.heroLabel.textContent = "Waktu sholat telah masuk";
    } else if (windowInfo.kind === "prayer") {
      els.heroKicker.textContent = "Sholat " + windowInfo.prayer.label;
      els.heroCount.textContent = formatRemain(windowInfo.remain);
      els.heroLabel.textContent = "Mohon tenangkan layar & suara";
    } else {
      els.heroKicker.textContent = windowInfo.tomorrow ? "Berikutnya besok" : "Sholat berikutnya";
      els.heroCount.textContent = formatRemain(windowInfo.remain);
      els.heroLabel.textContent = "Menuju " + windowInfo.prayer.label + " · " + fmtHM(windowInfo.time);
    }
  }

  function renderMeta() {
    const m = state.config.mosque;
    els.mosqueName.textContent = m.name || "Al Jabar";
    els.mosqueType.textContent = m.type || "Masjid & Mushola";
    els.locLabel.textContent = state.loc.label;
    els.running.textContent = (state.content.runningText || "").repeat(2);
    const off = state.content.officers || {};
    els.khatib.textContent = off.khatib || "—";
    els.imam.textContent = off.imam || "—";
    els.muadzin.textContent = off.muadzin || "—";
  }

  function renderPanels() {
    const quotes = state.content.quotes || [];
    const q = quotes[state.quoteIndex % Math.max(quotes.length, 1)] || {
      text: "Dirikanlah shalat.",
      source: "Al-Qur'an"
    };
    els.quoteText.textContent = "“" + q.text + "”";
    els.quoteSource.textContent = q.source;

    const anns = state.content.announcements || [];
    els.announceList.innerHTML = anns
      .map(function (a) {
        return (
          '<article class="card-item"><span class="tag">' +
          escapeHtml(a.tag || "Info") +
          "</span><h3>" +
          escapeHtml(a.title) +
          "</h3><p>" +
          escapeHtml(a.body) +
          "</p></article>"
        );
      })
      .join("");

    const acts = state.content.activities || [];
    els.activityList.innerHTML = acts
      .map(function (a) {
        return (
          '<li><div><strong>' +
          escapeHtml(a.title) +
          "</strong><span>" +
          escapeHtml(a.day) +
          "</span></div><em>" +
          escapeHtml(a.time) +
          "</em></li>"
        );
      })
      .join("");

    const f = state.content.finance || {};
    els.finIn.textContent = idr(f.inflow);
    els.finOut.textContent = idr(f.outflow);
    els.finBal.textContent = idr(f.balance);
    els.finNote.textContent = f.note || "";
    els.finPeriod.textContent = f.period || "";
    els.account.textContent = state.config.mosque.account || "Atur rekening di admin";
  }

  function rotatePanels() {
    const panels = document.querySelectorAll("[data-panel]");
    panels.forEach(function (p, i) {
      p.classList.toggle("is-active", i === state.panelIndex);
    });
    const dots = document.querySelectorAll(".dot");
    dots.forEach(function (d, i) {
      d.classList.toggle("is-on", i === state.panelIndex);
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function idr(n) {
    const num = Number(n) || 0;
    return "Rp " + num.toLocaleString("id-ID");
  }

  function tick() {
    const now = new Date();
    state.times = computeTimes(now);
    if (state.mode === "iqamah" && state.iqamahUntil && now >= state.iqamahUntil) {
      tickIqamahToPrayer();
    }
    if (state.mode === "prayer" && state.prayerUntil && now >= state.prayerUntil) {
      clearModes();
    }
    const windowInfo = currentWindow(now);
    renderClock(now);
    renderTimes(now, windowInfo);
    renderHero(windowInfo);
    if (els.overlayCount) {
      if (windowInfo.kind === "iqamah" || windowInfo.kind === "prayer") {
        els.overlayCount.textContent = formatRemain(windowInfo.remain);
      } else {
        els.overlayCount.textContent = "";
      }
    }
    document.body.dataset.mode = windowInfo.kind;
  }

  async function resolveLocation() {
    const locCfg = state.config.location || {};
    if (locCfg.useGeo === false && locCfg.lat != null && locCfg.lng != null) {
      state.loc = {
        lat: Number(locCfg.lat),
        lng: Number(locCfg.lng),
        label: locCfg.label || coordLabel(locCfg.lat, locCfg.lng),
        source: "manual"
      };
      return;
    }
    const geo = await getGeo();
    if (geo) {
      state.loc = geo;
      reverseGeocode(geo.lat, geo.lng);
      return;
    }
    if (locCfg.lat != null && locCfg.lng != null) {
      state.loc = {
        lat: Number(locCfg.lat),
        lng: Number(locCfg.lng),
        label: locCfg.label || coordLabel(locCfg.lat, locCfg.lng),
        source: "fallback"
      };
    }
  }

  function coordLabel(lat, lng) {
    return Number(lat).toFixed(4) + "°, " + Number(lng).toFixed(4) + "°";
  }

  function getGeo() {
    return new Promise(function (resolve) {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: "Lokasi perangkat",
            source: "geo"
          });
        },
        function () {
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
      );
    });
  }

  async function reverseGeocode(lat, lng) {
    try {
      const url =
        "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" +
        lat +
        "&lon=" +
        lng +
        "&zoom=12";
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("geo");
      const json = await res.json();
      const a = json.address || {};
      const label = [a.village || a.suburb || a.town || a.city, a.county || a.state]
        .filter(Boolean)
        .join(", ");
      if (label) {
        state.loc.label = label;
        if (els.locLabel) els.locLabel.textContent = label;
      }
    } catch (e) {
      state.loc.label = coordLabel(lat, lng);
      if (els.locLabel) els.locLabel.textContent = state.loc.label;
    }
  }

  function bindChrome() {
    $("btn-full").addEventListener("click", function () {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () {});
      else document.exitFullscreen();
    });
    document.querySelectorAll(".dot").forEach(function (d, i) {
      d.addEventListener("click", function () {
        state.panelIndex = i;
        rotatePanels();
      });
    });
  }

  async function init() {
    els.clock = $("clock");
    els.gregorian = $("gregorian");
    els.hijri = $("hijri");
    els.mosqueName = $("mosque-name");
    els.mosqueType = $("mosque-type");
    els.locLabel = $("loc-label");
    els.times = $("times");
    els.hero = $("hero");
    els.heroKicker = $("hero-kicker");
    els.heroCount = $("hero-count");
    els.heroLabel = $("hero-label");
    els.running = $("running-inner");
    els.quoteText = $("quote-text");
    els.quoteSource = $("quote-source");
    els.announceList = $("announce-list");
    els.activityList = $("activity-list");
    els.finIn = $("fin-in");
    els.finOut = $("fin-out");
    els.finBal = $("fin-bal");
    els.finNote = $("fin-note");
    els.finPeriod = $("fin-period");
    els.account = $("account");
    els.khatib = $("khatib");
    els.imam = $("imam");
    els.muadzin = $("muadzin");
    els.overlay = $("overlay");
    els.overlayEyebrow = $("overlay-eyebrow");
    els.overlayTitle = $("overlay-title");
    els.overlayHint = $("overlay-hint");
    els.overlayCount = $("overlay-count");

    const boot = await Store.bootstrap();
    state.config = boot.config;
    state.content = boot.content;

    renderMeta();
    renderPanels();
    rotatePanels();
    bindChrome();
    await resolveLocation();
    renderMeta();
    tick();
    setInterval(tick, 1000);
    setInterval(function () {
      const quotes = state.content.quotes || [];
      if (quotes.length) state.quoteIndex = (state.quoteIndex + 1) % quotes.length;
      renderPanels();
    }, (state.config.display.quoteSeconds || 22) * 1000);
    setInterval(function () {
      if (document.body.dataset.mode === "soon" || document.body.dataset.mode === "iqamah") return;
      const n = document.querySelectorAll("[data-panel]").length;
      state.panelIndex = (state.panelIndex + 1) % n;
      rotatePanels();
    }, (state.config.display.rotateSeconds || 18) * 1000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
