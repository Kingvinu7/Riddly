const socket = io();
let currentRoom = null;
let playerName = null;
let isRoomOwner = false;
let tapCount = 0;
let tapperActive = false;
let challengeTimer = null;

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
    console.log('Showing page:', pageName);
    Object.values(pages).forEach(page => page.classList.remove('active'));
    if (pages[pageName]) {
        pages[pageName].classList.add('active');
    } else {
        console.error('Page not found:', pageName);
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
    console.log('Submitting challenge response, auto:', isAutoSubmit);
    
    const responseField = document.getElementById('challenge-response');
    const triviaOptions = document.getElementById('trivia-options-container');
    const submitBtn = document.getElementById('submit-challenge-response');
    
    if (!responseField || !triviaOptions || !submitBtn) {
        console.error('Missing UI elements for submission');
        return;
    }
    
    let response = '';

    if (triviaOptions.style.display !== 'none') {
        const selectedOption = document.querySelector('.trivia-option.selected');
        if (selectedOption) {
            response = selectedOption.textContent.trim();
        } else if (!isAutoSubmit) {
            alert('Please select an option!');
            return;
        }
    } else {
        response = responseField.value.trim();
        if (!isAutoSubmit) {
            if (!response) {
                alert('Please enter your response - this challenge requires thought!');
                return;
            }
            if (response.length < 5) {
                alert('Please provide a more detailed response for this complex scenario.');
                return;
            }
        }
    }
    
    if (!currentRoom) {
        console.error('No current room for submission');
        return;
    }

    const finalResponse = isAutoSubmit ? `[Auto-submitted] ${response}` : response;
    
    console.log('Sending response:', finalResponse.substring(0, 50) + '...');
    socket.emit('submit-challenge-response', { 
        roomCode: currentRoom, 
        response: finalResponse 
    });

    if (triviaOptions.style.display !== 'none') {
        document.querySelectorAll('.trivia-option').forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
    } else {
        responseField.disabled = true;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = isAutoSubmit ? 'Auto-Submitted!' : 'Submitted!';
    
    if (challengeTimer) {
        clearInterval(challengeTimer);
        challengeTimer = null;
    }
    
    if (isAutoSubmit) {
        setTimeout(() => {
            const shortResponse = response.length > 50 ? response.substring(0, 50) + '...' : response;
            alert(`Time ran out - response auto-submitted: "${shortResponse}"`);
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
    const startGameBtn = document.getElementById('start-game-btn');
    
    if (isRoomOwner && playerCount >= 2) {
        startGameBtn.classList.remove('hidden');
        startGameBtn.disabled = false;
        startGameBtn.textContent = 'Start Game';
        if (waitingText) waitingText.style.display = 'none';
    } else if (isRoomOwner && playerCount < 2) {
        startGameBtn.classList.remove('hidden');
        startGameBtn.disabled = true;
        startGameBtn.textContent = 'Need More Players';
        if (waitingText) {
            waitingText.textContent = 'Waiting for more players...';
            waitingText.style.display = 'block';
        }
    } else {
        startGameBtn.classList.add('hidden');
        if (waitingText) {
            waitingText.textContent = 'Waiting for room owner to start...';
            waitingText.style.display = 'block';
        }
    }
}

function updatePlayers(players) {
    playersListEl.innerHTML = players.map((player, index) => {
        const isOwnerPlayer = index === 0;
        return `
            <div class="player ${isOwnerPlayer ? 'owner-player' : ''}">
                ${isOwnerPlayer ? 'Owner: ' : ''}${player.name}: ${player.score}pts
            </div>
        `;
    }).join('');
}

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
    tableHtml += '<div class="points-table-header">';
    tableHtml += '<div class="player-name-header">Player</div>';
    for (let i = 1; i <= 5; i++) {
        tableHtml += `<div class="round-header">R${i}</div>`;
    }
    tableHtml += '<div class="total-header">Total</div>';
    tableHtml += '</div>';
    
    roundHistory.forEach(playerHistory => {
        if (!playerHistory.playerName) return;
        
        tableHtml += '<div class="points-table-row">';
        tableHtml += `<div class="player-name-cell">${playerHistory.playerName}</div>`;
        
        for (let i = 0; i < 5; i++) {
            const result = (playerHistory.rounds && playerHistory.rounds[i]) ? playerHistory.rounds[i] : '-';
            const resultClass = result === 'W' ? 'win' : result === 'L' ? 'loss' : '';
            tableHtml += `<div class="round-result ${resultClass}">${result}</div>`;
        }
        
        const totalWins = playerHistory.rounds ? playerHistory.rounds.filter(r => r === 'W').length : 0;
        tableHtml += `<div class="total-score">${totalWins}</div>`;
        tableHtml += '</div>';
    });
    tableHtml += '</div>';
    table.innerHTML = tableHtml;
    
    console.log('Points table created successfully for:', tableId);
}

let currentTimer;
function startTimer(elementId, seconds, onComplete = () => {}) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Timer element not found:', elementId);
        return;
    }
    
    let timeLeft = seconds;
    clearInterval(currentTimer);
    
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
            onComplete();
        }
    }, 1000);
    
    currentTimer = timer;
}

