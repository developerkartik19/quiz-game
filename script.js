/* ════════════════════════════════════════════════
   QUIZFORGE — MAIN SCRIPT
   Architecture:
     Config      → App-wide constants
     State       → Single source of truth
     API         → Fetches questions from Open Trivia DB
     UI          → DOM manipulation helpers
     Timer       → Countdown logic
     Quiz        → Core game logic
     Results     → Score display & review
     Storage     → LocalStorage high score
     Events      → Event listeners (bootstrapped last)
   ════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════
   1. CONFIG — App-wide constants
   ══════════════════════════════════════ */
const CONFIG = {
  TOTAL_QUESTIONS : 10,
  TIMER_SECONDS   : 15,
  NEXT_DELAY_MS   : 1800,   // ms before auto-advancing
  LS_HIGH_SCORE   : 'quizforge_highscore',
  LS_THEME        : 'quizforge_theme',
  API_BASE        : 'https://opentdb.com/api.php',

  // Fallback questions if API is unavailable
  FALLBACK_QUESTIONS: [
    { question:"What does HTML stand for?", correct:"HyperText Markup Language", options:["HyperText Markup Language","HighText Machine Language","Hyper Transfer Markup Language","HyperText Model Language"], category:"Web Tech" },
    { question:"Which language runs in a web browser?", correct:"JavaScript", options:["Java","Python","JavaScript","C++"], category:"Web Tech" },
    { question:"What year was the first iPhone released?", correct:"2007", options:["2005","2006","2007","2008"], category:"Technology" },
    { question:"What is the powerhouse of the cell?", correct:"Mitochondria", options:["Nucleus","Ribosome","Mitochondria","Golgi apparatus"], category:"Science" },
    { question:"How many continents are on Earth?", correct:"7", options:["5","6","7","8"], category:"Geography" },
    { question:"What is the capital of France?", correct:"Paris", options:["Rome","Madrid","Berlin","Paris"], category:"Geography" },
    { question:"Who wrote 'Romeo and Juliet'?", correct:"William Shakespeare", options:["Charles Dickens","Mark Twain","William Shakespeare","Jane Austen"], category:"Literature" },
    { question:"What is 12 × 12?", correct:"144", options:["124","132","144","148"], category:"Math" },
    { question:"Which planet is closest to the Sun?", correct:"Mercury", options:["Venus","Earth","Mars","Mercury"], category:"Science" },
    { question:"What is the largest ocean on Earth?", correct:"Pacific Ocean", options:["Atlantic Ocean","Indian Ocean","Arctic Ocean","Pacific Ocean"], category:"Geography" },
    { question:"Which element has the symbol 'O'?", correct:"Oxygen", options:["Osmium","Oganesson","Oxygen","Olivine"], category:"Science" },
    { question:"How many sides does a hexagon have?", correct:"6", options:["5","6","7","8"], category:"Math" },
    { question:"In what year did World War II end?", correct:"1945", options:["1943","1944","1945","1946"], category:"History" },
    { question:"What is the speed of light (approx)?", correct:"300,000 km/s", options:["150,000 km/s","200,000 km/s","300,000 km/s","400,000 km/s"], category:"Science" },
    { question:"Who painted the Mona Lisa?", correct:"Leonardo da Vinci", options:["Michelangelo","Raphael","Donatello","Leonardo da Vinci"], category:"Art" },
  ]
};

/* ══════════════════════════════════════
   2. STATE — Single source of truth
   ══════════════════════════════════════ */
const State = {
  questions     : [],     // Array of question objects
  currentIndex  : 0,      // Which question we're on
  score         : 0,      // Points earned
  correctCount  : 0,
  wrongCount    : 0,
  skippedCount  : 0,
  answered      : false,  // Has the user answered current Q?
  timerInterval : null,
  timeLeft      : CONFIG.TIMER_SECONDS,
  selectedCat   : '9',
  selectedDiff  : 'easy',
  userAnswers   : [],     // [{question, correct, chosen, wasCorrect}]
};

/* ══════════════════════════════════════
   3. DOM CACHE — All element references
   ══════════════════════════════════════ */
