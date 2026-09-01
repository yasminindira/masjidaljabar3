/* Perhitungan waktu sholat sisi klien — algoritma astronomi standar */
(function (global) {
  const METHODS = {
    kemenag: { fajr: 20, isha: 18, maghrib: 0.833, midnight: "standard" },
    mwl: { fajr: 18, isha: 17, maghrib: 0.833, midnight: "standard" },
    isna: { fajr: 15, isha: 15, maghrib: 0.833, midnight: "standard" },
    egypt: { fajr: 19.5, isha: 17.5, maghrib: 0.833, midnight: "standard" },
    makkah: { fajr: 18.5, isha: "90min", maghrib: 0.833, midnight: "standard" },
    karachi: { fajr: 18, isha: 18, maghrib: 0.833, midnight: "standard" }
  };

  function dtr(d) { return (d * Math.PI) / 180; }
  function rtd(r) { return (r * 180) / Math.PI; }

  function julian(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    return (
      d +
      Math.floor((153 * mm + 2) / 5) +
      365 * yy +
      Math.floor(yy / 4) -
      Math.floor(yy / 100) +
      Math.floor(yy / 400) -
      32045
    );
  }

  function sunPosition(jd) {
    const d = jd - 2451545.0;
    const g = 357.529 + 0.98560028 * d;
    const q = 280.459 + 0.98564736 * d;
    const L = q + 1.915 * Math.sin(dtr(g)) + 0.02 * Math.sin(dtr(2 * g));
    const e = 23.439 - 0.00000036 * d;
    const ra = rtd(Math.atan2(Math.cos(dtr(e)) * Math.sin(dtr(L)), Math.cos(dtr(L)))) / 15;
    const dec = rtd(Math.asin(Math.sin(dtr(e)) * Math.sin(dtr(L))));
    const eqt = q / 15 - fixHour(ra);
    return { declination: dec, equation: eqt };
  }

  function fixHour(h) {
    h = h - 24 * Math.floor(h / 24);
    if (h < 0) h += 24;
    return h;
  }

  function timeDiff(lat, dec, angle) {
    const term =
      (Math.sin(dtr(-angle)) - Math.sin(dtr(lat)) * Math.sin(dtr(dec))) /
      (Math.cos(dtr(lat)) * Math.cos(dtr(dec)));
    if (term < -1 || term > 1) return null;
    return (1 / 15) * rtd(Math.acos(term));
  }

  function asrDiff(lat, dec, factor) {
    const ang = -rtd(Math.atan(1 / (factor + Math.tan(dtr(Math.abs(lat - dec))))));
    return timeDiff(lat, dec, ang);
  }

  function hoursToDate(base, hours) {
    if (hours == null || Number.isNaN(hours)) return null;
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
    d.setTime(d.getTime() + Math.round(hours * 3600 * 1000));
    return d;
  }

  function applyMin(date, minutes) {
    if (!date) return null;
    return new Date(date.getTime() + minutes * 60000);
  }

  function compute(date, lat, lng, methodKey, asrMode, adjustments) {
    const method = METHODS[methodKey] || METHODS.kemenag;
    const tz = -date.getTimezoneOffset() / 60;
    const jd = julian(date);
    const sun = sunPosition(jd);
    const noon = fixHour(12 + tz - lng / 15 - sun.equation);
    const sunriseSpan = timeDiff(lat, sun.declination, 0.833);
    const fajrSpan = timeDiff(lat, sun.declination, method.fajr);
    let ishaSpan;
    if (method.isha === "90min") ishaSpan = null;
    else ishaSpan = timeDiff(lat, sun.declination, method.isha);
    const asrFactor = asrMode === "hanafi" ? 2 : 1;
    const asrSpan = asrDiff(lat, sun.declination, asrFactor);

    const adj = Object.assign(
      { imsak: -10, fajr: 0, sunrise: 0, dhuha: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      adjustments || {}
    );

    const sunrise = hoursToDate(date, noon - sunriseSpan);
    const sunset = hoursToDate(date, noon + sunriseSpan);
    const dhuhr = hoursToDate(date, noon);
    const fajr = hoursToDate(date, noon - fajrSpan);
    const asr = hoursToDate(date, noon + asrSpan);
    const maghrib = sunset;
    const isha =
      method.isha === "90min"
        ? applyMin(maghrib, 90)
        : hoursToDate(date, noon + ishaSpan);
    const imsak = applyMin(fajr, adj.imsak);
    const dhuha = applyMin(sunrise, 20 + (adj.dhuha || 0));

    return {
      imsak: applyMin(imsak, 0),
      fajr: applyMin(fajr, adj.fajr),
      sunrise: applyMin(sunrise, adj.sunrise),
      dhuha: dhuha,
      dhuhr: applyMin(dhuhr, adj.dhuhr),
      asr: applyMin(asr, adj.asr),
      maghrib: applyMin(maghrib, adj.maghrib),
      isha: applyMin(isha, adj.isha)
    };
  }

  function hijriParts(date) {
    let y = date.getFullYear();
    let m = date.getMonth() + 1;
    let d = date.getDate();
    if (m < 3) {
      y -= 1;
      m += 12;
    }
    const a = Math.floor(y / 100);
    let b = 2 - a + Math.floor(a / 4);
    const jd2 =
      Math.floor(365.25 * (y + 4716)) +
      Math.floor(30.6001 * (m + 1)) +
      d +
      b -
      1524.5;
    const ijd = Math.floor(jd2 + 0.5);
    const l = ijd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j =
      Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
      Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 =
      l2 -
      Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
      29;
    const im = Math.floor((24 * l3) / 709);
    const id = l3 - Math.floor((709 * im) / 24);
    const iy = 30 * n + j - 30;
    return { day: id, month: im, year: iy };
  }

  const HIJRI_MONTHS = [
    "",
    "Muharram",
    "Safar",
    "Rabiul Awal",
    "Rabiul Akhir",
    "Jumadil Awal",
    "Jumadil Akhir",
    "Rajab",
    "Sya'ban",
    "Ramadan",
    "Syawal",
    "Zulkaidah",
    "Zulhijah"
  ];

  const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const MONTH_NAMES = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  global.PrayEngine = {
    METHODS,
    compute,
    hijriParts,
    HIJRI_MONTHS,
    DAY_NAMES,
    MONTH_NAMES,
    formatHijri(date) {
      const h = hijriParts(date);
      return h.day + " " + HIJRI_MONTHS[h.month] + " " + h.year + " H";
    },
    formatGregorian(date) {
      return (
        DAY_NAMES[date.getDay()] +
        ", " +
        date.getDate() +
        " " +
        MONTH_NAMES[date.getMonth()] +
        " " +
        date.getFullYear()
      );
    }
  };
})(window);
