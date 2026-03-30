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

// Smooth scroll with offset for fixed nav
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 68;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  window.addEventListener('scroll', () => {
    document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 40);
  });
  function toggleFaq(btn) {
    const answer = btn.nextElementSibling;
    const isOpen = answer.classList.contains('open');
    document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
    document.querySelectorAll('.faq-q').forEach(q => q.classList.remove('open'));
    if (!isOpen) { answer.classList.add('open'); btn.classList.add('open'); }
  }
  function handleSubmit(e) {
    e.preventDefault();
    document.getElementById('success-msg').style.display = 'block';
    e.target.reset();
    setTimeout(() => { document.getElementById('success-msg').style.display = 'none'; }, 6000);
  }

// Cal.com booking button
document.addEventListener('DOMContentLoaded', function() {
  var btns = document.querySelectorAll('#cal-booking-btn, .cal-booking-btn');
  btns.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      Cal.ns['free-discovery-call']('ui', {
        styles: { branding: { brandColor: '#013dc4' } },
        hideEventTypeDetails: false,
        layout: 'month_view'
      });
      Cal.ns['free-discovery-call']('openModal', { calLink: 'makersklub/free-discovery-call' });
    });
  });
});