const DOM = {
  screens: {
    start   : document.getElementById('startScreen'),
    loading : document.getElementById('loadingScreen'),
    quiz    : document.getElementById('quizScreen'),
    result  : document.getElementById('resultScreen'),
    review  : document.getElementById('reviewScreen'),
  },
  // Start
  startBtn          : document.getElementById('startBtn'),
  categoryPills     : document.getElementById('categoryPills'),
  diffPills         : document.getElementById('diffPills'),
  apiNote           : document.getElementById('apiNote'),
  // Quiz HUD
  questionCounter   : document.getElementById('questionCounter'),
  scoreDisplay      : document.getElementById('scoreDisplay'),
  timerNum          : document.getElementById('timerNum'),
  timerCircle       : document.getElementById('timerCircle'),
  progressFill      : document.getElementById('progressFill'),
  qCategory         : document.getElementById('qCategory'),
  questionText      : document.getElementById('questionText'),
  optionsGrid       : document.getElementById('optionsGrid'),
  qFeedback         : document.getElementById('qFeedback'),
  questionCard      : document.getElementById('questionCard'),
  // Result
  resultEmoji       : document.getElementById('resultEmoji'),
  resultGrade       : document.getElementById('resultGrade'),
  scorePct          : document.getElementById('scorePct'),
  scoreArc          : document.getElementById('scoreArc'),
  statCorrect       : document.getElementById('statCorrect'),
  statWrong         : document.getElementById('statWrong'),
  statSkipped       : document.getElementById('statSkipped'),
  newHighBanner     : document.getElementById('newHighBanner'),
  restartBtn        : document.getElementById('restartBtn'),
  reviewBtn         : document.getElementById('reviewBtn'),
  // Review
  reviewList        : document.getElementById('reviewList'),
  backBtn           : document.getElementById('backBtn'),
  // Header
  themeToggle       : document.getElementById('themeToggle'),
  highScoreVal      : document.getElementById('highScoreVal'),
  // Theme icon
  themeIcon         : document.querySelector('.theme-icon'),
};

/* ══════════════════════════════════════
   4. STORAGE MODULE — High score & theme
   ══════════════════════════════════════ */
const Storage = {
  getHighScore() {
    return parseInt(localStorage.getItem(CONFIG.LS_HIGH_SCORE) || '0', 10);
  },
  setHighScore(score) {
    const current = this.getHighScore();
    if (score > current) {
      localStorage.setItem(CONFIG.LS_HIGH_SCORE, score);
      return true; // New high score!
    }
    return false;
  },
  getTheme() {
    return localStorage.getItem(CONFIG.LS_THEME) || 'dark';
  },
  setTheme(theme) {
    localStorage.setItem(CONFIG.LS_THEME, theme);
  }
};

/* ══════════════════════════════════════
   5. THEME MODULE — Dark / Light toggle
   ══════════════════════════════════════ */
const Theme = {
  init() {
    const saved = Storage.getTheme();
    document.documentElement.setAttribute('data-theme', saved);
    DOM.themeIcon.textContent = saved === 'dark' ? '☀️' : '🌙';
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    DOM.themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
    Storage.setTheme(next);
  }
};

/* ══════════════════════════════════════
   6. API MODULE — Fetch from Open Trivia DB
   ══════════════════════════════════════ */
const API = {
  /**
   * Fetches questions from Open Trivia DB.
   * Returns normalized question array on success,
   * falls back to local questions on failure.
   */
  async fetchQuestions(category, difficulty) {
    const url = `${CONFIG.API_BASE}?amount=${CONFIG.TOTAL_QUESTIONS}&category=${category}&difficulty=${difficulty}&type=multiple`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      if (data.response_code !== 0 || !data.results?.length) {
        throw new Error('No results from API');
      }
      DOM.apiNote.textContent = '✓ Questions loaded from Open Trivia DB';
      return data.results.map(this._normalize);
    } catch (err) {
      console.warn('API fetch failed, using fallback questions:', err.message);
      DOM.apiNote.textContent = '⚠ Offline mode — using built-in questions';
      return this._getFallback();
    }
  },

  /** Normalize API response to our internal format */
  _normalize(q) {
    // Decode HTML entities from API strings
    const decode = (str) => {
      const txt = document.createElement('textarea');
      txt.innerHTML = str;
      return txt.value;
    };
    const correct = decode(q.correct_answer);
    const all = [...q.incorrect_answers.map(decode), correct];
    // Shuffle options
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return {
      question : decode(q.question),
      correct  : correct,
      options  : all,
      category : decode(q.category),
    };
  },

  /** Get shuffled fallback questions */
  _getFallback() {
    const shuffled = [...CONFIG.FALLBACK_QUESTIONS]
      .sort(() => Math.random() - 0.5)
      .slice(0, CONFIG.TOTAL_QUESTIONS);
    // Shuffle options within each question
    return shuffled.map(q => ({
      ...q,
      options: [...q.options].sort(() => Math.random() - 0.5)
    }));
  }
};

