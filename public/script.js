const socket = io();
let currentRoom = null;
let playerName = null;
let isChooser = false;

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

// Game containers
const placeSelectionContainer = document.getElementById('place-selection-container');
const factSelectionContainer = document.getElementById('fact-selection-container');
const gameInfoContainer = document.getElementById('game-info-container');
const statusContainer = document.getElementById('status-container');

// Event listeners
createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', joinRoom);
startGameBtn.addEventListener('click', startGame);
sendMessageBtn.addEventListener('click', sendMessage);

playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createRoom();
});

roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoom();
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

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

function makeGuess() {
    const guessInput = document.getElementById('guess-input');
    if (!guessInput) return;
    
    const guess = guessInput.value.trim();
    if (!guess || !currentRoom) return;
    
    socket.emit('guess', { roomCode: currentRoom, guess: guess });
    guessInput.value = '';
}

function selectPlace(placeName) {
    socket.emit('select-place', { roomCode: currentRoom, placeName: placeName });
}

function selectFact(fact) {
    socket.emit('select-fact', { roomCode: currentRoom, fact: fact });
}

function showScreen(screen) {
    homeScreen.style.display = screen === 'home' ? 'block' : 'none';
    gameScreen.style.display = screen === 'game' ? 'block' : 'none';
}

function hideAllGameContainers() {
    placeSelectionContainer.style.display = 'none';
    factSelectionContainer.style.display = 'none';
    gameInfoContainer.style.display = 'none';
    statusContainer.style.display = 'none';
}

function addMessage(message, type = 'info') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    
    if (type === 'chat') {
        messageElement.innerHTML = message;
    } else {
        const timestamp = new Date().toLocaleTimeString();
        messageElement.innerHTML = `<span class="timestamp">${timestamp}</span> ${message}`;
    }
    
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

// Socket event listeners
socket.on('room-created', (data) => {
    currentRoom = data.roomCode;
    showScreen('game');
    roomCodeDisplay.innerHTML = `Room: <strong>${data.roomCode}</strong>`;
    addMessage(`🎉 Room created: ${data.roomCode}`, 'success');
    addMessage('Share this code with friends to play!', 'info');
    startGameBtn.style.display = 'block';
    
    hideAllGameContainers();
    statusContainer.style.display = 'block';
    statusContainer.querySelector('.status-content').innerHTML = `
        <h2>🎮 Room Created!</h2>
        <p>Room Code: <strong style="font-size: 2em; color: #4CAF50;">${data.roomCode}</strong></p>
        <p>Waiting for players to join...</p>
        <p>Need at least 2 players to start the game</p>
    `;
});

socket.on('player-joined', (data) => {
    updatePlayers(data.players);
    addMessage(`👋 ${data.newPlayer} joined the game!`, 'success');
    
    if (data.players.length >= 2) {
        statusContainer.querySelector('.status-content').innerHTML = `
            <h2>🎮 Ready to Play!</h2>
            <p>${data.players.length} players in the room</p>
            <p>Click "Start Game" when everyone is ready!</p>
        `;
    }
});

socket.on('player-left', (data) => {
    updatePlayers(data.players);
    addMessage(`👋 ${data.leftPlayer} left the game`, 'warning');
});

socket.on('place-selection', (data) => {
    hideAllGameContainers();
    placeSelectionContainer.style.display = 'block';
    isChooser = true;
    
    const placesHtml = data.places.map(place => 
        `<button class="place-option" onclick="selectPlace('${place.name}')">
            <div class="place-preview">${place.preview}</div>
            <div class="place-hint">Mystery Location</div>
        </button>`
    ).join('');
    
    placeSelectionContainer.querySelector('.selection-content').innerHTML = `
        <div class="selection-header">
            <h2>🗺️ Choose a Place</h2>
            <p>Select a location for other players to guess:</p>
        </div>
        <div class="places-grid">
            ${placesHtml}
        </div>
        <div class="timer">⏱️ 15 seconds to choose</div>
    `;
    
    // Timer countdown
    let timeLeft = 15;
    const timerElement = placeSelectionContainer.querySelector('.timer');
    const countdown = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `⏱️ ${timeLeft} seconds to choose`;
        if (timeLeft <= 0) {
            clearInterval(countdown);
        }
    }, 1000);
});

socket.on('fact-selection', (data) => {
    hideAllGameContainers();
    factSelectionContainer.style.display = 'block';
    
    const factsHtml = data.facts.map(fact => 
        `<button class="fact-option" onclick="selectFact('${fact}')">
            <span class="fact-text">${fact}</span>
        </button>`
    ).join('');
    
    factSelectionContainer.querySelector('.selection-content').innerHTML = `
        <div class="selection-header">
            <h2>💡 Choose a Clue</h2>
            <p>Select an interesting fact about <strong>${data.place}</strong>:</p>
        </div>
        <div class="facts-list">
            ${factsHtml}
        </div>
        <div class="timer">⏱️ 15 seconds to choose</div>
    `;
    
    // Timer countdown
    let timeLeft = 15;
    const timerElement = factSelectionContainer.querySelector('.timer');
    const countdown = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `⏱️ ${timeLeft} seconds to choose`;
        if (timeLeft <= 0) {
            clearInterval(countdown);
        }
    }, 1000);
});

