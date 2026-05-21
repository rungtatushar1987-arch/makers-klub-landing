function ScreenBrief() {
  const [sel, setSel] = React.useState('founder');
  const opts = [
    ['founder','◇','Founder / Business Owner',"I'm building a product and need creative talent"],
    ['designer','✶','Brand / UI Designer','I help businesses craft visual identity'],
    ['creator','◐','Content Creator','Photo, video, copy, motion'],
    ['producer','☷','Producer / Director','I lead creative work end-to-end'],
  ];
  return (
    <div className="mka">
      <div className="mka-scroll">
        <header className="mka-topbar">
          <button className="mka-iconbtn">←</button>
          <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 600 }}>2 of 5</span>
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
