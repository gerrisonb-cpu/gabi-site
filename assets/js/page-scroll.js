/* Page up / page down.
   A short press moves about one screen. Holding the button scrolls
   continuously in that direction and speeds up a little the longer
   it is held. Reduced motion jumps a screen at a time instead of
   gliding. */
(function () {
  var HOLD_MS = 200;
  var START_SCREENS = 3.2;
  var MAX_SCREENS = 8;
  var ACCEL_SCREENS = 2.5;
  var STEP_MS = 200;
  var STEP_MIN_MS = 80;
  var STEP_FASTER_MS = 30;

  var gesture = null;
  var suppressClick = false;
  var suppressTimer = 0;

  function reduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function height() {
    return window.innerHeight || document.documentElement.clientHeight || 0;
  }
  function distance() {
    return Math.max(1, Math.round(height() - 48));
  }
  function maxScroll() {
    return Math.max(0, (document.documentElement.scrollHeight || 0) - height());
  }
  function currentY() {
    return window.scrollY || window.pageYOffset || 0;
  }
  function buttonFrom(node) {
    return node && node.closest ? node.closest("[data-page-scroll]") : null;
  }
  function directionOf(btn) {
    return btn.getAttribute("data-page-scroll") === "down" ? 1 : -1;
  }
  function atBound(dir, y) {
    if (dir < 0) return y <= 0.5;
    return y >= maxScroll() - 0.5;
  }
  function scrollByScreen(dir) {
    var y = currentY();
    var next = Math.min(maxScroll(), Math.max(0, y + dir * distance()));
    try {
      window.scrollTo({ top: next, left: 0, behavior: reduced() ? "auto" : "smooth" });
    } catch (e) {
      window.scrollTo(0, next);
    }
  }
  function armSuppress() {
    suppressClick = true;
    clearTimeout(suppressTimer);
  }
  function scheduleSuppressClear() {
    clearTimeout(suppressTimer);
    suppressTimer = setTimeout(function () { suppressClick = false; }, 500);
  }
  function stopGesture() {
    if (!gesture) return;
    if (gesture.raf) cancelAnimationFrame(gesture.raf);
    gesture = null;
  }
  function hitBound(dir, next, max) {
    return dir > 0 ? next >= max : next <= 0;
  }
  function frame(now) {
    if (!gesture) return;
    if (gesture.pending) {
      if (now - gesture.started < HOLD_MS) {
        gesture.raf = requestAnimationFrame(frame);
        return;
      }
      gesture.pending = false;
      gesture.holdStart = now;
      gesture.last = now;
      gesture.stepMs = STEP_MS;
      gesture.stepped = false;
      window.scrollTo(0, currentY());
      if (atBound(gesture.dir, currentY())) {
        stopGesture();
        return;
      }
    }
    if (reduced()) {
      if (gesture.stepped && now - gesture.last < gesture.stepMs) {
        gesture.raf = requestAnimationFrame(frame);
        return;
      }
      var before = currentY();
      var maxStep = maxScroll();
      var stepped = Math.min(maxStep, Math.max(0, before + gesture.dir * distance()));
      window.scrollTo(0, stepped);
      gesture.stepped = true;
      gesture.last = now;
      if (stepped === before || hitBound(gesture.dir, stepped, maxStep)) {
        stopGesture();
        return;
      }
      gesture.stepMs = Math.max(STEP_MIN_MS, gesture.stepMs - STEP_FASTER_MS);
      gesture.raf = requestAnimationFrame(frame);
      return;
    }
    var dt = (now - gesture.last) / 1000;
    gesture.last = now;
    if (!(dt > 0)) {
      gesture.raf = requestAnimationFrame(frame);
      return;
    }
    dt = Math.min(0.05, dt);
    var elapsed = Math.max(0, (now - gesture.holdStart) / 1000);
    var screens = Math.min(MAX_SCREENS, START_SCREENS + ACCEL_SCREENS * elapsed);
    var y = currentY();
    var max = maxScroll();
    var next = y + gesture.dir * screens * height() * dt;
    if (hitBound(gesture.dir, next, max)) {
      window.scrollTo(0, gesture.dir > 0 ? max : 0);
      stopGesture();
      return;
    }
    window.scrollTo(0, next);
    gesture.raf = requestAnimationFrame(frame);
  }
  function startGesture(btn, kind, pointerId) {
    stopGesture();
    armSuppress();
    gesture = {
      btn: btn,
      dir: directionOf(btn),
      kind: kind,
      pointerId: pointerId,
      pending: true,
      started: performance.now()
    };
    gesture.raf = requestAnimationFrame(frame);
  }
  function releaseGesture(allowTap) {
    if (!gesture) return;
    var dir = gesture.dir;
    var tap = allowTap && gesture.pending;
    stopGesture();
    scheduleSuppressClear();
    if (tap) scrollByScreen(dir);
  }

  document.addEventListener("pointerdown", function (ev) {
    var btn = buttonFrom(ev.target);
    if (!btn || ev.button > 0 || gesture) return;
    ev.preventDefault();
    startGesture(btn, "pointer", ev.pointerId);
  }, { passive: false });

  document.addEventListener("pointerup", function (ev) {
    if (!gesture || gesture.kind !== "pointer" || gesture.pointerId !== ev.pointerId) {
      if (suppressClick) scheduleSuppressClear();
      return;
    }
    var over = ev.target === gesture.btn || gesture.btn.contains(ev.target);
    releaseGesture(over);
  });

  document.addEventListener("pointercancel", function (ev) {
    if (!gesture || gesture.kind !== "pointer" || gesture.pointerId !== ev.pointerId) return;
    releaseGesture(false);
  });

  document.addEventListener("keydown", function (ev) {
    var btn = buttonFrom(ev.target);
    if (!btn || (ev.key !== "Enter" && ev.key !== " ")) return;
    ev.preventDefault();
    if (ev.repeat || gesture) return;
    startGesture(btn, "key", null);
  });

  document.addEventListener("keyup", function (ev) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    if (!gesture || gesture.kind !== "key") {
      if (suppressClick) scheduleSuppressClear();
      return;
    }
    releaseGesture(true);
  });

  window.addEventListener("blur", function () { releaseGesture(false); });

  document.addEventListener("click", function (ev) {
    var btn = buttonFrom(ev.target);
    if (!btn) return;
    ev.preventDefault();
    if (suppressClick) {
      suppressClick = false;
      clearTimeout(suppressTimer);
      return;
    }
    scrollByScreen(directionOf(btn));
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-page-scroll]"), function (btn) {
    btn.addEventListener("pointerleave", function (ev) {
      if (!gesture || gesture.kind !== "pointer" || gesture.pointerId !== ev.pointerId) return;
      releaseGesture(false);
    });
    btn.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
  });
})();
