// Mobile redirect to PWA
if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
  window.location.replace('https://app.makersklub.com');
}

// Nav scroll
window.addEventListener('scroll', () => {
  document.querySelector('nav').classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// Waitlist CTA
function openTally(e) {
  if (e) e.preventDefault();
  window.open('https://tally.so/r/J9JAjJ', '_blank');
}

// Carousel
(function () {
  const track = document.getElementById('carouselTrack');
  if (!track) return;

  let x = 0;
  let speed = 0.6; // px per frame
  let paused = false;
  let dragging = false;
  let dragStartX = 0;
  let dragStartScroll = 0;

  // Width of one full set (12 photos + gaps)
  function getSingleSetWidth() {
    const items = track.children;
    const count = Math.floor(items.length / 2); // half are duplicates
    let w = 0;
    for (let i = 0; i < count; i++) {
      w += items[i].offsetWidth + 12; // 12 = gap
    }
    return w;
  }

  function tick() {
    if (!paused && !dragging) {
      x -= speed;
      const setWidth = getSingleSetWidth();
      if (Math.abs(x) >= setWidth) x = 0;
      track.style.transform = `translateX(${x}px)`;
    }
    requestAnimationFrame(tick);
  }

  // Mouse drag
  track.addEventListener('mousedown', e => {
    dragging = true;
    dragStartX = e.clientX;
    dragStartScroll = x;
    track.style.transition = 'none';
  });

  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    x = dragStartScroll + (e.clientX - dragStartX);
    track.style.transform = `translateX(${x}px)`;
  });

  window.addEventListener('mouseup', () => { dragging = false; });

  // Touch drag
  track.addEventListener('touchstart', e => {
    dragging = true;
    dragStartX = e.touches[0].clientX;
    dragStartScroll = x;
  }, { passive: true });

  track.addEventListener('touchmove', e => {
    if (!dragging) return;
    x = dragStartScroll + (e.touches[0].clientX - dragStartX);
    track.style.transform = `translateX(${x}px)`;
  }, { passive: true });

  track.addEventListener('touchend', () => { dragging = false; });

  // Pause on hover
  track.addEventListener('mouseenter', () => { paused = true; });
  track.addEventListener('mouseleave', () => { paused = false; });

  requestAnimationFrame(tick);
})();
