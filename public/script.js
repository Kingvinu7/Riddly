const socket = io();
let currentRoom = null;
let playerName = null;

// DOM elements - same as before
const pages = {
    home: document.getElementById('home-screen'),
    lobby: document.getElementById('lobby-screen'),
    oracleIntro: document.getElementById('oracle-intro-screen'),
    riddle: document.getElementById('riddle-screen'),
    riddleResults: document.getElementById('riddle-results-screen'),
    puzzle: document.getElementById('puzzle-screen'),
    puzzleResults: document.getElementById('puzzle-results-screen'),
    waiting: document.getElementById('waiting-screen'),
    roundSummary: document.getElementById('round-summary-screen'),
    gameOver: document.getElementById('game-over-screen')
};

const playerNameInput = document.getElementById('player-name');
const roomCodeInput = document.getElementById('room-code');
const riddleAnswer = document.getElementById('riddle-answer');

const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const startGameBtn = document.getElementById('start-game-btn');
const submitRiddleBtn = document.getElementById('submit-riddle');

const choiceButtons = {
    a: document.getElementById('choice-a'),
    b: document.getElementById('choice-b'),
    c: document.getElementById('choice-c')
};

const roomCodeDisplay = document.getElementById('room-code-display');
const playersListEl = document.getElementById('players-list');
const oracleIntroMessage = document.getElementById('oracle-intro-message');
const riddleText = document.getElementById('riddle-text');

// Event listeners - same as before
createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', joinRoom);
startGameBtn.addEventListener('click', startGame);
submitRiddleBtn.addEventListener('click', submitRiddleAnswer);

playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createRoom();
});

roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoom();
});

riddleAnswer.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitRiddleAnswer();
});

Object.values(choiceButtons).forEach(button => {
    button.addEventListener('click', (e) => {
        const choice = e.currentTarget.dataset.choice;
        submitPuzzleChoice(choice);
    });
});

// Utility functions - same as before
function showPage(pageName) {
    Object.values(pages).forEach(page => page.classList.remove('active'));
    if (pages[pageName]) {
        pages[pageName].classList.add('active');
    }
}

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

function submitPuzzleChoice(choice) {
    if (!currentRoom) return;
    
    socket.emit('submit-puzzle-choice', { roomCode: currentRoom, choice: choice });
    
    Object.values(choiceButtons).forEach(btn => {
        btn.disabled = true;
        btn.classList.remove('selected');
    });
    
    const selectedButton = choiceButtons[choice.toLowerCase()];
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }
}

function updatePlayers(players) {
    playersListEl.innerHTML = players.map(player => 
        `<div class="player">${player.name}: ${player.score}pts</div>`
    ).join('');
}

function createPointsTable(roundHistory, tableId) {
    const table = document.getElementById(tableId);
    if (!table || !roundHistory || roundHistory.length === 0) return;
    
    let tableHtml = '<div class="points-table">';
    
    tableHtml += '<div class="points-table-header">';
    tableHtml += '<div>Player</div>';
    for (let i = 1; i <= 5; i++) {
        tableHtml += `<div>R${i}</div>`;
    }
    tableHtml += '<div>Total</div>';
    tableHtml += '</div>';
    
    roundHistory.forEach(playerHistory => {
        tableHtml += '<div class="points-table-row">';
        tableHtml += `<div class="player-name-cell">${playerHistory.playerName}</div>`;
        
        for (let i = 0; i < 5; i++) {
            const result = playerHistory.rounds[i] || '-';
            const resultClass = result === 'W' ? 'win' : result === 'L' ? 'loss' : '';
            tableHtml += `<div class="round-result ${resultClass}">${result}</div>`;
        }
        
        const totalWins = playerHistory.rounds.filter(r => r === 'W').length;
        tableHtml += `<div class="total-score">${totalWins}</div>`;
        tableHtml += '</div>';
    });
    
    tableHtml += '</div>';
    table.innerHTML = tableHtml;
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
    document.getElementById('round-display').textContent = `Round ${data.round}/${data.maxRounds}`;
    riddleText.textContent = data.riddle.question;
    
    riddleAnswer.disabled = false;
    riddleAnswer.value = '';
    riddleAnswer.focus();
    submitRiddleBtn.disabled = false;
    submitRiddleBtn.textContent = 'Submit Answer';
    
    document.getElementById('submission-count').textContent = '0/0 players answered';
    
    showPage('riddle');
    // FIXED: 45 seconds for riddle timer
    startTimer('riddle-timer', 45);
});

