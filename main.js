// Scroll reveal — mark elements for animation, then observe
document.querySelectorAll('.rv').forEach(el => el.classList.add('pre-anim'));

const obs = new IntersectionObserver(es => {
  es.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.remove('pre-anim');
      e.target.classList.add('on');
    }
  });
}, { threshold: 0.07, rootMargin: '0px 0px -30px 0px' });

document.querySelectorAll('.rv').forEach(el => obs.observe(el));