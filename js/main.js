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

  // Scroll-linked effects: progress bar fill, nav shadow past the hero,
  // and a subtle parallax drift on the hero/page-hero grid texture.
  // All three read from one rAF-throttled scroll listener.
  (function () {
    var progressEl = document.getElementById('scroll-progress');
    var navEl = document.getElementById('site-nav');
    var grids = document.querySelectorAll('.hero-grid');
    var mobileCta = document.querySelector('.mobile-cta');
    var reduceMotionForParallax = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ticking = false;

    function update() {
      var scrollTop = window.scrollY || window.pageYOffset;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      if (progressEl) {
        progressEl.style.width = pct + '%';
      }

      if (navEl) {
        navEl.classList.toggle('scrolled', scrollTop > 40);
      }

      if (mobileCta) {
        mobileCta.classList.toggle('visible', pct >= 7);
      }

      if (!reduceMotionForParallax && grids.length) {
        grids.forEach(function (grid) {
          grid.style.transform = 'translateY(' + (scrollTop * 0.15) + 'px)';
        });
      }

      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  })();

  // Sequential "pop" entrance for the hero loop cards (01 → 04) on load,
  // followed by a slow, continuous spotlight cycle: one card at a time
  // enlarges into sharp focus while the rest of the diagram (the other
  // cards, the connecting lines, the center hub) softens into the
  // background, moving through 1 → 4 on a loop.
  var loopVisualEl = document.querySelector('.loop-visual');
  var loopCards = document.querySelectorAll('.loop-visual .loop-card');
  if (loopVisualEl && loopCards.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var popStagger = 400;
    var popDelay = 500;
    var popDuration = 900;

    loopCards.forEach(function (card, i) {
      setTimeout(function () {
        card.classList.add('popped');
      }, popDelay + i * popStagger);
    });

    var totalPopTime = popDelay + (loopCards.length - 1) * popStagger + popDuration;

    setTimeout(function () {
      var svg = loopVisualEl.querySelector('.loop-svg');
      var center = loopVisualEl.querySelector('.loop-center');
      if (svg) svg.style.filter = 'blur(1.5px)';
      if (center) center.style.filter = 'blur(1.5px)';

      var active = 0;
      function applySpotlight() {
        loopCards.forEach(function (card, i) {
          if (i === active) {
            card.style.filter = 'blur(0px)';
            card.style.opacity = '1';
            card.style.transform = 'scale(1.25)';
            card.style.zIndex = '5';
          } else {
            card.style.filter = 'blur(2px)';
            card.style.opacity = '0.5';
            card.style.transform = 'scale(0.9)';
            card.style.zIndex = '1';
          }
        });
      }
      applySpotlight();

      setInterval(function () {
        active = (active + 1) % loopCards.length;
        applySpotlight();
      }, 2600);
    }, totalPopTime);
  }

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

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // 3D tilt-on-hover for card-like elements: rotates toward the cursor
  // within a small range and eases back flat on mouseleave. Excludes
  // .loop-card: those are exclusively driven by the spotlight cycle
  // above, so nothing else fights it over the transform/transition.
  if (canHover && !reduceMotion) {
    var tiltEls = document.querySelectorAll('.icp-card, .feature-card');
    tiltEls.forEach(function (el) {
      var maxTilt = 8;
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width;
        var y = (e.clientY - rect.top) / rect.height;
        var rotateY = (x - 0.5) * maxTilt * 2;
        var rotateX = (0.5 - y) * maxTilt * 2;
        el.style.transition = 'none';
        el.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale3d(1.02,1.02,1.02)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform .5s cubic-bezier(.16,.84,.44,1)';
        el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
      });
    });

    // Parallax drift for the hero loop visual's center hub only — the
    // four cards are owned by the spotlight cycle, not by mouse position.
    var heroEl = document.querySelector('.hero');
    var loopVisual = document.querySelector('.loop-visual');
    if (heroEl && loopVisual) {
      var centerEl = loopVisual.querySelector('.loop-center');
      if (centerEl) {
        heroEl.addEventListener('mousemove', function (e) {
          var rect = heroEl.getBoundingClientRect();
          var cx = (e.clientX - rect.left) / rect.width - 0.5;
          var cy = (e.clientY - rect.top) / rect.height - 0.5;
          centerEl.classList.add('no-transform-transition');
          centerEl.style.transform = 'translate(-50%,-50%) translate(' + (cx * 10) + 'px, ' + (cy * 10) + 'px)';
        });
        heroEl.addEventListener('mouseleave', function () {
          centerEl.classList.remove('no-transform-transition');
          centerEl.style.transform = 'translate(-50%,-50%)';
        });
      }
    }
  }

  // Ambient particle network drifting behind the hero copy — purely
  // decorative canvas animation, skipped entirely under reduced motion.
  (function () {
    var canvas = document.getElementById('hero-particles');
    if (!canvas || reduceMotion) return;
    var ctx = canvas.getContext('2d');
    var hero = canvas.closest('.hero');
    var particles = [];
    var count = 46;
    var w, h, raf, resizeTimer;

    function resize() {
      w = canvas.width = hero.offsetWidth;
      h = canvas.height = hero.offsetHeight;
    }

    function init() {
      resize();
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.6 + 0.6
        });
      }
    }

    function step() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.strokeStyle = 'rgba(91,139,240,' + (0.14 * (1 - dist / 130)) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      for (var k = 0; k < particles.length; k++) {
        var pt = particles[k];
        ctx.fillStyle = 'rgba(139,166,240,0.55)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(step);
    }

    init();
    raf = requestAnimationFrame(step);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(step);
    });

    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(init, 200);
    });
  })();

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
