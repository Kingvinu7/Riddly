const socket = io();
let currentRoom = null;
let playerName = null;

// DOM elements
const homeScreen = document.getElementById('home-screen');
const gameScreen = document.getElementById('game-screen');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const playerNameInput = document.getElementById('player-name');
const roomCodeInput = document.getElementById('room-code');
const startGameBtn = document.getElementById('start-game-btn');

// Game elements
const roomCodeDisplay = document.getElementById('room-code-display');
const roundDisplay = document.getElementById('round-display');
const playersListEl = document.getElementById('players-list');
const oracleMessage = document.getElementById('oracle-message');

// Game phases
const waitingScreen = document.getElementById('waiting-screen');
const riddlePhase = document.getElementById('riddle-phase');
const sabotagePhase = document.getElementById('sabotage-phase');
const resultsPhase = document.getElementById('results-phase');

// Game inputs
const riddleAnswer = document.getElementById('riddle-answer');
const submitRiddleBtn = document.getElementById('submit-riddle');
const sabotageText = document.getElementById('sabotage-text');
const submitSabotageBtn = document.getElementById('submit-sabotage');

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

// Utility functions
function createRoom() {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert('Please enter your name');
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
}

function submitSabotage() {
    const sabotage = sabotageText.value.trim();
    if (!sabotage || !currentRoom) return;
    
    socket.emit('submit-sabotage', { roomCode: currentRoom, sabotage: sabotage });
    sabotageText.disabled = true;
    submitSabotageBtn.disabled = true;
}

function showScreen(screen) {
    homeScreen.style.display = screen === 'home' ? 'flex' : 'none';
    gameScreen.style.display = screen === 'game' ? 'flex' : 'none';
}

function showGamePhase(phase) {
    [waitingScreen, riddlePhase, sabotagePhase, resultsPhase].forEach(el => {
        el.classList.remove('active');
    });
    
    const phaseEl = document.getElementById(phase);
    if (phaseEl) phaseEl.classList.add('active');
}

function updatePlayers(players) {
    playersListEl.innerHTML = players.map(player => 
        `<div class="player">${player.name}: ${player.score}pts</div>`
    ).join('');
}

function updateOracle(message) {
    oracleMessage.textContent = message;
}

function startTimer(elementId, seconds) {
    const element = document.getElementById(elementId);
    let timeLeft = seconds;
    
    const timer = setInterval(() => {
        element.textContent = timeLeft;
        
        if (timeLeft <= 10) {
            element.classList.add('urgent');
        }
        
        timeLeft--;
        
        if (timeLeft < 0) {
            clearInterval(timer);
            element.classList.remove('urgent');
        }
    }, 1000);
}

// Socket event listeners
socket.on('room-created', (data) => {
    currentRoom = data.roomCode;
    showScreen('game');
    roomCodeDisplay.textContent = `Room: ${data.roomCode}`;
    startGameBtn.classList.remove('hidden');
    showGamePhase('waiting-screen');
});

socket.on('join-success', (data) => {
    currentRoom = data.roomCode;
    showScreen('game');
    roomCodeDisplay.textContent = `Room: ${data.roomCode}`;
    showGamePhase('waiting-screen');
});

socket.on('player-joined', (data) => {
    updatePlayers(data.players);
});

socket.on('oracle-speaks', (data) => {
    updateOracle(data.message);
});

socket.on('riddle-presented', (data) => {
    showGamePhase('riddle-phase');
    roundDisplay.textContent = `Round ${data.round}/${data.maxRounds}`;
    document.getElementById('riddle-text').textContent = data.riddle.question;
    
    // Reset inputs
    riddleAnswer.disabled = false;
    riddleAnswer.value = '';
    submitRiddleBtn.disabled = false;
    
    startTimer('riddle-timer', 30);
});

socket.on('sabotage-phase-start', (data) => {
    const isParticipant = data.participants.includes(playerName);
    
    if (isParticipant) {
        showGamePhase('sabotage-phase');
        
        // Reset inputs
        sabotageText.disabled = false;
        sabotageText.value = '';
        submitSabotageBtn.disabled = false;
        
        startTimer('sabotage-timer', 60);
    } else {
        showGamePhase('waiting-screen');
        waitingScreen.innerHTML = '<h2>Others are plotting against the Oracle...</h2>';
    }
});

socket.on('game-over', (data) => {
    showGamePhase('results-phase');
    
    const scoresHtml = data.finalScores.map((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏆';
        return `
            <div class="final-score ${index === 0 ? 'winner' : ''}">
                <span>${medal} ${player.name}</span>
                <span>${player.score} pts</span>
            </div>
        `;
    }).join('');
    
    document.getElementById('results-content').innerHTML = `
        <div class="results-header">
            <h2>🎊 Game Over!</h2>
        </div>
        <div class="final-scores">
            ${scoresHtml}
        </div>
        <button class="btn primary large" onclick="location.reload()">Play Again</button>
    `;
});

socket.on('error', (data) => {
    alert(data.message);
});

// Initialize
showScreen('home');
playerNameInput.focus();
