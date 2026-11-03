'use strict';

(() => {
  const CFG = [
    { bits: 4, live: true },
    { bits: 4, live: false },
    { bits: 6, live: true },
    { bits: 6, live: false },
    { bits: 8, live: true },
    { bits: 8, live: false },
  ];
  const ROUNDS = 3;

  Games.register({
    id: 'binary',
    cat: 'digital',
    icon: '💡',
    title: 'האקר הקוד הבינארי',
    desc: 'הדליקו נורות (ביטים) כדי לכתוב מספר בשפת המחשב.',
    long: 'המחשב מדבר רק ב-0 ו-1. כל נורה היא <b>ביט</b>: דולקת = 1, כבויה = 0. לכל נורה יש ערך (1, 2, 4, 8...). הדליקו את הנורות שהסכום שלהן שווה למספר הסודי – ותפרצו את הכספת! 🔓',
    levels: CFG.length,
    play(stage, lvl, api) {
      const cfg = CFG[lvl];
      let round = 0;
      let mistakes = 0;
      let bits = [];
      let target = 0;
      let busy = false;
      const used = new Set();

      api.hint(cfg.live
        ? 'טיפ: התחילו מהנורה הכי גדולה שלא עוברת את המספר. אחר כך הוסיפו קטנות.'
        : 'הפעם הסכום מוסתר 🙈 – תחשבו לבד ואז לחצו "פרצו".');

      stage.innerHTML = `
        <div class="vault">
          <div class="vault-label">המספר הסודי</div>
          <div class="vault-num" id="bTarget"></div>
          <div class="vault-lock" id="bLock">🔒</div>
        </div>
        <div class="bulbs" id="bBulbs" dir="ltr"></div>
        <div class="bin-readout" dir="ltr"><span id="bStr"></span><span class="eq">=</span><span id="bVal"></span></div>
        <div class="row"><button class="btn big" id="bCheck">פרצו את הכספת! 🔓</button></div>`;
      const $ = (s) => stage.querySelector(s);
      const weight = (i) => 2 ** (cfg.bits - 1 - i);
      const value = () => bits.reduce((s, b, i) => s + (b ? weight(i) : 0), 0);

      function paint() {
        $('#bBulbs').innerHTML = bits.map((b, i) => `
          <button class="bulb ${b ? 'on' : ''}" data-i="${i}">
            <span class="bulb-glass">💡</span>
            <span class="bulb-bit">${b}</span>
            <span class="bulb-w">${weight(i)}</span>
          </button>`).join('');
        $('#bStr').textContent = bits.join('');
        $('#bVal').textContent = cfg.live ? value() : '?';
      }

      function newRound() {
        api.rounds(round, ROUNDS);
        const max = 2 ** cfg.bits - 1;
        do { target = U.rand(Math.max(1, Math.floor(max / 3)), max); } while (used.has(target));
        used.add(target);
        bits = Array(cfg.bits).fill(0);
        $('#bTarget').textContent = target;
        $('#bLock').textContent = '🔒';
        paint();
        FX.pop($('#bTarget'));
        busy = false;
      }

      $('#bBulbs').onclick = (e) => {
        const b = e.target.closest('.bulb');
        if (!b || busy) return;
        const i = +b.dataset.i;
        bits[i] ^= 1;
        Sound.toggle(bits[i]);
        paint();
      };

      $('#bCheck').onclick = () => {
        if (busy) return;
        const v = value();
        if (v === target) {
          busy = true;
          $('#bLock').textContent = '🔓';
          api.good(`${target} = ${bits.join('')}`, $('#bLock'));
          round++;
          if (round >= ROUNDS) {
            api.rounds(round, ROUNDS);
            api.win(U.starsByMistakes(mistakes), `פרצתם ${ROUNDS} כספות בשפת המחשב!`);
          } else {
            setTimeout(() => { if (api.alive()) newRound(); }, 1000);
          }
        } else {
          mistakes++;
          api.bad(v > target ? `יצא ${v} – יותר מדי! כבו נורה.` : `יצא ${v} – חסר עוד ${target - v}.`, $('#bBulbs'));
        }
      };

      newRound();
    },
  });
})();