function startChallengeTimer(elementId, seconds) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Timer element not found:', elementId);
        return null;
    }
    
    const textarea = document.getElementById('challenge-response');
    const submitBtn = document.getElementById('submit-challenge-response');
    const triviaOptions = document.getElementById('trivia-options-container');
    
    let timeLeft = seconds;
    
    if (challengeTimer) {
        clearInterval(challengeTimer);
    }
    
    console.log('Timer started:', seconds, 'seconds');
    
    challengeTimer = setInterval(() => {
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
            console.log('Timer expired!');
            clearInterval(challengeTimer);
            challengeTimer = null;
            element.classList.remove('urgent', 'danger');
            
            const hasTextInput = textarea && textarea.style.display !== 'none' && textarea.value.trim().length > 0;
            const hasTriviaSelection = triviaOptions && 
                                    triviaOptions.style.display !== 'none' && 
                                    document.querySelector('.trivia-option.selected');
            
            const hasInput = hasTextInput || hasTriviaSelection;

            if (hasInput && submitBtn && !submitBtn.disabled) {
                console.log('Auto-submitting response due to timeout...');
                element.textContent = 'AUTO-SUBMIT';
                element.classList.add('auto-submit');
                
                setTimeout(() => {
                    submitChallengeResponse(true);
                }, 500);
            } else {
                console.log('Timer ended with no input to submit');
                element.textContent = 'TIME UP';
            }
        }
    }, 1000);
    
    return challengeTimer;
}

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

