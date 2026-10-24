/* The Green Brief sign-up.
   1. Posts to the Apps Script web app (saves to the subscriber sheet, sends the welcome email)
      and READS the reply, so a failure is visible instead of silently redirecting.
   2. If the script cannot be reached, falls back to the backup form service (FormSubmit).
   3. If the script says the details are wrong, shows a clear message on the page. */
(function () {
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycby6o099ajBV-90b-fE3juAy6t1rq8SMbyCADXhZnlw_SPbbLCCrx2-S-zWsHzRvp28E/exec';
  if (ENDPOINT.indexOf('https://script.google.com/') !== 0 || !window.fetch || !window.FormData) return;
  function msg(form, text) {
    var el = form.querySelector('.gb-msg');
    if (!el) { el = document.createElement('p'); el.className = 'gb-msg'; el.setAttribute('role', 'alert');
      el.style.cssText = 'margin:12px 0 0;padding:10px 12px;border-left:4px solid #D40000;background:#FFF;color:#17201A;font-size:15px';
      form.appendChild(el); }
    el.textContent = text;
  }
  Array.prototype.forEach.call(document.querySelectorAll('form[data-gb-signup]'), function (form) {
    form.addEventListener('submit', function (ev) {
      if (form.getAttribute('data-sending') === '1') { ev.preventDefault(); return; }
      if (form.checkValidity && !form.checkValidity()) return;
      ev.preventDefault();
      var btn = form.querySelector('button[type="submit"]'), label = btn ? btn.textContent : '';
      var next = form.querySelector('input[name="_next"]');
      var thanks = next ? next.value : 'https://gabi.ph/weekly/subscribe/thanks/';
      var body = new URLSearchParams();
      new FormData(form).forEach(function (v, k) { if (k.charAt(0) !== '_' || k === '_honey') body.append(k, v); });
      body.append('_format', 'json');
      form.setAttribute('data-sending', '1');
      if (btn) { btn.disabled = true; btn.textContent = 'Subscribing…'; }
      var done = false;
      function reset() { form.removeAttribute('data-sending'); if (btn) { btn.disabled = false; btn.textContent = label; } }
      function backup() { if (done) return; done = true; reset(); HTMLFormElement.prototype.submit.call(form); }
      var timer = setTimeout(backup, 12000);
      fetch(ENDPOINT, { method: 'POST', body: body, redirect: 'follow' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (done) return; clearTimeout(timer);
          if (j && j.ok) { done = true; location.href = thanks; return; }
          done = true; reset();
          msg(form, 'Sorry, that did not go through. Please check your email address and the consent box, then try again. If it keeps failing, email jeff@gabi.ph and we will add you.');
        })
        .catch(function () { clearTimeout(timer); backup(); });
    });
  });
})();
