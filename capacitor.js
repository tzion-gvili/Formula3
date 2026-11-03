'use strict';

(() => {
  const TARGET = 63.2;
  const COMBOS_EASY = [
    { R: '10kΩ', C: '100µF', tau: 1.0 },
    { R: '20kΩ', C: '100µF', tau: 2.0 },
    { R: '15kΩ', C: '100µF', tau: 1.5 },
    { R: '1kΩ', C: '1000µF', tau: 1.0 },
  ];
  const COMBOS_HARD = [
    { R: '47kΩ', C: '47µF', tau: 2.209 },
    { R: '220kΩ', C: '10µF', tau: 2.2 },
    { R: '33kΩ', C: '47µF', tau: 1.551 },
    { R: '100kΩ', C: '22µF', tau: 2.2 },
    { R: '68kΩ', C: '22µF', tau: 1.496 },
  ];
  const BOMBS = [
    { R: '10kΩ', tau: 2.2, ok: '220µF', wrong: ['22µF', '2200µF', '100µF'] },
    { R: '1kΩ', tau: 0.47, ok: '470µF', wrong: ['47µF', '4700µF', '220µF'] },
    { R: '100kΩ', tau: 1, ok: '10µF', wrong: ['1µF', '100µF', '22µF'] },
    { R: '47kΩ', tau: 4.7, ok: '100µF', wrong: ['10µF', '47µF', '1000µF'] },
  ];

  const CFG = [
    { mode: 'visible', taus: [1.2, 1.2, 1.2] },
    { mode: 'visible', taus: [0.7, 0.9, 0.6] },
    { mode: 'hidden', combos: COMBOS_EASY },
    { mode: 'hidden', combos: COMBOS_HARD },
    { mode: 'bomb' },
  ];

  function chartSVG(points, tau, showCurve, stopT) {
    const W = 420, H = 220, P = 30;
    const tMax = 5 * tau;
    const X = (t) => P + ((W - P * 2) * t) / tMax;
    const Y = (pct) => H - P - ((H - P * 2) * pct) / 100;
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}">
      <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="#6b73a8" stroke-width="2"/>
      <line x1="${P}" y1="${P}" x2="${P}" y2="${H - P}" stroke="#6b73a8" stroke-width="2"/>
      <line x1="${P}" y1="${Y(TARGET)}" x2="${W - P}" y2="${Y(TARGET)}" stroke="#ffd166" stroke-dasharray="6 5" stroke-width="2"/>
      <text x="${W - P}" y="${Y(TARGET) - 6}" text-anchor="end" fill="#ffd166" font-size="13" font-weight="700">63%</text>
      ${[1, 2, 3, 4, 5].map((k) => `<text x="${X(k * tau)}" y="${H - P + 18}" text-anchor="middle" fill="#aab2e0" font-size="12">${k}τ</text>`).join('')}
      ${showCurve ? `<path d="${path}" stroke="#4cc9f0" stroke-width="4" fill="none" stroke-linecap="round"/>` : ''}
      ${stopT != null ? `<line x1="${X(stopT)}" y1="${P}" x2="${X(stopT)}" y2="${H - P}" stroke="#ff5c7a" stroke-width="3"/>
        <line x1="${X(tau)}" y1="${P}" x2="${X(tau)}" y2="${H - P}" stroke="#2ee59d" stroke-width="2" stroke-dasharray="4 4"/>` : ''}
    </svg>`;
  }

  Games.register({
    id: 'capacitor',
    cat: 'analog',
    icon: '🔋',
    title: 'טעינת קבל',
    desc: 'לחצו בדיוק כשהקבל נטען ל-63%. ובסוף – נטרלו פצצה עם הקבל הנכון!',
    long: 'קבל הוא כמו דלי קטן שמתמלא בחשמל. בהתחלה הוא מתמלא מהר, ואחר כך לאט. הזמן שלוקח לו להגיע ל-<b>63%</b> נקרא <b>קבוע הזמן τ</b> (טאו), והוא שווה ל-<b class="ltr">R × C</b>. נסו לעצור בדיוק בזמן!',
    levels: CFG.length,
    play(stage, lvl, api) {
      const cfg = CFG[lvl];
      if (cfg.mode === 'bomb') return playBomb(stage, api);

      const items = cfg.mode === 'visible'
        ? cfg.taus.map((tau) => ({ tau }))
        : U.shuffle(cfg.combos).slice(0, 3);
      const ROUNDS = items.length;
      let round = 0;
      let mistakes = 0;
      const errors = [];
      let raf = 0;
      let state = 'idle';
      let t0 = 0;
      let points = [];

      api.hint(cfg.mode === 'visible'
        ? 'לחצו "התחילו טעינה", ואז "עצרו!" בדיוק כשהמילוי מגיע לקו הצהוב (63%).'
        : 'המד מוסתר! 🙈 חשבו <b class="ltr">τ = R × C</b> ועצרו כשהשעון מגיע ל-τ שניות.<br><small>טיפ: <span class="ltr">1kΩ × 1000µF = 1 s</span>, <span class="ltr">10kΩ × 100µF = 1 s</span></small>');

      function draw() {
        const it = items[round];
        const hidden = cfg.mode === 'hidden';
        stage.innerHTML = `
          ${hidden ? `<div class="cap-info">נגד <b class="ltr">R = ${it.R}</b> · קבל <b class="ltr">C = ${it.C}</b> · עצרו ב-τ!</div>` : ''}
          <div class="cap-layout">
            <div>
              <div class="svg-wrap" id="kChart">${chartSVG([], it.tau, !hidden, null)}</div>
              <div class="cap-timer" id="kTimer">${hidden ? '0.00 s' : '0%'}</div>
            </div>
            <div class="cap-meter">
              <div class="cap-fill" id="kFill"></div>
              <div class="cap-mark"><span>63%</span></div>
              ${hidden ? '<div class="cap-cover" id="kCover">❓</div>' : ''}
            </div>
          </div>
          <div class="row mt"><button class="btn big" id="kBtn">⚡ התחילו טעינה</button></div>`;
        stage.querySelector('#kBtn').onclick = press;
      }

      function frame() {
        if (!api.alive() || state !== 'charging') return;
        const it = items[round];
        const t = (performance.now() - t0) / 1000;
        const pct = 100 * (1 - Math.exp(-t / it.tau));
        points.push([t, pct]);
        stage.querySelector('#kFill').style.height = pct + '%';
        stage.querySelector('#kTimer').textContent = cfg.mode === 'hidden' ? t.toFixed(2) + ' s' : Math.round(pct) + '%';
        if (cfg.mode === 'visible') stage.querySelector('#kChart').innerHTML = chartSVG(points, it.tau, true, null);
        if (t > 5 * it.tau) { stop(t, pct, true); return; }
        raf = requestAnimationFrame(frame);
      }

      function press() {
        const btn = stage.querySelector('#kBtn');
        if (state === 'idle') {
          state = 'charging';
          t0 = performance.now();
          points = [[0, 0]];
          btn.textContent = '✋ עצרו!';
          btn.classList.add('good');
          Sound.pop();
          raf = requestAnimationFrame(frame);
        } else if (state === 'charging') {
          const t = (performance.now() - t0) / 1000;
          stop(t, 100 * (1 - Math.exp(-t / items[round].tau)), false);
        }
      }

      function stop(t, pct, missed) {
        state = 'done';
        cancelAnimationFrame(raf);
        const it = items[round];
        const cover = stage.querySelector('#kCover');
        if (cover) cover.remove();
        stage.querySelector('#kChart').innerHTML = chartSVG(points, it.tau, true, t);
        stage.querySelector('#kTimer').textContent = `${Math.round(pct)}%  ·  ${t.toFixed(2)}s`;
        const err = Math.abs(pct - TARGET);
        const btn = stage.querySelector('#kBtn');
        if (!missed && err <= 8) {
          errors.push(err);
          api.good(err < 2 ? `וואו! ${pct.toFixed(1)}% – כמעט מושלם!` : `${pct.toFixed(1)}% – קרוב מאוד!`, stage.querySelector('.cap-meter'));
          round++;
          if (round >= ROUNDS) {
            api.rounds(round, ROUNDS);
            const avg = errors.reduce((a, b) => a + b, 0) / errors.length;
            const base = avg <= 3 ? 3 : avg <= 5.5 ? 2 : 1;
            api.win(base - (mistakes > 1 ? 1 : 0), `הסטייה הממוצעת שלכם: ${avg.toFixed(1)}%`);
            btn.remove();
          } else {
            btn.textContent = 'לסיבוב הבא ◀';
            btn.classList.remove('good');
            btn.onclick = () => { Sound.click(); state = 'idle'; api.rounds(round, ROUNDS); draw(); };
          }
        } else {
          mistakes++;
          api.bad(missed ? 'פספסתם – הקבל כבר מלא!' : pct < TARGET ? `${pct.toFixed(0)}% – מוקדם מדי` : `${pct.toFixed(0)}% – מאוחר מדי`, stage.querySelector('.cap-meter'));
          btn.textContent = 'נסו שוב 🔁';
          btn.classList.remove('good');
          btn.onclick = () => { Sound.click(); state = 'idle'; draw(); };
        }
      }

      api.rounds(0, ROUNDS);
      draw();
      return () => cancelAnimationFrame(raf);
    },
  });

  function playBomb(stage, api) {
    const list = U.shuffle(BOMBS);
    let round = 0;
    let mistakes = 0;
    let busy = false;
    let raf = 0;
    api.hint('הפצצה 💣 מתנטרלת רק אם קבוע הזמן <b class="ltr">τ = R × C</b> מדויק. בחרו את הקבל הנכון!');

    function draw() {
      busy = false;
      api.rounds(round, list.length);
      const b = list[round];
      const opts = U.shuffle([b.ok, ...b.wrong]);
      stage.innerHTML = `
        <div class="fade-in">
          <div class="bomb tick" id="kBomb">💣</div>
          <div class="cap-info">צריך השהיה של <b>${b.tau} שניות</b>. הנגד הוא <b class="ltr">R = ${b.R}</b>.<br>איזה קבל C לבחור?</div>
          <div class="bar" style="max-width:420px;margin:0 auto;height:14px"><i id="kFuse" style="width:0%"></i></div>
          <div class="opt-grid">${opts.map((o) => `<button class="answer" data-o="${o}">${o}</button>`).join('')}</div>
        </div>`;
      stage.querySelector('.opt-grid').onclick = (e) => {
        const btn = e.target.closest('.answer');
        if (!btn || busy || btn.disabled) return;
        if (btn.dataset.o === b.ok) {
          busy = true;
          btn.classList.add('right');
          const start = performance.now();
          const dur = Math.min(2500, b.tau * 1000);
          const fuse = stage.querySelector('#kFuse');
          const anim = () => {
            if (!api.alive()) return;
            const k = Math.min(1, (performance.now() - start) / dur);
            fuse.style.width = k * 100 + '%';
            if (k < 1) { raf = requestAnimationFrame(anim); return; }
            const bomb = stage.querySelector('#kBomb');
            bomb.classList.remove('tick');
            bomb.textContent = '✂️✅';
            api.good('הפצצה נוטרלה!', bomb);
            round++;
            if (round >= list.length) {
              api.rounds(round, list.length);
              api.win(U.starsByMistakes(mistakes), 'נטרלתם את כל הפצצות בעזרת הקבלים!');
            } else setTimeout(() => { if (api.alive()) draw(); }, 1200);
          };
          raf = requestAnimationFrame(anim);
        } else {
          mistakes++;
          btn.classList.add('wrong');
          btn.disabled = true;
          Sound.boom();
          FX.shake(stage.querySelector('#kBomb'));
          FX.toast(`💥 בום! ${b.R} × ${btn.dataset.o} זה לא ${b.tau} שניות`, 'bad');
        }
      };
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }
})();
