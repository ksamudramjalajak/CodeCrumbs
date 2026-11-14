const state = {
  selectedAnswer: null,
  answered: false,
  snackUnlocked: false,
  questionIndex: 3,
  totalQuestions: 8,
  completedBites: 3,
  streak: 4,
  timer: null,
  secondsLeft: 120,
  duration: 2,
  score: 0,
  breakHasStarted: false,
};

const $ = (selector) => document.querySelector(selector);
const answerButtons = [...document.querySelectorAll('.answer-option')];
const continueButton = $('#continueButton');
const feedback = $('#feedback');
const hintButton = $('#hintButton');
const hintText = $('#hintText');
const breakCard = $('#breakCard');
const breakButton = $('#breakButton');
const breakButtonText = $('#breakButtonText');
const breakButtonIcon = $('#breakButtonIcon');
const lockPill = $('#lockPill');
const breakTitle = $('#breakTitle');
const breakDescription = $('#breakDescription');
const snackModal = $('#snackModal');
const timerDisplay = $('#timerDisplay');
const timerRing = document.querySelector('.timer-ring');
const scoreDisplay = $('#snackScore');
const toast = $('#toast');

function updateProgress() {
  const percent = Math.round((state.completedBites / state.totalQuestions) * 100);
  $('#goalValue').textContent = `${percent}%`;
  $('#goalDone').textContent = state.completedBites;
  $('#progressCopy').textContent = `Bite ${state.questionIndex} of ${state.totalQuestions}`;
  $('#lessonProgress').style.width = `${percent}%`;
  $('#pathCount').textContent = `${state.completedBites} / ${state.totalQuestions}`;
  const ring = document.querySelector('.goal-ring');
  ring.style.background = `conic-gradient(var(--orange) 0 ${percent}%, #f0efe8 ${percent}% 100%)`;
}

function selectAnswer(button) {
  if (state.answered) return;
  answerButtons.forEach((option) => option.classList.remove('selected'));
  button.classList.add('selected');
  state.selectedAnswer = button.dataset.answer;
  continueButton.disabled = false;
  continueButton.innerHTML = 'Check answer <span>→</span>';
}

function checkAnswer() {
  if (!state.selectedAnswer) {
    showToast('Pick an answer first ✦');
    return;
  }
  if (state.answered) {
    openSnackBreak();
    return;
  }

  state.answered = true;
  const selected = answerButtons.find((option) => option.dataset.answer === state.selectedAnswer);
  const correct = state.selectedAnswer === '3';
  selected.classList.add(correct ? 'correct' : 'incorrect');
  if (!correct) {
    const right = answerButtons.find((option) => option.dataset.answer === '3');
    right.classList.add('correct');
    feedback.querySelector('strong').textContent = 'Almost there!';
    feedback.querySelector('div span').innerHTML = 'There are 3 items — <code>len()</code> counts the items in a list.';
    feedback.style.background = '#fff6ee';
    feedback.style.color = '#985d44';
    feedback.querySelector('.feedback-icon').textContent = '→';
    feedback.querySelector('.feedback-icon').style.background = '#ffe1ce';
  }
  feedback.hidden = false;
  answerButtons.forEach((option) => { option.disabled = true; });
  continueButton.innerHTML = correct ? 'Unlock snack break <span>→</span>' : 'Got it — unlock break <span>→</span>';
  continueButton.disabled = false;
  unlockSnack();
}

function unlockSnack() {
  state.snackUnlocked = true;
  breakCard.classList.remove('locked');
  breakCard.classList.add('unlocked');
  lockPill.innerHTML = '<span>✦</span> Unlocked';
  breakTitle.textContent = 'You earned a snack';
  breakDescription.textContent = 'Take a tiny reset, then we’ll keep building your Python brain.';
  breakButton.disabled = false;
  breakButtonIcon.textContent = '▶';
  breakButtonText.textContent = 'Start snack break';
  document.querySelector('.after-card-note').innerHTML = '<span class="sparkle">✦</span> Your reward is ready when you are <span class="note-arrow">→</span>';
  if (state.selectedAnswer === '3') {
    showToast('Snack break unlocked — nice work!');
  }
}

function openSnackBreak() {
  if (!state.snackUnlocked) return;
  snackModal.hidden = false;
  document.body.style.overflow = 'hidden';
  state.breakHasStarted = true;
  state.score = 0;
  scoreDisplay.textContent = '0';
  state.secondsLeft = state.duration * 60;
  updateTimer();
  startTimer();
  requestAnimationFrame(() => $('.snack-modal').querySelector('.modal-close').focus());
}

function startTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.secondsLeft -= 1;
    updateTimer();
    if (state.secondsLeft <= 0) {
      finishSnackBreak();
    }
  }, 1000);
}

