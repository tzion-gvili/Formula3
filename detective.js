'use strict';

(() => {
  const V_BAT = 9;
  const PARTS = {
    R1: { id: 'R1', type: 'R', r: 100, label: 'R1' },
    R2: { id: 'R2', type: 'R', r: 220, label: 'R2' },
    R3: { id: 'R3', type: 'R', r: 330, label: 'R3' },
    L: { id: 'L', type: 'L', r: 150, label: 'נורה' },
    W: { id: 'W', type: 'W', r: 0, label: 'חוט חזרה' },
  };
  const CFG = [
    { parts: ['R1', 'L'], kinds: ['open'] },
    { parts: ['R1', 'L', 'R2'], kinds: ['open'] },
    { parts: ['R1', 'L', 'R2'], kinds: ['open', 'short'] },
    { parts: ['R1', 'R2', 'L', 'R3'], kinds: ['open', 'short'] },
    { parts: ['R1', 'L', 'R2', 'R3'], kinds: ['open', 'short'] },
  ];
  const KIND_HE = { open: 'שרוף / מנותק', short: 'מקוצר (קצר)' };
  const NODE_NAMES = 'ABCDEFG';

  // elements in series: top parts..., then the return wire
  function solve(els, fault) {
    const r = els.map((e) => (e.id === fault.id ? (fault.kind === 'open' ? Infinity : 0) : e.r));
    const openIdx = r.indexOf(Infinity);
    const volts = [V_BAT];
    let I = 0;
    if (openIdx >= 0) {
      for (let k = 1; k <= els.length; k++) volts.push(k <= openIdx ? V_BAT : 0);
    } else {
      I = V_BAT / r.reduce((a, b) => a + b, 0);
      let acc = V_BAT;
      r.forEach((x) => { acc -= I * x; volts.push(acc); });
    }
    return { volts, I };
  }

  function layout(top) {
    const n = top.length;
    const x0 = 70, x1 = 580, yT = 70, yB = 260;
    const w = (x1 - x0) / n;
    const nodes = [];
    for (let k = 0; k <= n; k++) nodes.push({ x: x0 + k * w, y: yT });
    nodes.push({ x: x0, y: yB });
    return { nodes, w, x0, x1, yT, yB };
  }

  function svg(top, lay, bulbBright, probes) {
    const { nodes, w, x0, x1, yT, yB } = lay;
    let s = `<svg viewBox="0 0 650 320">
      <defs><radialGradient id="dGlow"><stop offset="0" stop-color="#fff6c2"/><stop offset=".5" stop-color="#ffd166" stop-opacity=".8"/><stop offset="1" stop-color="#ffb703" stop-opacity="0"/></radialGradient></defs>
      <path d="M${x0},${yT} V152 M${x0},188 V${yB} H${x1} V${yT}" stroke="#8a92c8" stroke-width="5" fill="none"/>
      <line x1="${x0 - 22}" y1="152" x2="${x0 + 22}" y2="152" stroke="#fff" stroke-width="5"/>
      <line x1="${x0 - 11}" y1="164" x2="${x0 + 11}" y2="164" stroke="#fff" stroke-width="5"/>
      <line x1="${x0 - 22}" y1="176" x2="${x0 + 22}" y2="176" stroke="#fff" stroke-width="5"/>
      <line x1="${x0 - 11}" y1="188" x2="${x0 + 11}" y2="188" stroke="#fff" stroke-width="5"/>
      <text x="${x0 + 30}" y="158" font-size="20" font-weight="900" fill="#ffd166">+</text>
      <text x="${x0 + 30}" y="186" font-size="18" font-weight="700" fill="#7dffc8">9V</text>
      <text x="${(x0 + x1) / 2}" y="${yB + 30}" text-anchor="middle" font-size="15" fill="#aab2e0">${PARTS.W.label}</text>`;

    top.forEach((p, i) => {
      const cx = x0 + (i + 0.5) * w;
      const half = p.type === 'L' ? 22 : 35;
      s += `<line x1="${nodes[i].x}" y1="${yT}" x2="${cx - half}" y2="${yT}" stroke="#8a92c8" stroke-width="5"/>
            <line x1="${cx + half}" y1="${yT}" x2="${nodes[i + 1].x}" y2="${yT}" stroke="#8a92c8" stroke-width="5"/>`;
      if (p.type === 'R') {
        s += `<path d="M${cx - 35},${yT} l5,-12 l10,24 l10,-24 l10,24 l10,-24 l10,24 l10,-24 l5,12" stroke="#ff9f1c" stroke-width="5" fill="none" stroke-linejoin="round"/>`;
      } else {
        const b = U.clamp(bulbBright, 0, 1.4);
        s += `<circle cx="${cx}" cy="${yT}" r="${30 + b * 30}" fill="url(#dGlow)" opacity="${Math.min(1, b)}"/>
              <circle cx="${cx}" cy="${yT}" r="22" fill="${b > 0 ? `rgba(255,209,102,${0.3 + Math.min(1, b) * 0.6})` : '#2a2f5c'}" stroke="#fff" stroke-width="4"/>
              <path d="M${cx - 14},${yT - 14} L${cx + 14},${yT + 14} M${cx + 14},${yT - 14} L${cx - 14},${yT + 14}" stroke="#fff" stroke-width="3" opacity=".8"/>`;
      }
      s += `<text x="${cx}" y="${yT - 30}" text-anchor="middle" font-size="16" font-weight="900" fill="#fff">${p.label}</text>
            <text x="${cx}" y="${yT + 44}" text-anchor="middle" font-size="14" fill="#aab2e0">${p.r}Ω</text>`;
    });

    nodes.forEach((nd, k) => {
      const isRed = probes.red === k, isBlack = probes.black === k;
      s += `<g class="det-node" data-node="${k}">
        <circle cx="${nd.x}" cy="${nd.y}" r="22" fill="transparent"/>
        <circle class="n" cx="${nd.x}" cy="${nd.y}" r="12" fill="${isRed ? '#ff3b3b' : isBlack ? '#222' : '#4cc9f0'}" stroke="#fff" stroke-width="3"/>
        <text x="${nd.x - (k === nodes.length - 1 ? 30 : 0)}" y="${nd.y + (k === nodes.length - 1 ? 6 : -20)}" text-anchor="middle" font-size="15" font-weight="900" fill="#4cc9f0">${NODE_NAMES[k]}</text>
      </g>`;
    });
    return s + '</svg>';
  }

  Games.register({
    id: 'detective',
    cat: 'tech',
    icon: '🕵️',
    title: 'חוקר המעגלים',
    desc: 'המעגל מקולקל! מדדו מתח עם רב-מודד וגלו איזה רכיב שרוף או מקוצר.',
    long: 'אתם הטכנאים 🔧. משהו במעגל לא עובד. שימו את החוט ה<b style="color:#ff5c7a">אדום</b> והחוט ה<b>שחור</b> של הרב-מודד על שתי נקודות, וראו כמה וולט יש ביניהן.<br>• רכיב <b>שרוף/מנותק</b> – כל ה-9V "נתקעים" עליו.<br>• רכיב <b>מקוצר</b> – יש עליו 0V, כמו חוט רגיל.',
    levels: CFG.length,
    play(stage, lvl, api) {
      const cfg = CFG[lvl];
      const top = cfg.parts.map((id) => PARTS[id]);
      const els = [...top, PARTS.W];
      const candidates = [];
      els.forEach((e) => cfg.kinds.forEach((k) => {
        if (k === 'short' && e.type === 'W') return;
        candidates.push({ id: e.id, kind: k });
      }));
      const fault = U.pick(candidates);
      const { volts, I } = solve(els, fault);
      const normalI = V_BAT / els.reduce((a, e) => a + e.r, 0);
      const bulbOk = !(fault.id === 'L');
      const bulbBright = bulbOk ? (I / normalI) ** 2 : 0;
      const lay = layout(top);
      const probes = { red: null, black: null };
      let next = 'red';
      let measures = 0;
      let mistakes = 0;
      let pick = { id: null, kind: cfg.kinds.length === 1 ? cfg.kinds[0] : null };
      let solved = false;

      const status = bulbBright === 0 ? 'הנורה <b>כבויה</b> 😟' : bulbBright > 1.1 ? 'הנורה דולקת <b>חזק מדי</b> 😵 – משהו מקוצר?' : 'הנורה דולקת';
      api.hint(`${status}. בדקו כל רכיב: אדום בצד אחד שלו ושחור בצד השני.`);
      api.rounds(0, 1);

      stage.innerHTML = `
        <div class="svg-wrap" id="dSvg"></div>
        <div class="meter">
          <button class="probe-btn" data-p="red">🔴 חוט אדום</button>
          <div class="meter-lcd" id="dLcd">-- V</div>
          <button class="probe-btn" data-p="black">⚫ חוט שחור</button>
        </div>
        <div class="center mt" id="dCount"></div>
        <div class="panel mt">
          <div class="center" style="font-weight:700;margin-bottom:10px">איזה רכיב מקולקל?</div>
          <div class="choices" id="dParts">${els.map((e) => `<button class="choice" data-id="${e.id}">${e.label}</button>`).join('')}</div>
          ${cfg.kinds.length > 1 ? `<div class="choices mt" id="dKinds">${cfg.kinds.map((k) => `<button class="choice" data-k="${k}">${k === 'open' ? '🔥' : '⚡'} ${KIND_HE[k]}</button>`).join('')}</div>` : ''}
          <div class="row mt"><button class="btn big" id="dAnswer">זה הרכיב הפגום! 🕵️</button></div>
        </div>`;
      const $ = (s) => stage.querySelector(s);

      function paint() {
        $('#dSvg').innerHTML = svg(top, lay, bulbBright, probes);
        stage.querySelectorAll('.probe-btn').forEach((b) => b.classList.toggle('sel', b.dataset.p === next));
        const lcd = $('#dLcd');
        if (probes.red != null && probes.black != null) {
          const v = Math.round((volts[probes.red] - volts[probes.black]) * 100) / 100;
          lcd.textContent = `${(v === 0 ? 0 : v).toFixed(2)} V`;
        } else lcd.textContent = '-- V';
        $('#dCount').textContent = `מדידות: ${measures}`;
        stage.querySelectorAll('#dParts .choice').forEach((b) => b.classList.toggle('sel', b.dataset.id === pick.id));
        stage.querySelectorAll('#dKinds .choice').forEach((b) => b.classList.toggle('sel', b.dataset.k === pick.kind));
      }

      $('#dSvg').onclick = (e) => {
        const g = e.target.closest('.det-node');
        if (!g || solved) return;
        const k = +g.dataset.node;
        const other = next === 'red' ? 'black' : 'red';
        if (probes[other] === k) probes[other] = null;
        probes[next] = k;
        Sound.click();
        if (probes.red != null && probes.black != null) {
          measures++;
          Sound.tick();
          FX.pop($('#dLcd'));
        }
        next = other;
        paint();
      };
      stage.querySelector('.meter').onclick = (e) => {
        const b = e.target.closest('.probe-btn');
        if (!b) return;
        next = b.dataset.p;
        Sound.click();
        paint();
      };
      $('#dParts').onclick = (e) => {
        const b = e.target.closest('[data-id]');
        if (!b) return;
        pick.id = b.dataset.id;
        Sound.click();
        paint();
      };
      if ($('#dKinds')) {
        $('#dKinds').onclick = (e) => {
          const b = e.target.closest('[data-k]');
          if (!b) return;
          pick.kind = b.dataset.k;
          Sound.click();
          paint();
        };
      }
      $('#dAnswer').onclick = () => {
        if (solved) return;
        if (!pick.id || !pick.kind) { api.bad('בחרו רכיב' + (cfg.kinds.length > 1 ? ' וגם סוג תקלה' : ''), $('.panel')); return; }
        if (measures === 0) { api.bad('טכנאי טוב קודם מודד 📏', $('.meter')); return; }
        if (pick.id === fault.id && pick.kind === fault.kind) {
          solved = true;
          api.rounds(1, 1);
          const name = PARTS[fault.id].label;
          api.good(`מצאתם! ${name} ${KIND_HE[fault.kind]}`, $('.panel'));
          const n = els.length;
          const base = measures <= n + 1 ? 3 : measures <= 2 * n + 2 ? 2 : 1;
          api.win(base - Math.min(2, mistakes), `תיקנתם את המעגל אחרי ${measures} מדידות. כל הכבוד, טכנאים!`);
        } else {
          mistakes++;
          api.bad('לא זה... מדדו עוד קצת', $('.panel'));
        }
      };

      paint();
    },
  });

  window.__DETECTIVE = { solve, PARTS };
})();
