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

// FIXED: Enhanced submit challenge response with auto-submit support
function submitChallengeResponse(isAutoSubmit = false) {
    const response = document.getElementById('challenge-response').value.trim();
    const submitBtn = document.getElementById('submit-challenge-response');
    
    // Skip validation for auto-submit
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
    // Add indicator for auto-submitted responses
    const finalResponse = isAutoSubmit ? `[Auto-submitted] ${response}` : response;
    socket.emit('submit-challenge-response', { roomCode: currentRoom, response: finalResponse });
    document.getElementById('challenge-response').disabled = true;
    submitBtn.disabled = true;
    submitBtn.textContent = isAutoSubmit ? 'Auto-Submitted!' : 'Submitted!';
    if (isAutoSubmit) {
        // Show user their response was auto-submitted
        setTimeout(() => {
            const shortResponse = response.length > 50 ? response.substring(0, 50) + '...' : response;
            alert(`⏰ Your response was auto-submitted: "${shortResponse}"`);
        }, 1000);
    }
}

// Fast tapper functionality
function onTap() {
    if (!tapperActive) return;
    tapCount++;
    document.getElementById('tap-count').textContent = tapCount.toString();
    // Enhanced visual feedback
    const button = document.getElementById('tap-button');
    const countDisplay = document.getElementById('tap-count');
    
    button.style.transform = 'scale(0.95)';
    countDisplay.style.animation = 'none';
    
    setTimeout(() => {
        button.style.transform = 'scale(1)';
        countDisplay.style.animation = 'numberPulse 0.1s ease-out';
    }, 50);
}

// Enhanced fast tapper timer
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
      
            // Submit result
            socket.emit('submit-tap-result', { roomCode: currentRoom, taps: tapCount });
            
            // Show completion message
            setTimeout(() => {
                alert(`Time's up! You tapped ${tapCount} times!`);
            }, 500);
        }
    }, 1000);
}

