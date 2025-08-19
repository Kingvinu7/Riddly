const socket = io();
let currentRoom = null;
let playerName = null;

// DOM elements
const pages = {
    home: document.getElementById('home-screen'),
    lobby: document.getElementById('lobby-screen'),
    oracleIntro: document.getElementById('oracle-intro-screen'),
    riddle: document.getElementById('riddle-screen'),
    sabotage: document.getElementById('sabotage-screen'),
    waiting: document.getElementById('waiting-screen'),
    results: document.getElementById('results-screen'),
    gameOver: document.getElementById('game-over-screen')
};

// Input elements
const playerNameInput = document.getElementById('player-name');
const roomCodeInput = document.getElementById('room-code');
const riddleAnswer = document.getElementById('riddle-answer');
const sabotageText = document.getElementById('sabotage-text');

// Button elements
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const startGameBtn = document.getElementById('start-game-btn');
const submitRiddleBtn = document.getElementById('submit-riddle');
const submitSabotageBtn = document.getElementById('submit-sabotage');

// Display elements
const roomCodeDisplay = document.getElementById('room-code-display');
const roundDisplay = document.getElementById('round-display');
const playersListEl = document.getElementById('players-list');
const oracleIntroMessage = document.getElementById('oracle-intro-message');
const riddleText = document.getElementById('riddle-text');
const charCount = document.querySelector('.char-count');

// Event listeners
createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', joinRoom);
startGameBtn.addEventListener('click', startGame);
submitRiddleBtn.addEventListener('click', submitRiddleAnswer);
submitSabotageBtn.addEventListener('click', submitSabotage);

playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createRoom();
});

roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoom();
});

riddleAnswer.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitRiddleAnswer();
});

sabotageText.addEventListener('input', () => {
    const count = sabotageText.value.length;
    if (charCount) {
        charCount.textContent = `${count}/500`;
        charCount.style.color = count > 450 ? '#ff0040' : '#888';
    }
});

// Page navigation
function showPage(pageName) {
    Object.values(pages).forEach(page => page.classList.remove('active'));
    if (pages[pageName]) {
        pages[pageName].classList.add('active');
    }
}

// Utility functions
function createRoom() {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    if (name.length > 15) {
        alert('Name must be 15 characters or less');
        return;
    }
    
    playerName = name;
    socket.emit('create-room', { playerName: name });
}

function joinRoom() {
    const name = playerNameInput.value.trim();
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    
    if (!name || !roomCode) {
        alert('Please enter your name and room code');
        return;
    }
    
    if (name.length > 15) {
        alert('Name must be 15 characters or less');
        return;
    }
    
    if (roomCode.length !== 6) {
        alert('Room code must be 6 characters');
        return;
    }
    
    playerName = name;
    socket.emit('join-room', { playerName: name, roomCode: roomCode });
}

function startGame() {
    if (currentRoom) {
        socket.emit('start-game', { roomCode: currentRoom });
    }
}

function submitRiddleAnswer() {
    const answer = riddleAnswer.value.trim();
    if (!answer || !currentRoom) return;
    
    socket.emit('submit-riddle-answer', { roomCode: currentRoom, answer: answer });
    riddleAnswer.disabled = true;
    submitRiddleBtn.disabled = true;
    submitRiddleBtn.textContent = 'Submitted!';
}

function submitSabotage() {
    const sabotage = sabotageText.value.trim();
    if (!sabotage || !currentRoom) return;
    
    if (sabotage.length < 20) {
        alert('Your threat must be at least 20 characters long. Be more creative!');
        return;
    }
    
    socket.emit('submit-sabotage', { roomCode: currentRoom, sabotage: sabotage });
    sabotageText.disabled = true;
    submitSabotageBtn.disabled = true;
    submitSabotageBtn.textContent = 'Threat Submitted!';
}

function updatePlayers(players) {
    playersListEl.innerHTML = players.map(player => 
        `<div class="player">${player.name}: ${player.score}pts</div>`
    ).join('');
}

