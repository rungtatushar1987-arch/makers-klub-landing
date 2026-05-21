// ===== Splash Screen =====
// First thing members see when the app launches.
// Cream surface, oversized navy wordmark with italic lavender "Klub" accent,
// hand illustration peeks from corners, ochre dot-pulse loader anchors the bottom.

function ScreenSplash() {
  return (
    <div className="mka mka-splash">
      {/* Hand decorations — pen + pointing, rotated and clipped to corners */}
      <img src="../../assets/hand-pen.svg" className="mka-splash-hand-tl" alt=""/>
      <img src="../../assets/hand-pointing.svg" className="mka-splash-hand-br" alt=""/>

      <div className="mka-splash-center">
        <div className="mka-splash-mark">MK</div>
        <div className="mka-splash-wordmark">
          <span>Makers</span>
          <span className="mk-italic-accent">Klub</span>
        </div>
        <div className="mka-splash-tag">Berlin · Founders × Creatives</div>
      </div>

      <div className="mka-splash-foot">
        <div className="mka-dots">
          <span></span><span></span><span></span>
        </div>
        <div className="mka-splash-version">v1.0 · founding members</div>
      </div>
    </div>
  );
}
window.ScreenSplash = ScreenSplash;


// ===== Loader Variants =====
// Three loaders, each tied to a different async moment in the app.
// They live alongside the splash for the design review.

// 1. Dot-pulse — generic, inline. Used at bottom of splash and for fast loads.
function LoaderDots() {
  return (
    <div className="mka-loader-frame">
      <div className="mka-loader-label">Loading</div>
      <div className="mka-dots large"><span></span><span></span><span></span></div>
      <div className="mka-loader-caption">For any background fetch under 1s</div>
    </div>
  );
}

// 2. Match-shuffle — thematic, for the once-a-month match reveal.
//    Four colored chips swap positions on a 1.6s loop suggesting "matching".
function LoaderMatch() {
  return (
    <div className="mka-loader-frame">
      <div className="mka-loader-label">Matching you</div>
      <div className="mka-match-loader">
        <div className="mka-match-chip a" style={{ background: '#f4a833' }}>T</div>
        <div className="mka-match-chip b" style={{ background: '#cdbcf5' }}>S</div>
        <div className="mka-match-chip c" style={{ background: '#0f1e3d', color: '#fff' }}>J</div>
        <div className="mka-match-chip d" style={{ background: '#e89a1f' }}>M</div>
      </div>
      <div className="mka-loader-caption">For the monthly match reveal — themed, &lt;3s</div>
    </div>
  );
}

// 3. Skeleton row — for the home feed while jobs / members load.
function LoaderSkeleton() {
  return (
    <div className="mka-loader-frame">
      <div className="mka-loader-label">Skeleton</div>
      <div className="mka-skel-list">
        {[0,1,2].map(i => (
          <div key={i} className="mka-skel-row">
            <div className="mka-skel-av"></div>
            <div className="mka-skel-lines">
              <div className="mka-skel-line w70"></div>
              <div className="mka-skel-line w40"></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mka-loader-caption">For the directory + memory feeds</div>
    </div>
  );
}

window.LoaderDots = LoaderDots;
window.LoaderMatch = LoaderMatch;
window.LoaderSkeleton = LoaderSkeleton;