// Enhanced lobby functions
function updateLobbyOwnerDisplay() {
    const lobbyHeader = document.querySelector('.lobby-header');
    const existingOwnerBadge = document.querySelector('.owner-badge');
    if (existingOwnerBadge) {
        existingOwnerBadge.remove();
    }
    
    if (isRoomOwner) {
        const ownerBadge = document.createElement('div');
        ownerBadge.className = 'owner-badge';
        ownerBadge.innerHTML = '👑 You are the Room Owner';
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
                ${isOwnerPlayer ? '👑 ' : ''}${player.name}: ${player.score}pts
            </div>
        `;
    }).join('');
}

// Enhanced points table creation with bulletproof error handling
function createPointsTable(roundHistory, tableId) {
    const table = document.getElementById(tableId);
    if (!table) {
        console.error(`Table element with id '${tableId}' not found`);
        return;
    }
    
    console.log('Creating points table for:', tableId, 'with data:', roundHistory);
    if (!roundHistory || !Array.isArray(roundHistory) || roundHistory.length === 0) {
        console.warn('No round history data provided for table:', tableId);
        table.innerHTML = '<div class="no-data">No game data available yet</div>';
        return;
    }
    
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
    roundHistory.forEach(playerHistory => {
        if (!playerHistory.playerName) return; // Skip invalid entries
        
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
    table.innerHTML = tableHtml;
    
    console.log('Points table created successfully for:', tableId);
}

// Enhanced timer with better color progression
function startTimer(elementId, seconds) {
    const element = document.getElementById(elementId);
    let timeLeft = seconds;
    
    const timer = setInterval(() => {
        element.textContent = timeLeft;
        
        // Better color progression
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

// FIXED: Enhanced challenge timer with auto-submit functionality
function startChallengeTimer(elementId, seconds) {
    const element = document.getElementById(elementId);
    const textarea = document.getElementById('challenge-response');
    const submitBtn = document.getElementById('submit-challenge-response');
    let timeLeft = seconds;
    const timer = setInterval(() => {
        element.textContent = timeLeft;
        
        // Color coding for better UX - adjusted for 40 seconds
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
            
            // FIXED: Auto-submit if user has typed something
            if (textarea && !textarea.disabled && !submitBtn.disabled) {
                const currentText = textarea.value.trim();
                if (currentText.length > 0) {
                    console.log('⏰ Auto-submitting response:', currentText.substring(0, 30) + '...');
                    
                    // Add visual indicator
                    element.textContent = 'AUTO-SUBMIT';
                    element.classList.add('auto-submit');
                    
                    // Auto-submit the current text
                    setTimeout(() => {
                        submitChallengeResponse(true);
                    }, 500);
                } else {
                    console.log('⏰ Timer ended with no input');
                    element.textContent = 'TIME UP';
                }
            }
        }
    }, 1000);
    return timer;
}

// Typing effect function
function typeWriter(element, text, speed = 30) {
    return new Promise((resolve) => {
        element.textContent = '';
        let i = 0;
        let isTyping = true;
        
        document.body.style.pointerEvents = 'none';
        
        function typeNextChar() {
            if (i < text.length && isTyping) {
                element.textContent += text.charAt(i);
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
                isTyping = false;
                document.body.style.pointerEvents = 'auto';
                resolve();
            }
        }
        
        typeNextChar();
    });
}

// FIXED: Better individual result overlay with proper text handling
async function showIndividualResult(data) {
    const overlay = document.getElementById('result-overlay');
    const content = document.getElementById('individual-result-content');
    
    // FIXED: Better text handling for display
    let responseText = data.response || "";
    const isAutoSubmitted = responseText.startsWith('[Auto-submitted]');
    
    if (isAutoSubmitted) {
        responseText = responseText.replace('[Auto-submitted] ', '');
    }
    
    const feedbackText = data.feedback || "No feedback available.";
    
    const autoSubmitIndicator = isAutoSubmitted ?
        '<div class="auto-submit-indicator">⏰ Auto-submitted when time expired</div>' : '';
    
    const resultHtml = `
        <div class="individual-result ${data.passed ? 'passed' : 'failed'}">
            <h3>${data.passed ? '✅ WELL REASONED!' : '❌ INSUFFICIENT!'}</h3>
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
    
    // Animate the typing effect
    // Animate the typing effect
await typeWriter(responseEl, `"${responseText}"`, 20); // Faster speed for the response
responseEl.classList.add('typing-complete'); // Add this line

await new Promise(resolve => setTimeout(resolve, 500)); // Pause between the two texts
await typeWriter(feedbackEl, feedbackText);
feedbackEl.classList.add('typing-complete'); // Add this line
    
    continueBtn.classList.remove('hidden'); // Show the button after typing is complete
    
    console.log('Showing individual result:', { passed: data.passed, feedbackLength: feedbackText.length, isAutoSubmitted });
    
    // Auto-hide the overlay after a delay if the user hasn't clicked
    setTimeout(() => {
        if (overlay.style.display === 'flex') {
            console.log("Auto-hiding judgment overlay after timeout.");
            hideIndividualResult();
        }
    }, 8000); // 8-second delay
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

// FIXED: Handle text challenges with auto-submit functionality
socket.on('text-challenge-start', (data) => {
    const isParticipant = data.participants.includes(playerName);
    
    if (isParticipant) {
        document.getElementById('text-challenge-title').textContent = 
            `${data.challengeType.toUpperCase()} CHALLENGE`;
        
        // Better content handling with validation
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
        // FIXED: Use enhanced timer with auto-submit
        startChallengeTimer('text-challenge-timer', data.timeLimit || 40);
        // Auto-focus on textarea after a brief delay
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

// Handle fast tapper challenges
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
// Handle individual challenge results
socket.on('challenge-individual-result', (data) => {
    showIndividualResult(data);
});
// Handle challenge results screens
socket.on('fast-tapper-results', (data) => {
    document.getElementById('challenge-results-title').textContent = '⚡ FAST TAPPER RESULTS';
    document.getElementById('challenge-results-message').textContent = 
        `Fastest fingers: ${data.maxTaps} taps!`;
    
    const resultsHtml = data.results.map(result => `
        <div class="tap-result-item ${result.won ? 'winner' : ''}">
            <span class="tap-result-name">${result.won ? '🏆 ' : ''}${result.playerName}</span>
            <span class="tap-result-count">${result.taps} taps</span>
        </div>
    `).join('');
    
    document.getElementById('challenge-results-content').innerHTML = resultsHtml;
    showPage('challengeResults');
});
// Handle submission status updates
socket.on('challenge-response-submitted', (data) => {
    document.getElementById('text-challenge-submission-count').textContent = 
        `${data.totalSubmissions}/${data.expectedSubmissions} players responded`;
});
socket.on('tap-result-submitted', (data) => {
    console.log(`${data.player} tapped ${data.taps} times`);
});
// Enhanced round summary handler - always shows leaderboard
socket.on('round-summary', (data) => {
    console.log('Received round-summary:', data);
    
    document.getElementById('round-summary-title').textContent = `Round ${data.round} Complete!`;
    
    // Always create points table, even with minimal data
    if (data.roundHistory && Array.isArray(data.roundHistory) && data.roundHistory.length > 0) {
        createPointsTable(data.roundHistory, 'points-table');
    } else {
        console.warn('No round history data received in round-summary');
        const pointsTable = document.getElementById('points-table');
        if (pointsTable) {
            pointsTable.innerHTML = '<div class="no-data">Leaderboard data processing...</div>';
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
    
    showPage('roundSummary');
});
// FIXED: Enhanced game-over handler with tie-breaking display
socket.on('game-over', (data) => {
    console.log('🏆 Game over received:', data);
    
    // Use data.scores from the server, which is the sorted list of players
    const scoresHtml = data.scores.map((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏆';
        return `
            <div class="final-score ${index === 0 ? 'winner' : ''}">
                <span>${medal} ${player.name}</span>
                <span>${player.score} pts</span>
            </div>
        `;
    }).join('');
    
    const bigWinnerEl = document.getElementById('big-winner-announcement');
    if (bigWinnerEl) {
        // Use data.tied from the server to check for a tie
        const tieText = data.tied ? '<br><span style="font-size:0.6em;">🎯 It\'s a Tie!</span>' : '';
        bigWinnerEl.innerHTML = `🏆 CHAMPION: ${data.winner.name} 🏆<br><span style="font-size:0.7em;">${data.winner.score} Points</span>${tieText}`;
    }
    
    const finalOracleEl = document.getElementById('final-oracle');
    if (finalOracleEl) {
        finalOracleEl.textContent = data.winner.score > 0 ? '💥' : '🤖';
    }
    
    const finalOracleMessageEl = document.getElementById('final-oracle-message');
    if (finalOracleMessageEl) {
        finalOracleMessageEl.textContent = `"${data.message}"`;
    }
    
    const finalScoresEl = document.getElementById('final-scores');
    if (finalScoresEl) {
        finalScoresEl.innerHTML = scoresHtml;
    }
    
    // Always create final points table
    if (data.roundHistory && Array.isArray(data.roundHistory) && data.roundHistory.length > 0) {
        createPointsTable(data.roundHistory, 'final-points-table');
    } else {
        console.warn('No final round history data received in game-over');
        const finalPointsTable = document.getElementById('final-points-table');
        if (finalPointsTable) {
            finalPointsTable.innerHTML = '<div class="no-data">Final leaderboard data not available</div>';
        }
    }
    
    showPage('gameOver');
});
socket.on('error', (data) => {
    console.error('Socket error:', data.message);
    alert(data.message);
});

// Initialize
showPage('home');
playerNameInput.focus();
console.log('Frontend loaded - Threatened by AI v4.7 (Judgement Typing Effect)');
