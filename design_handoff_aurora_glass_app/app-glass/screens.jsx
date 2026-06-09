// Makers Klub — Aurora Glass redesign · mobile screens + device frame
// Palette: yellow #fcb813 (ink), violet #7a4ed8 (white), blue #3b6dd9 (white),
//          navy #0a1340 (white), soft-violet #a587f0 (ink)

const AV = {
  yellow: ['#fcb813', '#0a1340'],
  violet: ['#7a4ed8', '#ffffff'],
  blue:   ['#3b6dd9', '#ffffff'],
  navy:   ['#0a1340', '#ffffff'],
  soft:   ['#a587f0', '#0a1340'],
};

// ===== Device frame =====
function StatusBar() {
  return (
    <div className="g-status">
      <span>9:41</span>
      <span className="r">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none"><rect x="0" y="7" width="3" height="5" rx="1" fill="currentColor"/><rect x="4.5" y="4.5" width="3" height="7.5" rx="1" fill="currentColor"/><rect x="9" y="2" width="3" height="10" rx="1" fill="currentColor"/><rect x="13.5" y="0" width="3" height="12" rx="1" fill="currentColor" opacity="0.35"/></svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M8 2.5c2 0 3.8.8 5.2 2.1l1.3-1.4C13 1.5 10.6.5 8 .5S3 1.5 1.5 3.2l1.3 1.4C4.2 3.3 6 2.5 8 2.5Z" fill="currentColor"/><path d="M8 6c1 0 2 .4 2.7 1.1l1.3-1.4C11 4.7 9.6 4 8 4s-3 .7-4 1.7l1.3 1.4C6 6.4 7 6 8 6Z" fill="currentColor"/><circle cx="8" cy="9.8" r="1.6" fill="currentColor"/></svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity="0.4"/><rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor"/><rect x="23" y="4" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.5"/></svg>
      </span>
    </div>
  );
}

function Phone({ children, label }) {
  return (
    <div className="g-frame-cell" data-screen-label={label}>
      <div className="g-phone">
        <div className="g-screen">
          <div className="g-island"></div>
          <StatusBar />
          {children}
        </div>
      </div>
      <div className="g-cap">{label}</div>
    </div>
  );
}
window.Phone = Phone;

// ===== Bottom nav =====
function BottomNav({ active }) {
  const tabs = [['home','◇','Klub'],['match','✦','Match'],['session','▦','Session'],['memory','♡','Memory'],['me','◉','Me']];
  return (
    <div className="mka-tabbar">
      {tabs.map(([k,ic,l]) => (
        <div key={k} className={'mka-tab' + (active === k ? ' active' : '')}>
          <div className="mka-tab-icon">{ic}</div>
          <div className="mka-tab-label">{l}</div>
        </div>
      ))}
    </div>
  );
}
window.BottomNav = BottomNav;

// ===== Splash =====
function ScreenSplash() {
  return (
    <div className="mka mka-splash">
      <div className="mka-splash-center">
        <div className="mka-splash-mark">MK</div>
        <div className="mka-splash-wordmark">
          <span className="scriptline">makers</span>
          <span className="klubline">KLUB</span>
        </div>
        <div className="mka-splash-tag">Berlin · Founders × Creatives</div>
      </div>
      <div className="mka-splash-foot">
        <div className="mka-dots"><span></span><span></span><span></span></div>
        <div className="mka-splash-version">v2.0 · founding members</div>
      </div>
    </div>
  );
}
window.ScreenSplash = ScreenSplash;

