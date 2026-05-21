function ScreenMatch() {
  return (
    <div className="mka">
      <div className="mka-scroll">
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
          {[
            ['T','#f4a833','Tushar R.','FOUNDER · FINTECH','Building B2B payments. Looking for a brand designer for v1 identity.'],
            ['S','#cdbcf5','Sarah K.','BRAND DESIGNER','7 yrs across SaaS + lifestyle. Open to founders ready to commit.'],
            ['J','#0f1e3d','Jana R.','FOUNDER · CLIMATE','Climate-tech hardware. Need help with product narrative + launch.'],
            ['M','#e89a1f','Maya L.','MOTION DESIGNER','After Effects + Cavalry. Product films that convert.'],
          ].map(([i,c,n,r,b]) => (
            <div key={n} className="mka-member-card">
              <div className="mka-row-av" style={{ background: c, color: c==='#cdbcf5'||c==='#f4a833'||c==='#e89a1f'?'#0f1e3d':'#fff' }}>{i}</div>
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
