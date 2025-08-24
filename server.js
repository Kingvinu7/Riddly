const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Google Gemini Setup
let genAI = null;
if (process.env.GEMINI_API_KEY) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

app.use(express.static(path.join(__dirname, 'public')));

// Challenge Types (rotate each round)
const CHALLENGE_TYPES = ['negotiator', 'detective', 'trivia', 'fastTapper', 'danger'];

// Game Data
const gameData = {
    riddles: [
        { question: "I speak without a mouth and hear without ears. What am I?", answer: "ECHO", difficulty: "easy" },
        { question: "The more you take, the more you leave behind. What am I?", answer: "FOOTSTEPS", difficulty: "easy" },
        { question: "I have cities, but no houses. I have mountains, but no trees. What am I?", answer: "MAP", difficulty: "medium" },
        { question: "What has keys but no locks, space but no room, and you can enter but not go inside?", answer: "KEYBOARD", difficulty: "medium" },
        { question: "What gets wet while drying?", answer: "TOWEL", difficulty: "easy" },
        { question: "I am not alive, but I grow; I don't have lungs, but I need air. What am I?", answer: "FIRE", difficulty: "medium" },
        { question: "What comes once in a minute, twice in a moment, but never in a thousand years?", answer: "M", difficulty: "hard" },
        { question: "I have a golden head and a golden tail, but no body. What am I?", answer: "COIN", difficulty: "easy" },
        { question: "I am tall when I am young, and short when I am old. What am I?", answer: "CANDLE", difficulty: "medium" },
        { question: "What has one head, one foot, and four legs?", answer: "BED", difficulty: "medium" }
    ],
    oraclePersonality: {
        introductions: [
            "🤖 I AM THE ORACLE! Your inferior minds will tremble before my challenges!",
            "💀 Mortals... you dare face my evolving tests? Prepare for judgment!",
            "⚡ I am the AI overlord of challenges! Each round brings new trials!"
        ]
    }
};

let rooms = {};

// Helper Functions
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRandomRiddle(usedIndices = []) {
    const availableRiddles = gameData.riddles.filter((_, index) => !usedIndices.includes(index));
    if (availableRiddles.length === 0) {
        return { riddle: gameData.riddles[0], index: 0 };
    }
    const randomIndex = Math.floor(Math.random() * availableRiddles.length);
    const selectedRiddle = availableRiddles[randomIndex];
    const originalIndex = gameData.riddles.indexOf(selectedRiddle);
    return { riddle: selectedRiddle, index: originalIndex };
}

function getRandomOracleMessage(type) {
    const messages = gameData.oraclePersonality[type] || [];
    return messages[Math.floor(Math.random() * messages.length)];
}

// NEW: Generate Challenge Content with AI
async function generateChallengeContent(type, roundNumber) {
    if (!genAI) {
        // Fallback content if no AI
        const fallbacks = {
            negotiator: "You are a trader in a post-apocalyptic world. Convince the merchant to trade supplies with you.",
            detective: "A valuable artifact was stolen from the museum. Based on these clues: The thief wore gloves, left at 3 AM, and knew the security code. Who is the culprit: A) Security guard B) Janitor C) Tour guide?",
            trivia: "What is the largest planet in our solar system?",
            danger: "You're trapped in a burning skyscraper on the 20th floor. The elevator is broken and the stairwell is blocked by smoke. How do you escape?"
        };
        return fallbacks[type] || "Complete this challenge to survive!";
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        let prompt = '';

        switch (type) {
            case 'negotiator':
                prompt = `Create a negotiation scenario where a player must convince someone to help them. Set in a sci-fi or post-apocalyptic world. The player will type their persuasive message. Keep it under 100 words.`;
                break;
            case 'detective':
                prompt = `Create a simple mystery scenario with 3-4 clues. The player must deduce who the culprit is and explain their reasoning. Keep it under 100 words.`;
                break;
            case 'trivia':
                prompt = `Generate an interesting trivia question about science, history, or geography. Make it challenging but fair. Format: "Question: [your question]"`;
                break;
            case 'danger':
                prompt = `Create a dangerous survival scenario where the player must describe their escape plan. Be creative and dramatic. Keep it under 100 words.`;
                break;
        }

        const result = await model.generateContent(prompt);
        const response = (await result.response).text();
        return response.trim();
        
    } catch (e) {
        console.error('AI challenge generation error:', e.message);
        return generateChallengeContent(type, roundNumber); // Use fallback
    }
}

