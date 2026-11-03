'use strict';

(() => {
  const CFG = [
    { n: 4, time: 60, bumps: 2 },
    { n: 5, time: 70, bumps: 4 },
    { n: 5, time: 55, bumps: 6 },
    { n: 6, time: 85, bumps: 8 },
    { n: 6, time: 70, bumps: 11 },
  ];
  // directions: 0 up, 1 right, 2 down, 3 left
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const BASE = { S: 0b0101, C: 0b0011 }; // straight: up+down, corner: up+right
  const opp = (d) => (d + 2) % 4;
  const rotMask = (m, r) => {
    let out = 0;
    for (let d = 0; d < 4; d++) if (m & (1 << d)) out |= 1 << ((d + r) % 4);
    return out;
  };
  const dirsOf = (m) => [0, 1, 2, 3].filter((d) => m & (1 << d));

  function dirBetween(a, b) {
    for (let d = 0; d < 4; d++) if (a.x + DX[d] === b.x && a.y + DY[d] === b.y) return d;
    return -1;
  }

  function genLoop(n, bumps) {
    const w = U.rand(2, n - 1), h = U.rand(2, n - 1);
    const x0 = U.rand(0, n - w), y0 = U.rand(0, n - h);
    const cyc = [];
    for (let x = x0; x < x0 + w; x++) cyc.push({ x, y: y0 });
    for (let y = y0 + 1; y < y0 + h; y++) cyc.push({ x: x0 + w - 1, y });
    for (let x = x0 + w - 2; x >= x0; x--) cyc.push({ x, y: y0 + h - 1 });
    for (let y = y0 + h - 2; y > y0; y--) cyc.push({ x: x0, y });

    const key = (c) => c.x + ',' + c.y;
    const used = new Set(cyc.map(key));
    let done = 0;
    for (let t = 0; t < bumps * 40 && done < bumps; t++) {
      const i = U.rand(0, cyc.length - 1);
      const p = cyc[i], q = cyc[(i + 1) % cyc.length];
      const d = dirBetween(p, q);
      const perp = U.pick([(d + 1) % 4, (d + 3) % 4]);
      const p2 = { x: p.x + DX[perp], y: p.y + DY[perp] };
      const q2 = { x: q.x + DX[perp], y: q.y + DY[perp] };
      const inGrid = (c) => c.x >= 0 && c.y >= 0 && c.x < n && c.y < n;
      if (!inGrid(p2) || !inGrid(q2) || used.has(key(p2)) || used.has(key(q2))) continue;
      cyc.splice(i + 1, 0, p2, q2);
      used.add(key(p2));
      used.add(key(q2));
      done++;
    }
    return cyc;
  }

  function buildBoard(n, bumps) {
    const cyc = genLoop(n, bumps);
    const grid = Array.from({ length: n }, () => Array(n).fill(null));
    cyc.forEach((c, i) => {
      const prev = cyc[(i - 1 + cyc.length) % cyc.length];
      const next = cyc[(i + 1) % cyc.length];
      const m = (1 << dirBetween(c, prev)) | (1 << dirBetween(c, next));
      const kind = m === 0b0101 || m === 0b1010 ? 'S' : 'C';
      let sol = 0;
      while (rotMask(BASE[kind], sol) !== m) sol++;
      grid[c.y][c.x] = { kind, sol, turns: U.rand(0, 3), special: null };
    });
    const bi = U.rand(0, cyc.length - 1);
    const li = (bi + Math.floor(cyc.length / 2)) % cyc.length;
    grid[cyc[bi].y][cyc[bi].x].special = 'bat';
    grid[cyc[li].y][cyc[li].x].special = 'bulb';

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (grid[y][x]) continue;
        grid[y][x] = Math.random() < 0.75 ? { kind: U.pick(['S', 'C']), turns: U.rand(0, 3), special: null } : null;
      }
    }
    const solved = (t) => (t.kind === 'S' ? t.turns % 2 === t.sol % 2 : t.turns % 4 === t.sol);
    const loopTiles = cyc.map((c) => grid[c.y][c.x]);
    if (loopTiles.every(solved)) loopTiles[0].turns++;
    return { grid, bat: cyc[bi] };
  }

  Games.register({
    id: 'circuit',
    cat: 'basics',
    icon: '🔌',
    title: 'חיווט מעגל סגור',
    desc: 'סובבו חלקי חוטים כדי לסגור מעגל מהסוללה לנורה – לפני שהזמן נגמר!',
    long: 'חשמל זורם רק ב<b>מעגל סגור</b>: יוצא מהסוללה 🔋, עובר דרך הנורה 💡, וחוזר לסוללה. לחצו על משבצת כדי לסובב אותה. כשהמסלול כולו מחובר – הנורה נדלקת! מהרו, השעון מתקתק ⏱️',
    levels: CFG.length,
    play(stage, lvl, api) {
      const cfg = CFG[lvl];
      const { grid, bat } = buildBoard(cfg.n, cfg.bumps);
      const n = cfg.n;
      let timeLeft = cfg.time;
      let finished = false;

      api.hint('לחצו על משבצות כדי לסובב אותן. החוטים שמחוברים לסוללה יאירו בצהוב ✨');
      api.rounds(0, 1);

      stage.innerHTML = `
        <div class="cr-top">
          <span>⏱️</span>
          <div class="timebar" id="cTime"><i style="width:100%"></i></div>
          <b id="cSec" style="min-width:40px;text-align:center">${timeLeft}</b>
        </div>
        <div class="cr-grid" id="cGrid" style="grid-template-columns:repeat(${n},1fr)"></div>`;
      const gridEl = stage.querySelector('#cGrid');

      const maskAt = (x, y) => {
        const t = grid[y] && grid[y][x];
        return t ? rotMask(BASE[t.kind], t.turns % 4) : 0;
      };

      function trace() {
        const powered = new Set([bat.x + ',' + bat.y]);
        const ds = dirsOf(maskAt(bat.x, bat.y));
        let x = bat.x, y = bat.y, out = ds[0];
        let bulb = false;
        for (let step = 0; step < n * n + 2; step++) {
          const nx = x + DX[out], ny = y + DY[out];
          if (nx < 0 || ny < 0 || nx >= n || ny >= n) break;
          const m = maskAt(nx, ny);
          if (!(m & (1 << opp(out)))) break;
          if (nx === bat.x && ny === bat.y) return { powered, closed: bulb };
          powered.add(nx + ',' + ny);
          if (grid[ny][nx].special === 'bulb') bulb = true;
          out = dirsOf(m).find((d) => d !== opp(out));
          x = nx; y = ny;
        }
        return { powered, closed: false };
      }

      function paint() {
        const { powered, closed } = trace();
        gridEl.innerHTML = grid.map((row, y) => row.map((t, x) => {
          if (!t) return '<div class="tile empty"></div>';
          const live = powered.has(x + ',' + y);
          const icon = t.special === 'bat' ? '🔋' : t.special === 'bulb' ? '💡' : '';
          const bulbCls = t.special === 'bulb' ? (closed ? 'bulb-on' : 'bulb-off') : '';
          return `<button class="tile ${live ? 'live' : ''} ${bulbCls}" data-x="${x}" data-y="${y}">
            <div class="pipe" style="transform:rotate(${t.turns * 90}deg)">
              <svg viewBox="0 0 100 100"><path d="${t.kind === 'S' ? 'M50,0 V100' : 'M50,0 V50 H100'}"/></svg>
            </div>
            ${icon ? `<div class="icon"><span>${icon}</span></div>` : ''}
          </button>`;
        }).join('')).join('');
        return closed;
      }

      gridEl.onclick = (e) => {
        if (finished) return;
        const b = e.target.closest('.tile[data-x]');
        if (!b) return;
        const x = +b.dataset.x, y = +b.dataset.y;
        const t = grid[y][x];
        t.turns++;
        Sound.rotate();
        const pipe = b.querySelector('.pipe');
        pipe.style.transform = `rotate(${t.turns * 90}deg)`;
        setTimeout(() => {
          if (!api.alive() || finished) return;
          if (paint()) win();
        }, 200);
      };

      function win() {
        finished = true;
        clearInterval(timer);
        api.rounds(1, 1);
        const bulbEl = gridEl.querySelector('.bulb-on');
        api.good('המעגל סגור – הנורה דולקת! 💡', bulbEl);
        const ratio = timeLeft / cfg.time;
        api.win(ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1, `סגרתם את המעגל עם ${timeLeft} שניות שנשארו!`);
      }

      const timer = setInterval(() => {
        if (finished) return;
        timeLeft--;
        const bar = stage.querySelector('#cTime');
        bar.querySelector('i').style.width = (100 * timeLeft) / cfg.time + '%';
        bar.classList.toggle('low', timeLeft <= 10);
        stage.querySelector('#cSec').textContent = timeLeft;
        if (timeLeft <= 10 && timeLeft > 0) Sound.tick();
        if (timeLeft <= 0) {
          finished = true;
          clearInterval(timer);
          api.fail('נגמר הזמן ⏰ והנורה לא נדלקה. נסו שוב – אתם כבר יודעים איך!');
        }
      }, 1000);

      paint();
      return () => clearInterval(timer);
    },
  });

  window.__CIRCUIT = { buildBoard, rotMask, BASE, dirsOf };
})();
