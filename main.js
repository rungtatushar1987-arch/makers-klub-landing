// Nav scroll
window.addEventListener('scroll', () => {
  document.querySelector('nav').classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// Waitlist CTA
function openTally(e) {
  if (e) e.preventDefault();
  window.open('https://tally.so/r/J9JAjJ', '_blank');
}