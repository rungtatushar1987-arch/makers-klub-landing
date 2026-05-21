function ScreenHome() {
  const matches = [
    ['T', '#0f1e3d', 'Tushar R.', 'Founder · Fintech', 'Looking for: Brand designer'],
    ['S', '#cdbcf5', 'Sarah K.', 'Brand Designer', 'Open to: Founders, agencies'],
    ['J', '#f4a833', 'Jana R.', 'UX Lead', 'Looking for: Product founders'],
    ['M', '#1a2a4f', 'Maya L.', 'Motion Designer', 'Open to: All briefs'],
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
            <div className="mka-av-sm" style={{ background: '#f4a833', color: '#0f1e3d' }}>T</div>
            <div className="mka-av-sm" style={{ background: '#cdbcf5', color: '#0f1e3d' }}>S</div>
            <div className="mka-av-sm" style={{ background: '#fff', color: '#0f1e3d' }}>J</div>
            <div className="mka-av-sm" style={{ background: '#e89a1f', color: '#0f1e3d' }}>M</div>
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
              <div className="mka-row-av" style={{ background: c }}>{i}</div>
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
function BottomNav({ active }) {
  const tabs = [['home','◇','Klub'],['match','✦','Match'],['session','☷','Session'],['memory','♡','Memory'],['me','◉','Me']];
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
window.ScreenHome = ScreenHome;
window.BottomNav = BottomNav;
