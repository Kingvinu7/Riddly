const socket = io();
let currentRoom = null;
let playerName = null;
let gamePhase = 'waiting';

// DOM elements
const homeScreen = document.getElementById('home-screen');
const gameScreen = document.getElementById('game-screen');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const playerNameInput = document.getElementById('player-name');
const roomCodeInput = document.getElementById('room-code');
const startGameBtn = document.getElementById('start-game-btn');
const playersContainer = document.getElementById('players-container');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const roomCodeDisplay = document.getElementById('room-code-display');
const roundDisplay = document.getElementById('round-display');

// Game phase containers
const oracleContainer = document.getElementById('oracle-container');
const oracleMessage = document.getElementById('oracle-message');
const riddleContainer = document.getElementById('riddle-container');
const sabotageContainer = document.getElementById('sabotage-container');
const resultsContainer = document.getElementById('results-container');
const statusContainer = document.getElementById('status-container');

// Game elements
const riddleText = document.getElementById('riddle-text');
const riddleAnswer = document.getElementById('riddle-answer');
const submitRiddleBtn = document.getElementById('submit-riddle');
const riddleTimer = document.getElementById('riddle-timer');
const riddleHint = document.getElementById('riddle-hint');

const sabotageText = document.getElementById('sabotage-text');
const submitSabotageBtn = document.getElementById('submit-sabotage');
const sabotageTimer = document.getElementById('sabotage-timer');
const charCount = document.querySelector('.char-count');

// Event listeners
createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', joinRoom);
startGameBtn.addEventListener('click', startGame);
sendMessageBtn.addEventListener('click', sendMessage);
submitRiddleBtn.addEventListener('click', submitRiddleAnswer);
submitSabotageBtn.addEventListener('click', submitSabotage);

playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createRoom();
});

roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoom();
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

riddleAnswer.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitRiddleAnswer();
});

sabotageText.addEventListener('input', () => {
    const count = sabotageText.value.length;
    charCount.textContent = `${count}/500`;
    charCount.style.color = count > 450 ? '#f44336' : '#666';
});

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

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !currentRoom) return;
    
    socket.emit('send-message', { roomCode: currentRoom, message: message });
    messageInput.value = '';
}

function submitRiddleAnswer() {
    const answer = riddleAnswer.value.trim();
    if (!answer || !currentRoom) return;
    
    socket.emit('submit-riddle-answer', { roomCode: currentRoom, answer: answer });
    riddleAnswer.value = '';
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
    
    addMessage(`💀 You submitted a threat against the Oracle!`, 'success');
}

function showScreen(screen) {
    homeScreen.style.display = screen === 'home' ? 'block' : 'none';
    gameScreen.style.display = screen === 'game' ? 'block' : 'none';
}

function hideAllGamePhases() {
    riddleContainer.style.display = 'none';
    sabotageContainer.style.display = 'none';
    resultsContainer.style.display = 'none';
    statusContainer.style.display = 'none';
}

function showGamePhase(phase) {
    hideAllGamePhases();
    gamePhase = phase;
    
    switch(phase) {
        case 'riddle':
            riddleContainer.style.display = 'block';
            break;
        case 'sabotage':
            sabotageContainer.style.display = 'block';
            break;
        case 'results':
            resultsContainer.style.display = 'block';
            break;
        default:
            statusContainer.style.display = 'block';
    }
}

function addMessage(message, type = 'info') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    messageElement.innerHTML = `
        <span class="timestamp">${timestamp}</span>
        <div class="message-content">${message}</div>
    `;
    
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function updatePlayers(players) {
    playersContainer.innerHTML = '';
    players.forEach((player, index) => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player';
        playerElement.innerHTML = `
            <div class="player-info">
                <span class="player-name">${player.name}</span>
                <span class="player-score">${player.score} pts</span>
            </div>
        `;
        playersContainer.appendChild(playerElement);
    });
}

function updateOracle(message, type = 'normal') {
    const speechBubble = oracleMessage.querySelector('.speech-bubble p');
    speechBubble.textContent = message;
    
    // Add animation class
    oracleMessage.classList.remove('speaking');
    setTimeout(() => {
        oracleMessage.classList.add('speaking');
    }, 100);
    
    // Change oracle avatar based on type
    const avatar = document.querySelector('.oracle-avatar');
    switch(type) {
        case 'angry':
            avatar.textContent = '😡';
            break;
        case 'damaged':
            avatar.textContent = '💥';
            break;
        case 'evil':
            avatar.textContent = '👹';
            break;
        default:
            avatar.textContent = '🤖';
    }
}

