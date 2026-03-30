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

// ── Set Cal.com data attributes on booking buttons via JS ──
// (avoids Vite HTML parser choking on single-quoted JSON in data attributes)
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("#cal-booking-btn, .cal-booking-btn").forEach(function (btn) {
    btn.setAttribute("data-cal-link", "makersklub/free-discovery-call");
    btn.setAttribute("data-cal-namespace", "free-discovery-call");
    btn.setAttribute("data-cal-config", JSON.stringify({ layout: "month_view" }));
  });
});

// ── Nav scroll effect ──
window.addEventListener("scroll", function () {
  document.getElementById("nav").classList.toggle("scrolled", window.scrollY > 40);
});

// ── Smooth scroll with offset for fixed nav ──
document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener("click", function (e) {
    // Skip booking buttons — Cal.com handles their click
    if (this.id === "cal-booking-btn" || this.classList.contains("cal-booking-btn")) return;
    var target = document.querySelector(this.getAttribute("href"));
    if (target) {
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 68;
      window.scrollTo({ top: top, behavior: "smooth" });
    }
  });
});

// ── FAQ accordion ──
function toggleFaq(btn) {
  var answer = btn.nextElementSibling;
  var isOpen = answer.classList.contains("open");
  document.querySelectorAll(".faq-a").forEach(function (a) { a.classList.remove("open"); });
  document.querySelectorAll(".faq-q").forEach(function (q) { q.classList.remove("open"); });
  if (!isOpen) { answer.classList.add("open"); btn.classList.add("open"); }
}

// ── Contact form ──
function handleSubmit(e) {
  e.preventDefault();
  document.getElementById("success-msg").style.display = "block";
  e.target.reset();
  setTimeout(function () {
    document.getElementById("success-msg").style.display = "none";
  }, 6000);
}