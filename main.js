// ── Nav scroll effect ──
window.addEventListener("scroll", function () {
  document.getElementById("nav").classList.toggle("scrolled", window.scrollY > 40);
});

// ── Smooth scroll with offset for fixed nav ──
document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener("click", function (e) {
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