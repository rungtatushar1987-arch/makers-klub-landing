// ── Cal.com Embed Initialisation ──
(function (C, A, L) {
  let p = function (a, ar) { a.q.push(ar); };
  let d = C.document;
  C.Cal = C.Cal || function () {
    let cal = C.Cal;
    let ar = arguments;
    if (!cal.loaded) {
      cal.ns = {};
      cal.q = cal.q || [];
      d.head.appendChild(d.createElement("script")).src = A;
      cal.loaded = true;
    }
    if (ar[0] === L) {
      const api = function () { p(api, arguments); };
      const namespace = ar[1];
      api.q = api.q || [];
      if (typeof namespace === "string") {
        cal.ns[namespace] = cal.ns[namespace] || api;
        p(cal.ns[namespace], ar);
        p(cal, ["initNamespace", namespace]);
      } else p(cal, ar);
      return;
    }
    p(cal, ar);
  };
})(window, "https://app.cal.com/embed/embed.js", "init");

Cal("init", "free-discovery-call", { origin: "https://cal.eu" });
Cal.ns["free-discovery-call"]("ui", {
  styles: { branding: { brandColor: "#013dc4" } },
  hideEventTypeDetails: false,
  layout: "month_view"
});

// ── Nav scroll effect ──
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 40);
});

// ── Smooth scroll with offset for fixed nav ──
// Excludes booking buttons (no href target to scroll to)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');

    // Skip if this is a booking button
    if (this.id === 'cal-booking-btn' || this.classList.contains('cal-booking-btn')) return;

    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const offset = 68;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ── Cal.com booking button ──
document.querySelectorAll('#cal-booking-btn, .cal-booking-btn').forEach(function (btn) {
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    Cal.ns["free-discovery-call"]("showPopup", {
      calLink: "makersklub/free-discovery-call",
      config: { layout: "month_view" }
    });
  });
});

// ── FAQ accordion ──
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-q').forEach(q => q.classList.remove('open'));
  if (!isOpen) { answer.classList.add('open'); btn.classList.add('open'); }
}

// ── Contact form ──
function handleSubmit(e) {
  e.preventDefault();
  document.getElementById('success-msg').style.display = 'block';
  e.target.reset();
  setTimeout(() => { document.getElementById('success-msg').style.display = 'none'; }, 6000);
}