// ===== Home =====
function ScreenHome() {
  const matches = [
    ['T', AV.yellow, 'Tushar R.', 'Founder · Fintech', 'Looking for: Brand designer'],
    ['S', AV.violet, 'Sarah K.', 'Brand Designer', 'Open to: Founders, agencies'],
    ['J', AV.blue,   'Jana R.', 'UX Lead', 'Looking for: Product founders'],
    ['M', AV.navy,   'Maya L.', 'Motion Designer', 'Open to: All briefs'],
  ];
  return (
    <div className="mka">
      <div className="mka-scroll">
        <header className="mka-topbar">
          <h1>Klub</h1>
          <div className="mka-topbar-right">
            <button className="mka-iconbtn">⌕</button>
            <div className="mka-avatar-btn">A</div>
          </div>
        </header>
        <div className="mka-hero-card">
          <div className="mka-eyebrow">April Match · Group of 4</div>
          <h2 className="mka-hero-title">You're matched with <em>3 makers</em></h2>
          <p className="mka-hero-meta">Berlin Mitte · Sat 12 Apr · 10:00 – 14:00</p>
          <div className="mka-hero-stack">
            <div className="mka-av-sm" style={{ background: '#fcb813', color: '#0a1340' }}>T</div>
            <div className="mka-av-sm" style={{ background: '#7a4ed8' }}>S</div>
            <div className="mka-av-sm" style={{ background: '#3b6dd9' }}>J</div>
            <div className="mka-av-sm" style={{ background: '#a587f0', color: '#0a1340' }}>M</div>
          </div>
          <button className="mka-hero-cta">View Session →</button>
        </div>
        <div className="mka-section"><h3>Filter</h3></div>
        <div className="mka-chips">
          <div className="mka-chip active">All</div>
          <div className="mka-chip">Founders</div>
          <div className="mka-chip">Designers</div>
          <div className="mka-chip">Creators</div>
        </div>
        <div className="mka-section"><h3>Your group</h3><a href="#">See all</a></div>
        <div className="mka-list">
          {matches.map(([i, c, n, r, sub]) => (
            <div key={n} className="mka-row">
              <div className="mka-row-av" style={{ background: c[0], color: c[1] }}>{i}</div>
              <div className="mka-row-main">
                <div className="mka-row-name">{n} <span className="mka-chip-tag lavender">Match</span></div>
                <div className="mka-row-role">{r}<span className="dot"></span>{sub}</div>
              </div>
              <button className="mka-row-action">View</button>
            </div>
          ))}
        </div>
      </div>
      <BottomNav active="home" />
    </div>
  );
}
window.ScreenHome = ScreenHome;