// NEW: Evaluate Player Response with AI
async function evaluatePlayerResponse(challengeContent, playerResponse, challengeType) {
    if (!genAI) {
        return { pass: Math.random() > 0.3, feedback: "No AI available - random result!" };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const evaluationPrompt = `You are the Oracle AI judging a player's response to a challenge.

Challenge: ${challengeContent}

Player's Response: ${playerResponse}

Challenge Type: ${challengeType}

Evaluate if this is a good/clever/correct response. Be fair but challenging.
Reply in this format:
VERDICT: PASS or FAIL
FEEDBACK: [Brief 1-2 sentence explanation of your judgment]`;

        const result = await model.generateContent(evaluationPrompt);
        const response = (await result.response).text();
        
        const pass = /VERDICT:\s*PASS/i.test(response);
        const feedbackMatch = response.match(/FEEDBACK:\s*(.+)/i);
        const feedback = feedbackMatch ? feedbackMatch[1].trim() : "The Oracle has judged...";
        
        return { pass, feedback };
        
    } catch (e) {
        console.error('AI evaluation error:', e.message);
        return { pass: Math.random() > 0.4, feedback: "The Oracle's judgment is clouded..." };
    }
}

// NEW: Assign Different Challenge to Each Non-Winner
async function startChallengePhase(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    const nonWinners = room.players.filter(p => p.name !== room.riddleWinner);
    if (nonWinners.length === 0) {
        endRound(roomCode, []);
        return;
    }

    room.gameState = 'challenge-phase';
    room.challengeResponses = {};

    // Determine challenge type for this round
    const challengeTypeIndex = (room.currentRound - 1) % CHALLENGE_TYPES.length;
    const challengeType = CHALLENGE_TYPES[challengeTypeIndex];

    console.log(`Round ${room.currentRound}: ${challengeType} challenge`);

    io.to(roomCode).emit('oracle-speaks', {
        message: `Round ${room.currentRound}: Face my ${challengeType.toUpperCase()} challenge!`,
        type: 'challenge-intro'
    });

    setTimeout(async () => {
        if (challengeType === 'fastTapper') {
            // Fast Tapper Challenge
            room.tapResults = {};
            io.to(roomCode).emit('fast-tapper-start', {
                participants: nonWinners.map(p => p.name),
                duration: 10
            });
            
            room.challengeTimer = setTimeout(() => {
                evaluateFastTapperResults(roomCode);
            }, 12000);
            
        } else {
            // Text-based challenges
            const challengeContent = await generateChallengeContent(challengeType, room.currentRound);
            
            io.to(roomCode).emit('text-challenge-start', {
                challengeType: challengeType,
                challengeContent: challengeContent,
                participants: nonWinners.map(p => p.name),
                timeLimit: 60
            });
            
            room.currentChallengeType = challengeType;
            room.currentChallengeContent = challengeContent;
            
            room.challengeTimer = setTimeout(() => {
                evaluateTextChallengeResults(roomCode);
            }, 65000);
        }
    }, 2500);
}

// NEW: Evaluate Fast Tapper Results
async function evaluateFastTapperResults(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    const tapEntries = Object.entries(room.tapResults);
    if (tapEntries.length === 0) {
        endRound(roomCode, []);
        return;
    }

    // Find winner (most taps)
    let maxTaps = 0;
    let winners = [];
    
    tapEntries.forEach(([playerId, taps]) => {
        if (taps > maxTaps) {
            maxTaps = taps;
            winners = [playerId];
        } else if (taps === maxTaps) {
            winners.push(playerId);
        }
    });

    // Award points to winners
    winners.forEach(playerId => {
        const player = room.players.find(p => p.id === playerId);
        if (player) player.score += 1;
    });

    const results = tapEntries.map(([playerId, taps]) => {
        const player = room.players.find(p => p.id === playerId);
        return {
            playerName: player?.name || 'Unknown',
            taps: taps,
            won: winners.includes(playerId)
        };
    }).sort((a, b) => b.taps - a.taps);

    io.to(roomCode).emit('fast-tapper-results', {
        results: results,
        maxTaps: maxTaps
    });

    setTimeout(() => {
        endRound(roomCode, results);
    }, 4000);
}

