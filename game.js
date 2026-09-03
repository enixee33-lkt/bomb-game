// ⚠️ 重要：請將下方的設定值替換成你在 Firebase 控制台獲得的專屬程式碼
const firebaseConfig = {
    apiKey: "AIzaSyA92tY9X4za5ScTXgoVyfApy34aPb-m9sg",
    authDomain: "bomb-game-f61cf.firebaseapp.com",
    databaseURL: "https://bomb-game-f61cf-default-rtdb.firebaseio.com",
    projectId: "bomb-game-f61cf",
    storageBucket: "bomb-game-f61cf.firebasestorage.app",
    messagingSenderId: "486156336414",
    appId: "1:486156336414:web:ba234c2f894ff838489d0f"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 9x9 踩地雷遊戲設定
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

// DOM 元素
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

// 初始化遊戲
function initGame() {
    board = [];
    mines.clear();
    revealedCount = 0;
    flaggedCount = 0;
    isGameOver = false;
    hasUploadedThisGame = false;
    
    // 重置計時器
    clearInterval(timerInterval);
    secondsElapsed = 0;
    isTimerRunning = false;
    timerEl.textContent = '0';
    mineCountEl.textContent = MINE_COUNT;

    gameOverModal.classList.add('hidden');
    uploadScoreZone.classList.add('hidden');
    gameStatusEl.textContent = "遊戲開始！小心不要踩到地雷。";

    // 建立 9x9 乾淨棋盤與格子
    boardEl.innerHTML = '';
    for (let r = 0; r < BOARD_SIZE; r++) {
        board[r] = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cellEl = document.createElement('div');
            cellEl.className = 'cell';
            cellEl.dataset.row = r;
            cellEl.dataset.col = c;

            // 綁定左鍵點擊 (翻開)
            cellEl.addEventListener('click', () => handleCellClick(r, c));
            // 綁定右鍵點擊 (插旗防爆)
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

    // 隨機佈置 10 顆地雷
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

    // 計算每個格子周圍的地雷數
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c].isMine) continue;
            let count = 0;
            // 搜尋周圍八個方位
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

// 啟動計時器
function startTimer() {
    isTimerRunning = true;
    timerInterval = setInterval(() => {
        secondsElapsed++;
        timerEl.textContent = secondsElapsed;
    }, 1000);
}

// 左鍵翻開格子
function handleCellClick(r, c) {
    if (isGameOver) return;
    const cell = board[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    // 玩家第一次點擊時，啟動計時器
    if (!isTimerRunning) {
        startTimer();
    }

    // 💥 踩到地雷，遊戲結束
    if (cell.isMine) {
        endGame(false);
        return;
    }

    // 翻開安全格子
    revealCell(r, c);

    // 🎉 檢查是否將所有安全格子都翻開了 (9x9 - 10顆雷 = 71個安全格)
    if (revealedCount === (BOARD_SIZE * BOARD_SIZE - MINE_COUNT)) {
        endGame(true);
    }
}

// 遞迴翻開格子 (如果周圍地雷是 0，會連鎖自動展開)
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
        // 周圍無雷，自動連鎖翻開八個方向
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

// 右鍵插旗或取消插旗
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

// 遊戲結束判定邏輯
function endGame(isWin) {
    isGameOver = true;
    clearInterval(timerInterval);

    if (isWin) {
        gameResultTitle.textContent = "🎉 順利通關！";
        gameResultText.textContent = `曾棒棒太厲害了！你花費了 ${secondsElapsed} 秒成功拆除所有地雷！`;
        uploadScoreZone.classList.remove('hidden'); // 贏了才可以上傳秒數排行榜
    } else {
        gameResultTitle.textContent = "💥 💥 爆炸啦！";
        gameResultText.textContent = "很遺憾，你踩到地雷了。再接再厲！";
        
        // 翻開所有地雷讓玩家看
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

// 💾 雲端功能：將玩家秒數上傳至 Firebase
submitScoreBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) { alert("請輸入名字再上傳！"); return; }
    if (hasUploadedThisGame) return;

    database.ref('minesweeper_scores').push({
        name: name,
        score: secondsElapsed, // 踩地雷排行榜比的是少秒數
        timestamp: Date.now()
    }).then(() => {
        alert("通關紀錄上傳成功！");
        uploadScoreZone.classList.add('hidden');
        hasUploadedThisGame = true;
    }).catch((error) => {
        console.error("上傳失敗:", error);
    });
});

// ⏳ 雲端功能：即時監聽並更新踩地雷排行榜 (最少秒數排在最上面)
database.ref('minesweeper_scores').orderByChild('score').limitToFirst(10).on('value', (snapshot) => {
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

restartBtn.addEventListener('click', initGame);
window.onload = initGame;
