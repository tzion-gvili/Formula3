'use strict';

/* ---------- Helpers ---------- */
const U = {
  rand: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  trim: (n, d = 2) => String(parseFloat(Number(n).toFixed(d))),
  starsByMistakes: (m) => (m === 0 ? 3 : m <= 2 ? 2 : 1),
  fmtOhm(v) {
    if (v >= 1e6) return U.trim(v / 1e6) + 'MΩ';
    if (v >= 1e3) return U.trim(v / 1e3) + 'kΩ';
    return U.trim(v) + 'Ω';
  },
};

const PRAISE = ['מעולה!', 'כל הכבוד!', 'יפה מאוד!', 'אלוף/ה!', 'בדיוק!', 'וואו, מהנדס/ת אמיתי/ת!', 'מושלם!'];
const OOPS = ['כמעט!', 'לא נורא, נסו שוב', 'אופס...', 'עוד ניסיון קטן', 'קרוב!'];

/* ---------- Sound (Web Audio, no files) ---------- */
const Sound = {
  ctx: null,
  master: null,
  muted: localStorage.getItem('formula3_muted') === '1',

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('formula3_muted', m ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
  },

  tone(freq, dur = 0.15, opt = {}) {
    const c = this.init();
    if (!c || this.muted) return;
    const { type = 'sine', vol = 0.2, delay = 0, slide = 0 } = opt;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },

  noiseBuffer(sec = 1) {
    const c = this.init();
    const b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  },

  noise(dur = 0.5, cutoff = 1200, vol = 0.3) {
    const c = this.init();
    if (!c || this.muted) return;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer(dur);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  },

  click() { this.tone(700, 0.06, { type: 'triangle', vol: 0.12 }); },
  pop() { this.tone(420, 0.12, { vol: 0.16, slide: 900 }); },
  tick() { this.tone(1300, 0.03, { type: 'square', vol: 0.035 }); },
  toggle(on) { this.tone(on ? 880 : 500, 0.08, { type: 'triangle', vol: 0.12 }); },
  rotate() { this.tone(300 + Math.random() * 80, 0.05, { type: 'triangle', vol: 0.1, slide: 520 }); },
  correct() {
    [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', vol: 0.17, delay: i * 0.08 }));
  },
  wrong() {
    this.tone(330, 0.28, { vol: 0.16, slide: 210 });
    this.tone(247, 0.3, { type: 'triangle', vol: 0.06, delay: 0.05, slide: 160 });
  },
  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.28, { type: 'triangle', vol: 0.17, delay: i * 0.12 }));
    this.tone(1318.5, 0.6, { vol: 0.12, delay: 0.5 });
    this.tone(1567.98, 0.6, { vol: 0.08, delay: 0.62 });
  },
  star(i) { this.tone(880 * Math.pow(1.26, i), 0.25, { type: 'triangle', vol: 0.15 }); },
  burn() {
    this.noise(0.6, 1500, 0.3);
    this.tone(180, 0.4, { type: 'sawtooth', vol: 0.06, slide: 60 });
  },
  boom() {
    this.noise(1.2, 500, 0.5);
    this.tone(90, 0.8, { type: 'sawtooth', vol: 0.1, slide: 30 });
  },
};

