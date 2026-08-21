// Crux — shared site behavior

// Google Apps Script Web App URL that appends submissions to a Sheet
// owned by ai@wrcrux.com. See project notes for setup steps.
var SHEET_LOG_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzIqfAkS3WypXKMgIXlIvmezOtvAshlpZpKh-Xa708t3S3P0FuGm3uEx1Ec4BzjCSDb/exec';

function logToSheet(type, payload) {
  if (!SHEET_LOG_ENDPOINT || SHEET_LOG_ENDPOINT.indexOf('PASTE_YOUR') === 0) return;
  var data = Object.assign({ type: type }, payload);
  fetch(SHEET_LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(data)
  }).catch(function () {});
}

// Netlify Forms AJAX submission — the <form> tags carry data-netlify="true"
// so Netlify's build bot registers them; this just submits without a page reload.
function submitNetlifyForm(formEl) {
  var params = new URLSearchParams();
  new FormData(formEl).forEach(function (value, key) { params.append(key, value); });
  return fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
}

document.addEventListener('DOMContentLoaded', function () {

  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
      var expanded = links.classList.contains('open');
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', function () {
      var wasOpen = item.classList.contains('open');
      item.closest('.faq-list').querySelectorAll('.faq-item').forEach(function (i) {
        i.classList.remove('open');
      });
      if (!wasOpen) item.classList.add('open');
    });
  });

  // Bring a few more element types into the scroll-reveal system that
  // previously just appeared flat with no motion.
  document.querySelectorAll('.icp-card, .founder-block, .section-head').forEach(function (el) {
    el.classList.add('reveal');
  });

  // Scroll reveal
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    // Stagger siblings that reveal together (e.g. cards in the same grid)
    // so they animate in as a sequence instead of all at once. Elements
    // that are the only .reveal in their parent get 0ms, so solo reveals
    // (CTA bands, single blocks) are unaffected.
    var revealGroups = [];
    revealEls.forEach(function (el) {
      var parent = el.parentElement;
      var group = null;
      for (var i = 0; i < revealGroups.length; i++) {
        if (revealGroups[i].parent === parent) { group = revealGroups[i]; break; }
      }
      if (!group) { group = { parent: parent, count: 0 }; revealGroups.push(group); }
      el.style.transitionDelay = Math.min(group.count * 80, 480) + 'ms';
      group.count++;
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  // Count-up animation for stat numbers (e.g. case study metrics).
  // Parses a leading/trailing prefix and suffix around the numeric part
  // so values like "+40%", "6 mo", or "2×" animate correctly; anything
  // without a plain number in it (e.g. a "—" placeholder) is left as-is.
  var countEls = document.querySelectorAll('.m-num');
  if ('IntersectionObserver' in window && countEls.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var countIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countIo.unobserve(entry.target);
        var el = entry.target;
        var raw = el.textContent.trim();
        var match = raw.match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/);
        if (!match) return;
        var prefix = match[1], target = parseFloat(match[2]), suffix = match[3];
        var isInt = target === Math.round(target);
        var duration = 900;
        var start = null;
        function step(ts) {
          if (!start) start = ts;
          var progress = Math.min((ts - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          var current = target * eased;
          el.textContent = prefix + (isInt ? Math.round(current) : (Math.round(current * 10) / 10)) + suffix;
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = raw;
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    countEls.forEach(function (el) { countIo.observe(el); });
  }

  // Scroll-focus for the phase timeline (process-row): the row nearest the
  // vertical center of the viewport is emphasized; the rest recede.
  var processRows = document.querySelectorAll('.process-row');
  if ('IntersectionObserver' in window && processRows.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    processRows.forEach(function (row) { row.classList.add('is-dim'); });
    var focusIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        processRows.forEach(function (row) {
          if (row === entry.target) {
            row.classList.add('is-focus');
            row.classList.remove('is-dim');
          } else {
            row.classList.remove('is-focus');
            row.classList.add('is-dim');
          }
        });
      });
    }, { threshold: 0, rootMargin: '-42% 0px -42% 0px' });
    processRows.forEach(function (row) { focusIo.observe(row); });
  }

  // Contact form -> Netlify Forms submission
  var CONTACT_NOTE_DEFAULT = 'We read every message personally and reply within two business days.';
  var form = document.getElementById('contact-form');
  var contactSuccess = document.getElementById('contact-form-success');
  var contactAgainBtn = document.getElementById('contact-form-again');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('#name').value.trim();
      var email = form.querySelector('#email').value.trim();
      var phone = form.querySelector('#phone').value.trim();
      var company = form.querySelector('#company').value.trim();
      var track = form.querySelector('#track').value;
      var message = form.querySelector('#message').value.trim();

      logToSheet('contact', { name: name, email: email, phone: phone, company: company, track: track, message: message });

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      submitNetlifyForm(form).then(function (res) {
        if (!res.ok) throw new Error('Submission failed');
        form.style.display = 'none';
        if (contactSuccess) contactSuccess.style.display = 'block';
      }).catch(function () {
        if (submitBtn) submitBtn.disabled = false;
        var note = form.querySelector('.form-note');
        if (note) note.textContent = 'Something went wrong sending this. Please try again, or email us directly at support@wrcrux.com.';
      });
    });
  }

  if (contactAgainBtn) {
    contactAgainBtn.addEventListener('click', function () {
      if (form) {
        form.reset();
        form.style.display = '';
        var note = form.querySelector('.form-note');
        if (note) note.textContent = CONTACT_NOTE_DEFAULT;
      }
      if (contactSuccess) contactSuccess.style.display = 'none';
    });
  }

  // Current year in footer
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Active nav link
  var path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
});
