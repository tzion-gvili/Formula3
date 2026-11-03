'use strict';

(() => {
  // m = which knob the player turns. Range = safe current window in mA.
  const LEVELS = [
    { rounds: [{ m: 'R', V: 9 }, { m: 'R', V: 6 }], range: [15, 25] },
    { rounds: [{ m: 'R', V: 5 }, { m: 'R', V: 12 }, { m: 'R', V: 3.3 }], range: [18, 22] },
    { rounds: [{ m: 'V', R: 220 }, { m: 'V', R: 470 }, { m: 'V', R: 150 }], range: [18, 22] },
    { rounds: [{ m: 'R', V: 24 }, { m: 'V', R: 330 }, { m: 'R', V: 4.5 }], range: [9, 11] },
    { rounds: [{ m: 'R', V: 15 }, { m: 'V', R: 680 }, { m: 'R', V: 7.5 }, { m: 'V', R: 1000 }], range: [4.5, 5.5] },
  ];
  const R_MIN = 10, R_MAX = 4000, V_MAX = 24;

  function circuit(V, R, bright, burnt) {
    const glow = U.clamp(bright, 0, 1.3);
    return `<svg viewBox="0 0 600 300">
      <defs>
        <radialGradient id="bulbGlow"><stop offset="0" stop-color="#fff6c2"/><stop offset=".4" stop-color="#ffd166" stop-opacity=".9"/><stop offset="1" stop-color="#ffb703" stop-opacity="0"/></radialGradient>
      </defs>
      <path d="M90,60 H260 M340,60 H470 M470,240 H90 M90,60 V120 M90,180 V240 M470,60 V110 M470,190 V240"
            stroke="${bright > 0 && !burnt ? '#ffd166' : '#6b73a8'}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <!-- battery -->
      <line x1="60" y1="120" x2="120" y2="120" stroke="#fff" stroke-width="6"/>
      <line x1="75" y1="138" x2="105" y2="138" stroke="#fff" stroke-width="6"/>
      <line x1="60" y1="156" x2="120" y2="156" stroke="#fff" stroke-width="6"/>
      <line x1="75" y1="174" x2="105" y2="174" stroke="#fff" stroke-width="6"/>
      <line x1="90" y1="174" x2="90" y2="180" stroke="#6b73a8" stroke-width="6"/>
      <text x="40" y="128" font-size="22" fill="#ffd166" font-weight="900">+</text>
      <text x="150" y="155" font-size="26" fill="#7dffc8" font-weight="900">${U.trim(V, 1)}V</text>
      <!-- resistor -->
      <path d="M260,60 l5,-14 l10,28 l10,-28 l10,28 l10,-28 l10,28 l10,-28 l5,14" stroke="#ff9f1c" stroke-width="6" fill="none" stroke-linejoin="round"/>
      <text x="300" y="115" text-anchor="middle" font-size="26" fill="#ff9f1c" font-weight="900">${Math.round(R)}Ω</text>
      <!-- bulb -->
      <circle cx="470" cy="150" r="${40 + glow * 50}" fill="url(#bulbGlow)" opacity="${burnt ? 0 : glow}"/>
      <circle cx="470" cy="150" r="42" fill="${burnt ? '#3a3a3a' : bright > 0 ? `rgba(255,209,102,${0.25 + glow * 0.6})` : '#2a2f5c'}" stroke="#fff" stroke-width="4"/>
      <path d="M445,125 L495,175 M495,125 L445,175" stroke="${burnt ? '#111' : '#fff'}" stroke-width="4" opacity=".8"/>
      ${burnt ? '<text x="470" y="100" text-anchor="middle" font-size="40" class="smoke">💨</text><text x="470" y="164" text-anchor="middle" font-size="36">💥</text>' : ''}
      <text x="540" y="157" font-size="20" fill="#aab2e0" font-weight="700">LED</text>
    </svg>`;
  }

  Games.register({
    id: 'ohm',
    cat: 'basics',
    icon: '🎚️',
    title: 'מכוונן חוק אוהם',
    desc: 'הזיזו את הסליידר כך שהנורה לא תישרף ולא תהיה חלשה מדי.',
    long: 'חוק אוהם אומר: <b class="ltr">I = V ÷ R</b>. כלומר הזרם (I) שווה למתח (V) חלקי ההתנגדות (R). אם הזרם גדול מדי – הנורה נשרפת 💥. אם הוא קטן מדי – היא חלשה. המחשב ישנה ערכים, ואתם תכוונו את השני!',
    levels: LEVELS.length,
    play(stage, lvl, api) {
      const L = LEVELS[lvl];
      const [lo, hi] = L.range;
      const mid = (lo + hi) / 2;
      let round = 0;
      let mistakes = 0;
      let V = 0, R = 0;
      let busy = false;

      function startRound(announce) {
        busy = false;
        const r = L.rounds[round];
        api.rounds(round, L.rounds.length);
        if (r.m === 'R') {
          V = r.V;
          R = U.pick([20, 30, 3800]);
        } else {
          R = r.R;
          V = U.pick([0.5, 22]);
        }
        if (announce) api.info(`⚡ המחשב שינה את ${r.m === 'R' ? `המתח ל-${r.V}V` : `ההתנגדות ל-${r.R}Ω`}! כוונו מחדש`);
        api.hint(lvl === 0
          ? `הנורה צריכה זרם בין <b>${lo}</b> ל-<b>${hi}</b> מיליאמפר (mA). נסו: <b class="ltr">R = V ÷ I</b>. למשל <span class="ltr">9V ÷ 0.02A = 450Ω</span>`
          : `הנורה צריכה זרם בין <b>${lo}</b> ל-<b>${hi}</b> mA. ${r.m === 'R' ? 'כוונו את <b>ההתנגדות</b>.' : 'הפעם כוונו את <b>המתח</b>!'}`);
        draw();
      }

      function draw(result) {
        const r = L.rounds[round];
        const I = (V / R) * 1000;
        const shown = result ? result.I : null;
        const bright = result ? (result.burnt ? 0 : I / mid) : 0;
        stage.innerHTML = `
          <div class="svg-wrap" id="oSvg">${circuit(V, R, bright, result && result.burnt)}</div>
          <div class="readouts">
            <div class="readout"><small>מתח V</small>${U.trim(V, 1)} V</div>
            <div class="readout"><small>התנגדות R</small>${Math.round(R)} Ω</div>
            <div class="readout"><small>זרם I</small>${shown == null ? '? mA' : U.trim(shown, 1) + ' mA'}</div>
            <div class="readout" style="color:#ffd166"><small>יעד</small>${lo}–${hi} mA</div>
          </div>
          <div class="ohm-controls">
            <div class="slider-row">
              <label>${r.m === 'R' ? 'התנגדות R' : 'מתח V'}</label>
              <input type="range" id="oKnob" ${r.m === 'R'
                ? `min="${R_MIN}" max="${R_MAX}" step="10" value="${R}"`
                : `min="0" max="${V_MAX}" step="0.1" value="${V}"`}>
              <output id="oOut">${r.m === 'R' ? Math.round(R) + 'Ω' : U.trim(V, 1) + 'V'}</output>
            </div>
            <div class="row"><button class="btn big" id="oTest">הדליקו! 💡</button></div>
          </div>`;

        const knob = stage.querySelector('#oKnob');
        let lastTick = 0;
        knob.oninput = () => {
          if (r.m === 'R') R = +knob.value; else V = +knob.value;
          stage.querySelector('#oOut').textContent = r.m === 'R' ? Math.round(R) + 'Ω' : U.trim(V, 1) + 'V';
          const now = performance.now();
          if (now - lastTick > 60) { Sound.tick(); lastTick = now; }
        };
        knob.onchange = () => draw();
        stage.querySelector('#oTest').onclick = test;
      }

      function test() {
        if (busy) return;
        const I = (V / R) * 1000;
        const svgEl = () => stage.querySelector('#oSvg');
        if (I > hi) {
          mistakes++;
          busy = true;
          draw({ I, burnt: true });
          Sound.burn();
          FX.shake(svgEl());
          FX.toast(`💥 נשרפה! ${U.trim(I, 1)}mA זה יותר מדי. ${L.rounds[round].m === 'R' ? 'הגדילו את ההתנגדות' : 'הקטינו את המתח'}`, 'bad');
          setTimeout(() => { if (api.alive()) { busy = false; draw(); api.info('🔧 הכנסנו נורה חדשה'); } }, 1700);
        } else if (I < lo) {
          mistakes++;
          draw({ I });
          api.bad(`חלש מדי – רק ${U.trim(I, 1)}mA. ${L.rounds[round].m === 'R' ? 'הקטינו את ההתנגדות' : 'הגדילו את המתח'}`, svgEl());
        } else {
          busy = true;
          draw({ I });
          api.good(`בול! ${U.trim(I, 1)}mA – הנורה מאירה יפה`, svgEl());
          round++;
          if (round >= L.rounds.length) {
            api.rounds(round, L.rounds.length);
            api.win(U.starsByMistakes(mistakes), 'אתם שולטים בחוק אוהם!');
          } else {
            setTimeout(() => { if (api.alive()) startRound(true); }, 1500);
          }
        }
      }

      startRound(false);
    },
  });
})();
