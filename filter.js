'use strict';

(() => {
  // "Yonatan HaKatan" melody (C4..G4)
  const MELODY = [392, 329.63, 329.63, 349.23, 293.66, 293.66, 261.63, 293.66, 329.63, 349.23, 392, 392, 392];
  const R_OHM = 1000;
  const C_MIN = 10e-9, C_SPAN = 200; // slider 0..100 -> 10nF..2µF
  const PASS = 0.85;

  const CFG = [
    { noise: 'hiss', octave: 1, choose: false, type: 'lowpass', msg: '"אלקטרון קטן – כוח גדול!"' },
    { noise: 'hum', octave: 4, choose: false, type: 'highpass', msg: '"הקוד לכספת הוא 1-0-1"' },
    { noise: 'hiss', octave: 1, choose: true, type: 'lowpass', msg: '"נגד + קבל = מסנן"' },
    { noise: 'hum', octave: 4, choose: true, type: 'highpass', msg: '"כל הכבוד, מהנדסי הרדיו!"' },
  ];
  const NOISE_F = { hiss: 4000, hum: 130 };

  const capFromSlider = (s) => C_MIN * Math.pow(C_SPAN, s / 100);
  const fcOf = (C) => 1 / (2 * Math.PI * R_OHM * C);
  const H = (type, f, fc) => (type === 'lowpass' ? 1 / Math.sqrt(1 + (f / fc) ** 4) : 1 / Math.sqrt(1 + (fc / f) ** 4));
  const fmtC = (C) => (C >= 1e-6 ? U.trim(C * 1e6, 2) + 'µF' : U.trim(C * 1e9, 0) + 'nF');
  const fmtF = (f) => (f >= 1000 ? U.trim(f / 1000, 2) + 'kHz' : Math.round(f) + 'Hz');

  function clarity(cfg, type, fc) {
    const notes = MELODY.map((f) => f * cfg.octave);
    const sig = Math.min(...notes.map((f) => H(type, f, fc)));
    return sig * (1 - H(type, NOISE_F[cfg.noise], fc));
  }

  Games.register({
    id: 'filter',
    cat: 'analog',
    icon: '📻',
    title: 'רדיו המסננים',
    desc: 'נקו את הרעש מהרדיו בעזרת נגד וקבל – ושמעו את המסר הסודי!',
    long: 'ברדיו יש מנגינה סודית, אבל יש עליה <b>רעש</b>. נגד וקבל ביחד יוצרים <b>מסנן</b>: Low Pass מעביר רק צלילים נמוכים, ו-High Pass מעביר רק צלילים גבוהים. שנו את הקבל עד שהרעש נעלם! 🎧 מומלץ עם אוזניות.',
    levels: CFG.length,
    play(stage, lvl, api) {
      const cfg = CFG[lvl];
      let type = cfg.choose ? (cfg.type === 'lowpass' ? 'highpass' : 'lowpass') : cfg.type;
      let slider = cfg.type === 'lowpass' ? 2 : 98;
      let mistakes = 0;
      let done = false;
      let audio = null;
      let raf = 0;
      let noteTimer = 0;

      api.hint(cfg.choose
        ? 'קודם בחרו סוג מסנן: האם הרעש <b>גבוה</b> (שששש) או <b>נמוך</b> (זמזום)? אחר כך כוונו את הקבל.'
        : cfg.type === 'lowpass'
          ? 'הרעש כאן <b>גבוה</b> (שששש). מסנן Low Pass. הגדילו את הקבל כדי להוריד את תדר החיתוך.'
          : 'הרעש כאן <b>נמוך</b> (זמזום). מסנן High Pass. הקטינו את הקבל כדי להעלות את תדר החיתוך.');
      api.rounds(0, 1);

      stage.innerHTML = `
        <div class="radio">
          <canvas id="fCanvas"></canvas>
          <div class="radio-controls">
            ${cfg.choose ? `<div class="ftype" id="fType">
              <button data-t="lowpass">Low Pass – מעביר נמוכים</button>
              <button data-t="highpass">High Pass – מעביר גבוהים</button></div>` : ''}
            <div class="slider-row">
              <label>קבל C</label>
              <input type="range" id="fC" min="0" max="100" step="0.5" value="${slider}">
              <output id="fCOut"></output>
            </div>
            <div class="row" style="gap:18px">
              <span>נגד: <b class="ltr">R = 1kΩ</b></span>
              <span>תדר חיתוך: <b class="ltr" id="fFc"></b></span>
            </div>
            <div class="clarity"><span>ניקיון האות</span><div class="bar"><i id="fClar"></i></div><span id="fClarTxt"></span></div>
            <div class="row">
              <button class="btn" id="fPlay">▶ הפעילו רדיו</button>
              <button class="btn good" id="fDecode">🔓 פענחו את המסר</button>
            </div>
          </div>
        </div>
        <div class="secret" id="fSecret"></div>`;

      const $ = (s) => stage.querySelector(s);
      const canvas = $('#fCanvas');
      const g2 = canvas.getContext('2d');

      function update() {
        const C = capFromSlider(slider);
        const fc = fcOf(C);
        $('#fCOut').textContent = fmtC(C);
        $('#fFc').textContent = fmtF(fc);
        const cl = clarity(cfg, type, fc);
        $('#fClar').style.width = Math.round(cl * 100) + '%';
        $('#fClarTxt').textContent = Math.round(cl * 100) + '%';
        if (cfg.choose) $('#fType').querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.t === type));
        if (audio) {
          audio.filter.type = type;
          audio.filter.frequency.setTargetAtTime(U.clamp(fc, 20, 20000), audio.ctx.currentTime, 0.03);
        }
        return cl;
      }

      function startAudio() {
        const c = Sound.init();
        if (!c || audio) return;
        const mix = c.createGain();
        const filter = c.createBiquadFilter();
        filter.Q.value = Math.SQRT1_2;
        const analyser = c.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.75;
        const out = c.createGain();
        out.gain.value = 0.6;
        mix.connect(filter);
        filter.connect(analyser);
        analyser.connect(out);
        out.connect(Sound.master);

        const noiseGain = c.createGain();
        const nodes = [];
        if (cfg.noise === 'hiss') {
          const src = c.createBufferSource();
          src.buffer = Sound.noiseBuffer(2);
          src.loop = true;
          const hp1 = c.createBiquadFilter(); hp1.type = 'highpass'; hp1.frequency.value = 4000;
          const hp2 = c.createBiquadFilter(); hp2.type = 'highpass'; hp2.frequency.value = 4000;
          src.connect(hp1); hp1.connect(hp2); hp2.connect(noiseGain);
          noiseGain.gain.value = 0.35;
          src.start();
          nodes.push(src);
        } else {
          [110, 130, 120].forEach((f, i) => {
            const o = c.createOscillator();
            o.type = 'sine';
            o.frequency.value = f;
            const g = c.createGain();
            g.gain.value = i === 2 ? 0.25 : 0.35;
            o.connect(g); g.connect(noiseGain);
            o.start();
            nodes.push(o);
          });
          noiseGain.gain.value = 0.8;
        }
        noiseGain.connect(mix);

        let k = 0;
        const playNote = () => {
          const f = MELODY[k % MELODY.length] * cfg.octave;
          const last = k % MELODY.length === MELODY.length - 1;
          const t = c.currentTime;
          const dur = last ? 0.9 : 0.34;
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = 'sine';
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(g); g.connect(mix);
          o.start(t); o.stop(t + dur + 0.05);
          k++;
          noteTimer = setTimeout(playNote, last ? 1200 : 380);
        };
        playNote();

        audio = { ctx: c, filter, analyser, out, noiseGain, nodes, data: new Uint8Array(analyser.frequencyBinCount) };
        update();
        $('#fPlay').textContent = '⏸ עצרו רדיו';
      }

      function stopAudio() {
        clearTimeout(noteTimer);
        if (!audio) return;
        const a = audio;
        audio = null;
        a.out.gain.setTargetAtTime(0, a.ctx.currentTime, 0.05);
        setTimeout(() => {
          a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* already stopped */ } });
          a.out.disconnect();
        }, 300);
        const btn = $('#fPlay');
        if (btn) btn.textContent = '▶ הפעילו רדיו';
      }

      function drawSpectrum() {
        raf = requestAnimationFrame(drawSpectrum);
        const dpr = devicePixelRatio || 1;
        const W = canvas.clientWidth * dpr, Hh = canvas.clientHeight * dpr;
        if (canvas.width !== W) { canvas.width = W; canvas.height = Hh; }
        const f0 = 40, f1 = 12000;
        const X = (f) => (W * Math.log(f / f0)) / Math.log(f1 / f0);
        g2.clearRect(0, 0, W, Hh);

        const notes = MELODY.map((f) => f * cfg.octave);
        g2.fillStyle = 'rgba(46,229,157,.16)';
        g2.fillRect(X(Math.min(...notes) * 0.9), 0, X(Math.max(...notes) * 1.1) - X(Math.min(...notes) * 0.9), Hh);
        g2.fillStyle = 'rgba(255,92,122,.16)';
        if (cfg.noise === 'hiss') g2.fillRect(X(4000), 0, W - X(4000), Hh);
        else g2.fillRect(X(95), 0, X(145) - X(95), Hh);

        if (audio) {
          audio.analyser.getByteFrequencyData(audio.data);
          const binHz = audio.ctx.sampleRate / audio.analyser.fftSize;
          g2.fillStyle = '#4cc9f0';
          for (let i = 1; i < audio.data.length; i++) {
            const f = i * binHz;
            if (f < f0 || f > f1) continue;
            const h = (audio.data[i] / 255) * Hh * 0.9;
            const x = X(f);
            const w = Math.max(1.5 * dpr, X(f + binHz) - x);
            g2.fillRect(x, Hh - h, w, h);
          }
        }

        const fc = fcOf(capFromSlider(slider));
        g2.strokeStyle = '#ffd166';
        g2.lineWidth = 3 * dpr;
        g2.beginPath();
        for (let px = 0; px <= W; px += 3) {
          const f = f0 * Math.pow(f1 / f0, px / W);
          const y = Hh - 6 * dpr - H(type, f, fc) * (Hh * 0.8);
          px ? g2.lineTo(px, y) : g2.moveTo(px, y);
        }
        g2.stroke();
        g2.setLineDash([6 * dpr, 6 * dpr]);
        g2.beginPath();
        g2.moveTo(X(fc), 0);
        g2.lineTo(X(fc), Hh);
        g2.stroke();
        g2.setLineDash([]);

        g2.direction = 'ltr';
        g2.textAlign = 'center';
        g2.font = `700 ${12 * dpr}px Rubik, sans-serif`;
        g2.fillStyle = '#aab2e0';
        [100, 1000, 10000].forEach((f) => g2.fillText(fmtF(f), X(f), Hh - 6 * dpr));
        g2.font = `700 ${15 * dpr}px Rubik, sans-serif`;
        g2.fillStyle = '#7dffc8';
        g2.fillText('🎵 מנגינה', X(Math.sqrt(Math.min(...notes) * Math.max(...notes))), 22 * dpr);
        g2.fillStyle = '#ff9aac';
        g2.fillText('📢 רעש', cfg.noise === 'hiss' ? X(7000) : X(118), 22 * dpr);
        g2.fillStyle = '#ffd166';
        g2.fillText('✂ ' + fmtF(fc), U.clamp(X(fc), 40 * dpr, W - 40 * dpr), 44 * dpr);
      }

      $('#fC').oninput = (e) => {
        slider = +e.target.value;
        update();
      };
      if (cfg.choose) {
        $('#fType').onclick = (e) => {
          const b = e.target.closest('[data-t]');
          if (!b || done) return;
          type = b.dataset.t;
          Sound.click();
          update();
        };
      }
      $('#fPlay').onclick = () => {
        Sound.click();
        if (audio) stopAudio(); else startAudio();
      };
      $('#fDecode').onclick = () => {
        if (done) return;
        if (!audio) startAudio();
        const cl = update();
        if (cl >= PASS) {
          done = true;
          if (audio) audio.noiseGain.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.3);
          const box = $('#fSecret');
          const text = '🔓 המסר הסודי: ' + cfg.msg;
          let i = 0;
          const type1 = () => {
            if (!api.alive()) return;
            box.textContent = text.slice(0, ++i);
            if (i % 2) Sound.tick();
            if (i < text.length) setTimeout(type1, 45);
            else {
              api.rounds(1, 1);
              api.good('האות נקי!', box);
              api.win(U.starsByMistakes(mistakes), 'בניתם מסנן כמו מהנדסי רדיו אמיתיים!');
            }
          };
          type1();
        } else {
          mistakes++;
          const wrongType = cfg.choose && type !== cfg.type;
          api.bad(wrongType ? 'נראה שבחרתם סוג מסנן לא נכון 🤔' : `עדיין רועש... רק ${Math.round(cl * 100)}% נקי`, $('.radio'));
        }
      };

      update();
      drawSpectrum();
      return () => {
        cancelAnimationFrame(raf);
        stopAudio();
      };
    },
  });

  window.__FILTER = { clarity, CFG, capFromSlider, fcOf };
})();
