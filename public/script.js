let socket = null;
let playerName = '';
let roomId = '';
let gamePhase = 'menu';
let players = [];
let maskedWord = '';
let timeLeft = 60;
let gameSettings = {};

function showCreateRoom() {
    document.getElementById('createRoomForm').style.display = 'block';
    document.getElementById('joinRoomForm').style.display = 'none';
}

function showJoinRoom() {
    document.getElementById('joinRoomForm').style.display = 'block';
    document.getElementById('createRoomForm').style.display = 'none';
}

function createRoom() {
    const username = document.getElementById('createUsername').value.trim();
    const roomName = document.getElementById('createRoomName').value.trim();
    const rounds = document.getElementById('createRounds').value;
    const questionsPerRound = document.getElementById('createQuestions').value;
    
    if (!username || !roomName) {
        alert('Please fill in all fields!');
        return;
    }
    
    playerName = username;
    roomId = roomName;
    
    socket = io();
    setupSocketListeners();
    
    socket.emit('createRoom', {
        username: username,
        roomName: roomName,
        rounds: rounds,
        questionsPerRound: questionsPerRound
    });
}

function joinRoom() {
    const username = document.getElementById('joinUsername').value.trim();
    const roomName = document.getElementById('joinRoomName').value.trim();
    
    if (!username || !roomName) {
        alert('Please fill in all fields!');
        return;
    }
    
    playerName = username;
    roomId = roomName;
    
    socket = io();
    setupSocketListeners();
    
    socket.emit('joinRoom', {
        username: username,
        roomName: roomName
    });
}

function setupSocketListeners() {
    socket.on('roomCreated', (data) => {
        players = data.players;
        gameSettings = data.settings;
        showGame();
        addGameEvent(`🎉 Room "${roomId}" created! Settings: ${data.settings.rounds} rounds, ${data.settings.questionsPerRound} questions per round`);
        addGameEvent('👥 Waiting for more players to start...');
        updatePlayersList();
    });
    
    socket.on('roomJoined', (data) => {
        players = data.players;
        gameSettings = data.settings;
        showGame();
        addGameEvent(`🎉 Joined room "${roomId}"!`);
        addGameEvent(`⚙️ Settings: ${data.settings.rounds} rounds, ${data.settings.questionsPerRound} questions per round`);
        updatePlayersList();
    });
    
    socket.on('error', (data) => {
        alert(data.message);
    });
    
    socket.on('playerJoined', (data) => {
        players = data.players;
        updatePlayersList();
        addGameEvent(data.message);
    });
    
    socket.on('wordSelectionStarted', (data) => {
        document.getElementById('roundInfo').textContent = `Round ${data.round} / ${data.maxRounds}`;
        document.getElementById('questionInfo').textContent = `Question ${data.question} / ${data.maxQuestions}`;
        document.getElementById('currentSelector').textContent = `${data.selector} is choosing a word...`;
        
        addGameEvent(`👑 ${data.selector}'s turn to choose a word!`);
        
        document.getElementById('wordSelection').style.display = 'none';
        document.getElementById('word').textContent = 'Waiting for word...';
        document.getElementById('hint').textContent = `${data.selector} is choosing a word for you to guess!`;
    });
    
    socket.on('yourTurnToSelect', () => {
        document.getElementById('wordSelection').style.display = 'block';
        document.getElementById('wordInput').focus();
        addGameEvent('👑 Your turn! Choose a word for others to guess.');
    });
    
    socket.on('guessingStarted', (data) => {
        maskedWord = data.maskedWord;
        timeLeft = data.timeLeft;
        players = data.players;
        
        document.getElementById('wordSelection').style.display = 'none';
        document.getElementById('currentSelector').textContent = `${data.selector} chose the word!`;
        
        updateDisplay();
        updatePlayersList();
        
        if (data.selector === playerName) {
            document.getElementById('chat-input').disabled = true;
            document.getElementById('chat-input').placeholder = "You chose the word - watch others guess!";
            addGameEvent('👑 You chose the word! Watch others guess.');
        } else {
            document.getElementById('chat-input').disabled = false;
            document.getElementById('chat-input').placeholder = "Type your guess...";
            addGameEvent(`🎯 Guess the word chosen by ${data.selector}! (${data.wordLength} letters)`);
        }
    });
    
    // FIXED: Player Guess Handler - Now shows all guesses with correct colors
    socket.on('playerGuess', (data) => {
        // Show ALL guesses (including your own) with correct colors
        if (data.wordGuess && data.isCorrect) {
            addChatMessage(data.playerName, "got it right!", true); // Always show as correct (yellow)
            addGameEvent(`🎉 ${data.playerName} guessed the word! (+${data.points} points)`);
        } else {
            // Regular letter guesses - show with correct color for everyone
            addChatMessage(data.playerName, data.guess, data.isCorrect);
            if (data.points > 0 && data.isCorrect) {
                addGameEvent(`💰 ${data.playerName} found a letter! (+${data.points} points)`);
            }
        }
        
        players = data.players;
        updatePlayersList();
    });
    
    socket.on('wordUpdate', (data) => {
        maskedWord = data.maskedWord;
        players = data.players;
        updateDisplay();
        updatePlayersList();
    });
    
    socket.on('letterRevealed', (data) => {
        maskedWord = data.maskedWord;
        updateDisplay();
        addGameEvent(`💡 Letter "${data.letter}" revealed automatically!`);
    });
    
    socket.on('timeUpdate', (data) => {
        timeLeft = data.timeLeft;
        updateTimer();
    });
    
    socket.on('questionEnded', (data) => {
        addGameEvent(`⏰ Question ended! The word was: "${data.word}"`);
        addGameEvent(`👑 Word chosen by: ${data.selector}`);
        
        if (data.correctGuessers.length > 0) {
            addGameEvent(`🎉 Correct guessers: ${data.correctGuessers.join(', ')}`);
        } else {
            addGameEvent(`😅 No one guessed the word!`);
        }
        
        players = data.players;
        updatePlayersList();
        
        document.getElementById('chat-input').disabled = false;
        document.getElementById('chat-input').placeholder = "Chat while waiting for next question...";
    });
    
    socket.on('gameEnded', (data) => {
        showGameOverScreen(data);
    });
    
    socket.on('gameRestarted', (data) => {
        players = data.players;
        gameSettings = data.settings;
        hideGameOverScreen();
        addGameEvent('🔄 New game started!');
        updatePlayersList();
    });
}

