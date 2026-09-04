// 全域變數宣告
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

// 網頁載入完成後啟動
window.onload = function() {
    // 呼叫引入的 Firebase 初始化功能
    if (typeof initFirebase === 'function') {
        initFirebase();
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
        // 如果有成功初始化 Firebase 且 database 存在，才顯示上傳區域
        if (typeof database !== 'undefined' && database) uploadScoreZone.classList.remove('hidden');
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

// 綁定上傳按鈕點擊事件
submitScoreBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) { alert("請輸入名字再上傳！"); return; }
    if (hasUploadedThisGame) return;

    // 呼叫引入的 Firebase 上傳功能
    if (typeof uploadScore === 'function') {
        uploadScore(name, secondsElapsed, (success) => {
            if (success) {
                alert("通關紀錄上傳成功！");
                uploadScoreZone.classList.add('hidden');
                hasUploadedThisGame = true;
            }
        });
    }
});

// 重新開始按鈕事件
if (restartBtn) {
    restartBtn.addEventListener('click', initGame);
}
