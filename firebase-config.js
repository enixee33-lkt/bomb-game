// ⚠️ 這是你原本完全正確、可以直接使用的 Firebase 設定值
const firebaseConfig = {
  apiKey: "AIzaSyA92tY9X4za5ScTXgoVyfApy34aPb-m9sg",
  authDomain: "://firebaseapp.com",
  databaseURL: "https://firebaseio.com",
  projectId: "bomb-game-f61cf",
  storageBucket: "bomb-game-f61cf.firebasestorage.app",
  messagingSenderId: "486156336414",
  appId: "1:486156336414:web:ba234c2f894ff838489d0f",
  measurementId: "G-QCF89QNDSR"
};

let database = null;

// 💡 修正：跟昨天一樣，檔案一載入就在全域立刻初始化，絕對不包在 function 裡面！
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log("Firebase 雲端初始化成功！");
    
    // 檔案載入時就立刻啟動雲端排行榜監聽
    startLeaderboardListener();
} else {
    console.error("Firebase 套件未成功載入。");
}

// 雲端排行榜即時監聽
function startLeaderboardListener() {
    if (!database) return;
    const leaderboardList = document.getElementById('leaderboard-list');
    
    database.ref('minesweeper_scores').orderByChild('score').limitToFirst(10).on('value', (snapshot) => {
        const scores = [];
        snapshot.forEach((childSnapshot) => {
            scores.push(childSnapshot.val());
        });

        if (!leaderboardList) return;
        leaderboardList.innerHTML = '';
        
        if (scores.length === 0) {
            leaderboardList.innerHTML = '<li>目前還沒有速通紀錄</li>';
            return;
        }
        
        scores.forEach((item, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>No.${index + 1} ${item.name}</span> <span>${item.score} 秒</span>`;
            leaderboardList.appendChild(li);
        });
    });
}

// 上傳分數函式（供 game.js 呼叫）
function uploadScore(name, secondsElapsed, callback) {
    if (!database) return;
    
    database.ref('minesweeper_scores').push({
        name: name,
        score: secondsElapsed,
        timestamp: Date.now()
    }).then(() => {
        if (callback) callback(true);
    }).catch((error) => {
        console.error("上傳失敗:", error);
        if (callback) callback(false);
    });
}
