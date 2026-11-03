'use strict';

(() => {
  const DIGITS = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  const LETTERS = { A: 'abcefg', b: 'cdefg', C: 'adef', d: 'bcdeg', E: 'adefg', F: 'aefg', H: 'bcefg', L: 'def', P: 'abefg', U: 'bcdef' };
  const ALL = { ...DIGITS, ...LETTERS };
  const SEGS = 'abcdefg'.split('');
  // [cx, cy, length, horizontal]
  const GEOM = { a: [70, 20, 70, 1], b: [112, 62, 72, 0], c: [112, 148, 72, 0], d: [70, 190, 70, 1], e: [28, 148, 72, 0], f: [28, 62, 72, 0], g: [70, 105, 70, 1] };

  function poly(cx, cy, len, horiz) {
    const t = 7, h = len / 2;
    const pts = horiz
      ? [[cx - h, cy], [cx - h + t, cy - t], [cx + h - t, cy - t], [cx + h, cy], [cx + h - t, cy + t], [cx - h + t, cy + t]]
      : [[cx, cy - h], [cx + t, cy - h + t], [cx + t, cy + h - t], [cx, cy + h], [cx - t, cy + h - t], [cx - t, cy - h + t]];
    return pts.map((p) => p.join(',')).join(' ');
  }

  function svg(lit, { labels = true, clickable = false } = {}) {
    return `<svg class="seg7" viewBox="0 0 140 210">${SEGS.map((k) => {
      const [cx, cy, len, hz] = GEOM[k];
      return `<g class="seg ${lit.has(k) ? 'on' : ''} ${clickable ? 'click' : ''}" data-s="${k}">
        <polygon points="${poly(cx, cy, len, hz)}"/>
        ${labels ? `<text x="${cx}" y="${cy + 4}">${k.toUpperCase()}</text>` : ''}
      </g>`;
    }).join('')}</svg>`;
  }

  const same = (set, str) => set.size === str.length && [...str].every((s) => set.has(s));

  // mode: build = tap segments, read = pick the symbol, pins = toggle pins blind
  const CFG = [
    { mode: 'build', pool: '0123456789', rounds: 4 },
    { mode: 'build', pool: '2356908', rounds: 5 },
    { mode: 'read', pool: '0123456789', rounds: 5 },
    { mode: 'pins', pool: '0123456789', rounds: 4 },
    { mode: 'build', pool: 'AbCdEFHLPU', rounds: 4 },
    { mode: 'pins', pool: '0123456789AbCdEF', rounds: 5 },
  ];

  Games.register({
    id: 'segment',
    cat: 'digital',
    icon: '🔟',
    title: 'אתגר שבעת המקטעים',
    desc: 'הדליקו את הפינים A עד G כדי להציג ספרה, כמו בשעון דיגיטלי.',
    long: 'בשעונים ובמחשבונים יש תצוגה עם <b>7 מקטעים</b> (פסים). לכל פס יש שם: A, B, C, D, E, F, G. מדליקים רק חלק מהם – ומקבלים ספרה! בשלבים המתקדמים תתכנתו את הפינים בלי לראות, כמו מהנדסים אמיתיים.',
    levels: CFG.length,
    play(stage, lvl, api) {
      const cfg = CFG[lvl];
      let round = 0;
      let mistakes = 0;
      let target = '';
      let lit = new Set();
      let busy = false;
      const order = U.shuffle(cfg.pool.split(''));

      api.hint({
        build: 'לחצו על הפסים בתצוגה כדי להדליק או לכבות אותם. אחר כך לחצו "בדיקה".',
        read: 'הסתכלו אילו פסים דולקים. איזה סימן זה?',
        pins: 'התצוגה כבויה! הדליקו את הפינים הנכונים בכפתורים ולחצו "שלח" כדי לראות מה יצא.',
      }[cfg.mode]);

      function next() {
        api.rounds(round, cfg.rounds);
        target = order[round % order.length];
        lit = new Set();
        busy = false;
        if (cfg.mode === 'read') drawRead();
        else drawBuild();
      }

      function drawBuild() {
        const blind = cfg.mode === 'pins';
        stage.innerHTML = `
          <div class="seg-layout fade-in">
            <div class="seg-target">
              <div>הציגו את:</div>
              <div class="big" id="sTarget">${target}</div>
            </div>
            <div class="seg-box" id="sBox">${svg(blind ? new Set() : lit, { clickable: !blind })}</div>
          </div>
          ${blind ? `<div class="mt"><div class="center" style="margin-bottom:8px">פינים של המיקרו-בקר:</div>
            <div class="pins">${SEGS.map((k) => `<button class="pin ${lit.has(k) ? 'on' : ''}" data-p="${k}">${k.toUpperCase()}</button>`).join('')}</div></div>` : ''}
          <div class="row mt"><button class="btn big" id="sCheck">${blind ? 'שלח לתצוגה 📟' : 'בדיקה ✔'}</button></div>`;

        const box = stage.querySelector('#sBox');
        if (!blind) {
          box.onclick = (e) => {
            const g = e.target.closest('.seg');
            if (!g || busy) return;
            const k = g.dataset.s;
            lit.has(k) ? lit.delete(k) : lit.add(k);
            Sound.toggle(lit.has(k));
            g.classList.toggle('on', lit.has(k));
          };
        } else {
          stage.querySelector('.pins').onclick = (e) => {
            const p = e.target.closest('.pin');
            if (!p || busy) return;
            const k = p.dataset.p;
            lit.has(k) ? lit.delete(k) : lit.add(k);
            Sound.toggle(lit.has(k));
            p.classList.toggle('on', lit.has(k));
            box.innerHTML = svg(new Set());
          };
        }
        stage.querySelector('#sCheck').onclick = () => {
          if (busy) return;
          if (blind) box.innerHTML = svg(lit);
          check(same(lit, ALL[target]), box);
        };
      }

      function drawRead() {
        const others = U.shuffle(cfg.pool.split('').filter((x) => x !== target)).slice(0, 3);
        const opts = U.shuffle([target, ...others]);
        stage.innerHTML = `
          <div class="seg-layout fade-in">
            <div class="seg-box" id="sBox">${svg(new Set(ALL[target]), { labels: false })}</div>
          </div>
          <div class="answers mt" style="max-width:520px;margin-inline:auto">
            ${opts.map((o) => `<button class="answer" data-o="${o}" style="font-size:34px">${o}</button>`).join('')}
          </div>`;
        stage.querySelector('.answers').onclick = (e) => {
          const b = e.target.closest('.answer');
          if (!b || busy) return;
          const ok = b.dataset.o === target;
          b.classList.add(ok ? 'right' : 'wrong');
          check(ok, b);
        };
      }

      function check(ok, el) {
        if (ok) {
          busy = true;
          api.good(`זה ${target}! פינים: ${ALL[target].toUpperCase().split('').join(', ')}`, el);
          round++;
          if (round >= cfg.rounds) {
            api.rounds(round, cfg.rounds);
            api.win(U.starsByMistakes(mistakes), 'התצוגה הדיגיטלית עובדת מושלם!');
          } else {
            setTimeout(() => { if (api.alive()) next(); }, 1100);
          }
        } else {
          mistakes++;
          api.bad(cfg.mode === 'read' ? 'לא זה. ספרו את הפסים הדולקים' : 'זה לא נראה כמו ' + target, el);
        }
      }

      next();
    },
  });
})();
