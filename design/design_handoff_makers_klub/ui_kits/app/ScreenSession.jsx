function ScreenSession() {
  return (
    <div className="mka">
      <div className="mka-scroll">
        <header className="mka-topbar">
          <button className="mka-iconbtn">←</button>
          <span style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>Session</span>
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
          {[
            ['10:00','Welcome + briefs','Walk through what each person is working on. ~15 min each.', false],
            ['11:00','Heads-down co-work','Work on your own thing. Snacks + coffee.', true],
            ['12:30','Lunch (included)','Family-style lunch. No agenda.', false],
            ['13:30','Group debrief','Share what you got done. Trade contacts.', false],
          ].map(([t,h,d,a]) => (
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