socket.on('waiting-for-selection', (data) => {
    hideAllGameContainers();
    statusContainer.style.display = 'block';
    
    const selectionType = data.type === 'place' ? 'a place' : 'a clue';
    statusContainer.querySelector('.status-content').innerHTML = `
        <h2>🤔 Waiting...</h2>
        <p><strong>${data.chooser}</strong> is choosing ${selectionType}</p>
        <div class="loading-animation">⏳</div>
        <p>Get ready to guess!</p>
    `;
});

socket.on('game-state', (data) => {
    if (data.gameState === 'guessing') {
        hideAllGameContainers();
        gameInfoContainer.style.display = 'block';
        isChooser = false;
        
        gameInfoContainer.querySelector('.game-content').innerHTML = `
            <div class="game-area">
                <div class="map-section">
                    <h3>🗺️ Mystery Place</h3>
                    <div id="map-placeholder">
                        <div class="map-content">
                            <div class="map-icon">🌍</div>
                            <p>AI Generated Map</p>
                            <small>(Coming in next update!)</small>
                        </div>
                    </div>
                </div>
                
                <div class="word-section">
                    <h3>🔤 Place Name:</h3>
                    <div class="word-display">${data.displayWord}</div>
                </div>
                
                <div class="fact-section">
                    <h3>💡 Clue:</h3>
                    <div class="fact-display">${data.selectedFact}</div>
                </div>
                
                <div class="guess-section">
                    <input type="text" id="guess-input" placeholder="Type your guess..." maxlength="30">
                    <button id="guess-btn" onclick="makeGuess()">🎯 Guess!</button>
                </div>
                
                <div class="game-info">
                    <div class="info-item">🕒 New letters revealed every 20 seconds</div>
                    <div class="info-item">💎 Bonus points for guessing early!</div>
                    <div class="info-item">🎮 Type your answer and press Enter</div>
                </div>
            </div>
        `;
        
        // Focus on guess input
        const guessInput = document.getElementById('guess-input');
        if (guessInput) {
            guessInput.focus();
            guessInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') makeGuess();
            });
        }
    }
    
    updatePlayers(data.players);
});

socket.on('letter-revealed', (data) => {
    addMessage(`🔤 Letter revealed: "${data.letter}" at position ${data.position + 1}`, 'info');
    
    // Visual effect for letter reveal
    const wordDisplay = document.querySelector('.word-display');
    if (wordDisplay) {
        wordDisplay.style.animation = 'letterReveal 0.5s ease-in-out';
        setTimeout(() => {
            wordDisplay.style.animation = '';
        }, 500);
    }
});

socket.on('correct-guess', (data) => {
    addMessage(`🎉 ${data.player} guessed correctly: "${data.guess}"!`, 'success');
    if (data.bonus > 0) {
        addMessage(`⚡ Speed bonus: +${data.bonus} points! Total: ${data.score} pts`, 'success');
    }
});

socket.on('wrong-guess', (data) => {
    addMessage(`❌ ${data.player}: "${data.guess}"`, 'error');
});

socket.on('round-over', (data) => {
    hideAllGameContainers();
    statusContainer.style.display = 'block';
    
    let reasonText = '';
    let reasonEmoji = '';
    switch(data.reason) {
        case 'correct-guess':
        case 'all-correct':
            reasonText = 'All players guessed correctly!';
            reasonEmoji = '🎉';
            break;
        case 'all-revealed':
            reasonText = 'All letters were revealed!';
            reasonEmoji = '⏰';
            break;
        case 'timeout':
            reasonText = 'Time ran out!';
            reasonEmoji = '⏰';
            break;
    }
    
    statusContainer.querySelector('.status-content').innerHTML = `
        <div class="round-result">
            <h2>${reasonEmoji} Round Complete!</h2>
            <p>${reasonText}</p>
            <div class="answer-reveal">
                <h3>The answer was:</h3>
                <div class="final-answer">${data.correctAnswer}</div>
            </div>
            <p class="next-player">Next turn: <strong>${data.nextPlayer}</strong></p>
            <div class="loading-animation">⏳ Next round starting in 5 seconds...</div>
        </div>
    `;
    
    updatePlayers(data.scores);
});

socket.on('game-over', (data) => {
    hideAllGameContainers();
    statusContainer.style.display = 'block';
    
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
    
    statusContainer.querySelector('.status-content').innerHTML = `
        <div class="game-over-screen">
            <h2>🎊 Game Over!</h2>
            <div class="answer-reveal">
                <p>The final answer was:</p>
                <div class="final-answer">${data.correctAnswer}</div>
            </div>
            <h3>🏆 Final Scores:</h3>
            <div class="final-scores">
                ${scoresHtml}
            </div>
            <div class="game-over-actions">
                <button class="btn primary" onclick="location.reload()">🎮 Play Again</button>
            </div>
        </div>
    `;
});

socket.on('message', (data) => {
    const timestamp = data.timestamp || new Date().toLocaleTimeString();
    addMessage(`<strong>${data.player}:</strong> ${data.message} <span class="timestamp">${timestamp}</span>`, 'chat');
});

socket.on('error', (data) => {
    addMessage(`❌ Error: ${data.message}`, 'error');
    alert(data.message);
});

// Initialize
showScreen('home');
playerNameInput.focus();