socket.on('answer-submitted', (data) => {
    document.getElementById('submission-count').textContent = 
        `${data.totalSubmissions}/${data.totalPlayers} players answered`;
});

socket.on('riddle-results-reveal', (data) => {
    document.getElementById('riddle-results-message').textContent = data.message;
    
    const answersListEl = document.getElementById('all-answers-list');
    let answersHtml = '';
    
    data.allAnswers.forEach((answerData, index) => {
        const isCorrect = answerData.correct;
        const isWinner = answerData.winner;
        const orderText = index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`;
        
        answersHtml += `
            <div class="answer-item ${isCorrect ? 'correct' : 'incorrect'} ${isWinner ? 'winner' : ''}">
                <div class="answer-header">
                    <span class="player-name">${answerData.playerName}</span>
                    <span class="answer-order">${orderText}</span>
                    ${isWinner ? '<span class="winner-badge">🏆 WINNER</span>' : ''}
                </div>
                <div class="answer-text">"${answerData.answer}"</div>
                <div class="answer-status">
                    ${isCorrect ? '✅ Correct' : '❌ Incorrect'}
                </div>
            </div>
        `;
    });
    
    answersListEl.innerHTML = answersHtml;
    showPage('riddleResults');
});

socket.on('puzzle-challenge-start', (data) => {
    const isParticipant = data.participants.includes(playerName);
    
    if (isParticipant) {
        document.getElementById('puzzle-scenario').textContent = data.puzzle.scenario;
        
        document.getElementById('choice-a-text').textContent = data.puzzle.options.find(opt => opt.id === 'A')?.text || 'Option A';
        document.getElementById('choice-b-text').textContent = data.puzzle.options.find(opt => opt.id === 'B')?.text || 'Option B';
        document.getElementById('choice-c-text').textContent = data.puzzle.options.find(opt => opt.id === 'C')?.text || 'Option C';
        
        Object.values(choiceButtons).forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('selected');
        });
        
        document.getElementById('puzzle-submission-count').textContent = `0/${data.participants.length} non-winners chose`;
        
        showPage('puzzle');
        // FIXED: 45 seconds for puzzle timer
        startTimer('puzzle-timer', 45);
    } else {
        document.getElementById('waiting-title').textContent = 'Others are facing a challenge...';
        document.getElementById('waiting-message').textContent = 'Non-winners are solving a survival puzzle!';
        showPage('waiting');
    }
});

socket.on('puzzle-choice-submitted', (data) => {
    document.getElementById('puzzle-submission-count').textContent = 
        `${data.totalSubmissions}/${data.expectedSubmissions} non-winners chose`;
});

// FIXED: Only show current result, clear previous ones
socket.on('puzzle-choice-result', (data) => {
    const resultsContent = document.getElementById('puzzle-results-content');
    
    // FIXED: Clear previous results
    resultsContent.innerHTML = '';
    
    const resultHtml = `
        <div class="choice-result ${data.survived ? 'survived' : 'eliminated'}">
            <div class="choice-header">
                <h3>Option ${data.optionId}: ${data.optionText}</h3>
                <div class="players-list">
                    ${data.players.map(name => `<span class="player-tag">${name}</span>`).join('')}
                </div>
            </div>
            <div class="fate-narration">
                ${data.narration}
            </div>
            <div class="result-status">
                ${data.survived ? '✅ SURVIVED' : '💀 ELIMINATED'}
            </div>
        </div>
    `;
    
    resultsContent.innerHTML = resultHtml;
    showPage('puzzleResults');
});

socket.on('round-summary', (data) => {
    document.getElementById('round-summary-title').textContent = `Round ${data.round} Complete!`;
    
    createPointsTable(data.roundHistory, 'points-table');
    
    const nextRoundText = document.getElementById('next-round-text');
    if (data.round >= data.maxRounds) {
        nextRoundText.textContent = 'Final results coming up...';
    } else {
        nextRoundText.textContent = `Round ${data.round + 1} starting soon...`;
    }
    
    showPage('roundSummary');
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
    
    createPointsTable(data.roundHistory, 'final-points-table');
    showPage('gameOver');
});

socket.on('error', (data) => {
    console.error('Socket error:', data.message);
    alert(data.message);
});

// Initialize
showPage('home');
playerNameInput.focus();

console.log('Frontend loaded - Threatened by AI v2.1');
