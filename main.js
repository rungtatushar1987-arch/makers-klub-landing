import { checkEmailExists, addToWaitlist, getWaitlistCount } from './supabase.js'

const LIMIT = 100

// Initialize counter on page load
async function initCounter() {
  try {
    const count = await getWaitlistCount()
    updateCounterUI(count)
  } catch (error) {
    console.error('Error loading counter:', error)
    updateCounterUI(12) // Fallback
  }
}

// Update all counter UI elements
function updateCounterUI(count) {
  const pct = Math.min((count / LIMIT) * 100, 100)
  const spotsLeft = Math.max(LIMIT - count, 0)

  const counterNum = document.getElementById('counter-num')
  const heroCounter = document.getElementById('hero-counter')
  
  if (counterNum) counterNum.textContent = count
  if (heroCounter) heroCounter.textContent = `${count} creative${count !== 1 ? 's' : ''}`

  const spotsLeftEl = document.getElementById('spots-left')
  if (spotsLeftEl) {
    spotsLeftEl.textContent = spotsLeft === 0
      ? 'No spots remaining'
      : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} remaining`
  }

  const fill = document.getElementById('progress-fill')
  if (fill) fill.style.width = `${pct}%`

  const badge = document.getElementById('counter-badge')
  if (badge) {
    badge.classList.remove('warn', 'danger')
    if (fill) fill.classList.remove('warn', 'danger')

    if (count >= 81) {
      badge.classList.add('danger')
      if (fill) fill.classList.add('danger')
    } else if (count >= 51) {
      badge.classList.add('warn')
      if (fill) fill.classList.add('warn')
    }
  }

  if (count >= LIMIT) {
    const waitlistForm = document.getElementById('waitlist-form')
    const successMsg = document.getElementById('success-msg')
    const closedMsg = document.getElementById('waitlist-closed')
    const heroForm = document.querySelector('.waitlist-form')

    if (waitlistForm) waitlistForm.style.display = 'none'
    if (successMsg) successMsg.style.display = 'none'
    if (closedMsg) closedMsg.classList.add('visible')
    if (heroForm) heroForm.style.display = 'none'
  }
}

// Core submission logic
async function submitWaitlist(name, email, role, isHeroForm) {
  try {
    const button = isHeroForm 
      ? document.querySelector('.waitlist-form .btn-primary')
      : document.querySelector('#waitlist-form .btn-primary')
    
    const originalText = button.textContent
    button.textContent = 'Joining...'
    button.disabled = true

    // Check for duplicate email
    const emailExists = await checkEmailExists(email)
    if (emailExists) {
      alert('This email is already on the waitlist!')
      button.textContent = originalText
      button.disabled = false
      return
    }

    // Add to Supabase
    const { data, error } = await addToWaitlist(name, email, role)
    if (error) {
      console.error('Supabase error:', error)
      alert('Something went wrong. Please try again.')
      button.textContent = originalText
      button.disabled = false
      return
    }

    // Send confirmation email (simple mailto for now since we don't have serverless yet)
    // This will be upgraded when we add the API endpoint
    console.log('User signed up:', { name, email, role })

    // Get updated count and update UI
    const newCount = await getWaitlistCount()
    updateCounterUI(newCount)

    // Show success message
    if (isHeroForm) {
      const heroForm = document.querySelector('.waitlist-form')
      heroForm.style.display = 'none'
      
      const heroContent = document.querySelector('.hero-content')
      const successDiv = document.createElement('div')
      successDiv.className = 'success-message visible'
      successDiv.innerHTML = `
        <div class="success-icon">🎉</div>
        <h3>You're on the list!</h3>
        <p>We'll be in touch personally when Makers Klub launches in Berlin. Keep doing great work.</p>
      `
      heroContent.appendChild(successDiv)
    } else {
      const form = document.getElementById('waitlist-form')
      const success = document.getElementById('success-msg')
      form.style.display = 'none'
      success.classList.add('visible')
    }

  } catch (error) {
    console.error('Submission error:', error)
    alert('Something went wrong. Please try again.')
  }
}

// Handle hero form submission
window.handleHeroSubmit = async function(e) {
  e.preventDefault()
  
  const name = document.getElementById('hero-name').value.trim()
  const email = document.getElementById('hero-email').value.trim()
  const role = document.getElementById('hero-role').value
  
  await submitWaitlist(name, email, role, true)
}

// Handle CTA form submission
window.handleWaitlistSubmit = async function(e) {
  e.preventDefault()
  
  const name = document.getElementById('cta-name').value.trim()
  const email = document.getElementById('cta-email').value.trim()
  const role = document.getElementById('cta-role').value
  
  await submitWaitlist(name, email, role, false)
}

// Initialize on page load
initCounter()