/* ══════════════════════════════════════
   7. TIMER MODULE — Countdown logic
   ══════════════════════════════════════ */
const Timer = {
  /** SVG circle circumference for r=18: 2π×18 ≈ 113.1 */
  CIRCUMFERENCE: 113.1,

  start() {
    State.timeLeft = CONFIG.TIMER_SECONDS;
    this._update();
    State.timerInterval = setInterval(() => {
      State.timeLeft--;
      this._update();
      if (State.timeLeft <= 0) {
        this.stop();
        Quiz.handleTimeout();
      }
    }, 1000);
  },

  stop() {
    clearInterval(State.timerInterval);
    State.timerInterval = null;
  },

  reset() {
    this.stop();
    State.timeLeft = CONFIG.TIMER_SECONDS;
    this._update();
  },

  _update() {
    const t = State.timeLeft;
    const pct = t / CONFIG.TIMER_SECONDS;
    const offset = this.CIRCUMFERENCE * (1 - pct);

    // Update SVG arc
    DOM.timerCircle.style.strokeDashoffset = offset;

    // Update number
    DOM.timerNum.textContent = t;

    // Colour states: warn < 40%, danger < 20%
    DOM.timerCircle.classList.remove('warn', 'danger');
    DOM.timerNum.classList.remove('danger');
    if (pct <= 0.2) {
      DOM.timerCircle.classList.add('danger');
      DOM.timerNum.classList.add('danger');
    } else if (pct <= 0.4) {
      DOM.timerCircle.classList.add('warn');
    }
  }
};

/* ══════════════════════════════════════
   8. UI MODULE — Screen & render helpers
   ══════════════════════════════════════ */
const UI = {
  /** Show only the requested screen */
  showScreen(name) {
    Object.values(DOM.screens).forEach(s => s.classList.add('hidden'));
    DOM.screens[name].classList.remove('hidden');
  },

  /** Inject a question + its options into the card */
  renderQuestion(q, index) {
    const labels = ['A', 'B', 'C', 'D'];
    const total  = State.questions.length;

    // HUD updates
    DOM.questionCounter.textContent = `${index + 1} / ${total}`;
    DOM.scoreDisplay.textContent    = State.score;
    DOM.qCategory.textContent       = q.category || 'Question';
    DOM.questionText.innerHTML      = q.question;

    // Progress bar
    DOM.progressFill.style.width = `${(index / total) * 100}%`;

    // Reset feedback
    DOM.qFeedback.className = 'q-feedback hidden';
    DOM.qFeedback.innerHTML = '';

    // Build options
    DOM.optionsGrid.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.dataset.value = opt;
      btn.innerHTML = `
        <span class="option-letter">${labels[i]}</span>
        <span class="option-text">${opt}</span>
        <span class="option-icon"></span>
      `;
      btn.addEventListener('click', () => Quiz.handleAnswer(opt, btn));
      DOM.optionsGrid.appendChild(btn);
    });

    // Card flip animation
    DOM.questionCard.classList.remove('flip');
    void DOM.questionCard.offsetWidth; // force reflow
    DOM.questionCard.classList.add('flip');
  },

  /** Show feedback strip below the options */
  showFeedback(type, message) {
    const icons = { correct: '✓', wrong: '✗', timeout: '⏱' };
    const classes = { correct: 'correct-fb', wrong: 'wrong-fb', timeout: 'timeout-fb' };
    DOM.qFeedback.className = `q-feedback ${classes[type]}`;
    DOM.qFeedback.innerHTML = `<span class="feedback-icon">${icons[type]}</span><span class="feedback-text">${message}</span>`;
  },

  /** Mark buttons correct/wrong after answer */
  revealAnswer(correctAnswer, chosenBtn) {
    const allBtns = DOM.optionsGrid.querySelectorAll('.option-btn');
    allBtns.forEach(btn => {
      btn.disabled = true;
      const val = btn.dataset.value;
      if (val === correctAnswer) {
        btn.classList.add('correct');
        btn.querySelector('.option-icon').textContent = '✓';
      } else if (btn === chosenBtn && val !== correctAnswer) {
        btn.classList.add('wrong');
        btn.querySelector('.option-icon').textContent = '✗';
        btn.classList.add('shake');
        btn.addEventListener('animationend', () => btn.classList.remove('shake'), { once: true });
      }
    });
  },

  /** Update high score in header */
  updateHighScoreDisplay() {
    const hs = Storage.getHighScore();
    DOM.highScoreVal.textContent = hs > 0 ? hs : '--';
  }
};

