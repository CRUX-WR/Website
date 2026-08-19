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

  // Scroll reveal
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
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
      var company = form.querySelector('#company').value.trim();
      var track = form.querySelector('#track').value;
      var message = form.querySelector('#message').value.trim();

      logToSheet('contact', { name: name, email: email, company: company, track: track, message: message });

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

  // Booking modal
  var BOOKING_NOTE_DEFAULT = 'We read every request personally and confirm a time within a business day.';
  var overlay = document.getElementById('booking-modal-overlay');
  var openBtn = document.getElementById('open-booking-modal');
  var closeBtn = document.getElementById('booking-modal-close');
  var doneBtn = document.getElementById('booking-modal-done');
  var bookingForm = document.getElementById('booking-form');
  var bookingBody = document.getElementById('booking-modal-body');
  var bookingSuccess = document.getElementById('booking-modal-success');

  function openModal() {
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (bookingForm) {
      bookingForm.reset();
      var submitBtn = bookingForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = false;
      var note = bookingForm.querySelector('.form-note');
      if (note) note.textContent = BOOKING_NOTE_DEFAULT;
    }
    if (bookingBody) bookingBody.style.display = '';
    if (bookingSuccess) bookingSuccess.style.display = 'none';
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (doneBtn) doneBtn.addEventListener('click', closeModal);
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) closeModal();
  });

  if (bookingForm) {
    bookingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = bookingForm.querySelector('#booking-name').value.trim();
      var email = bookingForm.querySelector('#booking-email').value.trim();
      var company = bookingForm.querySelector('#booking-company').value.trim();
      var date = bookingForm.querySelector('#booking-date').value;
      var time = bookingForm.querySelector('#booking-time').value;
      var notes = bookingForm.querySelector('#booking-notes').value.trim();

      logToSheet('booking', { name: name, email: email, company: company, date: date, time: time, notes: notes });

      var submitBtn = bookingForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      submitNetlifyForm(bookingForm).then(function (res) {
        if (!res.ok) throw new Error('Submission failed');
        if (bookingBody) bookingBody.style.display = 'none';
        if (bookingSuccess) bookingSuccess.style.display = 'block';
      }).catch(function () {
        if (submitBtn) submitBtn.disabled = false;
        var note = bookingForm.querySelector('.form-note');
        if (note) note.textContent = 'Something went wrong sending this. Please try again, or email us directly at support@wrcrux.com.';
      });
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
