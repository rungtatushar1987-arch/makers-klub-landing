// Shared option lists for the onboarding wizard and the profile page's
// inline business-profile editor — keep both in sync from one place.

export const INDUSTRIES = [
  'Advertising & Marketing',
  'Architecture & Interior Design',
  'Consulting & Strategy',
  'Design & Creative',
  'Education & Training',
  'Fashion & Lifestyle',
  'Finance & Fintech',
  'Health & Wellness',
  'Media & Publishing',
  'Music & Audio',
  'Photography & Film',
  'Technology & Engineering',
  'E-commerce & Retail',
  'Other',
]

export const MAX_INDUSTRIES = 3
export const MAX_SERVICES = 5

export const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Expert']

export const SOCIAL_PLATFORMS = [
  'LinkedIn',
  'Instagram',
  'Twitter / X',
  'Behance',
  'Dribbble',
  'TikTok',
  'YouTube',
  'Facebook',
  'Threads',
]

export const INCOME_GOAL_OPTIONS = [
  { value: 'starting_out', label: 'Just starting out ($2k - $4k / mo)' },
  { value: 'replacing_job', label: 'Replacing my full-time job ($4k - $7k / mo)' },
  { value: 'scaling_business', label: 'Scaling my established business ($7k+ / mo)' },
]

export const CLIENT_CAPACITY_OPTIONS = [
  { value: '1_2', label: '1 - 2 clients (Focused)' },
  { value: '3_4', label: '3 - 4 clients (Optimal capacity)' },
  { value: '5_plus', label: '5+ clients (Agency style / High volume)' },
]

export const LEAD_AVAILABILITY_OPTIONS = [
  { value: 'fully_booked', label: 'Fully Booked (No calls needed right now)' },
  { value: 'steady_growth', label: 'Steady Growth (1-2 calls a week to fill a few gaps)' },
  { value: 'high_priority', label: 'High Priority (3+ calls a week, I need work immediately)' },
]
