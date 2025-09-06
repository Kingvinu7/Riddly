const socket = io();
let currentRoom = null;
let playerName = null;
let isRoomOwner = false;
let tapCount = 0;
let tapperActive = false;

// DOM elements
const pages = {
    home: document.getElementById('home-screen'),
    lobby: document.getElementById('lobby-screen'),
    oracleIntro: document.getElementById('oracle-intro-screen'),
    riddle: document.getElementById('riddle-screen'),
    riddleResults: document.getElementById('riddle-results-screen'),
    textChallenge: document.getElementById('text-challenge-screen'),
    fastTapper: document.getElementById('fast-tapper-screen'),
    challengeResults: document.getElementById('challenge-results-screen'),
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

const roomCodeDisplay = document.getElementById('room-code-display');
const playersListEl = document.getElementById('players-list');
const oracleIntroMessage = document.getElementById('oracle-intro-message');
const riddleText = document.getElementById('riddle-text');

// Event listeners
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

// Challenge response event listeners
document.getElementById('submit-challenge-response').addEventListener('click', () => submitChallengeResponse(false));
document.getElementById('challenge-response').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) submitChallengeResponse(false);
});

// Fast tapper event listener
document.getElementById('tap-button').addEventListener('click', onTap);

// Utility functions
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

function submitChallengeResponse(isAutoSubmit = false) {
    const response = document.getElementById('challenge-response').value.trim();
    const submitBtn = document.getElementById('submit-challenge-response');
    
    if (!isAutoSubmit) {
        if (!response) {
            alert('Please enter your response - this is a complex challenge that requires thought!');
            return;
        }
        if (response.length < 5) {
            alert('Please provide a more detailed response for this complex scenario.');
            return;
        }
    }
    
    if (!currentRoom) return;
    const finalResponse = isAutoSubmit ? `[Auto-submitted] ${response}` : response;
    socket.emit('submit-challenge-response', { roomCode: currentRoom, response: finalResponse });
    document.getElementById('challenge-response').disabled = true;
    submitBtn.disabled = true;
    submitBtn.textContent = isAutoSubmit ? 'Auto-Submitted!' : 'Submitted!';
    if (isAutoSubmit) {
        setTimeout(() => {
            const shortResponse = response.length > 50 ? response.substring(0, 50) + '...' : response;
            alert(`Your response was auto-submitted: "${shortResponse}"`);
        }, 1000);
    }
}

function onTap() {
    if (!tapperActive) return;
    tapCount++;
    document.getElementById('tap-count').textContent = tapCount.toString();
    const button = document.getElementById('tap-button');
    const countDisplay = document.getElementById('tap-count');
    
    button.style.transform = 'scale(0.95)';
    countDisplay.style.animation = 'none';
    
    setTimeout(() => {
        button.style.transform = 'scale(1)';
        countDisplay.style.animation = 'numberPulse 0.1s ease-out';
    }, 50);
}

function startFastTapperTimer(duration) {
    tapperActive = true;
    let timeLeft = duration;
    const timer = setInterval(() => {
        document.getElementById('fast-tapper-timer').textContent = timeLeft;
        
        if (timeLeft <= 3) {
            document.getElementById('fast-tapper-timer').classList.add('urgent');
            document.getElementById('fast-tapper-timer').classList.remove('danger');
        } else if (timeLeft <= 5) {
            document.getElementById('fast-tapper-timer').classList.add('danger');
            document.getElementById('fast-tapper-timer').classList.remove('urgent');
        }
        
        timeLeft--;
        
        if (timeLeft < 0) {
            clearInterval(timer);
            tapperActive = false;
            document.getElementById('tap-button').disabled = true;
            document.getElementById('fast-tapper-timer').classList.remove('urgent', 'danger');
            
            socket.emit('submit-tap-result', { roomCode: currentRoom, taps: tapCount });
            
            setTimeout(() => {
                alert(`Time's up! You tapped ${tapCount} times!`);
            }, 500);
        }
    }, 1000);
}

function updateLobbyOwnerDisplay() {
    const lobbyHeader = document.querySelector('.lobby-header');
    const existingOwnerBadge = document.querySelector('.owner-badge');
    if (existingOwnerBadge) {
        existingOwnerBadge.remove();
    }
    
    if (isRoomOwner) {
        const ownerBadge = document.createElement('div');
        ownerBadge.className = 'owner-badge';
        ownerBadge.innerHTML = 'You are the Room Owner';
        lobbyHeader.appendChild(ownerBadge);
    }
}

