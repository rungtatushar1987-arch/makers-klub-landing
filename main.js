import { addToWaitlist, getWaitlistCount } from './supabase'

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
  const heroCounter = document.getElementById('hero-counter')
  console.log(count)
  if (heroCounter) heroCounter.textContent = `${count}`
}
// Get selected features from checkboxes
function getSelectedFeatures() {
  const checkboxes = document.querySelectorAll('input[name="features"]:checked')
  const features = Array.from(checkboxes).map(cb => cb.value)
  return features.join(', ') || 'None selected'
}
// Core submission logic
async function submitWaitlist(name, email, role, features, isHeroForm) {
  try {
    const button = isHeroForm 
      ? document.querySelector('.waitlist-form .btn-primary')
      : document.querySelector('#waitlist-form .btn-primary')
    
    const originalText = button.textContent
    button.textContent = 'Joining...'
    button.disabled = true

    // Add to Supabase
    const { error } = await addToWaitlist(name, email, role, features)

    if (error === 'duplicate') {
      alert('This email is already on the waitlist!')
      button.textContent = originalText
      button.disabled = false
      return
    }

    if (error) {
      console.error('Supabase error:', error)
      alert('Something went wrong. Please try again.')
      button.textContent = originalText
      button.disabled = false
      return
    }

    // Send confirmation email
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
    } catch (emailError) {
      console.error('Email send failed:', emailError);
    }

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
  const features = getSelectedFeatures()
  
  await submitWaitlist(name, email, role, features, true)
}

// Handle CTA form submission
window.handleWaitlistSubmit = async function(e) {
  e.preventDefault()
  
  const name = document.getElementById('cta-name').value.trim()
  const email = document.getElementById('cta-email').value.trim()
  const role = document.getElementById('cta-role').value
  const features = getSelectedFeatures()
  
  await submitWaitlist(name, email, role, features, false)
}

// Initialize on page load
initCounter()