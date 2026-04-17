// Custom cursor
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');

document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
  ring.style.left = e.clientX + 'px';
  ring.style.top = e.clientY + 'px';
});

// Nav scroll
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 60);
});

// Scroll animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 100);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// Tally
function openTally(e) {
  if (e) e.preventDefault();
  window.open('https://tally.so/r/J9JAjJ', '_blank');
}