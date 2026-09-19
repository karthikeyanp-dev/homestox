/* Theme switcher. Loaded synchronously in <head> so the saved choice is
   applied before first paint. No saved choice = follow the system, and
   picking the theme that matches the system returns to "follow". */
(function () {
  var root = document.documentElement;
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  var COLORS = { light: "#f1f5f9", dark: "#0f172a" };
  var memory = null; // fallback when localStorage is unavailable

  function stored() {
    try {
      var v = localStorage.getItem("theme");
      return v === "light" || v === "dark" ? v : null;
    } catch (e) {
      return memory;
    }
  }

  function save(v) {
    memory = v;
    try {
      if (v) {
        localStorage.setItem("theme", v);
      } else {
        localStorage.removeItem("theme");
      }
    } catch (e) {
      /* memory fallback already set */
    }
  }

  function effective() {
    return stored() || (media.matches ? "dark" : "light");
  }

  function apply() {
    var choice = stored();
    if (choice) {
      root.setAttribute("data-theme", choice);
    } else {
      root.removeAttribute("data-theme");
    }
    // Keep the browser chrome color in sync when overriding the system scheme
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      var own = metas[i].getAttribute("media") || "";
      var scheme = choice || (own.indexOf("dark") !== -1 ? "dark" : "light");
      metas[i].setAttribute("content", COLORS[scheme]);
    }
  }

  function updateButtons() {
    var dark = effective() === "dark";
    var label = dark ? "Switch to light theme" : "Switch to dark theme";
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].textContent = dark ? "☀️" : "🌙";
      buttons[i].setAttribute("aria-label", label);
      buttons[i].title = label;
    }
  }

  apply();

  media.addEventListener("change", function () {
    if (!stored()) {
      apply();
      updateButtons();
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    updateButtons();
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        var next = effective() === "dark" ? "light" : "dark";
        var system = media.matches ? "dark" : "light";
        save(next === system ? null : next);
        apply();
        updateButtons();
      });
    }
  });
})();