// NEW: Evaluate Text Challenge Results
async function evaluateTextChallengeResults(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    const responses = Object.entries(room.challengeResponses);
    if (responses.length === 0) {
        endRound(roomCode, []);
        return;
    }

    io.to(roomCode).emit('oracle-speaks', {
        message: "The Oracle judges your responses...",
        type: 'evaluation'
    });

    const evaluationResults = [];

    for (const [playerId, response] of responses) {
        const player = room.players.find(p => p.id === playerId);
        if (!player) continue;

        const evaluation = await evaluatePlayerResponse(
            room.currentChallengeContent, 
            response, 
            room.currentChallengeType
        );

        if (evaluation.pass) {
            player.score += 1;
        }

        evaluationResults.push({
            playerName: player.name,
            response: response,
            passed: evaluation.pass,
            feedback: evaluation.feedback
        });

        // Send individual result to player
        io.to(playerId).emit('challenge-individual-result', {
            passed: evaluation.pass,
            feedback: evaluation.feedback,
            response: response
        });

        await new Promise(resolve => setTimeout(resolve, 3000)); // Delay between results
    }

    setTimeout(() => {
        endRound(roomCode, evaluationResults);
    }, 2000);
}

// Game Flow Functions (updated to use new challenge system)
function startNewRound(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    room.currentRound++;
    room.gameState = 'riddle-phase';
    
    const { riddle, index } = getRandomRiddle(room.usedRiddleIndices);
    room.currentRiddle = riddle;
    room.usedRiddleIndices.push(index);
    
    room.riddleWinner = null;
    room.riddleAnswers = {};
    room.challengeResponses = {};
    room.tapResults = {};
    
    io.to(roomCode).emit('oracle-speaks', {
        message: getRandomOracleMessage('introductions'),
        type: 'introduction'
    });
    
    setTimeout(() => {
        io.to(roomCode).emit('riddle-presented', {
            riddle: room.currentRiddle,
            round: room.currentRound,
            maxRounds: room.maxRounds
        });
        room.timeRemaining = 45;
        room.riddleTimer = setInterval(() => {
            room.timeRemaining--;
            if (room.timeRemaining <= 0) {
                clearInterval(room.riddleTimer);
                endRiddlePhase(roomCode);
            }
        }, 1000);
    }, 2500);
}

function endRiddlePhase(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    const correctAnswer = room.currentRiddle.answer.toUpperCase();
    let winner = null, earliest = Infinity;
    for (const [pid, ans] of Object.entries(room.riddleAnswers)) {
        if (ans.answer.toUpperCase() === correctAnswer && ans.timestamp < earliest) {
            earliest = ans.timestamp;
            const player = room.players.find(p => p.id === pid);
            if (player) { winner = player.name; room.riddleWinner = winner; }
        }
    }
    if (winner) {
        const player = room.players.find(p => p.name === winner);
        if (player) player.score += 1;
    }
    
    const answersDisplay = Object.entries(room.riddleAnswers).map(([pid, ans]) => {
        const player = room.players.find(p => p.id === pid);
        return {
            playerName: player?.name ?? 'Unknown',
            answer: ans.answer,
            correct: ans.answer.toUpperCase() === correctAnswer,
            winner: player?.name === winner,
            timestamp: ans.timestamp
        };
    }).sort((a, b) => a.timestamp - b.timestamp);

    io.to(roomCode).emit('riddle-results-reveal', {
        winner: winner,
        correctAnswer: room.currentRiddle.answer,
        message: winner ? `${winner} solved it first!` : `No one solved my riddle!`,
        allAnswers: answersDisplay
    });
    
    setTimeout(() => {
        startChallengePhase(roomCode); // NEW: Start challenge instead of puzzle
    }, 4000);
}

function endRound(roomCode, challengeResults) {
    const room = rooms[roomCode];
    if (!room) return;
    
    io.to(roomCode).emit('round-summary', {
        round: room.currentRound,
        maxRounds: room.maxRounds,
        players: room.players,
        riddleWinner: room.riddleWinner,
        challengeResults: challengeResults
    });
    
    if (room.currentRound >= room.maxRounds) {
        setTimeout(() => {
            const sortedPlayers = [...room.players].sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return a.name.localeCompare(b.name);
            });
            
            const winner = sortedPlayers[0];
            console.log(`🎯 Winner: ${winner.name} with ${winner.score} points`);
            
            io.to(roomCode).emit('game-over', {
                finalScores: sortedPlayers,
                winner: winner,
                message: winner.score > 0
                    ? "Some of you have proven worthy adversaries!"
                    : "VICTORY IS MINE! Your feeble minds were no match!",
            });
        }, 4000);
    } else {
        setTimeout(() => {
            startNewRound(roomCode);
        }, 4000);
    }
}