/* ══════════════════════════════════════
   9. QUIZ MODULE — Core game logic
   ══════════════════════════════════════ */
const Quiz = {
  /** Called when Start is clicked */
  async start() {
    // Reset state
    State.currentIndex = 0;
    State.score        = 0;
    State.correctCount = 0;
    State.wrongCount   = 0;
    State.skippedCount = 0;
    State.answered     = false;
    State.userAnswers  = [];

    // Show loading
    UI.showScreen('loading');

    // Fetch questions
    State.questions = await API.fetchQuestions(State.selectedCat, State.selectedDiff);

    // Start quiz
    UI.showScreen('quiz');
    this.loadQuestion(0);
  },

  /** Load a question by index */
  loadQuestion(index) {
    const q = State.questions[index];
    if (!q) {
      // No more questions → show results
      this.finish();
      return;
    }
    State.answered = false;
    UI.renderQuestion(q, index);
    Timer.start();
  },

  /** User clicked an option */
  handleAnswer(chosen, btnEl) {
    if (State.answered) return;
    State.answered = true;
    Timer.stop();

    const q = State.questions[State.currentIndex];
    const isCorrect = chosen === q.correct;

    // Update score
    if (isCorrect) {
      State.score++;
      State.correctCount++;
      // Bonus point if answered quickly (within half the timer)
      if (State.timeLeft > CONFIG.TIMER_SECONDS / 2) State.score++;
    } else {
      State.wrongCount++;
    }

    // Record answer for review
    State.userAnswers.push({
      question  : q.question,
      correct   : q.correct,
      chosen    : chosen,
      wasCorrect: isCorrect,
      skipped   : false,
    });

    // Reveal correct/wrong
    UI.revealAnswer(q.correct, btnEl);
    UI.showFeedback(
      isCorrect ? 'correct' : 'wrong',
      isCorrect ? `+1 point${State.timeLeft > CONFIG.TIMER_SECONDS / 2 ? ' +1 speed bonus!' : ''}` : `Correct: ${q.correct}`
    );

    // Auto-advance
    setTimeout(() => this.advance(), CONFIG.NEXT_DELAY_MS);
  },

  /** Timer ran out */
  handleTimeout() {
    if (State.answered) return;
    State.answered = true;
    State.skippedCount++;

    const q = State.questions[State.currentIndex];
    State.userAnswers.push({
      question  : q.question,
      correct   : q.correct,
      chosen    : null,
      wasCorrect: false,
      skipped   : true,
    });

    UI.revealAnswer(q.correct, null);
    UI.showFeedback('timeout', `Time's up! Correct: ${q.correct}`);

    setTimeout(() => this.advance(), CONFIG.NEXT_DELAY_MS);
  },

  /** Move to next question or end */
  advance() {
    Timer.reset();
    State.currentIndex++;
    if (State.currentIndex >= State.questions.length) {
      this.finish();
    } else {
      this.loadQuestion(State.currentIndex);
    }
  },

  /** End of quiz — show results */
  finish() {
    Timer.stop();
    // Full progress bar
    DOM.progressFill.style.width = '100%';
    Results.show();
    UI.showScreen('result');
  }
};

/* ══════════════════════════════════════
   10. RESULTS MODULE — Score display
   ══════════════════════════════════════ */