function startTimer(elementId, seconds) {
    const element = document.getElementById(elementId);
    let timeLeft = seconds;
    
    const timer = setInterval(() => {
        element.textContent = timeLeft;
        
        if (timeLeft <= 10) {
            element.classList.add('urgent');
        } else {
            element.classList.remove('urgent');
        }
        
        timeLeft--;
        
        if (timeLeft < 0) {
            clearInterval(timer);
            element.classList.remove('urgent');
        }
    }, 1000);
    
    return timer;
}

// Socket event listeners
socket.on('room-created', (data) => {
    currentRoom = data.roomCode;
    roomCodeDisplay.textContent = `Room: ${data.roomCode}`;
    startGameBtn.classList.remove('hidden');
    document.querySelector('.waiting-text').style.display = 'block';
    showPage('lobby');
});

socket.on('join-success', (data) => {
    currentRoom = data.roomCode;
    roomCodeDisplay.textContent = `Room: ${data.roomCode}`;
    document.querySelector('.waiting-text').style.display = 'block';
    showPage('lobby');
});

socket.on('player-joined', (data) => {
    updatePlayers(data.players);
    
    if (data.players.length >= 2) {
        startGameBtn.classList.remove('hidden');
        document.querySelector('.waiting-text').style.display = 'none';
    }
});

socket.on('player-left', (data) => {
    updatePlayers(data.players);
    
    if (data.players.length < 2) {
        startGameBtn.classList.add('hidden');
        document.querySelector('.waiting-text').style.display = 'block';
    }
});

socket.on('oracle-speaks', (data) => {
    oracleIntroMessage.textContent = data.message;
    showPage('oracleIntro');
});

socket.on('riddle-presented', (data) => {
    roundDisplay.textContent = `Round ${data.round}/${data.maxRounds}`;
    riddleText.textContent = data.riddle.question;
    
    // Reset inputs
    riddleAnswer.disabled = false;
    riddleAnswer.value = '';
    riddleAnswer.focus();
    submitRiddleBtn.disabled = false;
    submitRiddleBtn.textContent = 'Submit Answer';
    
    showPage('riddle');
    startTimer('riddle-timer', 30);
});

socket.on('riddle-solved', (data) => {
    riddleAnswer.disabled = true;
    submitRiddleBtn.disabled = true;
    submitRiddleBtn.textContent = `${data.winner} Won!`;
});

socket.on('sabotage-phase-start', (data) => {
    const isParticipant = data.participants.includes(playerName);
    
    if (isParticipant) {
        // Reset inputs
        sabotageText.disabled = false;
        sabotageText.value = '';
        sabotageText.focus();
        submitSabotageBtn.disabled = false;
        submitSabotageBtn.textContent = 'Submit Threat';
        
        showPage('sabotage');
        startTimer('sabotage-timer', 60);
    } else {
        document.getElementById('waiting-title').textContent = 'Others are plotting...';
        document.getElementById('waiting-message').textContent = 'Other players are threatening the Oracle. You\'re safe this round!';
        showPage('waiting');
    }
});

socket.on('sabotage-results', (data) => {
    let resultsHtml = `
        <div class="results-header">
            <h2>${data.oracleDamaged ? '💥 ORACLE DAMAGED!' : '🛡️ ORACLE SURVIVES!'}</h2>
            <div class="oracle-response">
                <div class="oracle-avatar ${data.oracleDamaged ? 'damaged' : 'victorious'}">
                    ${data.oracleDamaged ? '💥' : '🤖'}
                </div>
                <p class="oracle-message">"${data.oracleResponse}"</p>
            </div>
        </div>
    `;
    
    document.getElementById('results-content').innerHTML = resultsHtml;
    showPage('results');
});

socket.on('game-over', (data) => {
    const scoresHtml = data.finalScores.map((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏆';
        return `
            <div class="final-score ${index === 0 ? 'winner' : ''}">
                <span>${medal} ${player.name}</span>
                <span>${player.score} pts</span>
            </div>
        `;
    }).join('');
    
    document.getElementById('final-oracle').textContent = data.winner.score > 0 ? '💥' : '🤖';
    document.getElementById('final-oracle-message').textContent = `"${data.message}"`;
    document.getElementById('final-scores').innerHTML = scoresHtml;
    
    showPage('gameOver');
});

socket.on('error', (data) => {
    alert(data.message);
});

// Initialize
showPage('home');
playerNameInput.focus();