function updateStartButton() {
    const playerCount = document.querySelectorAll('.player').length;
    const waitingText = document.querySelector('.waiting-text');
    if (isRoomOwner && playerCount >= 2) {
        startGameBtn.classList.remove('hidden');
        startGameBtn.disabled = false;
        startGameBtn.textContent = 'Start Game';
        waitingText.style.display = 'none';
    } else if (isRoomOwner && playerCount < 2) {
        startGameBtn.classList.remove('hidden');
        startGameBtn.disabled = true;
        startGameBtn.textContent = 'Need More Players';
        waitingText.textContent = 'Waiting for more players...';
        waitingText.style.display = 'block';
    } else {
        startGameBtn.classList.add('hidden');
        waitingText.textContent = 'Waiting for room owner to start...';
        waitingText.style.display = 'block';
    }
}

function updatePlayers(players) {
    playersListEl.innerHTML = players.map((player, index) => {
        const isOwnerPlayer = index === 0;
        return `
            <div class="player ${isOwnerPlayer ? 'owner-player' : ''}">
                ${isOwnerPlayer ? 'OWNER ' : ''}${player.name}: ${player.score}pts
            </div>
        `;
    }).join('');
}

// ENHANCED: Points table creation with comprehensive debugging
function createPointsTable(roundHistory, tableId) {
    console.log('=== POINTS TABLE DEBUG START ===');
    console.log('createPointsTable called with:');
    console.log('- tableId:', tableId);
    console.log('- roundHistory:', roundHistory);
    console.log('- roundHistory type:', typeof roundHistory);
    console.log('- roundHistory isArray:', Array.isArray(roundHistory));
    console.log('- roundHistory length:', roundHistory ? roundHistory.length : 'N/A');
    
    const table = document.getElementById(tableId);
    console.log('- table element found:', !!table);
    console.log('- table element:', table);
    
    if (!table) {
        console.error('Table element with id "' + tableId + '" not found');
        console.log('Available elements with "points" in id:');
        document.querySelectorAll('[id*="points"]').forEach(el => {
            console.log('  - Found element:', el.id, el);
        });
        return;
    }
    
    if (!roundHistory || !Array.isArray(roundHistory) || roundHistory.length === 0) {
        console.warn('No valid round history data provided');
        console.log('Setting no-data message in table');
        table.innerHTML = '<div class="no-data">No game data available yet</div>';
        console.log('No-data message set');
        return;
    }
    
    console.log('Creating points table with valid data');
    
    let tableHtml = '<div class="points-table">';
    // Header
    tableHtml += '<div class="points-table-header">';
    tableHtml += '<div class="player-name-header">Player</div>';
    for (let i = 1; i <= 5; i++) {
        tableHtml += `<div class="round-header">R${i}</div>`;
    }
    tableHtml += '<div class="total-header">Total</div>';
    tableHtml += '</div>';
    
    // Player rows
    roundHistory.forEach((playerHistory, index) => {
        console.log(`Processing player ${index + 1}:`, playerHistory);
        if (!playerHistory.playerName) {
            console.warn('Skipping player with no name:', playerHistory);
            return;
        }
        
        tableHtml += '<div class="points-table-row">';
        tableHtml += `<div class="player-name-cell">${playerHistory.playerName}</div>`;
        
        // Round results
        for (let i = 0; i < 5; i++) {
            const result = (playerHistory.rounds && playerHistory.rounds[i]) ? playerHistory.rounds[i] : '-';
            const resultClass = result === 'W' ? 'win' : result === 'L' ? 'loss' : '';
            tableHtml += `<div class="round-result ${resultClass}">${result}</div>`;
        }
        
        // Total wins
        const totalWins = playerHistory.rounds ? playerHistory.rounds.filter(r => r === 'W').length : 0;
        tableHtml += `<div class="total-score">${totalWins}</div>`;
        tableHtml += '</div>';
    });
    tableHtml += '</div>';
    
    console.log('Setting table HTML (length:', tableHtml.length, 'chars)');
    console.log('HTML preview:', tableHtml.substring(0, 200) + '...');
    table.innerHTML = tableHtml;
    
    console.log('Points table created successfully for:', tableId);
    console.log('Final table innerHTML length:', table.innerHTML.length);
    console.log('=== POINTS TABLE DEBUG END ===');
}

