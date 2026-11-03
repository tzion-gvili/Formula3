'use strict';

(() => {
  const GATES = {
    AND: (a, b) => a & b,
    OR: (a, b) => a | b,
    XOR: (a, b) => a ^ b,
    NAND: (a, b) => 1 - (a & b),
    NOR: (a, b) => 1 - (a | b),
    NOT: (a) => 1 - a,
    BUF: (a) => a,
  };
  const GATE_HE = { AND: 'וגם', OR: 'או', XOR: 'או בלעדי', NAND: 'לא-וגם', NOR: 'לא-או', NOT: 'היפוך', BUF: 'חוט' };
  const GATE_RULE = {
    AND: 'נותן 1 רק אם <u>שתי</u> הכניסות 1',
    OR: 'נותן 1 אם <u>לפחות אחת</u> מהכניסות 1',
    XOR: 'נותן 1 רק אם הכניסות <u>שונות</u>',
    NAND: 'ההפך מ-AND',
    NOR: 'ההפך מ-OR',
    NOT: 'הופך: 1 נהיה 0, ו-0 נהיה 1',
    BUF: 'מעביר את האות כמו שהוא',
  };

  // Each node: in = list of sources (input names or node ids), x/y = position of the gate box.
  const LEVELS = [
    {
      story: 'הדלת נפתחת רק כשמגיע אליה <b>1</b>. בחרו שער שיהפוך A=1 ו-B=0 ל-1.',
      inputs: { A: 110, B: 190 }, h: 300,
      nodes: [{ id: 'g1', slot: true, opts: ['AND', 'OR'], in: ['A', 'B'], x: 250, y: 150 }],
      out: 'g1',
      cases: [{ A: 1, B: 0, out: 1 }],
    },
    {
      story: 'הפעם שתי הכניסות דולקות (1 ו-1), אבל המכונה צריכה לקבל <b>0</b>.',
      inputs: { A: 110, B: 190 }, h: 300,
      nodes: [{ id: 'g1', slot: true, opts: ['AND', 'OR', 'XOR'], in: ['A', 'B'], x: 250, y: 150 }],
      out: 'g1',
      cases: [{ A: 1, B: 1, out: 0 }],
    },
    {
      story: 'יש כאן שער AND קבוע. לכל כניסה בחרו "חוט" או "NOT" (היפוך), כדי שיצא <b>1</b>.',
      inputs: { A: 100, B: 200 }, h: 300,
      nodes: [
        { id: 'g1', slot: true, opts: ['BUF', 'NOT'], in: ['A'], x: 160, y: 100 },
        { id: 'g2', slot: true, opts: ['BUF', 'NOT'], in: ['B'], x: 160, y: 200 },
        { id: 'g3', type: 'AND', in: ['g1', 'g2'], x: 360, y: 150 },
      ],
      out: 'g3',
      cases: [{ A: 0, B: 1, out: 1 }],
    },
    {
      story: 'אחרי השער שלכם יש שער NOT שהופך הכל. חשבו הפוך! צריך שבסוף יצא <b>1</b>.',
      inputs: { A: 110, B: 190 }, h: 300,
      nodes: [
        { id: 'g1', slot: true, opts: ['AND', 'OR', 'XOR'], in: ['A', 'B'], x: 180, y: 150 },
        { id: 'g2', type: 'NOT', in: ['g1'], x: 360, y: 150 },
      ],
      out: 'g2',
      cases: [{ A: 1, B: 0, out: 1 }],
    },
    {
      story: 'עכשיו יש <b>שני מצבים</b> שהדלת חייבת לעבוד בשניהם. לחצו על כל מצב כדי לראות אותו.',
      inputs: { A: 110, B: 190 }, h: 300,
      nodes: [{ id: 'g1', slot: true, opts: ['AND', 'OR', 'XOR', 'NAND'], in: ['A', 'B'], x: 250, y: 150 }],
      out: 'g1',
      cases: [{ A: 0, B: 1, out: 1 }, { A: 1, B: 1, out: 0 }],
    },
    {
      story: 'שלוש כניסות ושני שערים! מצאו את הצירוף שעובד בשני המצבים.',
      inputs: { A: 70, B: 150, C: 250 }, h: 320,
      nodes: [
        { id: 'g1', slot: true, opts: ['AND', 'OR', 'XOR'], in: ['A', 'B'], x: 180, y: 110 },
        { id: 'g2', slot: true, opts: ['AND', 'OR', 'XOR'], in: ['g1', 'C'], x: 380, y: 180 },
      ],
      out: 'g2',
      cases: [{ A: 1, B: 1, C: 0, out: 1 }, { A: 1, B: 0, C: 1, out: 0 }],
    },
    {
      story: 'אתגר המומחים 🧠: בנו שער XOR רק מ-AND, OR ו-NAND. הוא צריך לעבוד בכל 4 המצבים!',
      inputs: { A: 100, B: 200 }, h: 300,
      nodes: [
        { id: 'g1', slot: true, opts: ['AND', 'OR', 'NAND'], in: ['A', 'B'], x: 210, y: 90 },
        { id: 'g2', slot: true, opts: ['AND', 'OR', 'NAND'], in: ['A', 'B'], x: 210, y: 210 },
        { id: 'g3', slot: true, opts: ['AND', 'OR', 'NAND'], in: ['g1', 'g2'], x: 400, y: 150 },
      ],
      out: 'g3',
      cases: [{ A: 0, B: 0, out: 0 }, { A: 0, B: 1, out: 1 }, { A: 1, B: 0, out: 1 }, { A: 1, B: 1, out: 0 }],
    },
  ];

  const GW = 100, GH = 64, IN_X = 50, OUT_X = 600;

  function evaluate(L, types, inputs) {
    const v = { ...inputs };
    for (const n of L.nodes) {
      const t = n.slot ? types[n.id] : n.type;
      const ins = n.in.map((r) => v[r]);
      v[n.id] = !t || ins.some((x) => x == null) ? null : GATES[t](...ins);
    }
    return v;
  }

  function pinPos(n, idx) {
    if (n.in.length === 1) return [n.x, n.y];
    return [n.x, n.y + (idx === 0 ? -16 : 16)];
  }

  function srcPos(L, ref) {
    if (ref in L.inputs) return [IN_X + 22, L.inputs[ref]];
    const n = L.nodes.find((x) => x.id === ref);
    return [n.x + GW, n.y];
  }

  function wireColor(v) { return v === 1 ? '#2ee59d' : v === 0 ? '#5a6390' : '#3a3f6e'; }

  function wire(sx, sy, tx, ty, v, mx) {
    const glow = v === 1 ? 'filter="url(#glow)"' : '';
    const dash = v == null ? 'stroke-dasharray="6 6"' : '';
    return `<path d="M${sx},${sy} H${mx} V${ty} H${tx}" stroke="${wireColor(v)}" stroke-width="5" fill="none" stroke-linejoin="round" ${glow} ${dash}/>`;
  }

  function render(L, types, caseIdx, opened) {
    const c = L.cases[caseIdx];
    const inputs = {};
    Object.keys(L.inputs).forEach((k) => { inputs[k] = c[k]; });
    const v = evaluate(L, types, inputs);
    let s = `<svg viewBox="0 0 680 ${L.h}" role="img">
      <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

    // wires
    for (const n of L.nodes) {
      n.in.forEach((ref, idx) => {
        const [sx, sy] = srcPos(L, ref);
        const [tx, ty] = pinPos(n, idx);
        const mx = tx - 26 - idx * 22;
        s += wire(sx, sy, tx, ty, v[ref], mx);
      });
    }
    const outNode = L.nodes.find((x) => x.id === L.out);
    s += wire(outNode.x + GW, outNode.y, OUT_X - 30, outNode.y, v[L.out], OUT_X - 50);

    // inputs
    for (const [name, y] of Object.entries(L.inputs)) {
      const val = c[name];
      s += `<g>
        <circle cx="${IN_X}" cy="${y}" r="24" fill="${val ? '#2ee59d' : '#3a3f6e'}" stroke="#fff" stroke-width="2" ${val ? 'filter="url(#glow)"' : ''}/>
        <text x="${IN_X}" y="${y + 7}" text-anchor="middle" font-size="20" font-weight="900" fill="${val ? '#00331f' : '#fff'}">${val}</text>
        <text x="${IN_X}" y="${y - 32}" text-anchor="middle" font-size="16" font-weight="700" fill="#aab2e0">${name}</text>
      </g>`;
    }

    // gates
    for (const n of L.nodes) {
      const t = n.slot ? types[n.id] : n.type;
      const fill = n.slot ? (t ? '#3b2f86' : '#262a5c') : '#4a3f1e';
      const stroke = n.slot ? '#9b8cff' : '#ffd166';
      s += `<g class="lg-gate ${n.slot ? 'lg-slot' : ''}" data-node="${n.id}">
        <rect x="${n.x}" y="${n.y - GH / 2}" width="${GW}" height="${GH}" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="3" ${n.slot && !t ? 'stroke-dasharray="8 6"' : ''}/>
        <text x="${n.x + GW / 2}" y="${n.y + (t ? 2 : 9)}" text-anchor="middle" font-size="${t ? 22 : 28}" font-weight="900" fill="#fff">${t || '?'}</text>
        <text x="${n.x + GW / 2}" y="${n.y + 22}" text-anchor="middle" font-size="12" fill="#cfd3ff">${t ? GATE_HE[t] : 'לחצו לבחירה'}</text>
        ${n.slot ? '' : `<text x="${n.x + GW / 2}" y="${n.y - GH / 2 - 8}" text-anchor="middle" font-size="12" fill="#ffd166">🔒 קבוע</text>`}
      </g>`;
    }

    // output door
    const ov = v[L.out];
    const lit = ov === 1;
    s += `<g>
      <rect x="${OUT_X - 30}" y="${outNode.y - 50}" width="70" height="100" rx="10" fill="${opened ? '#2ee59d' : '#5b3b23'}" stroke="#ffd166" stroke-width="3"/>
      <circle cx="${OUT_X + 5}" cy="${outNode.y - 66}" r="12" fill="${lit ? '#ffd166' : '#333'}" ${lit ? 'filter="url(#glow)"' : ''}/>
      <text x="${OUT_X + 5}" y="${outNode.y + 14}" text-anchor="middle" font-size="40">${opened ? '🔓' : '🚪'}</text>
      <text x="${OUT_X + 5}" y="${outNode.y + 72}" text-anchor="middle" font-size="16" font-weight="900" fill="#fff" direction="rtl">יוצא: ${ov == null ? '?' : ov}</text>
    </g></svg>`;
    return s;
  }

  Games.register({
    id: 'logic',
    cat: 'digital',
    icon: '🚪',
    title: 'מבוך השערים הלוגיים',
    desc: 'חברו שערי AND, OR, XOR ו-NOT כדי לפתוח את הדלת.',
    long: 'שערים לוגיים הם ה"מוח" של המחשב. כל שער מקבל 0 או 1 ומחליט מה להוציא. לחצו על השער עם סימן השאלה כדי להחליף את סוג השער, ונסו לשלוח <b>1</b> או <b>0</b> לדלת לפי מה שהיא צריכה.',
    levels: LEVELS.length,
    play(stage, lvl, api) {
      const L = LEVELS[lvl];
      const types = {};
      let caseIdx = 0;
      let mistakes = 0;
      let opened = false;
      const caseStatus = L.cases.map(() => '');
      const usedGates = [...new Set(L.nodes.flatMap((n) => (n.slot ? n.opts : [n.type])))];

      api.hint(L.story);
      api.rounds(0, 1);

      stage.innerHTML = `
        <div class="lg-cases" id="lgCases"></div>
        <div class="svg-wrap" id="lgSvg"></div>
        <div class="row mt"><button class="btn big" id="lgCheck">בדקו את הדלת 🔑</button></div>
        <details class="help" ${lvl < 3 ? 'open' : ''}>
          <summary>📘 חוקי השערים</summary>
          <div class="gate-rules">${usedGates.map((g) => `<div><b>${g}</b> (${GATE_HE[g]}): ${GATE_RULE[g]}</div>`).join('')}</div>
        </details>`;

      const $ = (s) => stage.querySelector(s);

      function draw() {
        $('#lgCases').innerHTML = L.cases.length > 1
          ? L.cases.map((c, i) => {
              const ins = Object.keys(L.inputs).map((k) => `${k}=${c[k]}`).join(' ');
              return `<button class="lg-case ${i === caseIdx ? 'sel' : ''} ${caseStatus[i]}" data-c="${i}">${ins} → ${c.out}</button>`;
            }).join('')
          : `<div class="lg-case sel">${Object.keys(L.inputs).map((k) => `${k}=${L.cases[0][k]}`).join(' ')} → הדלת צריכה ${L.cases[0].out}</div>`;
        $('#lgSvg').innerHTML = render(L, types, caseIdx, opened);
      }

      $('#lgCases').onclick = (e) => {
        const b = e.target.closest('[data-c]');
        if (!b) return;
        caseIdx = +b.dataset.c;
        Sound.click();
        draw();
      };

      $('#lgSvg').onclick = (e) => {
        if (opened) return;
        const g = e.target.closest('.lg-slot');
        if (!g) return;
        const n = L.nodes.find((x) => x.id === g.dataset.node);
        const cur = types[n.id];
        const idx = cur ? n.opts.indexOf(cur) : -1;
        types[n.id] = n.opts[(idx + 1) % n.opts.length];
        Sound.toggle(true);
        caseStatus.fill('');
        draw();
      };

      $('#lgCheck').onclick = () => {
        if (opened) return;
        if (L.nodes.some((n) => n.slot && !types[n.id])) {
          api.bad('יש עוד שער עם סימן שאלה ❓', $('#lgSvg'));
          return;
        }
        let allOk = true;
        L.cases.forEach((c, i) => {
          const inputs = {};
          Object.keys(L.inputs).forEach((k) => { inputs[k] = c[k]; });
          const ok = evaluate(L, types, inputs)[L.out] === c.out;
          caseStatus[i] = ok ? 'ok' : 'no';
          if (!ok) { allOk = false; caseIdx = i; }
        });
        if (allOk) {
          opened = true;
          draw();
          api.rounds(1, 1);
          api.good('הדלת נפתחה! 🔓', $('#lgSvg'));
          api.win(U.starsByMistakes(mistakes), 'פתרתם את מבוך השערים!');
        } else {
          mistakes++;
          draw();
          api.bad(L.cases.length > 1 ? 'יש מצב שלא עובד (מסומן באדום)' : 'הדלת לא קיבלה את מה שהיא צריכה', $('#lgSvg'));
        }
      };

      draw();
    },
  });

  // exposed for self-tests
  window.__LOGIC_LEVELS = { LEVELS, evaluate };
})();
