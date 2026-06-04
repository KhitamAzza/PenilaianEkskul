// ===== CONFIG =====
const API_URL = 'https://script.google.com/macros/s/AKfycbzTgsywx841aOg2cDYqtK2Zkd9X-PAwYwX2_9H-buXxMD_1CFqEkVezbJZzNiILu4Rs/exec'; // CHANGE THIS

const COACHES = {
  "eksesport": { name: "Masduki Zen", ekstra: "E-Sport" },
  "eksfutsal": { name: "Rizky", ekstra: "Futsal" },
  "ekspakbola": { name: "Rico Yoga", ekstra: "Sepakbola" },
  "eksperdiri": { name: "Yudi Setiono", ekstra: "Perisai diri" },
  "eksmusik": { name: "M ismail", ekstra: "Musik" },
  "eksminton": { name: "Deni Affandi", ekstra: "Badminton" },
  "eksbasket": { name: "Syamsul Arif", ekstra: "Basket" },
  "eksbvoli": { name: "Achamd Wahyudi", ekstra: "Bola Voli" },
  "eksbanjari": { name: "Rahmad Hidayat", ekstra: "Al-Banjari" },
  "ekstari": { name: "Nila", ekstra: "Seni tari" },
  "ekstabog": { name: "M Iqbal", ekstra: "Tata Boga" },
  "eksarias": { name: "Dina", ekstra: "Tata rias" },
  "ekstapmr": { name: "Nur Khozinatul", ekstra: "PMR" },
  "ekswondo": { name: "jalupaka", ekstra: "Taekwondo" },
  "eksdance": { name: "Ocha", ekstra: "Dance" },
  "ekscatur": { name: "Vanny", ekstra: "Catur" },
  "ekscinalam": { name: "Ergananta", ekstra: "Pecinta Alam" }
};

// ===== STATE =====
let currentCoach = null;
let students = [];
let currentIndex = 0;
let scores = {};
let touchStartY = 0;
let touchStartX = 0;
let isSwiping = false;
let isAnimating = false;

// ===== SOUND EFFECTS =====
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'next') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'prev') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'summary') {
      // Two-tone success chord
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659, now + 0.05);
      gain2.gain.setValueAtTime(0.12, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.35);
    }
  } catch (e) {
    // Audio not supported, silently fail
  }
}

// ===== LOGIN =====
function handleLogin() {
  const input = document.getElementById('passwordInput').value.trim().toLowerCase();
  const error = document.getElementById('loginError');

  if (COACHES[input]) {
    currentCoach = COACHES[input];
    error.classList.remove('show');
    showLoading();
    loadStudents();
  } else {
    error.classList.add('show');
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordInput').focus();
  }
}

document.getElementById('passwordInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleLogin();
});

document.getElementById('passwordInput').addEventListener('input', (e) => {
  const val = e.target.value.trim().toLowerCase();
  if (COACHES[val]) {
    handleLogin();
  }
});

// ===== LOADING =====
function showLoading() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'flex';
}

function updateLoading(percent, text) {
  document.getElementById('loadingBar').style.width = percent + '%';
  document.getElementById('loadingStatus').textContent = text || percent + '%';
}

// ===== PHOTO URL HELPER =====
function getPhotoUrl(idFoto) {
  if (!idFoto) return null;
  const id = idFoto.toString().trim();
  if (id.startsWith('http://') || id.startsWith('https://')) {
    return id;
  }
  return `https://drive.google.com/uc?export=view&id=${id}`;
}

// ===== FETCH STUDENTS =====
async function loadStudents() {
  try {
    const response = await fetch(`${API_URL}?action=students&ekstra=${encodeURIComponent(currentCoach.ekstra)}`);
    const data = await response.json();

    if (data.status !== 'ok') {
      throw new Error(data.message || 'Gagal memuat data');
    }

    students = data.students;

    if (students.length === 0) {
      showToast('Tidak ada siswa untuk ekstra ini', 'error');
      setTimeout(() => location.reload(), 2000);
      return;
    }

    students.forEach((s, idx) => {
      if (s.nilai !== null && s.nilai !== undefined && s.nilai !== '') {
        scores[idx] = Number(s.nilai);
      }
    });

    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('gradingScreen').style.display = 'block';

    initReel();
    showToast(`Selamat datang, ${currentCoach.name}! ${students.length} siswa ditemukan`, 'success');

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    console.error(err);
  }
}

// ===== REEL INTERFACE =====
function initReel() {
  const container = document.getElementById('reelContainer');
  container.innerHTML = '';

  renderCard(-1);
  renderCard(0);
  renderCard(1);

  setupSwipe();
}

