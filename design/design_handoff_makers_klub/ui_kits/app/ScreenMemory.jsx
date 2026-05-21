function ScreenMemory() {
  const months = [
    ['March 2026', [
      ['T','#f4a833','Tushar R.','Founder · Fintech','Co-Work #11 · Mindspace Mitte',"He'd just shipped v0 of his payments dashboard — wanted feedback on onboarding flow. Promised to send the Figma file Monday.", true],
      ['S','#cdbcf5','Sarah K.','Brand Designer','Co-Work #11 · Mindspace Mitte','Showed me her brand work for a Berlin coffee chain. Talked about how she scopes brand sprints. Said: always start with the photography.', false],
    ]],
    ['February 2026', [
      ['L','#0f1e3d','Lukas B.','Producer · Studio','Co-Work #10 · Factory Görli',"He runs a 4-person motion studio. Looking for a copywriter for an Adidas pitch. I said I might know someone.", true],
      ['N','#e89a1f','Nadia P.','UX Researcher','Co-Work #10 · Factory Görli','Just left N26. Building research-as-a-service for early-stage. Sent me her positioning doc — actually really sharp.', false],
    ]],
    ['January 2026', [
      ['K','#1a2a4f','Karim D.','Copywriter','Co-Work #09 · St. Oberholz','Wrote launch copy for two YC companies. We argued about whether headlines should rhyme. Fun guy.', false],
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
        {months.map(([month, people]) => (
          <React.Fragment key={month}>
            <div className="mka-month-label">{month}</div>
            {people.map(([i,c,n,r,where,note,flag]) => (
              <div key={n} className="mka-memory-card">
                <div className="mka-memory-head">
                  <div className="mka-row-av" style={{ background: c, color: c==='#cdbcf5'||c==='#f4a833'||c==='#e89a1f'?'#0f1e3d':'#fff', borderRadius: '50%', width: 40, height: 40 }}>{i}</div>
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