async function showIndividualResult(data) {
    const overlay = document.getElementById('result-overlay');
    const content = document.getElementById('individual-result-content');
    
    if (!overlay || !content) {
        console.error('Result overlay elements not found');
        return;
    }
    
    let responseText = data.response || "";
    const isAutoSubmitted = responseText.startsWith('[Auto-submitted]');
    const isTrivia = data.challengeType === 'trivia';
    
    if (isAutoSubmitted) {
        responseText = responseText.replace('[Auto-submitted] ', '');
    }
    
    const feedbackText = data.feedback || "No feedback available.";
    
    const autoSubmitIndicator = isAutoSubmitted ?
        '<div class="auto-submit-indicator">Time expired - response auto-submitted</div>' : '';
    
    const triviaCorrectAnswer = isTrivia ? `<div class="correct-answer">Correct Answer: <strong>${data.correctAnswer}</strong></div>` : '';

    const resultHtml = `
        <div class="individual-result ${data.passed ? 'passed' : 'failed'}">
            <h3>${data.passed ? 'WELL REASONED!' : 'INSUFFICIENT!'}</h3>
            ${autoSubmitIndicator}
            <div class="result-response"></div>
            ${triviaCorrectAnswer}
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
    
    console.log('Showing individual result:', { passed: data.passed, feedbackLength: feedbackText.length, isAutoSubmitted });
    
    setTimeout(() => {
        if (overlay.style.display === 'flex') {
            console.log("Auto-hiding judgment overlay after timeout.");
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
    
    document.getElementById('submission-count').textContent = `0/0 players answered`;
    
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
    console.log('Received text-challenge-start event:', data);
    console.log('Challenge data properties:', Object.keys(data));
    console.log('Full challenge data:', JSON.stringify(data, null, 2));
    
    const isParticipant = data.participants && data.participants.includes(playerName);
    
    if (isParticipant) {
        const challengeTitle = document.getElementById('text-challenge-title');
        if (challengeTitle) {
            challengeTitle.textContent = `${(data.challengeType || 'CHALLENGE').toUpperCase()} CHALLENGE`;
        }
        
        const contentElement = document.getElementById('text-challenge-content');
        const textarea = document.getElementById('challenge-response');
        const triviaOptionsContainer = document.getElementById('trivia-options-container');
        const submitBtn = document.getElementById('submit-challenge-response');

        if (!contentElement || !textarea || !triviaOptionsContainer || !submitBtn) {
            console.error('Missing challenge UI elements!');
            return;
        }

        textarea.style.display = 'none';
        triviaOptionsContainer.style.display = 'none';
        textarea.value = '';
        textarea.disabled = false;
        submitBtn.disabled = false;
        contentElement.textContent = '';

        if (data.challengeType === 'trivia') {
            console.log('Setting up trivia challenge');
            
            const questionText = data.challengeContent || data.question || data.content || data.text || 'Trivia question loading...';
            contentElement.textContent = questionText;
            
            triviaOptionsContainer.style.display = 'flex';
            triviaOptionsContainer.innerHTML = '';
            
            const options = data.options || data.choices || data.answers || [];
            
            if (Array.isArray(options) && options.length > 0) {
                console.log('Creating trivia options:', options);
                options.forEach((option, index) => {
                    const btn = document.createElement('button');
                    btn.className = 'btn secondary trivia-option';
                    btn.textContent = option;
                    btn.onclick = () => {
                        document.querySelectorAll('.trivia-option').forEach(el => el.classList.remove('selected'));
                        btn.classList.add('selected');
                    };
                    triviaOptionsContainer.appendChild(btn);
                });
            } else {
                console.error('No valid trivia options found!');
                triviaOptionsContainer.innerHTML = '<p class="error-message">Trivia options failed to load. Please refresh and try again.</p>';
            }
            
            submitBtn.textContent = 'Lock in Answer';

        } else {
            console.log('Setting up text challenge');
            
            textarea.style.display = 'block';
            
            const challengeText = data.challengeContent || 
                                 data.scenario || 
                                 data.content || 
                                 data.text || 
                                 data.description ||
                                 'Challenge scenario loading...';
            
            console.log('Challenge content length:', challengeText.length);
            contentElement.textContent = challengeText;
            
            submitBtn.textContent = 'Submit Response';
            
            textarea.placeholder = 'Think carefully and provide a detailed response... (auto-submits when timer reaches 0)';
            setTimeout(() => textarea.focus(), 500);
        }
        
        const submissionCounter = document.getElementById('text-challenge-submission-count');
        if (submissionCounter) {
            submissionCounter.textContent = `0/${data.participants.length} players responded`;
        }
        
        console.log('Showing text challenge page');
        showPage('textChallenge');
        
        if (challengeTimer) {
            clearInterval(challengeTimer);
            challengeTimer = null;
        }
        
        const timeLimit = data.timeLimit || data.duration || 40;
        console.log('Starting timer for', timeLimit, 'seconds');
        startChallengeTimer('text-challenge-timer', timeLimit);
        
    } else {
        console.log('Player is spectating this challenge');
        document.getElementById('waiting-title').textContent = 'Others are facing a complex challenge...';
        document.getElementById('waiting-message').textContent = 
            `Non-winners are solving a challenging ${data.challengeType || 'challenge'} scenario!`;
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
            <span class="tap-result-name">${result.won ? 'Winner: ' : ''}${result.playerName}</span>
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

socket.on('round-summary', (data) => {
    console.log('Received round-summary:', data);
    
    document.getElementById('round-summary-title').textContent = `Round ${data.round} Complete!`;
    
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

socket.on('game-over', (data) => {
    console.log('Game over received:', data);
    
    const scoresHtml = data.scores.map((player, index) => {
        const medal = index === 0 ? 'Winner' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`;
        return `
            <div class="final-score ${index === 0 ? 'winner' : ''}">
                <span>${medal}: ${player.name}</span>
                <span>${player.score} pts</span>
            </div>
        `;
    }).join('');
    
    const bigWinnerEl = document.getElementById('big-winner-announcement');
    if (bigWinnerEl) {
        const tieText = data.tied ? '<br><span style="font-size:0.6em;">It\'s a Tie!</span>' : '';
        bigWinnerEl.innerHTML = `CHAMPION: ${data.winner.name}<br><span style="font-size:0.7em;">${data.winner.score} Points</span>${tieText}`;
    }
    
    const finalOracleEl = document.getElementById('final-oracle');
    if (finalOracleEl) {
        finalOracleEl.textContent = data.winner.score > 0 ? 'Oracle' : 'Oracle';
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
    console.error('Socket error:', data);
    alert('Game error: ' + data.message);
});

// Initialize
showPage('home');
playerNameInput.focus();
console.log('Frontend loaded - Threatened by AI v4.8 (Complete Fixed Version)');