function startTimer(elementId, seconds) {
    const element = document.getElementById(elementId);
    let timeLeft = seconds;
    
    const timer = setInterval(() => {
        element.textContent = timeLeft;
        
        if (timeLeft <= 10) {
            element.classList.add('urgent');
            element.classList.remove('danger');
        } else if (timeLeft <= 20) {
            element.classList.add('danger');
            element.classList.remove('urgent');
        } else {
            element.classList.remove('urgent', 'danger');
        }
        
        timeLeft--;
        
        if (timeLeft < 0) {
            clearInterval(timer);
            element.classList.remove('urgent', 'danger');
        }
    }, 1000);
    
    return timer;
}

function startChallengeTimer(elementId, seconds) {
    const element = document.getElementById(elementId);
    const textarea = document.getElementById('challenge-response');
    const submitBtn = document.getElementById('submit-challenge-response');
    let timeLeft = seconds;
    const timer = setInterval(() => {
        element.textContent = timeLeft;
        
        if (timeLeft <= 10) {
            element.classList.add('urgent');
            element.classList.remove('danger');
        } else if (timeLeft <= 20) {
            element.classList.add('danger');
            element.classList.remove('urgent');
        } else {
            element.classList.remove('urgent', 'danger');
        }
        
        timeLeft--;
        
        if (timeLeft < 0) {
            clearInterval(timer);
            element.classList.remove('urgent', 'danger');
            
            if (textarea && !textarea.disabled && !submitBtn.disabled) {
                const currentText = textarea.value.trim();
                if (currentText.length > 0) {
                    console.log('Auto-submitting response:', currentText.substring(0, 30) + '...');
                    
                    element.textContent = 'AUTO-SUBMIT';
                    element.classList.add('auto-submit');
                    
                    setTimeout(() => {
                        submitChallengeResponse(true);
                    }, 500);
                } else {
                    console.log('Timer ended with no input');
                    element.textContent = 'TIME UP';
                }
            }
        }
    }, 1000);
    return timer;
}

function typeWriter(element, text, speed = 30) {
    return new Promise((resolve) => {
        element.textContent = '';
        element.scrollTop = 0;
        let i = 0;
        
        function typeNextChar() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                element.scrollTop = element.scrollHeight;
                i++;
                
                const char = text.charAt(i - 1);
                let delay = speed;
                
                if (char === '.' || char === '!' || char === '?') {
                    delay = speed * 3;
                } else if (char === ',' || char === ';') {
                    delay = speed * 2;
                }
                
                setTimeout(typeNextChar, delay);
            } else {
                resolve();
            }
        }
        
        typeNextChar();
    });
}

async function showIndividualResult(data) {
    const overlay = document.getElementById('result-overlay');
    const content = document.getElementById('individual-result-content');
    
    let responseText = data.response || "";
    const isAutoSubmitted = responseText.startsWith('[Auto-submitted]');
    
    if (isAutoSubmitted) {
        responseText = responseText.replace('[Auto-submitted] ', '');
    }
    
    const feedbackText = data.feedback || "No feedback available.";
    
    const autoSubmitIndicator = isAutoSubmitted ?
        '<div class="auto-submit-indicator">Auto-submitted when time expired</div>' : '';
    
    const resultHtml = `
        <div class="individual-result ${data.passed ? 'passed' : 'failed'}">
            <h3>${data.passed ? 'WELL REASONED!' : 'INSUFFICIENT!'}</h3>
            ${autoSubmitIndicator}
            <div class="result-response"></div>
            <div class="result-feedback"></div>
            <div class="continue-instruction">Click 'Continue' to proceed.</div>
            <button onclick="hideIndividualResult()" class="btn secondary">Continue</button>
        </div>
    `;
    
    content.innerHTML = resultHtml;
    overlay.style.display = 'flex';
    
    const responseEl = content.querySelector('.result-response');
    const feedbackEl = content.querySelector('.result-feedback');
    const continueBtn = content.querySelector('.btn');
    
    await typeWriter(responseEl, `"${responseText}"`, 20);
    await new Promise(resolve => setTimeout(resolve, 500));
    await typeWriter(feedbackEl, feedbackText);
    
    continueBtn.classList.remove('hidden');
    
    setTimeout(() => {
        if (overlay.style.display === 'flex') {
            hideIndividualResult();
        }
    }, 8000);
}

