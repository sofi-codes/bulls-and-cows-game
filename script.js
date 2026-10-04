(() => {
    const game       = document.querySelector('.game');
    const toast      = document.getElementById('toast');
    const giveUpWrap = document.getElementById('giveup-wrap');
    const KEY        = 'bullsCowsGame';

    /* ---------- saving (wrapped so it never crashes the game) ---------- */
    const store = {
      get()  { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
      set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} },
      clear(){ try { localStorage.removeItem(KEY); } catch {} }
    };

    function loadSaved() {
      const s = store.get();
      if (!s || !/^\d{4}$/.test(s.answer) || !Array.isArray(s.history)) return null;
      const ok = s.history.every(h =>
        h && /^\d{4}$/.test(h.guess) && Number.isInteger(h.bulls) && Number.isInteger(h.cows));
      return ok ? s : null;
    }

    /* ---------- secret number (same rules as your Python) ---------- */
    function sample(chars, k) {
      const pool = chars.split('');
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, k);
    }
    function makeAnswer() {
      const firstDigit    = sample('123456789', 1);
      const remainingPool = '0123456789'.replace(firstDigit[0], '');
      const remDigits     = sample(remainingPool, 3);
      return firstDigit.concat(remDigits).join('');
    }

    /* ---------- game state: resume a saved game or start a new one ---------- */
    const saved = loadSaved();
    let answer, history, draft;
    if (saved) {
      answer  = saved.answer;
      history = saved.history;
      draft   = Array.isArray(saved.draft) ? saved.draft.slice(0, 4) : [];
    } else {
      answer  = makeAnswer();
      history = [];                       // [{ guess, bulls, cows }, ...]
      draft   = [];
    }
    let gameOver = false;
    // console.log(answer);

    /* ---------- helpers ---------- */
    const CHECK_SVG =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" fill="none" ' +
      'stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const currentRow   = () => game.querySelector('.guess.current');
    const currentTiles = () => [...game.querySelectorAll('.guess.current input.tile')];

    function saveState() {
      if (gameOver) return;
      store.set({ answer, history, draft: currentTiles().map(t => t.value) });
    }

    let toastTimer;
    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    /* ---------- row markup (same structure for every row) ---------- */
    const inputTiles = [1, 2, 3, 4].map(n =>
      '<input class="tile" type="text" inputmode="numeric" maxlength="1" ' +
      'pattern="[0-9]" autocomplete="off" placeholder=" " aria-label="Digit ' + n + '">'
    ).join('');
    const spanTiles = g => [...g].map(d => '<span class="tile">' + d + '</span>').join('');
    const labelsOf  = (b, c) => '<span>Bulls: ' + b + '</span><span>Cows: ' + c + '</span>';

    function rowMarkup(n, tilesHtml, labelsHtml, locked) {
      return '<div class="guess-row">' +
               '<span class="guess-count">Guesses: <span class="guess-num">' + n + '</span></span>' +
               '<div class="tiles">' + tilesHtml + '</div>' +
               '<button class="submit-btn" type="button" aria-label="Submit guess"' +
                 (locked ? ' disabled' : '') + '>' + CHECK_SVG + '</button>' +
             '</div>' +
             '<div class="labels">' + labelsHtml + '</div>';
    }

    /* a finished guess (used when restoring a saved game) */
    function addLockedRow(n, h) {
      const row = document.createElement('section');
      row.className = 'guess';
      row.innerHTML = rowMarkup(n, spanTiles(h.guess), labelsOf(h.bulls, h.cows), true);
      game.insertBefore(row, giveUpWrap);
    }

    /* the row the player types in */
    function newRow(prefill = []) {
      const row = document.createElement('section');
      row.className = 'guess current';
      row.innerHTML = rowMarkup(history.length + 1, inputTiles,
                                '<span>Bulls:</span><span>Cows:</span>', false);
      game.insertBefore(row, giveUpWrap);

      const tiles = [...row.querySelectorAll('input.tile')];
      tiles.forEach((t, i) => { t.value = /^\d$/.test(prefill[i]) ? prefill[i] : ''; });
      (tiles.find(t => !t.value) || tiles[tiles.length - 1]).focus();
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    /* turn the current row into a finished one */
    function lockRow(guess, bulls, cows) {
      const row = currentRow();
      row.querySelector('.tiles').innerHTML  = spanTiles(guess);
      row.querySelector('.labels').innerHTML = labelsOf(bulls, cows);
      row.querySelector('.submit-btn').disabled = true;
      row.classList.remove('current');
    }

    /* ---------- validation (same order and messages as Python) ---------- */
    function validate(guess) {
      const repeated = new Set(guess).size !== guess.length;
      if (guess === '')            return 'Please enter your guess';
      if (!/^[0-9]+$/.test(guess)) return 'Enter only digits';
      if (guess.length !== 4)      return 'The number is of 4 digits';
      if (repeated)                return 'No repeated digits allowed';
      return null;
    }

    /* ---------- end of game (win or give up) ---------- */
    function showEnd(won) {
      giveUpWrap.remove();
      const box = document.createElement('div');
      box.className = 'win';
      box.innerHTML =
        '<p class="win-title">' + (won ? 'YOU WON!' : 'GAME OVER') + '</p>' +
        '<p>The answer was <b>' + answer + '</b></p>' +
        '<p>' + (won ? 'You took ' : 'Guesses made: ') + '<b>' + history.length + '</b>' +
          (won ? ' guesses' : '') + '</p>' +
        '<button class="again" type="button">Play again</button>';
      game.appendChild(box);
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    /* ---------- submit (check button OR Enter key) ---------- */
    function submitGuess() {
      if (gameOver) return;
      const tiles = currentTiles();
      if (!tiles.length) return;

      const guess = tiles.map(t => t.value).join('');
      const error = validate(guess);
      if (error) {
        showToast(error);
        (tiles.find(t => !t.value) || tiles[0]).focus();
        return;
      }

      let rightPlace = 0;                              // COUNTING BULLS
      for (let i = 0; i < 4; i++) {
        if (answer[i] === guess[i]) rightPlace++;
      }
      let correctDigits = 0;                           // COUNTING COWS
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (answer[i] === guess[j]) { correctDigits++; break; }
        }
      }
      const cows = correctDigits - rightPlace;

      history.push({ guess, bulls: rightPlace, cows });
      lockRow(guess, rightPlace, cows);

      if (guess === answer) {
        gameOver = true;
        store.clear();                                 // finished game is not resumed
        showEnd(true);
      } else {
        saveState();
        newRow();
        saveState();
      }
    }

    /* ---------- give up ---------- */
    function giveUp() {
      if (gameOver) return;
      if (!confirm('Give up and see the answer?')) return;
      gameOver = true;
      store.clear();
      const row = currentRow();
      if (row) row.remove();                           // drop the unfinished row
      showEnd(false);
    }

    /* ---------- events (one set of listeners covers every row) ---------- */
    game.addEventListener('input', (e) => {
      const tile = e.target.closest('input.tile');
      if (!tile) return;
      const tiles = currentTiles();
      const i = tiles.indexOf(tile);
      if (i === -1) return;

      const raw = tile.value;
      const digit = raw.replace(/\D/g, '').slice(-1);
      if (raw && !digit) showToast('Enter only digits');
      tile.value = digit;
      if (digit && i < tiles.length - 1) tiles[i + 1].focus();
      saveState();
    });

    game.addEventListener('keydown', (e) => {
      const tile = e.target.closest('input.tile');
      if (!tile) return;
      const tiles = currentTiles();
      const i = tiles.indexOf(tile);
      if (i === -1) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        submitGuess();
      } else if (e.key === 'Backspace' && !tile.value && i > 0) {
        e.preventDefault();
        tiles[i - 1].value = '';
        tiles[i - 1].focus();
        saveState();
      } else if (e.key === 'ArrowLeft' && i > 0) {
        e.preventDefault();
        tiles[i - 1].focus();
      } else if (e.key === 'ArrowRight' && i < tiles.length - 1) {
        e.preventDefault();
        tiles[i + 1].focus();
      }
    });

    game.addEventListener('click', (e) => {
      if (e.target.closest('.again'))  { location.reload(); return; }
      if (e.target.closest('#giveup')) { giveUp(); return; }
      const btn = e.target.closest('.submit-btn');
      if (btn && !btn.disabled) submitGuess();
    });

    game.addEventListener('focusin', (e) => {
      if (e.target.matches('input.tile')) e.target.select();
    });

    /* ---------- start: rebuild saved rows, then the row to type in ---------- */
    history.forEach((h, i) => addLockedRow(i + 1, h));
    newRow(draft);
    saveState();
  })();