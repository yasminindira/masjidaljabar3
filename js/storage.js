(function (global) {
  const KEY = "aljabar-display-v1";

  function defaults() {
    return {
      config: null,
      content: null
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : defaults();
    } catch (e) {
      return defaults();
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  async function fetchJSON(path) {
    const res = await fetch(path + "?t=" + Date.now());
    if (!res.ok) throw new Error("Gagal memuat " + path);
    return res.json();
  }

  async function bootstrap() {
    const stored = load();
    let fileConfig = null;
    let fileContent = null;
    try {
      fileConfig = await fetchJSON("data/config.json");
    } catch (e) {
      fileConfig = {};
    }
    try {
      fileContent = await fetchJSON("data/content.json");
    } catch (e) {
      fileContent = {};
    }
    const config = deepMerge(fileConfig, stored.config || {});
    const content = deepMerge(fileContent, stored.content || {});
    return { config, content, stored };
  }

  function deepMerge(a, b) {
    if (Array.isArray(b)) return b.slice();
    if (b && typeof b === "object") {
      const out = Object.assign({}, a || {});
      Object.keys(b).forEach(function (k) {
        out[k] = deepMerge(a && a[k], b[k]);
      });
      return out;
    }
    return b === undefined ? a : b;
  }

  global.Store = { KEY, load, save, bootstrap, deepMerge };
})(window);
