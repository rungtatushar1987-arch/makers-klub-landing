// The Solopreneurs Club — homepage content.
// Edit names, numbers, logos and placeholders here; components read from this file.

export const CTA_URL = 'https://tally.so/r/Pde8pd'
export const CTA_LABEL = 'Apply to Join'

export const FOUNDING_OPEN = false
export const FOUNDING_SPOTS_LEFT = '[X]'
export const FOUNDING_SPOTS_TOTAL = '[Y]'
export const FOUNDING_DEADLINE = '[DATE]'

export const TIERS = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'See what it’s like',
    monthly: '€0',
    yearly: '€0',
    unit: '',
    highlight: false,
    included: [
      'Access to general Slack channels',
      'Free events, by approval and availability',
    ],
  },
  {
    key: 'lite',
    name: 'Lite',
    tagline: 'For getting involved',
    monthly: '€19.99',
    yearly: '€229',
    unit: '',
    highlight: false,
    included: [
      'Full Slack community access',
      'Priority access to free events',
      '15% off paid events & workshops',
      'Host 1 free webinar per quarter with full support*',
    ],
  },
  {
    key: 'premium',
    name: 'Premium',
    tagline: 'Full membership',
    monthly: '€49.99',
    yearly: '€499.99',
    unit: '',
    highlight: true,
    included: [
      'Full access to the Slack community and channels',
      'Priority access to ALL events',
      '30% off all paid events & workshops',
      'Weekly Job board and listings',
      'Chance to host one quarterly webinar with end-to-end promotional support to grow your business.*',
      '1 x 30-mins consultation with Tushar Rungta for event hosting and community-building (worth €125)',
      '10% off on “Community Building for Business” coaching with Tushar Rungta',
    ],
  },
]
export const BUSINESS_TIER = {
  name: 'For Founders & Businesses',
  tagline: 'Host with us, or learn to build your own community',
  included: [
    'Host an event with The Solopreneurs Club to promote your product or service',
    'Reach our community of freelancers, founders and consultants',
    'Event planning, promotion and hosting support',
    '“Community Building for Business” coaching with Tushar Rungta',
  ],
  cta: 'Talk to us',
  ctaUrl: 'mailto:contact@tusharrungta.com?subject=Hosting%20or%20coaching%20for%20my%20business',
  note: 'Custom pricing, based on what you need.',
}
export const TIERS_FINE_PRINT = '*Subject to demand, slot availability, and members’ community engagement.'

export const HOW_IT_WORKS = {
  eyebrow: 'HOW IT WORKS',
  cards: [
    {
      number: '01',
      title: 'Foundation',
      caption: 'Weeks 1 to 3',
      body: 'A video library covering LinkedIn, positioning, messaging, your website, pricing, pitching and German admin, built to get you started and hitting the ground running. Each video ends in one task. You also join a kick-off call with everyone who started that month.',
    },
    {
      number: '02',
      title: 'The Room',
      caption: 'Every week after that',
      body: 'A private Slack channel where your questions get answered by coaches within 24 hours. A live session every month, expert AMAs twice a month, and reserved spots at exclusive Berlin meetups and workshops with industry experts.',
    },
    {
      number: '03',
      title: 'Referrals',
      caption: "Once you've done the work",
      body: "Finish the foundation checklist and we start recommending you to partners in our network. You also get an optional 1:1 with a coach.",
    },
  ],
}

export const MANIFESTO = "We don't sell clients. We build freelancers that clients want, and vouch for the ones who've done the work."

export const CREDIBILITY = {
  eyebrow: 'BEHIND THE CLUB',
  experts: {
    title: 'Experts and coaches',
    body: 'Tax advisors, lawyers, sales coaches and senior freelancers run our AMAs and answer member questions.',
  },
  tools: {
    title: 'Tools and resources',
    body: 'Templates, tools and resources, built for freelancers working in Germany. Members get all of it, and a new one lands every two weeks.',
  },
  network: {
    title: 'A network that hires',
    body: "We work with startups and companies across Berlin, and they ask us for freelancers. We can't promise you clients. We can put your name in front of people who hire, once you've done the work.",
  },
}

export const WHATS_INCLUDED = {
  eyebrow: 'WHAT YOU GET',
  rows: [
    { name: 'Foundation video library', cadence: 'Weeks 1 to 3', desc: 'A focused set of videos, each ending in one task.' },
    { name: 'Kick-off call', cadence: 'Monthly, 45 min', desc: 'For everyone who joined that month.' },
    { name: 'Private Slack', cadence: 'Daily', desc: 'Answers from a coach within 24 hours on weekdays.' },
    { name: 'Live session', cadence: 'Monthly, 75 min', desc: 'One real topic like late payments, raising rates or tricky clients. Recorded. €40 for non-members.' },
    { name: 'Expert AMAs', cadence: 'Twice a month, 45 min', desc: 'Tax, legal, sales and LinkedIn. Every AMA gets a written summary.' },
    { name: 'Berlin meetups', cadence: 'Monthly', desc: 'Reserved spots at Freelancer Fridays and a members-only session every quarter.' },
    { name: 'Resource library', cadence: 'New item every 2 weeks', desc: 'Pricing calculator, Germany checklist, contract, invoice and proposal templates.' },
    { name: 'Referrals and a 1:1', cadence: 'After the checklist', desc: 'Partner recommendations and an optional session with a coach.' },
  ],
}