/* ---------- Visual effects ---------- */
const FX = {
  canvas: null,
  ctx: null,
  parts: [],
  running: false,
  colors: ['#ffd166', '#ef476f', '#06d6a0', '#4cc9f0', '#9b5de5', '#ff9f1c', '#ffffff'],

  init() {
    this.canvas = document.getElementById('fx');
    this.ctx = this.canvas.getContext('2d');
    const resize = () => {
      this.canvas.width = innerWidth * devicePixelRatio;
      this.canvas.height = innerHeight * devicePixelRatio;
    };
    resize();
    addEventListener('resize', resize);
  },

  spawn(n, x, y, speed, life) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.6,
        size: 5 + Math.random() * 6,
        color: U.pick(this.colors),
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.3,
        life: life * (0.7 + Math.random() * 0.6),
        circle: Math.random() < 0.4,
      });
    }
    if (!this.running) {
      this.running = true;
      requestAnimationFrame(() => this.loop());
    }
  },

  confetti() {
    this.spawn(90, innerWidth * 0.3, innerHeight * 0.35, 13, 140);
    this.spawn(90, innerWidth * 0.7, innerHeight * 0.35, 13, 140);
  },

  burstAt(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    this.spawn(22, r.left + r.width / 2, r.top + r.height / 2, 7, 55);
  },

  loop() {
    const c = this.ctx;
    const dpr = devicePixelRatio;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.parts = this.parts.filter((p) => p.life-- > 0 && p.y < innerHeight + 50);
    for (const p of this.parts) {
      p.vy += 0.32;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      c.save();
      c.translate(p.x * dpr, p.y * dpr);
      c.rotate(p.rot);
      c.globalAlpha = Math.min(1, p.life / 30);
      c.fillStyle = p.color;
      const s = p.size * dpr;
      if (p.circle) {
        c.beginPath();
        c.arc(0, 0, s / 2, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillRect(-s / 2, -s / 4, s, s / 2);
      }
      c.restore();
    }
    if (this.parts.length) requestAnimationFrame(() => this.loop());
    else {
      this.running = false;
      c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  },

  restartAnim(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  },
  shake(el) { this.restartAnim(el, 'shake'); },
  pop(el) { this.restartAnim(el, 'pop'); },

  toast(msg, kind = 'info') {
    const t = document.getElementById('toast');
    t.className = 'toast ' + kind;
    t.innerHTML = msg;
    this.restartAnim(t, 'show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('show'), 2200);
  },
};

/* ---------- Progress (stars saved in the browser) ---------- */
const Progress = {
  key: 'formula3_progress_v1',
  data: {},
  load() {
    try { this.data = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { this.data = {}; }
  },
  save() { localStorage.setItem(this.key, JSON.stringify(this.data)); },
  get(g, l) { return (this.data[g] || {})[l] || 0; },
  set(g, l, s) {
    this.data[g] = this.data[g] || {};
    if (s > (this.data[g][l] || 0)) {
      this.data[g][l] = s;
      this.save();
    }
  },
  gameStars(g) { return Object.values(this.data[g] || {}).reduce((a, b) => a + b, 0); },
  total() { return Object.keys(this.data).reduce((a, g) => a + this.gameStars(g), 0); },
  unlocked(g, l) { return l === 0 || this.get(g, l - 1) > 0; },
};

/* ---------- Game registry ---------- */
const Games = {
  list: [],
  byId: {},
  register(g) {
    this.list.push(g);
    this.byId[g.id] = g;
  },
};

const CATEGORIES = [
  { id: 'quiz', title: 'חידונים ומשימות חשמל', icon: '❓', color: '#ff7eb3' },
  { id: 'digital', title: 'אלקטרוניקה ספרתית (לוגיקה)', icon: '🔢', color: '#9b5de5' },
  { id: 'basics', title: 'חוקים בסיסיים ותורת החשמל', icon: '⚡', color: '#ffb703' },
  { id: 'analog', title: 'רכיבים ואלקטרוניקה אנלוגית', icon: '〰️', color: '#06d6a0' },
  { id: 'tech', title: 'מצב טכנאי – רכיבים פגומים', icon: '🔧', color: '#ff5c7a' },
];

const MASCOT_LINES = [
  'שלום! אני וולטי 🤖 בואו נלמד אלקטרוניקה ביחד!',
  'ידעתם? זרם חשמלי הוא בעצם אלקטרונים קטנטנים שזזים בחוט.',
  'כל שלב שעוברים נותן עד 3 כוכבים ⭐',
  'מחשב חושב רק ב-0 ו-1. מדהים, נכון?',
  'נגד הוא כמו צינור צר – הוא מאט את הזרם.',
  'קבל הוא כמו דלי קטן שמתמלא בחשמל.',
];

/* ---------- App (screens) ---------- */
const App = {
  root: null,
  cleanup: null,
  session: 0,

  start() {
    this.root = document.getElementById('app');
    Progress.load();
    FX.init();

    const mute = document.getElementById('muteBtn');
    const paintMute = () => { mute.textContent = Sound.muted ? '🔇' : '🔊'; };
    paintMute();
    mute.onclick = () => {
      Sound.setMuted(!Sound.muted);
      paintMute();
      Sound.click();
    };
    document.getElementById('homeBtn').onclick = () => { Sound.click(); this.hub(); };
    document.addEventListener('pointerdown', () => Sound.init(), { once: true });

    this.updateStars();
    this.hub();
  },

  updateStars() {
    document.getElementById('starTotal').textContent = Progress.total();
  },

  leave() {
    this.session++;
    if (this.cleanup) {
      try { this.cleanup(); } catch (e) { console.error(e); }
      this.cleanup = null;
    }
    this.closeModal();
    window.scrollTo({ top: 0 });
  },

  catOf(g) { return CATEGORIES.find((c) => c.id === g.cat) || CATEGORIES[0]; },

  /* Main menu */
  hub() {
    this.leave();
    const cats = CATEGORIES.map((cat) => {
      const games = Games.list.filter((g) => g.cat === cat.id);
      if (!games.length) return '';
      return `
        <section class="cat" style="--c:${cat.color}">
          <h2 class="cat-title"><span>${cat.icon}</span>${cat.title}</h2>
          <div class="cards">
            ${games.map((g) => {
              const s = Progress.gameStars(g.id);
              const max = g.levels * 3;
              return `
                <button class="card" data-game="${g.id}">
                  <div class="card-icon">${g.icon}</div>
                  <div class="card-body">
                    <h3>${g.title}</h3>
                    <p>${g.desc}</p>
                    <div class="card-stars">
                      <div class="bar"><i style="width:${(100 * s) / max}%"></i></div>
                      <span>⭐ ${s}/${max}</span>
                    </div>
                  </div>
                </button>`;
            }).join('')}
          </div>
        </section>`;
    }).join('');

    this.root.innerHTML = `
      <div class="hub fade-in">
        <div class="hero">
          <div class="mascot" id="mascot">🤖</div>
          <div class="bubble" id="bubble">${MASCOT_LINES[0]}</div>
        </div>
        ${cats}
      </div>`;

    let line = 0;
    this.root.querySelector('#mascot').onclick = () => {
      line = (line + 1) % MASCOT_LINES.length;
      const b = this.root.querySelector('#bubble');
      b.textContent = MASCOT_LINES[line];
      FX.pop(b);
      Sound.pop();
    };
    this.root.onclick = (e) => {
      const card = e.target.closest('[data-game]');
      if (card) { Sound.click(); this.levels(card.dataset.game); }
    };
  },

  /* Level select */
  levels(id) {
    this.leave();
    const g = Games.byId[id];
    const cat = this.catOf(g);
    this.root.innerHTML = `
      <div class="levels-screen fade-in" style="--c:${cat.color}">
        <div class="game-head">
          <button class="btn small secondary" data-act="hub">→ לכל המשחקים</button>
          <div class="game-title"><span class="gicon">${g.icon}</span>${g.title}</div>
        </div>
        <div class="intro-card">
          <div class="intro-bot">🤖</div>
          <p>${g.long || g.desc}</p>
        </div>
        <div class="level-grid">
          ${Array.from({ length: g.levels }, (_, i) => {
            const un = g.free || Progress.unlocked(id, i);
            const s = Progress.get(id, i);
            return `
              <button class="level ${un ? '' : 'locked'} ${s ? 'done' : ''}" data-level="${i}" ${un ? '' : 'disabled'}
                      style="animation-delay:${i * 0.05}s">
                <b>${un ? (g.levelIcons ? g.levelIcons[i] : i + 1) : '🔒'}</b>
                <span class="lv-stars">${'★'.repeat(s)}<em>${'★'.repeat(3 - s)}</em></span>
              </button>`;
          }).join('')}
        </div>
      </div>`;
    this.root.onclick = (e) => {
      if (e.target.closest('[data-act="hub"]')) { Sound.click(); this.hub(); return; }
      const lv = e.target.closest('[data-level]');
      if (lv && !lv.disabled) { Sound.click(); this.play(id, +lv.dataset.level); }
    };
  },

  /* Game screen */
  play(id, lvl) {
    this.leave();
    const session = this.session;
    const g = Games.byId[id];
    const cat = this.catOf(g);
    this.root.innerHTML = `
      <div class="game-screen fade-in" style="--c:${cat.color}">
        <div class="game-head">
          <button class="btn small secondary" data-act="levels">→ שלבים</button>
          <div class="game-title"><span class="gicon">${g.icon}</span>${g.title}</div>
          <div class="chip">שלב ${lvl + 1} / ${g.levels}</div>
        </div>
        <div class="rounds" id="rounds"></div>
        <div class="hint"><span class="hint-bot">🤖</span><div id="hintText"></div></div>
        <div class="stage" id="stage"></div>
      </div>`;
    this.root.onclick = (e) => {
      if (e.target.closest('[data-act="levels"]')) { Sound.click(); this.levels(id); }
    };

    const alive = () => session === this.session;
    let finished = false;
    const api = {
      level: lvl,
      alive,
      hint: (html) => {
        if (!alive()) return;
        const h = document.getElementById('hintText');
        h.innerHTML = html;
        FX.pop(h.parentElement);
      },
      rounds: (cur, total) => {
        if (!alive()) return;
        document.getElementById('rounds').innerHTML = Array.from({ length: total },
          (_, i) => `<i class="${i < cur ? 'done' : i === cur ? 'now' : ''}"></i>`).join('');
      },
      good: (msg, el) => {
        if (!alive()) return;
        Sound.correct();
        FX.toast('✅ ' + (msg || U.pick(PRAISE)), 'good');
        if (el) { FX.burstAt(el); FX.pop(el); }
      },
      bad: (msg, el) => {
        if (!alive()) return;
        Sound.wrong();
        FX.toast('🙈 ' + (msg || U.pick(OOPS)), 'bad');
        if (el) FX.shake(el);
      },
      info: (msg) => { if (alive()) FX.toast(msg, 'info'); },
      win: (stars, msg) => {
        if (!alive() || finished) return;
        finished = true;
        stars = U.clamp(stars, 1, 3);
        Progress.set(id, lvl, stars);
        this.updateStars();
        setTimeout(() => {
          if (!alive()) return;
          Sound.win();
          FX.confetti();
          this.resultModal(g, lvl, stars, msg);
        }, 500);
      },
      fail: (msg) => {
        if (!alive() || finished) return;
        finished = true;
        setTimeout(() => {
          if (!alive()) return;
          Sound.wrong();
          this.failModal(g, lvl, msg);
        }, 400);
      },
    };

    const stage = document.getElementById('stage');
    try {
      const ret = g.play(stage, lvl, api);
      this.cleanup = typeof ret === 'function' ? ret : null;
    } catch (e) {
      console.error(e);
      stage.innerHTML = '<p>אופס, משהו השתבש במשחק הזה.</p>';
    }
  },

  resultModal(g, lvl, stars, msg) {
    const hasNext = lvl + 1 < g.levels;
    const titles = ['', 'עברתם את השלב!', 'יופי של עבודה!', 'מושלם! 3 כוכבים!'];
    this.openModal(`
      <div class="result-emoji">${stars === 3 ? '🏆' : stars === 2 ? '🎉' : '👍'}</div>
      <h2>${titles[stars]}</h2>
      <div class="stars-big">
        ${[0, 1, 2].map((i) => `<span class="sb ${i < stars ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.25}s">★</span>`).join('')}
      </div>
      <p>${msg || ''}</p>
      ${!hasNext ? '<p class="finale">🎓 סיימתם את כל השלבים במשחק הזה!</p>' : ''}
      <div class="modal-actions">
        ${hasNext ? '<button class="btn" data-m="next">לשלב הבא ◀</button>' : '<button class="btn" data-m="hub">לעוד משחקים 🎮</button>'}
        <button class="btn secondary" data-m="again">שוב 🔁</button>
        <button class="btn secondary" data-m="levels">שלבים</button>
      </div>`, g, lvl);
    for (let i = 0; i < stars; i++) setTimeout(() => Sound.star(i), 250 + i * 250);
  },

  failModal(g, lvl, msg) {
    this.openModal(`
      <div class="result-emoji">⏰</div>
      <h2>לא נורא!</h2>
      <p>${msg || 'נסו שוב, אתם כבר כמעט שם.'}</p>
      <div class="modal-actions">
        <button class="btn" data-m="again">נסו שוב 🔁</button>
        <button class="btn secondary" data-m="levels">שלבים</button>
      </div>`, g, lvl);
  },

  openModal(html, g, lvl) {
    const m = document.getElementById('modal');
    const card = document.getElementById('modalCard');
    card.innerHTML = html;
    m.classList.remove('hidden');
    FX.pop(card);
    card.onclick = (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      Sound.click();
      const a = b.dataset.m;
      if (a === 'next') this.play(g.id, lvl + 1);
      else if (a === 'again') this.play(g.id, lvl);
      else if (a === 'levels') this.levels(g.id);
      else this.hub();
    };
  },

  closeModal() {
    const m = document.getElementById('modal');
    if (m) m.classList.add('hidden');
  },
};
