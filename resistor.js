'use strict';

(() => {
  const COLORS = [
    { n: 'שחור', c: '#1b1b1b' },
    { n: 'חום', c: '#7b3f00' },
    { n: 'אדום', c: '#e53935' },
    { n: 'כתום', c: '#fb8c00' },
    { n: 'צהוב', c: '#fdd835' },
    { n: 'ירוק', c: '#43a047' },
    { n: 'כחול', c: '#1e88e5' },
    { n: 'סגול', c: '#8e24aa' },
    { n: 'אפור', c: '#9e9e9e' },
    { n: 'לבן', c: '#fafafa' },
  ];
  const GOLD = '#d4af37';
  const BAND_X = [95, 127, 159];

  const CFG = [
    { mode: 'read', maxMult: 2, legend: true, rounds: 5 },
    { mode: 'read', maxMult: 4, legend: false, rounds: 5 },
    { mode: 'paint', maxMult: 3, legend: true, rounds: 4 },
    { mode: 'paint', maxMult: 5, legend: false, rounds: 4 },
    { mode: 'mix', maxMult: 6, legend: false, rounds: 6 },
  ];

  const val = (b) => (b[0] * 10 + b[1]) * 10 ** b[2];

  function resistorSVG(bands, { selected = -1, clickable = false } = {}) {
    return `<svg viewBox="0 0 300 90">
      <line x1="0" y1="45" x2="300" y2="45" stroke="#c0c4d6" stroke-width="6"/>
      <rect x="60" y="14" width="180" height="62" rx="28" fill="#e8cfa0" stroke="#b89a66" stroke-width="2"/>
      <rect x="60" y="14" width="180" height="20" rx="10" fill="#fff" opacity=".18"/>
      ${bands.map((b, i) => `<rect class="res-band ${i === selected ? 'sel' : ''}" data-b="${i}" x="${BAND_X[i]}" y="14" width="18" height="62"
          fill="${b == null ? 'url(#hatch)' : COLORS[b].c}" ${clickable ? '' : 'style="cursor:default"'}/>`).join('')}
      <rect x="205" y="14" width="14" height="62" fill="${GOLD}"/>
      <defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="8" height="8" fill="#bbb"/><rect width="4" height="8" fill="#888"/></pattern></defs>
    </svg>`;
  }

  function legendHTML() {
    return `<div class="legend">${COLORS.map((c, i) => `<div><i style="background:${c.c}"></i>${i} ${c.n}</div>`).join('')}</div>
      <p style="margin:10px 0 0">פס 1 = ספרה ראשונה · פס 2 = ספרה שנייה · פס 3 = כמה אפסים להוסיף · זהב = דיוק ±5%</p>`;
  }

  function randomBands(maxMult) {
    return [U.rand(1, 9), U.rand(0, 9), U.rand(0, maxMult)];
  }

  function wrongOptions(b) {
    const right = val(b);
    const set = new Set([right]);
    const tries = [
      [b[0], b[1], b[2] + 1], [b[0], b[1], b[2] - 1], [b[1], b[0], b[2]],
      [b[0], (b[1] + 1) % 10, b[2]], [(b[0] % 9) + 1, b[1], b[2]], [b[0], b[1], b[2] + 2],
    ];
    for (const t of U.shuffle(tries)) {
      if (set.size >= 4) break;
      if (t[0] < 1 || t[2] < 0) continue;
      set.add(val(t));
    }
    while (set.size < 4) set.add(val(randomBands(6)));
    return U.shuffle([...set]);
  }

  Games.register({
    id: 'resistor',
    cat: 'basics',
    icon: '🌈',
    title: 'פיצוח קוד הנגדים',
    desc: 'כל צבע על הנגד הוא ספרה. פענחו את הערך – או צבעו נגד בעצמכם!',
    long: 'נגדים קטנים מדי בשביל לכתוב עליהם מספרים, אז צובעים עליהם <b>פסים</b>. כל צבע הוא ספרה: שחור=0, חום=1, אדום=2... שני הפסים הראשונים הם ספרות, והשלישי אומר כמה אפסים להוסיף. למשל <b>צהוב-סגול-אדום</b> = 4, 7 ועוד 2 אפסים = <span class="ltr">4700Ω = 4.7kΩ</span>.',
    levels: CFG.length,
    play(stage, lvl, api) {
      const cfg = CFG[lvl];
      let round = 0;
      let mistakes = 0;
      let busy = false;

      api.hint(cfg.mode === 'paint'
        ? 'לחצו על פס בנגד, ואז בחרו לו צבע מהפלטה למטה.'
        : cfg.mode === 'read' ? 'הסתכלו על 3 הפסים ובחרו את הערך הנכון.' : 'שלב מעורב: פעם קוראים ופעם צובעים!');

      function next() {
        busy = false;
        api.rounds(round, cfg.rounds);
        const mode = cfg.mode === 'mix' ? (round % 2 ? 'paint' : 'read') : cfg.mode;
        const target = randomBands(cfg.maxMult);
        if (mode === 'read') drawRead(target); else drawPaint(target);
      }

      const help = () => `<details class="help" ${cfg.legend ? 'open' : ''}><summary>📖 טבלת הצבעים</summary>${legendHTML()}</details>`;

      function drawRead(target) {
        const opts = wrongOptions(target);
        stage.innerHTML = `
          <div class="fade-in">
            <div class="res-wrap svg-wrap" id="rSvg">${resistorSVG(target)}</div>
            <div class="quiz-q">מה הערך של הנגד?</div>
            <div class="answers">${opts.map((o) => `<button class="answer" data-v="${o}">${U.fmtOhm(o)}</button>`).join('')}</div>
            ${help()}
          </div>`;
        stage.querySelector('.answers').onclick = (e) => {
          const b = e.target.closest('.answer');
          if (!b || busy || b.disabled) return;
          if (+b.dataset.v === val(target)) {
            b.classList.add('right');
            success(target, b);
          } else {
            mistakes++;
            b.classList.add('wrong');
            b.disabled = true;
            api.bad(`${COLORS[target[0]].n}=${target[0]}, ${COLORS[target[1]].n}=${target[1]}...`, b);
          }
        };
      }

      function drawPaint(target) {
        const bands = [null, null, null];
        let sel = 0;
        stage.innerHTML = `
          <div class="fade-in">
            <div class="center">צבעו נגד של:</div>
            <div class="res-target">${U.fmtOhm(val(target))}</div>
            <div class="res-wrap svg-wrap" id="rSvg"></div>
            <div class="palette" id="rPal">${COLORS.map((c, i) => `<button class="swatch" data-c="${i}"><i style="background:${c.c}"></i>${i} ${c.n}</button>`).join('')}</div>
            <div class="row mt"><button class="btn big" id="rCheck">בדיקה ✔</button></div>
            ${help()}
          </div>`;
        const svgBox = stage.querySelector('#rSvg');
        const paint = () => { svgBox.innerHTML = resistorSVG(bands, { selected: sel, clickable: true }); };
        paint();
        svgBox.onclick = (e) => {
          const b = e.target.closest('.res-band');
          if (!b || busy) return;
          sel = +b.dataset.b;
          Sound.click();
          paint();
        };
        stage.querySelector('#rPal').onclick = (e) => {
          const s = e.target.closest('.swatch');
          if (!s || busy) return;
          bands[sel] = +s.dataset.c;
          Sound.toggle(true);
          sel = Math.min(2, sel + 1);
          paint();
        };
        stage.querySelector('#rCheck').onclick = () => {
          if (busy) return;
          if (bands.includes(null)) { api.bad('צבעו את כל 3 הפסים', svgBox); return; }
          if (bands[0] === 0) { mistakes++; api.bad('הפס הראשון לא יכול להיות שחור (0)', svgBox); return; }
          if (val(bands) === val(target)) success(target, svgBox);
          else {
            mistakes++;
            api.bad(`הצבעים שלכם = ${U.fmtOhm(val(bands))}`, svgBox);
          }
        };
      }

      function success(target, el) {
        busy = true;
        api.good(`${COLORS[target[0]].n}-${COLORS[target[1]].n}-${COLORS[target[2]].n} = ${U.fmtOhm(val(target))}`, el);
        round++;
        if (round >= cfg.rounds) {
          api.rounds(round, cfg.rounds);
          api.win(U.starsByMistakes(mistakes), 'פיצחתם את קוד הצבעים!');
        } else {
          setTimeout(() => { if (api.alive()) next(); }, 1300);
        }
      }

      next();
    },
  });
})();
