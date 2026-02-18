const LIMIT = 100;
const SEED = 12;

// Update all counter UI elements
function updateCounterUI(count) {
  const pct = Math.min((count / LIMIT) * 100, 100);
  const spotsLeft = Math.max(LIMIT - count, 0);

  // Counter number
  document.getElementById('counter-num').textContent = count;
  document.getElementById('hero-counter').textContent = `${count} creative${count !== 1 ? 's' : ''}`;

  // Spots left
  document.getElementById('spots-left').textContent = spotsLeft === 0
    ? 'No spots remaining'
    : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} remaining`;

  // Progress bar
  const fill = document.getElementById('progress-fill');
  fill.style.width = `${pct}%`;

  // Colour states
  const badge = document.getElementById('counter-badge');
  badge.classList.remove('warn', 'danger');
  fill.classList.remove('warn', 'danger');

  if (count >= 81) {
    badge.classList.add('danger');
    fill.classList.add('danger');
    badge.querySelector('strong').innerHTML = `<span id="counter-num">${count}</span> of 100`;
    document.getElementById('counter-num').textContent = count;
  } else if (count >= 51) {
    badge.classList.add('warn');
    fill.classList.add('warn');
  }

  // If full — hide form, show closed state
  if (count >= LIMIT) {
    document.getElementById('waitlist-form').style.display = 'none';
    document.getElementById('success-msg').style.display = 'none';
    document.getElementById('waitlist-closed').classList.add('visible');
    // Also hide hero form
    document.querySelector('.waitlist-form').style.display = 'none';
  }
}

// Load count from storage on page load
async function loadCount() {
  try {
    const result = await window.storage.get('mk_waitlist_count', true);
    const count = result ? parseInt(result.value) : SEED;
    updateCounterUI(count);
  } catch (e) {
    // Key doesn't exist yet — use seed
    updateCounterUI(SEED);
  }
}

// Increment and save count
async function incrementCount() {
  let current = SEED;
  try {
    const result = await window.storage.get('mk_waitlist_count', true);
    if (result) current = parseInt(result.value);
  } catch (e) {}

  const newCount = Math.min(current + 1, LIMIT);
  try {
    await window.storage.set('mk_waitlist_count', String(newCount), true);
  } catch (e) {}

  updateCounterUI(newCount);
  return newCount;
}

async function handleHeroSubmit(e) {
  e.preventDefault();
  
  // Increment counter first
  const newCount = await incrementCount();
  
  const name = document.getElementById('hero-name').value;
  const email = document.getElementById('hero-email').value;
  const role = document.getElementById('hero-role').value;
  
  // Hide hero form and show success
  const heroForm = document.querySelector('.waitlist-form');
  heroForm.style.display = 'none';
  
  // Create and show success message in hero section
  const heroContent = document.querySelector('.hero-content');
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message visible';
  successDiv.innerHTML = `
      <div class="success-icon">🎉</div>
      <h3>You're on the list!</h3>
      <p>We'll be in touch personally when Makers Klub launches in Berlin. Keep doing great work.</p>
    `;
  heroContent.appendChild(successDiv);
  
  // Also fill the CTA form in case they scroll down
  document.getElementById('cta-name').value = name;
  document.getElementById('cta-email').value = email;
  document.getElementById('cta-role').value = role;
}

async function handleWaitlistSubmit(e) {
  e.preventDefault();
  const newCount = await incrementCount();
  const form = document.getElementById('waitlist-form');
  const success = document.getElementById('success-msg');

  if (newCount < LIMIT) {
    form.style.display = 'none';
    success.classList.add('visible');
  }
}

// Init on load
loadCount();
