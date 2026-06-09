// Makers Klub — Aurora Glass · desktop web-app dashboard

function Desktop() {
  const group = [
    ['T', ['#fcb813','#0a1340'], 'Tushar R.', 'FOUNDER · FINTECH', 'Building B2B payments. Looking for a brand designer for v1 identity.'],
    ['S', ['#7a4ed8','#ffffff'], 'Sarah K.', 'BRAND DESIGNER', '7 yrs across SaaS + lifestyle. Open to founders ready to commit.'],
    ['J', ['#3b6dd9','#ffffff'], 'Jana R.', 'FOUNDER · CLIMATE', 'Climate-tech hardware. Need help with product narrative + launch.'],
    ['M', ['#0a1340','#ffffff'], 'Maya L.', 'MOTION DESIGNER', 'After Effects + Cavalry. Product films that convert.'],
  ];
  const followups = [
    ['T', ['#fcb813','#0a1340'], 'Tushar R.', 'Send the Figma onboarding file'],
    ['L', ['#0a1340','#ffffff'], 'Lukas B.', 'Intro him to a copywriter for Adidas'],
  ];
  const nav = [
    ['◇','Klub', true],['✦','Match', false],['▦','Session', false],['♡','Memory', false],['◉','Me', false],
  ];
  return (
    <div className="gd-window" data-screen-label="Desktop · Klub dashboard">
      <div className="gd-chrome">
        <div className="gd-lights"><span style={{background:'#ff5f57'}}></span><span style={{background:'#febc2e'}}></span><span style={{background:'#28c840'}}></span></div>
        <div className="gd-url">🔒 app.makersklub.de</div>
        <div style={{ width: 54 }}></div>
      </div>
      <div className="gd-screen">

        {/* Sidebar */}
        <aside className="gd-side">
          <div className="gd-brand">
            <div className="gd-logo"><div className="s">makers</div><div className="k">KLUB</div></div>
            <div>
              <div className="nm">Makers Klub</div>
              <div className="tg">Berlin</div>
            </div>
          </div>
          <nav className="gd-nav">
            <div className="gd-nav-label">Menu</div>
            {nav.map(([ic,l,a]) => (
              <div key={l} className={'gd-nav-item' + (a?' active':'')}><span className="ic">{ic}</span>{l}</div>
            ))}
          </nav>
          <div className="gd-side-foot">
            <div className="av">A</div>
            <div>
              <div className="nm">Alex M.</div>
              <div className="rl">Founding member</div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="gd-main">
          <div className="gd-topbar">
            <div className="gd-greeting">
              <h1>Good morning, <em>Alex</em></h1>
              <p>Your April group is matched — your co-work session is in 5 days.</p>
            </div>
            <div className="gd-topbar-right">
              <div className="gd-search">⌕ Search members…</div>
              <button className="gd-newbtn">+ New brief</button>
            </div>
          </div>

          <div className="gd-cols">
            <div>
              <div className="gd-hero">
                <div className="eyebrow">April Match · Group of 4</div>
                <h2>You're matched with <em>3 makers</em></h2>
                <div className="meta">Berlin Mitte · Saturday 12 April · 10:00 – 14:00</div>
                <div className="gd-hero-row">
                  <div className="gd-hero-stack">
                    <div className="av" style={{ background:'#fcb813', color:'#0a1340' }}>T</div>
                    <div className="av" style={{ background:'#7a4ed8' }}>S</div>
                    <div className="av" style={{ background:'#3b6dd9' }}>J</div>
                    <div className="av" style={{ background:'#a587f0', color:'#0a1340' }}>M</div>
                  </div>
                  <button className="gd-hero-cta">View session →</button>
                </div>
              </div>

              <div className="gd-sec-head"><h3>Your April group</h3><a href="#">See directory</a></div>
              <div className="gd-grid">
                {group.map(([i,c,n,r,b]) => (
                  <div key={n} className="gd-mcard">
                    <div className="gd-mcard-top">
                      <div className="gd-mcard-av" style={{ background:c[0], color:c[1] }}>{i}</div>
                      <div>
                        <div className="nm">{n}</div>
                        <div className="rl">{r}</div>
                      </div>
                    </div>
                    <div className="bio">{b}</div>
                    <div className="gd-mcard-foot">
                      <button className="primary">Message</button>
                      <button>View profile</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right rail */}
            <div className="gd-rail">
              <div className="gd-rail-card">
                <div className="rc-eyebrow">Upcoming · Session #12</div>
                <h4>Monthly Co-Work</h4>
                <div className="rc-sub">Saturday, 12 April · Berlin Mitte</div>
                <div className="gd-mini-grid">
                  <div className="gd-mini-tile"><div className="l">Time</div><div className="v">10:00–14:00</div></div>
                  <div className="gd-mini-tile"><div className="l">Group</div><div className="v">4 people</div></div>
                  <div className="gd-mini-tile"><div className="l">Where</div><div className="v">Mindspace</div></div>
                  <div className="gd-mini-tile"><div className="l">Format</div><div className="v">Co-work + lunch</div></div>
                </div>
                <button className="gd-rail-cta">Confirm attendance →</button>
              </div>

              <div className="gd-rail-card">
                <div className="rc-eyebrow" style={{ marginBottom: 14, display: 'block' }}>Follow-ups</div>
                <div className="gd-followups">
                  {followups.map(([i,c,n,nt]) => (
                    <div key={n} className="gd-fu">
                      <div className="av" style={{ background:c[0], color:c[1] }}>{i}</div>
                      <div>
                        <div className="nm">{n}</div>
                        <div className="nt">{nt}</div>
                      </div>
                      <div className="gd-fu-flag"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
window.Desktop = Desktop;