function updateTimer() {
  const minutes = Math.floor(state.secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (state.secondsLeft % 60).toString().padStart(2, '0');
  timerDisplay.textContent = `${minutes}:${seconds}`;
  const totalSeconds = state.duration * 60;
  const usedPercent = Math.max(0, Math.min(100, ((totalSeconds - state.secondsLeft) / totalSeconds) * 100));
  timerRing.style.background = `conic-gradient(var(--orange) 0 ${usedPercent}%, #ecefe8 ${usedPercent}% 100%)`;
}

function closeSnackBreak(message = 'Break paused — your next bite is ready whenever you are.') {
  clearInterval(state.timer);
  state.breakHasStarted = false;
  snackModal.hidden = true;
  document.body.style.overflow = '';
  if (message) showToast(message);
}

function finishSnackBreak() {
  clearInterval(state.timer);
  $('#snackTitle').textContent = 'Welcome back, snack scholar';
  $('.modal-subtitle').textContent = 'Your reset is complete. Let’s turn that energy into one more Python win.';
  $('.modal-icon').textContent = '✨';
  $('.modal-bottom > span').innerHTML = '<span class="pulse-dot"></span> Next lesson queued up';
  $('#endBreakButton').textContent = 'Continue learning →';
  $('#endBreakButton').onclick = continueLearning;
  document.querySelectorAll('.duration-option').forEach((button) => { button.disabled = true; });
  document.querySelectorAll('.falling-snack').forEach((button) => { button.disabled = true; });
  showToast('Break complete — back to the Python path!');
}

function continueLearning() {
  clearInterval(state.timer);
  state.breakHasStarted = false;
  snackModal.hidden = true;
  document.body.style.overflow = '';
  document.querySelectorAll('.duration-option').forEach((button) => { button.disabled = false; });
  document.querySelectorAll('.falling-snack').forEach((button) => { button.disabled = false; });
  $('#snackTitle').textContent = 'Cookie Catch';
  $('.modal-subtitle').textContent = 'Catch as many crumbs as you can before your break is done.';
  $('.modal-icon').textContent = '🍪';
  $('#endBreakButton').textContent = 'End break early →';
  $('#endBreakButton').onclick = () => closeSnackBreak();
  advanceLesson();
}

function advanceLesson() {
  state.completedBites = Math.min(state.totalQuestions, state.completedBites + 1);
  state.questionIndex = Math.min(state.totalQuestions, state.questionIndex + 1);
  state.selectedAnswer = null;
  state.answered = false;
  answerButtons.forEach((button) => {
    button.disabled = false;
    button.classList.remove('selected', 'correct', 'incorrect');
  });
  feedback.hidden = true;
  feedback.style.background = '';
  feedback.style.color = '';
  feedback.querySelector('strong').textContent = 'Nice bite!';
  feedback.querySelector('div span').innerHTML = '<code>len()</code> counts every item in the list.';
  feedback.querySelector('.feedback-icon').textContent = '✓';
  feedback.querySelector('.feedback-icon').style.background = '';
  continueButton.disabled = true;
  continueButton.innerHTML = 'Check answer <span>→</span>';
  hintText.hidden = true;
  hintButton.innerHTML = '<span class="hint-icon">✦</span> Give me a hint';
  $('#questionNumber').innerHTML = `${String(state.questionIndex).padStart(2, '0')} <span>/ 08</span>`;
  $('#questionTitle').textContent = 'Which line adds one snack to the list?';
  document.querySelector('.code-block pre').innerHTML = '<span class="code-purple">snacks</span> = [<span class="code-orange">"cookie"</span>]\n<span class="code-yellow">?</span>(<span class="code-orange">"apple"</span>)';
  answerButtons[0].querySelector('span:last-child').textContent = 'snacks.add("apple")';
  answerButtons[1].querySelector('span:last-child').textContent = 'snacks.append("apple")';
  answerButtons[2].querySelector('span:last-child').textContent = 'snacks.push("apple")';
  updateProgress();
  document.querySelector('.question-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast('Next bite ready — keep the momentum!');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

answerButtons.forEach((button) => button.addEventListener('click', () => selectAnswer(button)));
continueButton.addEventListener('click', checkAnswer);
hintButton.addEventListener('click', () => {
  hintText.hidden = !hintText.hidden;
  hintButton.innerHTML = hintText.hidden ? '<span class="hint-icon">✦</span> Give me a hint' : '<span class="hint-icon">✦</span> Hide hint';
});
breakButton.addEventListener('click', openSnackBreak);
$('#closeModal').addEventListener('click', () => closeSnackBreak());
$('#endBreakButton').addEventListener('click', () => continueLearning());
$('#viewPathButton').addEventListener('click', () => showToast('Full path view is coming to the kitchen soon ✦'));

document.querySelectorAll('.duration-option').forEach((button) => {
  button.addEventListener('click', () => {
    if (state.breakHasStarted && state.secondsLeft < state.duration * 60) return;
    document.querySelectorAll('.duration-option').forEach((option) => option.classList.remove('selected'));
    button.classList.add('selected');
    state.duration = Number(button.dataset.minutes);
    state.secondsLeft = state.duration * 60;
    updateTimer();
  });
});

document.querySelectorAll('.falling-snack').forEach((snack) => {
  snack.addEventListener('click', () => {
    if (!state.breakHasStarted || state.secondsLeft <= 0) return;
    state.score += 1;
    scoreDisplay.textContent = state.score;
    snack.animate([{ transform: 'scale(1.35)', opacity: 1 }, { transform: 'scale(.4)', opacity: 0 }], { duration: 220, easing: 'ease-out' });
    setTimeout(() => snack.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: 'ease-out' }), 230);
  });
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !snackModal.hidden) closeSnackBreak();
  if (!state.answered && ['1', '2', '3'].includes(event.key)) selectAnswer(answerButtons[Number(event.key) - 1]);
});

updateProgress();