function renderCard(offset) {
  const idx = currentIndex + offset;
  if (idx < 0 || idx >= students.length) return;

  const container = document.getElementById('reelContainer');
  const s = students[idx];
  const existingScore = scores[idx];
  const photoUrl = getPhotoUrl(s.idFoto);

  const hasExisting = s.nilai !== null && s.nilai !== undefined && s.nilai !== '';
  const inputClass = existingScore !== undefined ? 'has-value' : hasExisting ? 'existing' : '';

  const card = document.createElement('div');
  card.className = `student-card ${offset === 0 ? 'active' : offset === -1 ? 'prev' : 'next'}`;
  card.dataset.index = idx;

  // Build progress segments
  let progressHtml = '<div class="card-progress">';
  for (let i = 0; i < students.length; i++) {
    let segClass = '';
    if (i < idx) segClass = 'done';
    else if (i === idx) segClass = 'current';
    progressHtml += `<div class="card-progress-segment ${segClass}"></div>`;
  }
  progressHtml += '</div>';

  card.innerHTML = `
    ${progressHtml}
    <div class="student-counter">${idx + 1} / ${students.length}</div>
    <div class="photo-frame">
      ${photoUrl ? 
        `<img class="student-photo" src="${photoUrl}" alt="${s.nama}" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'photo-placeholder\'>👤</div>'">` :
        `<div class="photo-placeholder">👤</div>`
      }
      <div class="photo-overlay">
        <div class="student-name">${s.nama}</div>
        <div class="student-class">${s.kelas} • ${currentCoach.ekstra}</div>
      </div>
    </div>
    <div class="score-section">
      <div class="score-label">Nilai Sikap</div>
      <input 
        type="number" 
        class="score-input ${inputClass}" 
        id="scoreInput-${idx}"
        placeholder="0-100"
        min="0" 
        max="100"
        value="${existingScore !== undefined ? existingScore : ''}"
        oninput="handleScoreInput(${idx}, this.value)"
        onfocus="this.select()"
      >
      <div class="score-hint">Geser atas/bawah untuk navigasi</div>
    </div>
  `;

  container.appendChild(card);
}

function updateCards() {
  const container = document.getElementById('reelContainer');
  container.innerHTML = '';
  renderCard(-1);
  renderCard(0);
  renderCard(1);
}

// ===== SCORE HANDLING =====
function handleScoreInput(idx, value) {
  const num = value === '' ? undefined : Number(value);

  if (value === '') {
    delete scores[idx];
  } else if (!isNaN(num) && num >= 0 && num <= 100) {
    scores[idx] = num;
  }

  const input = document.getElementById(`scoreInput-${idx}`);
  if (input) {
    if (value !== '' && !isNaN(num) && num >= 0 && num <= 100) {
      input.classList.add('has-value');
      input.classList.remove('existing');
    } else {
      input.classList.remove('has-value');
    }
  }

  if (!isNaN(num) && num >= 0 && num <= 100 && value !== '') {
    clearTimeout(window.autoAdvanceTimer);
    window.autoAdvanceTimer = setTimeout(() => {
      if (currentIndex === idx && currentIndex < students.length - 1) {
        goNext();
      }
    }, 800);
  }
}

// ===== SWIPE NAVIGATION =====
function setupSwipe() {
  const container = document.getElementById('gradingScreen');
  let currentCard = null;
  let nextCard = null;
  let prevCard = null;

  function getCards() {
    currentCard = document.querySelector('.student-card.active');
    nextCard = document.querySelector('.student-card.next');
    prevCard = document.querySelector('.student-card.prev');
  }

  container.addEventListener('touchstart', (e) => {
    if (isAnimating) return;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    isSwiping = true;
    getCards();
    if (currentCard) currentCard.classList.add('dragging');
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isSwiping || isAnimating) return;
    const touchY = e.touches[0].clientY;
    const diff = touchStartY - touchY;
    const absDiff = Math.abs(diff);

    if (currentCard) {
      currentCard.style.setProperty('--drag-y', absDiff + 'px');
      if (diff > 0) {
        currentCard.classList.add('drag-up');
        currentCard.classList.remove('drag-down');
        if (nextCard) {
          const scale = 0.92 + Math.min(absDiff / 400, 0.08);
          const opacity = 0.6 + Math.min(absDiff / 300, 0.4);
          nextCard.style.transform = `translate(-50%, -50%) scale(${scale})`;
          nextCard.style.opacity = opacity;
        }
      } else {
        currentCard.classList.add('drag-down');
        currentCard.classList.remove('drag-up');
        if (prevCard) {
          const scale = 0.92 + Math.min(absDiff / 400, 0.08);
          const opacity = 0.6 + Math.min(absDiff / 300, 0.4);
          prevCard.style.transform = `translate(-50%, -50%) scale(${scale})`;
          prevCard.style.opacity = opacity;
        }
      }
    }
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;

    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;
    const threshold = 80;

    if (currentCard) {
      currentCard.classList.remove('dragging', 'drag-up', 'drag-down');
      currentCard.style.removeProperty('--drag-y');
    }

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goNext();
      } else {
        goPrev();
      }
    } else {
      // Snap back
      if (currentCard) {
        currentCard.style.transform = '';
        currentCard.style.transition = '';
      }
      if (nextCard) {
        nextCard.style.transform = '';
        nextCard.style.opacity = '';
      }
      if (prevCard) {
        prevCard.style.transform = '';
        prevCard.style.opacity = '';
      }
    }

    touchStartY = 0;
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (document.getElementById('gradingScreen').style.display !== 'block') return;
    if (isAnimating) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    }
  });
}

function goNext() {
  if (currentIndex >= students.length - 1) {
    playSound('summary');
    showSummary();
    return;
  }

  if (isAnimating) return;
  isAnimating = true;
  playSound('next');
  showSwipeHint('down');

  const currentCard = document.querySelector('.student-card.active');
  const nextCard = document.querySelector('.student-card.next');

  if (currentCard) {
    currentCard.classList.add('swipe-out-up');
    currentCard.classList.remove('active');
  }
  if (nextCard) {
    nextCard.classList.remove('next');
    nextCard.classList.add('swipe-in');
  }

  setTimeout(() => {
    currentIndex++;
    updateCards();
    isAnimating = false;
  }, 380);
}

function goPrev() {
  if (currentIndex <= 0) {
    showToast('Ini siswa pertama', 'error');
    return;
  }

  if (isAnimating) return;
  isAnimating = true;
  playSound('prev');
  showSwipeHint('up');

  const currentCard = document.querySelector('.student-card.active');
  const prevCard = document.querySelector('.student-card.prev');

  if (currentCard) {
    currentCard.classList.add('swipe-out-down');
    currentCard.classList.remove('active');
  }
  if (prevCard) {
    prevCard.classList.remove('prev');
    prevCard.classList.add('swipe-in');
  }

  setTimeout(() => {
    currentIndex--;
    updateCards();
    isAnimating = false;
  }, 380);
}

function showSwipeHint(direction) {
  const hint = document.getElementById(direction === 'up' ? 'swipeUpHint' : 'swipeDownHint');
  hint.classList.add('show');
  setTimeout(() => hint.classList.remove('show'), 600);
}

// ===== SUMMARY SCREEN =====
function showSummary() {
  document.getElementById('gradingScreen').style.display = 'none';
  document.getElementById('summaryScreen').style.display = 'flex';

  const list = document.getElementById('summaryList');
  list.innerHTML = '';

  let filledCount = 0;

  students.forEach((s, idx) => {
    const score = scores[idx];
    const hasScore = score !== undefined;
    if (hasScore) filledCount++;

    const photoUrl = getPhotoUrl(s.idFoto);

    const item = document.createElement('div');
    item.className = 'summary-item';
    item.innerHTML = `
      ${photoUrl ? 
        `<img class="summary-photo" src="${photoUrl}" alt="" loading="lazy" onerror="this.style.display='none'">` :
        `<div class="summary-photo" style="display:flex;align-items:center;justify-content:center;background:#333;font-size:20px;">👤</div>`
      }
      <div class="summary-info">
        <div class="summary-name">${s.nama}</div>
        <div class="summary-class">${s.kelas}</div>
      </div>
      <input 
        type="number" 
        class="summary-score-input ${hasScore ? 'has-value' : ''}" 
        value="${hasScore ? score : ''}"
        min="0" 
        max="100"
        onchange="updateSummaryScore(${idx}, this.value)"
      >
    `;
    list.appendChild(item);
  });

  document.getElementById('summarySubtitle').textContent = 
    `${filledCount} dari ${students.length} siswa sudah dinilai`;
}

function updateSummaryScore(idx, value) {
  const num = value === '' ? undefined : Number(value);

  if (value === '' || isNaN(num) || num < 0 || num > 100) {
    delete scores[idx];
  } else {
    scores[idx] = num;
  }

  const filledCount = Object.keys(scores).length;
  document.getElementById('summarySubtitle').textContent = 
    `${filledCount} dari ${students.length} siswa sudah dinilai`;
}

function backToGrading() {
  document.getElementById('summaryScreen').style.display = 'none';
  document.getElementById('gradingScreen').style.display = 'block';
  currentIndex = students.length - 1;
  updateCards();
}

// ===== SUBMIT =====
async function submitScores() {
  const btn = document.querySelector('.btn-primary');
  btn.textContent = 'Mengirim...';
  btn.disabled = true;

  try {
    const payload = students.map((s, idx) => ({
      idSiswa: s.idSiswa,
      nama: s.nama,
      kelas: s.kelas,
      ekstra: currentCoach.ekstra,
      nilai: scores[idx] !== undefined ? scores[idx] : null
    }));

    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ scores: payload })
    });

    const result = await response.json();

    if (result.status === 'ok') {
      showToast(`✅ ${result.message}`, 'success');
      scores = {};

      setTimeout(() => {
        location.reload();
      }, 2000);
    } else {
      throw new Error(result.message);
    }

  } catch (err) {
    showToast('❌ Gagal mengirim: ' + err.message, 'error');
    console.error(err);
  } finally {
    btn.textContent = 'Kirim Nilai';
    btn.disabled = false;
  }
}

// ===== UTILITIES =====
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
