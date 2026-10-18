/* The Green Brief sign-up: saves to GABI's subscriber sheet and sends the welcome email.
   Paste the web app URL below after deploying. While it still reads PASTE_..., the forms
   keep posting to the backup email form service exactly as before. Without JavaScript the
   backup service is used too, and those sign-ups are copied into the sheet every 15 minutes. */
(function () {
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycby6o099ajBV-90b-fE3juAy6t1rq8SMbyCADXhZnlw_SPbbLCCrx2-S-zWsHzRvp28E/exec';
  if (ENDPOINT.indexOf('https://script.google.com/') !== 0 || !window.fetch || !window.FormData) return;
  var forms = document.querySelectorAll('form[data-gb-signup]');
  Array.prototype.forEach.call(forms, function (form) {
    form.addEventListener('submit', function (ev) {
      if (form.getAttribute('data-sending') === '1') { ev.preventDefault(); return; }
      if (form.checkValidity && !form.checkValidity()) return; // let the browser show the message
      ev.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.textContent : '';
      var next = form.querySelector('input[name="_next"]');
      var thanks = next ? next.value : 'https://gabi.ph/weekly/subscribe/thanks/';
      var data = new FormData(form), body = new URLSearchParams();
      data.forEach(function (v, k) { if (k.charAt(0) !== '_' || k === '_honey') body.append(k, v); });
      body.append('_format', 'json');
      form.setAttribute('data-sending', '1');
      if (btn) { btn.disabled = true; btn.textContent = 'Subscribing…'; }
      var done = false;
      var fallback = function () { // network trouble: use the backup service instead
        if (done) return; done = true;
        form.removeAttribute('data-sending');
        if (btn) { btn.disabled = false; btn.textContent = label; }
        HTMLFormElement.prototype.submit.call(form);
      };
      var timer = setTimeout(fallback, 10000);
      fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', body: body })
        .then(function () { if (done) return; done = true; clearTimeout(timer); location.href = thanks; })
        .catch(function () { clearTimeout(timer); fallback(); });
    });
  });
})();