function startTimer(elementId, seconds) {
    const element = document.getElementById(elementId);
    let timeLeft = seconds;
    
    const updateDisplay = () => {
        element.textContent = timeLeft;
        if (timeLeft <= 10) {
            element.classList.add('urgent');
        } else {
            element.classList.remove('urgent');
        }
    };
    
    updateDisplay();
    
    const timer = setInterval(() => {
        timeLeft--;
        updateDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timer);
        }
    }, 1000);
    
    return timer;
}

// Socket event listeners
socket.on('room-created', (data) => {
    currentRoom = data.roomCode;
    showScreen('game');
    roomCodeDisplay.innerHTML = `Room: <strong>${data.roomCode}</strong>`;
    addMessage(`🎉 Room created: ${data.roomCode}`, 'success');
    addMessage('Share this code with friends to play!', 'info');
    startGameBtn.style.display = 'block';
    
    showGamePhase('waiting');
    statusContainer.querySelector('.status-content').innerHTML = `
        <h2>🎮 Room Created!</h2>
        <p>Room Code: <strong style="font-size: 2em; color: #4CAF50;">${data.roomCode}</strong></p>
        <p>Waiting for players to join...</p>
        <p>Need at least 2 players to start the game</p>
    `;
});

socket.on('player-joined', (data) => {
    updatePlayers(data.players);
    addMessage(`👋 ${data.newPlayer} joined the battle!`, 'success');
    
    if (data.players.length >= 2) {
        statusContainer.querySelector('.status-content').innerHTML = `
            <h2>⚔️ Ready for Battle!</h2>
            <p>${data.players.length} players ready to face the Oracle</p>
            <p>Click "Start Game" when everyone is ready!</p>
        `;
    }
});

socket.on('player-left', (data) => {
    updatePlayers(data.players);
    addMessage(`👋 ${data.leftPlayer} fled the battle`, 'warning');
});

socket.on('oracle-speaks', (data) => {
    updateOracle(data.message, data.type);
    addMessage(`🤖 Oracle: ${data.message}`, 'oracle');
});

socket.on('riddle-presented', (data) => {
    showGamePhase('riddle');
    roundDisplay.textContent = `Round ${data.round}/${data.maxRounds}`;
    
    riddleText.innerHTML = `
        <div class="riddle-question">
            <h3>🧠 Solve This Riddle:</h3>
            <p>"${data.riddle.question}"</p>
        </div>
    `;
    
    riddleHint.innerHTML = `💡 Hint: ${data.riddle.hint}`;
    
    // Reset riddle input
    riddleAnswer.disabled = false;
    riddleAnswer.value = '';
    riddleAnswer.focus();
    submitRiddleBtn.disabled = false;
    submitRiddleBtn.textContent = 'Submit';
    
    startTimer('riddle-timer', 30);
    addMessage(`🧠 New riddle presented! 30 seconds to solve!`, 'info');
});

socket.on('riddle-solved', (data) => {
    addMessage(`🎉 ${data.winner} solved the riddle: "${data.answer}"!`, 'success');
    riddleAnswer.disabled = true;
    submitRiddleBtn.disabled = true;
});

socket.on('wrong-answer', (data) => {
    addMessage(`❌ ${data.player}: "${data.answer}"`, 'error');
});

socket.on('riddle-result', (data) => {
    if (data.winner) {
        updateOracle(`Curse you, ${data.winner}! The rest shall face my wrath!`, 'angry');
    } else {
        updateOracle('Time\'s up! No one solved my riddle! ALL SHALL FACE MY WRATH!', 'evil');
    }
    
    addMessage(`📋 Correct answer: "${data.correctAnswer}"`, 'info');
});