export const FIT_CHECK = {
  eyebrow: 'FIT CHECK',
  join: {
    title: 'Join if',
    items: [
      "You've freelanced for a year or more.",
      'You have a few clients, mostly from your network or an old employer.',
      "You want to know what to fix next, and you'll do the groundwork.",
    ],
  },
  skip: {
    title: 'Skip if',
    items: [
      "You're still deciding whether to freelance, or have no paying clients yet.",
      'Your pipeline is already full.',
      'You want someone to find clients for you.',
    ],
  },
}

// ── FFB-style page structure additions ──────────────────────────────────
// Sections whose arrays/values are empty/null are NOT rendered (no placeholders).
// Fill them in here and they appear.

export const NAV_LINKS = [
  { id: 'about', label: 'About' },
  { id: 'events', label: 'Events' },
  { id: 'membership', label: 'Membership' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
]

export const HERO_SUBHEAD =
  'Foundation first. Then daily coaching, expert AMAs and a Berlin network that vouches for you.'

// 350+ members is counted by newsletter subscribers. Months running and events
// hosted are not in the repo: add them here when known.
export const STATS = [
  { value: '350+', label: 'Members across the community' },
  { value: '24h', label: 'Coach answers in Slack, on weekdays' },
  { value: '2×', label: 'Expert AMAs every month' },
  { value: '1×', label: 'Live session every month' },
]

export const ABOUT = {
  eyebrow: 'ABOUT THE CLUB',
  statement: MANIFESTO,
  paragraphs: [
    'A members-only club for freelancers in Germany past their first year. Fix your foundation first, then get daily coaching on real client work, a live session every month, expert AMAs and a Berlin network that recommends you when it counts.',
    "Tax advisors, lawyers, sales coaches and senior freelancers run our AMAs and answer member questions. We work with startups and companies across Berlin, and they ask us for freelancers. We can't promise you clients. We can put your name in front of people who hire, once you've done the work.",
  ],
  image: '/hero.jpg', // reuses the hero photo: no separate About photo exists yet
  imageAlt: 'Members at a Solopreneurs Club event in Berlin',
}

export const EVENTS_ACCESS = {
  title: 'Want access to everything?',
  body: 'Members get priority on every event, discounts on paid workshops and the full Slack community.',
  cta: 'See membership',
  href: '#membership',
}

// Newsletter runs on Substack. Set SUBSTACK_URL to the publication, e.g.
// 'https://yourname.substack.com'. The section stays hidden until it is set.
export const SUBSTACK_URL = 'https://thesolopreneursclub.substack.com'
export const NEWSLETTER = {
  action: SUBSTACK_URL ? `${SUBSTACK_URL}/api/v1/free?nojs=true` : null,
  eyebrow: 'STAY IN THE LOOP',
  title: 'Get new sessions and resources by email',
  body: 'Join 350+ freelancers and founders. Upcoming sessions, new resources and what we are learning, straight to your inbox.',
  consent: 'I agree to receive The Solopreneurs Club newsletter by email via Substack and can unsubscribe at any time.',
}

export const TESTIMONIALS = [] // [{ quote, name, role }]
export const PARTNERS = { logos: [], href: 'mailto:contact@tusharrungta.com?subject=Partnering%20with%20The%20Solopreneurs%20Club' } // logos: [{ name, src, url }]

// Answers are derived from existing site copy only.
export const FAQ = [
  {
    q: 'Is The Solopreneurs Club free to join?',
    a: 'Yes, there is a free membership at €0. It gets you the general Slack channels and free events, by approval and availability. Lite is €19.99/month or €229/year. Premium is €49.99/month or €499.99/year.',
  },
  {
    q: 'Who can join The Solopreneurs Club?',
    a: "Freelancers in Germany who've freelanced for a year or more, have a few clients (mostly from their network or an old employer) and want to know what to fix next. If you're still deciding whether to freelance, or have no paying clients yet, it's too early.",
  },
  {
    q: 'When is the next live session?',
    a: 'We run a live session every month, plus expert AMAs twice a month. Dates are on the Upcoming Sessions calendar above.',
  },
  {
    q: 'How do I hear about upcoming events?',
    a: 'Follow the calendar above, subscribe to our newsletter, or join the Slack community, where members hear first.',
  },
  {
    q: 'Do I need to live in Berlin?',
    a: 'No. The club is for freelancers in Germany. Slack and the monthly live session (which is recorded) work from anywhere. The meetups and workshops are in Berlin.',
  },
  {
    q: 'Are the live sessions and events free?',
    a: 'Monthly live sessions are free for members and €40 for everyone else. Free-tier members can join free events by approval and availability. Lite members get 15% off paid events and workshops, and Premium members get 30% off.',
  },
  {
    q: 'How can I partner with The Solopreneurs Club?',
    a: 'Founders and businesses can host an event with us to reach our community of freelancers, founders and consultants, or take "Community Building for Business" coaching with Tushar Rungta. Email contact@tusharrungta.com and we will talk through what you need.',
  },
]

export const FINAL_CTA = {
  title: 'Join The Solopreneurs Club',
  note: 'Free to join. Paid tiers from €19.99/month.',
  image: '/hero.jpg',
}

export const CONTACT = {
  eyebrow: 'CONTACT',
  title: 'Questions? Talk to a person.',
  note: 'About membership, hosting an event with us, or coaching for your business.',
  founder: { name: 'Tushar Rungta', role: 'Founder', photo: '/founder.jpg' },
  email: 'contact@tusharrungta.com',
  linkedin: 'https://www.linkedin.com/in/tusharrungta',
}
