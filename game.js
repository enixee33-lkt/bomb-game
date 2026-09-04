// ⚠️ 重要：請將下方的設定值替換成你在 Firebase 控制台獲得的專屬程式碼
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA92tY9X4za5ScTXgoVyfApy34aPb-m9sg",
  authDomain: "bomb-game-f61cf.firebaseapp.com",
  databaseURL: "https://bomb-game-f61cf-default-rtdb.firebaseio.com",
  projectId: "bomb-game-f61cf",
  storageBucket: "bomb-game-f61cf.firebasestorage.app",
  messagingSenderId: "486156336414",
  appId: "1:486156336414:web:ba234c2f894ff838489d0f",
  measurementId: "G-QCF89QNDSR"
};

// 全域變數宣告
let database = null;
const BOARD_SIZE = 9;
const MINE_COUNT = 10;

let board = [];
let mines = new Set();
let revealedCount = 0;
let flaggedCount = 0;
let isGameOver = false;
let hasUploadedThisGame = false;

// 計時器變數
let timerInterval = null;
let secondsElapsed = 0;
let isTimerRunning = false;

// DOM 元素快取
const boardEl = document.getElementById('minesweeper-board');
const gameStatusEl = document.getElementById('game-status');
const mineCountEl = document.getElementById('mine-count');
const timerEl = document.getElementById('timer');
const gameOverModal = document.getElementById('game-over-modal');
const gameResultTitle = document.getElementById('game-result-title');
const gameResultText = document.getElementById('game-result-text');
const restartBtn = document.getElementById('restart-btn');
const uploadScoreZone = document.getElementById('upload-score-zone');
const playerNameInput = document.getElementById('player-name-input');
const submitScoreBtn = document.getElementById('submit-score-btn');
const leaderboardList = document.getElementById('leaderboard-list');

// 網頁載入完成後啟動
window.onload = function() {
    // 檢查 Firebase 是否成功下載載入
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        startLeaderboardListener(); // 啟動雲端排行榜即時監聽
        console.log("Firebase 雲端初始化成功！");
    } else {
        console.error("Firebase 套件未成功載入，將切換為單機無排行模式。");
        leaderboardList.innerHTML = '<li>⚠️ 雲端連線失敗，目前為單機模式</li>';
    }
    
    // 初始化 9x9 棋盤
    initGame();
};

function initGame() {
    board = [];
    mines.clear();
    revealedCount = 0;
    flaggedCount = 0;
    isGameOver = false;
    hasUploadedThisGame = false;
    
    clearInterval(timerInterval);
    secondsElapsed = 0;
    isTimerRunning = false;
    timerEl.textContent = '0';
    mineCountEl.textContent = MINE_COUNT;

    gameOverModal.classList.add('hidden');
    uploadScoreZone.classList.add('hidden');
    gameStatusEl.textContent = "遊戲開始！小心不要踩到地雷。";

    boardEl.innerHTML = '';
    for (let r = 0; r < BOARD_SIZE; r++) {
        board[r] = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cellEl = document.createElement('div');
            cellEl.className = 'cell';
            cellEl.dataset.row = r;
            cellEl.dataset.col = c;

            cellEl.addEventListener('click', () => handleCellClick(r, c));
            cellEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleCellRightClick(r, c);
            });

            boardEl.appendChild(cellEl);
            board[r][c] = {
                element: cellEl,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0
            };
        }
    }

    let plantedMines = 0;
    while (plantedMines < MINE_COUNT) {
        const r = Math.floor(Math.random() * BOARD_SIZE);
        const c = Math.floor(Math.random() * BOARD_SIZE);
        const key = `${r},${c}`;
        
        if (!mines.has(key)) {
            mines.add(key);
            board[r][c].isMine = true;
            plantedMines++;
        }
    }

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c].isMine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                        if (board[nr][nc].isMine) count++;
                    }
                }
            }
            board[r][c].neighborMines = count;
        }
    }
}

function startTimer() {
    isTimerRunning = true;
    timerInterval = setInterval(() => {
        secondsElapsed++;
        timerEl.textContent = secondsElapsed;
    }, 1000);
}

function handleCellClick(r, c) {
    if (isGameOver) return;
    const cell = board[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    if (!isTimerRunning) {
        startTimer();
    }

    if (cell.isMine) {
        endGame(false);
        return;
    }

    revealCell(r, c);

    if (revealedCount === (BOARD_SIZE * BOARD_SIZE - MINE_COUNT)) {
        endGame(true);
    }
}

function revealCell(r, c) {
    const cell = board[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;
    cell.element.classList.add('revealed');
    revealedCount++;

    if (cell.neighborMines > 0) {
        cell.element.textContent = cell.neighborMines;
        cell.element.setAttribute('data-count', cell.neighborMines);
    } else {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                    revealCell(nr, nc);
                }
            }
        }
    }
}

function handleCellRightClick(r, c) {
    if (isGameOver) return;
    const cell = board[r][c];
    if (cell.isRevealed) return;

    if (!isTimerRunning) startTimer();

    if (!cell.isFlagged) {
        cell.isFlagged = true;
        cell.element.classList.add('flagged');
        cell.element.textContent = '🚩';
        flaggedCount++;
    } else {
        cell.isFlagged = false;
        cell.element.classList.remove('flagged');
        cell.element.textContent = '';
        flaggedCount--;
    }
    mineCountEl.textContent = Math.max(0, MINE_COUNT - flaggedCount);
}

function endGame(isWin) {
    isGameOver = true;
    clearInterval(timerInterval);

    if (isWin) {
        gameResultTitle.textContent = "🎉 順利通關！";
        gameResultText.textContent = `曾棒棒太厲害了！你花費了 ${secondsElapsed} 秒成功拆除所有地雷！`;
        if (database) uploadScoreZone.classList.remove('hidden');
    } else {
        gameResultTitle.textContent = "💥 💥 爆炸啦！";
        gameResultText.textContent = "很遺憾，你踩到地雷了。再接再厲！";
        
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c].isMine) {
                    board[r][c].element.classList.add('mine');
                    board[r][c].element.textContent = '💣';
                }
            }
        }
    }
    gameOverModal.classList.remove('hidden');
}

submitScoreBtn.addEventListener('click', () => {
    if (!database) return;
    const name = playerNameInput.value.trim();
    if (!name) { alert("請輸入名字再上傳！"); return; }
    if (hasUploadedThisGame) return;

    database.ref('minesweeper_scores').push({
        name: name,
        score: secondsElapsed,
        timestamp: Date.now()
    }).then(() => {
        alert("通關紀錄上傳成功！");
        uploadScoreZone.classList.add('hidden');
        hasUploadedThisGame = true;
    }).catch((error) => {
        console.error("上傳失敗:", error);
    });
});

function startLeaderboardListener() {
    if (!database) return;
    database.ref('minesweeper_scores').orderByChild('score').limitToFirst(20).on('value', (snapshot) => {
        const scores = [];
        snapshot.forEach((childSnapshot) => {
            scores.push(childSnapshot.val());
        });

        leaderboardList.innerHTML = '';
        if (scores.length === 0) {
            leaderboardList.innerHTML = '<li>目前還沒有速通紀錄</li>';
            return;
        }
        
        scores.forEach((item, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>No.${index + 1} ${item.name}</span> <span>⏱️ ${item.score} 秒</span>`;
            leaderboardList.appendChild(li);
        });
    });
}

restartBtn.addEventListener('click', initGame);