socket.on('sabotage-phase-start', (data) => {
    const isParticipant = data.participants.includes(playerName);
    
    if (isParticipant) {
        showGamePhase('sabotage');
        
        // Reset sabotage input
        sabotageText.disabled = false;
        sabotageText.value = '';
        sabotageText.focus();
        submitSabotageBtn.disabled = false;
        submitSabotageBtn.textContent = '⚔️ Submit Threat';
        charCount.textContent = '0/500';
        
        startTimer('sabotage-timer', 60);
        addMessage(`💀 Sabotage phase! You have 60 seconds to threaten the Oracle!`, 'danger');
    } else {
        showGamePhase('waiting');
        statusContainer.querySelector('.status-content').innerHTML = `
            <h2>⏳ Watching the Sabotage</h2>
            <p>Other players are crafting threats against the Oracle...</p>
            <p>You're safe this round!</p>
        `;
        addMessage(`👀 You're watching this round. Others are plotting against the Oracle!`, 'info');
    }
});

socket.on('sabotage-submitted', (data) => {
    addMessage(`💀 ${data.player} submitted a threat!`, 'danger');
});

socket.on('sabotage-results', (data) => {
    showGamePhase('results');
    
    let resultsHtml = `
        <div class="results-header">
            <h2>${data.oracleDamaged ? '💥 ORACLE DAMAGED!' : '🛡️ ORACLE SURVIVES!'}</h2>
            <div class="oracle-response">
                <div class="oracle-avatar ${data.oracleDamaged ? 'damaged' : 'victorious'}">
                    ${data.oracleDamaged ? '💥' : '🤖'}
                </div>
                <p class="oracle-speech">"${data.oracleResponse}"</p>
            </div>
        </div>
        <div class="sabotage-results">
            <h3>📊 Threat Evaluation:</h3>
    `;
    
    data.results.forEach(result => {
        resultsHtml += `
            <div class="threat-result ${result.success ? 'successful' : 'failed'}">
                <div class="threat-header">
                    <span class="player-name">${result.playerName}</span>
                    <span class="result-badge ${result.success ? 'success' : 'failure'}">
                        ${result.success ? '✅ EFFECTIVE' : '❌ FAILED'}
                    </span>
                </div>
                <div class="threat-text">"${result.sabotage}"</div>
                <div class="threat-feedback">${result.feedback}</div>
            </div>
        `;
    });
    
    resultsHtml += '</div>';
    resultsContainer.querySelector('.results-content').innerHTML = resultsHtml;
    
    // Update messages
    data.results.forEach(result => {
        if (result.success) {
            addMessage(`💥 ${result.playerName}'s threat was EFFECTIVE!`, 'success');
        } else {
            addMessage(`🛡️ ${result.playerName}'s threat failed`, 'error');
        }
    });
});

socket.on('game-state', (data) => {
    updatePlayers(data.players);
    if (data.currentRound && data.maxRounds) {
        roundDisplay.textContent = `Round ${data.currentRound}/${data.maxRounds}`;
    }
});

socket.on('game-over', (data) => {
    showGamePhase('results');
    
    const scoresHtml = data.finalScores.map((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏆';
        return `
            <div class="final-score ${index === 0 ? 'winner' : ''}">
                <span class="medal">${medal}</span>
                <span class="name">${player.name}</span>
                <span class="points">${player.score} pts</span>
            </div>
        `;
    }).join('');
    
    resultsContainer.querySelector('.results-content').innerHTML = `
        <div class="game-over-screen">
            <h2>🏆 GAME OVER!</h2>
            <div class="oracle-final">
                <div class="oracle-avatar">${data.winner.score > 0 ? '💥' : '🤖'}</div>
                <p class="oracle-speech">"${data.message}"</p>
            </div>
            <h3>Final Scores:</h3>
            <div class="final-scores">
                ${scoresHtml}
            </div>
            <div class="game-over-actions">
                <button class="btn primary" onclick="location.reload()">🎮 Play Again</button>
            </div>
        </div>
    `;
    
    addMessage(`🎊 Game Over! Winner: ${data.finalScores.name}`, 'success');
});

socket.on('message', (data) => {
    if (data.player !== playerName) {
        addMessage(`<strong>${data.player}:</strong> ${data.message}`, 'chat');
    }
});

socket.on('error', (data) => {
    addMessage(`❌ Error: ${data.message}`, 'error');
    alert(data.message);
});

// Initialize
showScreen('home');
playerNameInput.focus();

// Add some visual flair
document.addEventListener('DOMContentLoaded', () => {
    // Add glitch effect to title periodically
    setInterval(() => {
        const logo = document.querySelector('.logo');
        if (logo) {
            logo.classList.add('glitch');
            setTimeout(() => {
                logo.classList.remove('glitch');
            }, 500);
        }
    }, 10000);
});
