(function () {
  const fields = [
    ["mosque.name", "mosque-name"],
    ["mosque.type", "mosque-type"],
    ["mosque.tagline", "mosque-tagline"],
    ["mosque.address", "mosque-address"],
    ["mosque.account", "mosque-account"],
    ["prayer.method", "prayer-method"],
    ["prayer.asr", "prayer-asr"],
    ["prayer.iqamah.fajr", "iq-fajr"],
    ["prayer.iqamah.dhuhr", "iq-dhuhr"],
    ["prayer.iqamah.asr", "iq-asr"],
    ["prayer.iqamah.maghrib", "iq-maghrib"],
    ["prayer.iqamah.isha", "iq-isha"],
    ["prayer.adjustments.fajr", "adj-fajr"],
    ["prayer.adjustments.dhuhr", "adj-dhuhr"],
    ["prayer.adjustments.asr", "adj-asr"],
    ["prayer.adjustments.maghrib", "adj-maghrib"],
    ["prayer.adjustments.isha", "adj-isha"],
    ["prayer.countdownHighlightMinutes", "highlight-min"],
    ["prayer.prayerDuration", "prayer-dur"],
    ["location.lat", "loc-lat"],
    ["location.lng", "loc-lng"],
    ["location.label", "loc-label"],
    ["display.rotateSeconds", "rotate-sec"]
  ];

  let config;
  let content;

  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) {
      return o ? o[k] : undefined;
    }, obj);
  }

  function setPath(obj, path, value) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function fill() {
    fields.forEach(function (pair) {
      const el = document.getElementById(pair[1]);
      if (!el) return;
      const val = getPath(config, pair[0]);
      if (val == null) el.value = "";
      else el.value = val;
    });
    document.getElementById("use-geo").checked = config.location.useGeo !== false;
    document.getElementById("show-imsak").checked = config.display.showImsak !== false;
    document.getElementById("show-sunrise").checked = config.display.showSunrise !== false;
    document.getElementById("show-dhuha").checked = config.display.showDhuha !== false;
    document.getElementById("running").value = content.runningText || "";
    document.getElementById("quotes").value = (content.quotes || [])
      .map(function (q) {
        return q.text + " | " + q.source;
      })
      .join("\n");
    document.getElementById("announcements").value = (content.announcements || [])
      .map(function (a) {
        return a.title + " | " + a.body + " | " + (a.tag || "Info");
      })
      .join("\n");
    document.getElementById("activities").value = (content.activities || [])
      .map(function (a) {
        return a.day + " | " + a.time + " | " + a.title;
      })
      .join("\n");
    document.getElementById("off-imam").value = (content.officers && content.officers.imam) || "";
    document.getElementById("off-muadzin").value = (content.officers && content.officers.muadzin) || "";
    document.getElementById("off-khatib").value = (content.officers && content.officers.khatib) || "";
    document.getElementById("fin-in").value = (content.finance && content.finance.inflow) || 0;
    document.getElementById("fin-out").value = (content.finance && content.finance.outflow) || 0;
    document.getElementById("fin-bal").value = (content.finance && content.finance.balance) || 0;
    document.getElementById("fin-period").value = (content.finance && content.finance.period) || "";
    document.getElementById("fin-note").value = (content.finance && content.finance.note) || "";
  }

  function harvest() {
    fields.forEach(function (pair) {
      const el = document.getElementById(pair[1]);
      if (!el) return;
      let val = el.value;
      if (el.type === "number") val = val === "" ? null : Number(val);
      setPath(config, pair[0], val);
    });
    config.location.useGeo = document.getElementById("use-geo").checked;
    config.display.showImsak = document.getElementById("show-imsak").checked;
    config.display.showSunrise = document.getElementById("show-sunrise").checked;
    config.display.showDhuha = document.getElementById("show-dhuha").checked;
    content.runningText = document.getElementById("running").value.trim();
    content.quotes = document
      .getElementById("quotes")
      .value.split("\n")
      .map(function (line) {
        const p = line.split("|").map(function (s) {
          return s.trim();
        });
        if (!p[0]) return null;
        return { text: p[0], source: p[1] || "" };
      })
      .filter(Boolean);
    content.announcements = document
      .getElementById("announcements")
      .value.split("\n")
      .map(function (line) {
        const p = line.split("|").map(function (s) {
          return s.trim();
        });
        if (!p[0]) return null;
        return { title: p[0], body: p[1] || "", tag: p[2] || "Info" };
      })
      .filter(Boolean);
    content.activities = document
      .getElementById("activities")
      .value.split("\n")
      .map(function (line) {
        const p = line.split("|").map(function (s) {
          return s.trim();
        });
        if (!p[0]) return null;
        return { day: p[0], time: p[1] || "", title: p[2] || p[0] };
      })
      .filter(Boolean);
    content.officers = {
      imam: document.getElementById("off-imam").value,
      muadzin: document.getElementById("off-muadzin").value,
      khatib: document.getElementById("off-khatib").value
    };
    content.finance = {
      inflow: Number(document.getElementById("fin-in").value) || 0,
      outflow: Number(document.getElementById("fin-out").value) || 0,
      balance: Number(document.getElementById("fin-bal").value) || 0,
      period: document.getElementById("fin-period").value,
      note: document.getElementById("fin-note").value
    };
  }

  function persist() {
    harvest();
    Store.save({ config: config, content: content });
    toast("Tersimpan di perangkat ini. Tampilkan layar utama untuk melihat perubahan.");
  }

  function downloadJSON() {
    harvest();
    const blob = new Blob(
      [JSON.stringify({ config: config, content: content }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "al-jabar-content.json";
    a.click();
  }

  function resetLocal() {
    localStorage.removeItem(Store.KEY);
    toast("Data lokal dihapus. Muat ulang halaman.");
    setTimeout(function () {
      location.reload();
    }, 700);
  }

  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("is-on");
    setTimeout(function () {
      t.classList.remove("is-on");
    }, 2800);
  }

  function detectLoc() {
    if (!navigator.geolocation) return toast("Geolokasi tidak tersedia.");
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        document.getElementById("loc-lat").value = pos.coords.latitude.toFixed(6);
        document.getElementById("loc-lng").value = pos.coords.longitude.toFixed(6);
        toast("Koordinat perangkat terisi.");
      },
      function () {
        toast("Izin lokasi ditolak.");
      }
    );
  }

  async function init() {
    const boot = await Store.bootstrap();
    config = boot.config;
    content = boot.content;
    fill();
    document.getElementById("btn-save").addEventListener("click", persist);
    document.getElementById("btn-export").addEventListener("click", downloadJSON);
    document.getElementById("btn-reset").addEventListener("click", resetLocal);
    document.getElementById("btn-geo").addEventListener("click", detectLoc);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