function hideIndividualResult() {
    const overlay = document.getElementById('result-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Socket event listeners
socket.on('room-created', (data) => {
    currentRoom = data.roomCode;
    isRoomOwner = data.isOwner;
    roomCodeDisplay.textContent = `Room: ${data.roomCode}`;
    
    updateLobbyOwnerDisplay();
    updateStartButton();
    showPage('lobby');
});

socket.on('join-success', (data) => {
    currentRoom = data.roomCode;
    isRoomOwner = data.isOwner;
    roomCodeDisplay.textContent = `Room: ${data.roomCode}`;
    
    updateLobbyOwnerDisplay();
    updateStartButton();
    showPage('lobby');
});

socket.on('player-joined', (data) => {
    updatePlayers(data.players);
    updateStartButton();
});

socket.on('player-left', (data) => {
    updatePlayers(data.players);
    updateStartButton();
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
                    ${isWinner ? '<span class="winner-badge">WINNER</span>' : ''}
                </div>
                <div class="answer-text">"${answerData.answer}"</div>
                <div class="answer-status">
                    ${isCorrect ? 'Correct' : 'Incorrect'}
                </div>
            </div>
        `;
    });
    
    answersListEl.innerHTML = answersHtml;
    showPage('riddleResults');
});

socket.on('text-challenge-start', (data) => {
    const isParticipant = data.participants.includes(playerName);
    
    if (isParticipant) {
        document.getElementById('text-challenge-title').textContent = 
            `${data.challengeType.toUpperCase()} CHALLENGE`;
        
        const challengeContent = data.challengeContent;
        const contentElement = document.getElementById('text-challenge-content');
        
        if (!challengeContent || challengeContent.trim().length === 0) {
            console.warn('Empty challenge content received, using fallback');
            contentElement.textContent = "Challenge loading failed. Please describe your approach to the situation.";
        } else {
            console.log('Setting challenge content:', challengeContent.substring(0, 50) + '...');
            contentElement.textContent = challengeContent;
        }
        
        document.getElementById('challenge-response').value = '';
        document.getElementById('challenge-response').disabled = false;
        document.getElementById('submit-challenge-response').disabled = false;
        document.getElementById('submit-challenge-response').textContent = 'Submit Response';
        document.getElementById('text-challenge-submission-count').textContent = 
            `0/${data.participants.length} players responded`;
        
        showPage('textChallenge');
        startChallengeTimer('text-challenge-timer', data.timeLimit || 40);
        setTimeout(() => {
            const textarea = document.getElementById('challenge-response');
            textarea.focus();
            textarea.placeholder = 'Think carefully and provide a detailed response... (auto-submits at 0)';
        }, 500);
    } else {
        document.getElementById('waiting-title').textContent = 'Others are facing a complex challenge...';
        document.getElementById('waiting-message').textContent = 
            `Non-winners are solving a challenging ${data.challengeType} scenario!`;
        showPage('waiting');
    }
});

socket.on('fast-tapper-start', (data) => {
    const isParticipant = data.participants.includes(playerName);
    
    if (isParticipant) {
        tapCount = 0;
        document.getElementById('tap-count').textContent = '0';
        document.getElementById('tap-button').disabled = false;
        
        showPage('fastTapper');
        startFastTapperTimer(data.duration || 10);
    } else {
        document.getElementById('waiting-title').textContent = 'Fast Tapper Challenge!';
        document.getElementById('waiting-message').textContent = 'Others are tapping as fast as they can!';
        showPage('waiting');
    }
});

socket.on('challenge-individual-result', (data) => {
    showIndividualResult(data);
});

socket.on('fast-tapper-results', (data) => {
    document.getElementById('challenge-results-title').textContent = 'FAST TAPPER RESULTS';
    document.getElementById('challenge-results-message').textContent = 
        `Fastest fingers: ${data.maxTaps} taps!`;
    
    const resultsHtml = data.results.map(result => `
        <div class="tap-result-item ${result.won ? 'winner' : ''}">
            <span class="tap-result-name">${result.won ? 'WINNER ' : ''}${result.playerName}</span>
            <span class="tap-result-count">${result.taps} taps</span>
        </div>
    `).join('');
    
    document.getElementById('challenge-results-content').innerHTML = resultsHtml;
    showPage('challengeResults');
});

socket.on('challenge-response-submitted', (data) => {
    document.getElementById('text-challenge-submission-count').textContent = 
        `${data.totalSubmissions}/${data.expectedSubmissions} players responded`;
});

socket.on('tap-result-submitted', (data) => {
    console.log(`${data.player} tapped ${data.taps} times`);
});

// ENHANCED: Round summary handler with comprehensive debugging
socket.on('round-summary', (data) => {
    console.log('=== ROUND SUMMARY DEBUG START ===');
    console.log('Full data received:', data);
    console.log('Round:', data.round);
    console.log('Max rounds:', data.maxRounds);
    console.log('Players:', data.players);
    console.log('Riddle winner:', data.riddleWinner);
    console.log('Challenge results:', data.challengeResults);
    console.log('Round history received:');
    console.log('- Type:', typeof data.roundHistory);
    console.log('- Is array:', Array.isArray(data.roundHistory));
    console.log('- Length:', data.roundHistory ? data.roundHistory.length : 'N/A');
    console.log('- Content:', data.roundHistory);
    
    document.getElementById('round-summary-title').textContent = `Round ${data.round} Complete!`;
    
    if (data.roundHistory && Array.isArray(data.roundHistory) && data.roundHistory.length > 0) {
        console.log('Valid round history found - calling createPointsTable');
        console.log('Calling createPointsTable with tableId: points-table');
        createPointsTable(data.roundHistory, 'points-table');
        console.log('createPointsTable call completed');
    } else {
        console.warn('No valid round history data received');
        console.log('Setting fallback message');
        const pointsTable = document.getElementById('points-table');
        console.log('Points table element found:', !!pointsTable);
        if (pointsTable) {
            pointsTable.innerHTML = '<div class="no-data">Leaderboard data processing...</div>';
            console.log('Fallback message set in points table');
        }
    }
    
    const nextRoundText = document.getElementById('next-round-text');
    if (nextRoundText) {
        if (data.round >= data.maxRounds) {
            nextRoundText.textContent = 'Final results coming up...';
        } else {
            nextRoundText.textContent = `Round ${data.round + 1} starting soon...`;
        }
    }
    
    console.log('Showing round summary page');
    showPage('roundSummary');
    console.log('=== ROUND SUMMARY DEBUG END ===');
});

// ENHANCED: Game over handler with debugging
socket.on('game-over', (data) => {
    console.log('=== GAME OVER DEBUG START ===');
    console.log('Game over data received:', data);
    console.log('Winner:', data.winner);
    console.log('Scores:', data.scores);
    console.log('Final round history:');
    console.log('- Type:', typeof data.roundHistory);
    console.log('- Is array:', Array.isArray(data.roundHistory));
    console.log('- Length:', data.roundHistory ? data.roundHistory.length : 'N/A');
    console.log('- Content:', data.roundHistory);
    
    const scoresHtml = data.scores.map((player, index) => {
        const medal = index === 0 ? 'GOLD' : index === 1 ? 'SILVER' : index === 2 ? 'BRONZE' : 'FINISHER';
        return `
            <div class="final-score ${index === 0 ? 'winner' : ''}">
                <span>${medal} ${player.name}</span>
                <span>${player.score} pts</span>
            </div>
        `;
    }).join('');
    
    const bigWinnerEl = document.getElementById('big-winner-announcement');
    if (bigWinnerEl) {
        const tieText = data.tied ? 'It\'s a Tie!' : '';
        bigWinnerEl.innerHTML = `CHAMPION: ${data.winner.name}<br>${data.winner.score} Points<br>${tieText}`;
    }
    
    const finalOracleEl = document.getElementById('final-oracle');
    if (finalOracleEl) {
        finalOracleEl.textContent = data.winner.score > 0 ? 'DEFEATED' : 'VICTORIOUS';
    }
    
    const finalOracleMessageEl = document.getElementById('final-oracle-message');
    if (finalOracleMessageEl) {
        finalOracleMessageEl.textContent = `"${data.message}"`;
    }
    
    const finalScoresEl = document.getElementById('final-scores');
    if (finalScoresEl) {
        finalScoresEl.innerHTML = scoresHtml;
    }
    
    if (data.roundHistory && Array.isArray(data.roundHistory) && data.roundHistory.length > 0) {
        console.log('Valid final round history found - calling createPointsTable');
        console.log('Calling createPointsTable with tableId: final-points-table');
        createPointsTable(data.roundHistory, 'final-points-table');
        console.log('Final createPointsTable call completed');
    } else {
        console.warn('No final round history data received');
        const finalPointsTable = document.getElementById('final-points-table');
        console.log('Final points table element found:', !!finalPointsTable);
        if (finalPointsTable) {
            finalPointsTable.innerHTML = '<div class="no-data">Final leaderboard data not available</div>';
        }
    }
    
    console.log('Showing game over page');
    showPage('gameOver');
    console.log('=== GAME OVER DEBUG END ===');
});

socket.on('error', (data) => {
    console.error('Socket error:', data.message);
    alert(data.message);
});

// Initialize
showPage('home');
playerNameInput.focus();
console.log('Frontend loaded - Threatened by AI v4.7 (Debug Version with Enhanced Logging)');