// ===== Brief =====
function ScreenBrief() {
  const [sel, setSel] = React.useState('founder');
  const opts = [
    ['founder','◇','Founder / Business Owner',"I'm building a product and need creative talent"],
    ['designer','✶','Brand / UI Designer','I help businesses craft visual identity'],
    ['creator','◐','Content Creator','Photo, video, copy, motion'],
    ['producer','▦','Producer / Director','I lead creative work end-to-end'],
  ];
  return (
    <div className="mka">
      <div className="mka-scroll" style={{ paddingBottom: 120 }}>
        <header className="mka-topbar">
          <button className="mka-iconbtn">←</button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>2 of 5</span>
          <button className="mka-iconbtn" style={{ visibility: 'hidden' }}>×</button>
        </header>
        <div className="mka-progress">
          <div className="mka-progress-step done"></div>
          <div className="mka-progress-step active"></div>
          <div className="mka-progress-step"></div>
          <div className="mka-progress-step"></div>
          <div className="mka-progress-step"></div>
        </div>
        <div className="mka-step-label">Your brief · 02</div>
        <h2 className="mka-q">What best describes <em>you?</em></h2>
        <p className="mka-q-sub">We use this to match you with people who fit your brief.</p>
        <div className="mka-options">
          {opts.map(([k,icon,t,d]) => (
            <div key={k} className={'mka-option' + (sel===k?' selected':'')} onClick={()=>setSel(k)}>
              <div className="mka-option-icon">{icon}</div>
              <div className="mka-option-text">
                <div className="mka-option-title">{t}</div>
                <div className="mka-option-desc">{d}</div>
              </div>
              <div className="mka-option-check">✓</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mka-action-bar">
        <button className="mka-btn-secondary">Back</button>
        <button className="mka-btn-primary">Continue →</button>
      </div>
    </div>
  );
}
window.ScreenBrief = ScreenBrief;

// ===== Match reveal =====
function ScreenMatch() {
  const people = [
    ['T',AV.yellow,'Tushar R.','FOUNDER · FINTECH','Building B2B payments. Looking for a brand designer for v1 identity.'],
    ['S',AV.violet,'Sarah K.','BRAND DESIGNER','7 yrs across SaaS + lifestyle. Open to founders ready to commit.'],
    ['J',AV.blue,'Jana R.','FOUNDER · CLIMATE','Climate-tech hardware. Need help with product narrative + launch.'],
    ['M',AV.navy,'Maya L.','MOTION DESIGNER','After Effects + Cavalry. Product films that convert.'],
  ];
  return (
    <div className="mka">
      <div className="mka-scroll" style={{ paddingBottom: 120 }}>
        <header className="mka-topbar">
          <button className="mka-iconbtn">←</button>
          <button className="mka-iconbtn">⤴</button>
        </header>
        <div className="mka-reveal">
          <div className="mka-reveal-eyebrow">April · Match #04</div>
          <h2 className="mka-display">Meet your<br/><em>April group</em></h2>
          <p className="mka-body" style={{ marginTop: 10, padding: '0 8px' }}>Matched on your brief. 2 founders, 2 creatives — meeting Saturday.</p>
        </div>
        <div className="mka-reveal-cards">
          {people.map(([i,c,n,r,b]) => (
            <div key={n} className="mka-member-card">
              <div className="mka-row-av" style={{ background: c[0], color: c[1] }}>{i}</div>
              <div style={{ flex: 1 }}>
                <div className="role">{r}</div>
                <div className="name">{n}</div>
                <div className="bio">{b}</div>
              </div>
              <div className="mka-member-pulse"></div>
            </div>
          ))}
        </div>
      </div>
      <div className="mka-action-bar">
        <button className="mka-btn-primary">Confirm attendance →</button>
      </div>
    </div>
  );
}
window.ScreenMatch = ScreenMatch;

// ===== Session =====
function ScreenSession() {
  const agenda = [
    ['10:00','Welcome + briefs','Walk through what each person is working on. ~15 min each.', false],
    ['11:00','Heads-down co-work','Work on your own thing. Snacks + coffee.', true],
    ['12:30','Lunch (included)','Family-style lunch. No agenda.', false],
    ['13:30','Group debrief','Share what you got done. Trade contacts.', false],
  ];
  return (
    <div className="mka">
      <div className="mka-scroll" style={{ paddingBottom: 120 }}>
        <header className="mka-topbar">
          <button className="mka-iconbtn">←</button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 700 }}>Session</span>
          <button className="mka-iconbtn">⋯</button>
        </header>
        <div className="mka-session-hero">
          <div className="mka-eyebrow">Session #12</div>
          <h2>Monthly<br/>Co-Work</h2>
          <p>Berlin Mitte · Saturday, 12 April</p>
        </div>
        <div className="mka-info-grid">
          <div className="mka-info-tile"><div className="label">Time</div><div className="value">10:00–14:00</div></div>
          <div className="mka-info-tile"><div className="label">Location</div><div className="value">Mindspace<br/>Krausenstr. 9</div></div>
          <div className="mka-info-tile"><div className="label">Group</div><div className="value">4 people</div></div>
          <div className="mka-info-tile"><div className="label">Format</div><div className="value">Co-work<br/>+ lunch</div></div>
        </div>
        <div className="mka-section" style={{ marginTop: 12 }}><h3>Agenda</h3></div>
        <div className="mka-timeline">
          {agenda.map(([t,h,d,a]) => (
            <div key={t} className={'mka-timeline-row' + (a?' active':'')}>
              <div className="mka-timeline-time">{t}</div>
              <div className="mka-timeline-dot"></div>
              <div className="mka-timeline-content">
                <div className="mka-timeline-title">{h}</div>
                <div className="mka-timeline-desc">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mka-action-bar">
        <button className="mka-btn-secondary">Directions</button>
        <button className="mka-btn-primary">Open chat →</button>
      </div>
    </div>
  );
}
window.ScreenSession = ScreenSession;

// ===== Memory =====
function ScreenMemory() {
  const months = [
    ['March 2026', [
      ['T',AV.yellow,'Tushar R.','Founder · Fintech','Co-Work #11 · Mindspace Mitte',"He'd just shipped v0 of his payments dashboard — wanted feedback on onboarding flow. Promised to send the Figma file Monday.", true],
      ['S',AV.violet,'Sarah K.','Brand Designer','Co-Work #11 · Mindspace Mitte','Showed me her brand work for a Berlin coffee chain. Said: always start with the photography.', false],
    ]],
    ['February 2026', [
      ['L',AV.navy,'Lukas B.','Producer · Studio','Co-Work #10 · Factory Görli',"Runs a 4-person motion studio. Looking for a copywriter for an Adidas pitch. I said I might know someone.", true],
      ['N',AV.blue,'Nadia P.','UX Researcher','Co-Work #10 · Factory Görli','Just left N26. Building research-as-a-service for early-stage. Sent me her positioning doc — really sharp.', false],
    ]],
    ['January 2026', [
      ['K',AV.soft,'Karim D.','Copywriter','Co-Work #09 · St. Oberholz','Wrote launch copy for two YC companies. We argued about whether headlines should rhyme. Fun guy.', false],
    ]],
  ];
  return (
    <div className="mka">
      <div className="mka-scroll">
        <header className="mka-topbar">
          <h1>Memory</h1>
          <div className="mka-topbar-right">
            <button className="mka-iconbtn">⌕</button>
            <button className="mka-iconbtn">⇅</button>
          </div>
        </header>
        <div className="mka-stats">
          <div className="mka-stat"><div className="num">14</div><div className="lbl">Met</div></div>
          <div className="mka-stat"><div className="num">3</div><div className="lbl">Follow up</div></div>
          <div className="mka-stat"><div className="num">7</div><div className="lbl">Saved</div></div>
        </div>
        <div className="mka-chips">
          <div className="mka-chip active">All</div>
          <div className="mka-chip">Follow up</div>
          <div className="mka-chip">Saved</div>
          <div className="mka-chip">Founders</div>
        </div>
        {months.map(([month, ppl]) => (
          <React.Fragment key={month}>
            <div className="mka-month-label">{month}</div>
            {ppl.map(([i,c,n,r,where,note,flag]) => (
              <div key={n} className="mka-memory-card">
                <div className="mka-memory-head">
                  <div className="mka-row-av" style={{ background: c[0], color: c[1], borderRadius: '50%', width: 42, height: 42 }}>{i}</div>
                  <div style={{ flex: 1 }}>
                    <div className="mka-memory-name">{n}</div>
                    <div className="mka-memory-where">{r} · {where}</div>
                  </div>
                  {flag && <span className="mka-followup-flag">↻ Follow up</span>}
                </div>
                <div className="mka-memory-quote">{note}</div>
                <div className="mka-memory-meta">
                  <button className="mka-row-action">Message</button>
                  <button className="mka-row-action">Add note</button>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
      <BottomNav active="memory" />
    </div>
  );
}
window.ScreenMemory = ScreenMemory;

// ===== Profile / Settings =====
function ScreenProfile() {
  const [notif, setNotif] = React.useState(true);
  const [reminders, setReminders] = React.useState(true);
  return (
    <div className="mka">
      <div className="mka-scroll">
        <header className="mka-topbar">
          <h1>Profile</h1>
          <div className="mka-topbar-right">
            <button className="mka-iconbtn">⌕</button>
            <button className="mka-iconbtn">⚙</button>
          </div>
        </header>

        <div className="mka-profile-head">
          <div className="mka-profile-av">A</div>
          <div className="mka-profile-name">Alex Moreau</div>
          <div className="mka-profile-role">Founder · Productivity SaaS · Berlin</div>
          <div className="mka-profile-badge">✦ Founding member</div>
        </div>

        <div className="mka-stats">
          <div className="mka-stat"><div className="num">11</div><div className="lbl">Sessions</div></div>
          <div className="mka-stat"><div className="num">14</div><div className="lbl">Met</div></div>
          <div className="mka-stat"><div className="num">3</div><div className="lbl">Follow up</div></div>
        </div>

        <div className="mka-section"><h3>Your brief</h3><a href="#">Edit</a></div>
        <div className="mka-chips">
          <div className="mka-chip">Founder · Fintech</div>
          <div className="mka-chip">Looking for: Brand designer</div>
          <div className="mka-chip">Open to founders</div>
        </div>

        <div className="mka-section"><h3>Preferences</h3></div>
        <div className="mka-set-list">
          <div className="mka-set-row">
            <div className="mka-set-ic">◐</div>
            <div className="mka-set-main">
              <div className="mka-set-label">Match notifications</div>
              <div className="mka-set-sub">Alert me when my group drops</div>
            </div>
            <div className={'mka-toggle' + (notif ? ' on' : '')} onClick={() => setNotif(!notif)}></div>
          </div>
          <div className="mka-set-row">
            <div className="mka-set-ic">◷</div>
            <div className="mka-set-main">
              <div className="mka-set-label">Session reminders</div>
              <div className="mka-set-sub">Day-before + morning-of</div>
            </div>
            <div className={'mka-toggle' + (reminders ? ' on' : '')} onClick={() => setReminders(!reminders)}></div>
          </div>
        </div>

        <div className="mka-section"><h3>Account</h3></div>
        <div className="mka-set-list">
          <div className="mka-set-row">
            <div className="mka-set-ic">◇</div>
            <div className="mka-set-main"><div className="mka-set-label">Membership</div><div className="mka-set-sub">Founding · renews 12 Dec</div></div>
            <div className="mka-set-chev">›</div>
          </div>
          <div className="mka-set-row">
            <div className="mka-set-ic">☆</div>
            <div className="mka-set-main"><div className="mka-set-label">Appearance</div><div className="mka-set-sub">Light · Aurora Glass</div></div>
            <div className="mka-set-chev">›</div>
          </div>
          <div className="mka-set-row">
            <div className="mka-set-ic">⛉</div>
            <div className="mka-set-main"><div className="mka-set-label">Privacy &amp; data</div><div className="mka-set-sub">Who can see your brief</div></div>
            <div className="mka-set-chev">›</div>
          </div>
          <div className="mka-set-row danger">
            <div className="mka-set-ic">⏻</div>
            <div className="mka-set-main"><div className="mka-set-label">Sign out</div></div>
            <div className="mka-set-chev">›</div>
          </div>
        </div>
      </div>
      <BottomNav active="me" />
    </div>
  );
}
window.ScreenProfile = ScreenProfile;