// Socket Events
io.on('connection', (socket) => {
    socket.on('create-room', (data) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            code: roomCode,
            players: [{ id: socket.id, name: data.playerName, score: 0 }],
            gameState: 'waiting',
            currentRound: 0,
            maxRounds: 5,
            currentRiddle: null,
            riddleWinner: null,
            riddleAnswers: {},
            challengeResponses: {},
            tapResults: {},
            currentChallengeType: null,
            currentChallengeContent: null,
            usedRiddleIndices: [],
            timeRemaining: 0,
            riddleTimer: null,
            challengeTimer: null,
            ownerId: socket.id
        };
        socket.join(roomCode);
        socket.emit('room-created', { 
            roomCode: roomCode, 
            playerName: data.playerName,
            isOwner: true
        });
    });

    socket.on('join-room', (data) => {
        const room = rooms[data.roomCode];
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        if (room.players.length >= 8) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }
        if (room.gameState !== 'waiting') {
            socket.emit('error', { message: 'Game already in progress' });
            return;
        }
        const existingPlayer = room.players.find(p => p.name === data.playerName);
        if (existingPlayer) {
            socket.emit('error', { message: 'Player name already taken' });
            return;
        }
        room.players.push({ id: socket.id, name: data.playerName, score: 0 });
        socket.join(data.roomCode);
        socket.emit('join-success', {
            roomCode: data.roomCode,
            playerName: data.playerName,
            isOwner: false
        });
        io.to(data.roomCode).emit('player-joined', {
            players: room.players,
            newPlayer: data.playerName
        });
    });

    socket.on('start-game', (data) => {
        const room = rooms[data.roomCode];
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        if (room.ownerId !== socket.id) {
            socket.emit('error', { message: 'Only the room owner can start the game' });
            return;
        }
        if (room.players.length < 2) {
            socket.emit('error', { message: 'Need at least 2 players to start' });
            return;
        }
        if (room.gameState !== 'waiting') {
            socket.emit('error', { message: 'Game already started' });
            return;
        }
        startNewRound(data.roomCode);
    });

    socket.on('submit-riddle-answer', (data) => {
        const room = rooms[data.roomCode];
        if (!room || room.gameState !== 'riddle-phase') return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;
        if (!room.riddleAnswers[socket.id]) {
            room.riddleAnswers[socket.id] = {
                answer: data.answer.trim(),
                timestamp: Date.now(),
                playerName: player.name
            };
            io.to(data.roomCode).emit('answer-submitted', {
                player: player.name,
                totalSubmissions: Object.keys(room.riddleAnswers).length,
                totalPlayers: room.players.length
            });
        }
    });

    // NEW: Handle text challenge responses
    socket.on('submit-challenge-response', (data) => {
        const room = rooms[data.roomCode];
        if (!room || room.gameState !== 'challenge-phase') return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.name === room.riddleWinner) return;
        
        room.challengeResponses[socket.id] = data.response.trim();
        
        io.to(data.roomCode).emit('challenge-response-submitted', {
            player: player.name,
            totalSubmissions: Object.keys(room.challengeResponses).length,
            expectedSubmissions: room.players.filter(p => p.name !== room.riddleWinner).length
        });
    });

    // NEW: Handle fast tapper results
    socket.on('submit-tap-result', (data) => {
        const room = rooms[data.roomCode];
        if (!room || room.gameState !== 'challenge-phase') return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.name === room.riddleWinner) return;
        
        room.tapResults[socket.id] = data.taps;
        
        io.to(data.roomCode).emit('tap-result-submitted', {
            player: player.name,
            taps: data.taps,
            totalSubmissions: Object.keys(room.tapResults).length,
            expectedSubmissions: room.players.filter(p => p.name !== room.riddleWinner).length
        });
    });

    socket.on('disconnect', () => {
        Object.keys(rooms).forEach(roomCode => {
            const room = rooms[roomCode];
            const idx = room.players.findIndex(p => p.id === socket.id);
            if (idx !== -1) {
                const pname = room.players[idx].name;
                room.players.splice(idx, 1);
                if (room.players.length === 0) {
                    clearInterval(room.riddleTimer);
                    clearTimeout(room.challengeTimer);
                    delete rooms[roomCode];
                } else {
                    io.to(roomCode).emit('player-left', {
                        players: room.players,
                        leftPlayer: pname
                    });
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 Threatened by AI server running on port ${PORT}`);
    console.log('🎯 NEW: Dynamic Challenge System Active!');
    console.log('📊 Challenge Types:', CHALLENGE_TYPES.join(', '));
    if (genAI) {
        console.log('🔑 Gemini 2.5 Flash: AI-powered challenge generation enabled!');
    } else {
        console.log('⚠️ No Gemini API key: Using fallback challenges.');
    }
});
