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
window.toggleFaq = function (btn) {
  var answer = btn.nextElementSibling;
  var isOpen = answer.classList.contains("open");
  document.querySelectorAll(".faq-a").forEach(function (a) { a.classList.remove("open"); });
  document.querySelectorAll(".faq-q").forEach(function (q) { q.classList.remove("open"); });
  if (!isOpen) { answer.classList.add("open"); btn.classList.add("open"); }
};

// ── Contact form ──
var form = document.getElementById("contact-form");
if (form) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = form.querySelector(".form-submit");
    var successMsg = document.getElementById("success-msg");
    btn.disabled = true;
    btn.textContent = "Sending...";

    var data = {
      name: form.querySelector("[name='name']").value,
      email: form.querySelector("[name='email']").value,
      interest: form.querySelector("[name='interest']").value,
      message: form.querySelector("[name='message']").value,
    };

    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.success) {
        successMsg.style.display = "block";
        form.reset();
        setTimeout(function () { successMsg.style.display = "none"; }, 6000);
      } else {
        alert("Something went wrong. Please try again.");
      }
    })
    .catch(function () {
      alert("Something went wrong. Please try again.");
    })
    .finally(function () {
      btn.disabled = false;
      btn.textContent = "Send Message →";
    });
  });
}