function showGame() {
    document.getElementById('roomSystem').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    document.getElementById('gameOverScreen').style.display = 'none';
}

function showGameOverScreen(data) {
    document.getElementById('gameContainer').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'block';
    
    const winner = data.winner;
    document.getElementById('winnerName').textContent = winner.name;
    document.getElementById('winnerScore').textContent = `${winner.score} Points`;
    
    document.getElementById('totalRounds').textContent = data.gameStats.totalRounds;
    document.getElementById('totalQuestions').textContent = data.gameStats.totalQuestions;
    document.getElementById('totalPlayers').textContent = data.gameStats.totalPlayers;
    
    const scoresList = document.getElementById('finalScoresList');
    scoresList.innerHTML = '';
    
    data.finalScores.forEach((player, index) => {
        const scoreItem = document.createElement('div');
        scoreItem.className = `score-item ${getScoreClass(index)}`;
        
        const medal = getMedal(index);
        
        scoreItem.innerHTML = `
            <div class="player-position">
                <div class="position-medal">${medal}</div>
                <div>${player.name}</div>
            </div>
            <div class="player-score">${player.score} pts</div>
        `;
        
        scoresList.appendChild(scoreItem);
    });
}

function hideGameOverScreen() {
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
}

function getScoreClass(index) {
    switch(index) {
        case 0: return 'first';
        case 1: return 'second';
        case 2: return 'third';
        default: return 'other';
    }
}

function getMedal(index) {
    switch(index) {
        case 0: return '🥇';
        case 1: return '🥈';
        case 2: return '🥉';
        default: return `#${index + 1}`;
    }
}

function playAgain() {
    if (socket) {
        socket.emit('playAgain', { roomId: roomId });
    }
}

function backToMenu() {
    location.reload();
}

function submitWord() {
    const word = document.getElementById('wordInput').value.trim().toUpperCase();
    
    if (!word || word.length < 3 || word.length > 15) {
        alert('Word must be between 3-15 letters!');
        return;
    }
    
    if (!/^[A-Z]+$/.test(word)) {
        alert('Word must contain only letters!');
        return;
    }
    
    socket.emit('submitWord', {
        roomId: roomId,
        word: word
    });
    
    document.getElementById('wordInput').value = '';
    addGameEvent(`✅ You chose the word! Others are now guessing...`);
}

// FIXED: Send Message - Don't show your own guess immediately
function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim().toUpperCase();
    
    if (message && socket && !input.disabled) {
        const isLetter = message.length === 1 && /^[A-Z]$/.test(message);
        const isWord = message.length > 1;
        
        if ((isLetter || isWord)) {
            // Send guess to server - let server handle the response
            socket.emit('playerGuess', {
                roomId: roomId,
                playerName: playerName,
                guess: message,
                isLetter: isLetter
            });
            
            // DON'T add your own guess here - wait for server response
        } else {
            // Regular chat message
            addChatMessage(playerName, message, false);
        }
        
        input.value = '';
    }
}

function updateDisplay() {
    if (maskedWord) {
        document.getElementById('word').innerHTML = maskedWord.split('').join(' ');
        updateProgress();
    }
}

function updateTimer() {
    document.getElementById('timer').innerHTML = `${timeLeft}s`;
    updateTimerProgress();
}

function updateTimerProgress() {
    const percentage = (timeLeft / 60) * 100;
    document.getElementById('timerFill').style.width = percentage + '%';
}

function updateProgress() {
    if (maskedWord) {
        const foundLetters = maskedWord.length - maskedWord.split('_').length + 1;
        const totalLetters = maskedWord.length;
        document.getElementById('progress').innerHTML = `${foundLetters}/${totalLetters}`;
    }
}

function updatePlayersList() {
    const playerListElement = document.getElementById('playersList');
    if (playerListElement && players.length > 0) {
        playerListElement.innerHTML = players.map(player => {
            let statusIcon = '';
            if (player.hasGuessedWord) {
                statusIcon = ' ✅';
            }
            
            return `<div class="player-item">
                <span>${player.name}${statusIcon}</span>
                <span class="score">${player.score}pts</span>
            </div>`;
        }).join('');
    }
}

function addChatMessage(sender, message, isCorrect) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isCorrect ? 'correct' : ''}`;
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addGameEvent(event) {
    const chatMessages = document.getElementById('chat-messages');
    const eventDiv = document.createElement('div');
    eventDiv.className = 'message game-event';
    eventDiv.innerHTML = event;
    chatMessages.appendChild(eventDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('chat-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    document.getElementById('wordInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitWord();
        }
    });
});
