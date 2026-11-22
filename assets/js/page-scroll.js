/* Page up / page down. Moves about one screen, and jumps instead of
   animating when the visitor prefers reduced motion. */
(function () {
  function reduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function distance() {
    var height = window.innerHeight || document.documentElement.clientHeight || 0;
    return Math.max(1, Math.round(height - 48));
  }
  function scrollByScreen(dir) {
    var height = window.innerHeight || document.documentElement.clientHeight || 0;
    var max = Math.max(0, (document.documentElement.scrollHeight || 0) - height);
    var current = window.scrollY || window.pageYOffset || 0;
    var next = Math.min(max, Math.max(0, current + dir * distance()));
    try {
      window.scrollTo({ top: next, left: 0, behavior: reduced() ? "auto" : "smooth" });
    } catch (e) {
      window.scrollTo(0, next);
    }
  }
  document.addEventListener("click", function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest("[data-page-scroll]") : null;
    if (!btn) return;
    ev.preventDefault();
    scrollByScreen(btn.getAttribute("data-page-scroll") === "down" ? 1 : -1);
  });
})();