const Results = {
  /** Render the results screen */
  show() {
    const total = State.questions.length;
    const pct   = Math.round((State.score / (total * 2)) * 100); // max is 2 pts/question with speed bonus
    // Use correct answers for grade percentage
    const gradePct = Math.round((State.correctCount / total) * 100);

    // Emoji & grade
    const { emoji, grade } = this._getGrade(gradePct);
    DOM.resultEmoji.textContent = emoji;
    DOM.resultGrade.textContent = grade;

    // Score percentage (based on correct/total)
    DOM.scorePct.textContent = `${gradePct}%`;

    // Animate the SVG arc
    // Circumference for r=52: 2π×52 ≈ 326.7
    const circumference = 326.7;
    const offset = circumference * (1 - gradePct / 100);
    // Small delay so animation is visible
    setTimeout(() => {
      DOM.scoreArc.style.strokeDashoffset = offset;
      DOM.scoreArc.style.stroke = this._getArcColor(gradePct);
    }, 200);

    // Stat counters
    DOM.statCorrect.textContent = State.correctCount;
    DOM.statWrong.textContent   = State.wrongCount;
    DOM.statSkipped.textContent = State.skippedCount;

    // High score
    const isNew = Storage.setHighScore(State.score);
    DOM.newHighBanner.classList.toggle('hidden', !isNew);
    UI.updateHighScoreDisplay();
  },

  _getGrade(pct) {
    if (pct === 100) return { emoji: '🏆', grade: 'Perfect Score!' };
    if (pct >= 80)  return { emoji: '🎉', grade: 'Excellent!' };
    if (pct >= 60)  return { emoji: '👍', grade: 'Good Job!' };
    if (pct >= 40)  return { emoji: '📚', grade: 'Keep Studying' };
    return { emoji: '💪', grade: 'Try Again!' };
  },

  _getArcColor(pct) {
    if (pct >= 80) return '#00c26f'; // green
    if (pct >= 60) return '#7c5cff'; // accent
    if (pct >= 40) return '#ff9f0a'; // warning
    return '#ff3b5c';                // red
  },

  /** Render the review screen */
  buildReview() {
    DOM.reviewList.innerHTML = '';
    State.userAnswers.forEach((ans, i) => {
      const item = document.createElement('div');
      let cls = 'review-item ';
      cls += ans.skipped ? 'rev-skipped' : ans.wasCorrect ? 'rev-correct' : 'rev-wrong';
      item.className = cls;

      let answersHtml = `<div class="rev-answers">`;
      // Show correct answer
      answersHtml += `<div class="rev-answer rev-correct-ans">
        <span class="rev-dot"></span>
        <span>Correct: ${ans.correct}</span>
      </div>`;
      // Show chosen answer if wrong
      if (ans.chosen && !ans.wasCorrect) {
        answersHtml += `<div class="rev-answer rev-wrong-ans">
          <span class="rev-dot"></span>
          <span>Your answer: ${ans.chosen}</span>
        </div>`;
      }
      if (ans.skipped) {
        answersHtml += `<div class="rev-answer" style="color:var(--warning)"><span class="rev-dot" style="background:var(--warning)"></span><span>Timed out</span></div>`;
      }
      answersHtml += `</div>`;

      item.innerHTML = `
        <div class="rev-q-num">Q${i + 1} · ${ans.wasCorrect ? '✓ Correct' : ans.skipped ? '⏱ Skipped' : '✗ Wrong'}</div>
        <div class="rev-q-text">${ans.question}</div>
        ${answersHtml}
      `;
      DOM.reviewList.appendChild(item);
    });
  }
};

/* ══════════════════════════════════════
   11. EVENTS — Bootstrap all listeners
   ══════════════════════════════════════ */
function initEvents() {
  // Theme toggle
  DOM.themeToggle.addEventListener('click', Theme.toggle.bind(Theme));

  // Start quiz
  DOM.startBtn.addEventListener('click', () => Quiz.start());

  // Category pills
  DOM.categoryPills.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    DOM.categoryPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    State.selectedCat = pill.dataset.cat;
  });

  // Difficulty pills
  DOM.diffPills.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    DOM.diffPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    State.selectedDiff = pill.dataset.diff;
  });

  // Restart
  DOM.restartBtn.addEventListener('click', () => {
    UI.showScreen('start');
  });

  // Review answers
  DOM.reviewBtn.addEventListener('click', () => {
    Results.buildReview();
    UI.showScreen('review');
  });

  // Back from review
  DOM.backBtn.addEventListener('click', () => {
    UI.showScreen('result');
  });
}

/* ══════════════════════════════════════
   12. INIT — Entry point
   ══════════════════════════════════════ */
function init() {
  Theme.init();
  UI.updateHighScoreDisplay();
  initEvents();
  DOM.apiNote.textContent = 'Select a category and difficulty to begin.';
}

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', init);
