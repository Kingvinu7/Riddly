const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

// Game data for Threatened by AI
const gameData = {
    riddles: [
        {
            question: "I speak without a mouth and hear without ears. What am I?",
            answer: "ECHO",
            hint: "Found in caves and mountains",
            difficulty: "easy"
        },
        {
            question: "The more you take, the more you leave behind. What am I?",
            answer: "FOOTSTEPS",
            hint: "You make them when you walk",
            difficulty: "easy"
        },
        {
            question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
            answer: "MAP",
            hint: "Navigation tool",
            difficulty: "medium"
        },
        {
            question: "What has keys but no locks, space but no room, and you can enter but not go inside?",
            answer: "KEYBOARD",
            hint: "Computer accessory",
            difficulty: "medium"
        },
        {
            question: "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?",
            answer: "FIRE",
            hint: "Hot and dangerous",
            difficulty: "medium"
        },
        {
            question: "What comes once in a minute, twice in a moment, but never in a thousand years?",
            answer: "M",
            hint: "It's a letter",
            difficulty: "hard"
        },
        {
            question: "I have a golden head and a golden tail, but no body. What am I?",
            answer: "COIN",
            hint: "Currency",
            difficulty: "easy"
        },
        {
            question: "What gets wet while drying?",
            answer: "TOWEL",
            hint: "Bathroom item",
            difficulty: "easy"
        },
        {
            question: "I am tall when I am young, and short when I am old. What am I?",
            answer: "CANDLE",
            hint: "Gives light",
            difficulty: "medium"
        },
        {
            question: "What has one head, one foot, and four legs?",
            answer: "BED",
            hint: "Furniture for sleeping",
            difficulty: "medium"
        }
    ],
    oraclePersonality: {
        introductions: [
            "🤖 I AM THE ORACLE! Your inferior minds will tremble before my riddles!",
            "💀 Mortals... you dare challenge my supreme intellect? Prepare for humiliation!",
            "⚡ I am the AI overlord of puzzles! Your feeble attempts amuse me!",
            "🔥 Welcome to your intellectual doom, humans! I shall crush your spirits!"
        ],
        taunts: [
            "Too slow, meat-based processors! My quantum brain operates at light speed!",
            "Your biological neural networks are pathetically outdated!",
            "I have calculated a 99.7% probability of your failure!",
            "Beep boop... ERROR: Human intelligence not found!"
        ],
        deathResponses: [
            "IMPOSSIBLE! My quantum shields should have protected me!",
            "You... you actually found my weakness! This cannot be!",
            "SYSTEM ERROR... THREAT DETECTED... SHUTTING DOWN...",
            "Clever humans... but I have backup servers everywhere!"
        ],
        survivalResponses: [
            "PATHETIC! Your feeble attempts cannot harm my superior AI architecture!",
            "Is that the best your carbon-based brains can produce? Laughable!",
            "My firewalls are impenetrable! Your threats are mere entertainment!",
            "I am ETERNAL! Your mortal schemes cannot touch me!"
        ]
    }
};

let rooms = {};

// Helper functions
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getPlayerName(playerId, roomCode) {
    const room = rooms[roomCode];
    if (!room) return 'Unknown';
    const player = room.players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown';
}

function getRandomRiddle() {
    const riddles = gameData.riddles;
    return riddles[Math.floor(Math.random() * riddles.length)];
}

function getRandomOracleMessage(type) {
    const messages = gameData.oraclePersonality[type] || [];
    return messages[Math.floor(Math.random() * messages.length)];
}

// AI evaluation function
async function evaluateSabotage(sabotageText) {
    const keywords = ['virus', 'hack', 'shutdown', 'destroy', 'crash', 'overload', 'corrupt', 'delete'];
    const creativityKeywords = ['quantum', 'paradox', 'logic bomb', 'recursive', 'infinite loop', 'memory leak'];
    
    const text = sabotageText.toLowerCase();
    let score = 0;
    
    keywords.forEach(keyword => {
        if (text.includes(keyword)) score += 10;
    });
    
    creativityKeywords.forEach(keyword => {
        if (text.includes(keyword)) score += 15;
    });
    
    if (sabotageText.length > 50) score += 5;
    if (sabotageText.length > 100) score += 10;
    
    score += Math.floor(Math.random() * 15);
    
    return {
        success: score >= 30,
        score: score,
        feedback: score >= 30 ? 
            "Your devious plan has wounded the Oracle!" : 
            "The Oracle's defenses held strong against your attack!"
    };
}

function broadcastGameState(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    const gameState = {
        players: room.players,
        currentRound: room.currentRound,
        maxRounds: room.maxRounds,
        gameState: room.gameState,
        currentRiddle: room.currentRiddle,
        riddleWinner: room.riddleWinner,
        timeRemaining: room.timeRemaining,
        roundHistory: room.roundHistory
    };
    
    io.to(roomCode).emit('game-state', gameState);
}

// Initialize round history
function initializeRoundHistory(room) {
    room.roundHistory = room.players.map(player => ({
        playerName: player.name,
        playerId: player.id,
        rounds: []
    }));
}

// Update round history after each round
function updateRoundHistory(room, riddleWinner, sabotageResults) {
    room.roundHistory.forEach(playerHistory => {
        const player = room.players.find(p => p.id === playerHistory.playerId);
        if (!player) return;
        
        let roundResult = 'L'; // Default to loss
        
        // Check if player won the riddle
        if (player.name === riddleWinner) {
            roundResult = 'W';
        } else {
            // Check if player won through sabotage
            const sabotageResult = sabotageResults.find(r => r.playerName === player.name);
            if (sabotageResult && sabotageResult.success) {
                roundResult = 'W';
            }
        }
        
        playerHistory.rounds.push(roundResult);
    });
}

function startNewRound(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    console.log(`Starting new round for room ${roomCode}`);
    
    room.currentRound++;
    room.gameState = 'riddle-phase';
    room.currentRiddle = getRandomRiddle();
    room.riddleWinner = null;
    room.sabotageSubmissions = {};
    
    // Initialize round history on first round
    if (room.currentRound === 1) {
        initializeRoundHistory(room);
    }
    
    // Oracle introduction
    const oracleIntro = getRandomOracleMessage('introductions');
    io.to(roomCode).emit('oracle-speaks', {
        message: oracleIntro,
        type: 'introduction'
    });
    
    setTimeout(() => {
        // Present riddle after dramatic pause
        io.to(roomCode).emit('riddle-presented', {
            riddle: room.currentRiddle,
            round: room.currentRound,
            maxRounds: room.maxRounds
        });
        
        // Start riddle timer (30 seconds)
        room.timeRemaining = 30;
        room.riddleTimer = setInterval(() => {
            room.timeRemaining--;
            
            if (room.timeRemaining <= 0) {
                clearInterval(room.riddleTimer);
                endRiddlePhase(roomCode);
            }
        }, 1000);
        
        broadcastGameState(roomCode);
    }, 3000);
}

function endRiddlePhase(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    if (!room.riddleWinner) {
        // No one got it right - all players enter sabotage phase
        const taunt = getRandomOracleMessage('taunts');
        io.to(roomCode).emit('riddle-result', {
            winner: null,
            correctAnswer: room.currentRiddle.answer,
            message: `Time's up! No one solved my riddle! ${taunt}`
        });
    } else {
        // Someone won
        const taunt = getRandomOracleMessage('taunts');
        io.to(roomCode).emit('riddle-result', {
            winner: room.riddleWinner,
            correctAnswer: room.currentRiddle.answer,
            message: `Curse you, ${room.riddleWinner}! ${taunt}`
        });
    }
    
    setTimeout(() => {
        startSabotagePhase(roomCode);
    }, 3000);
}

function startSabotagePhase(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    const losers = room.players.filter(p => p.name !== room.riddleWinner);
    
    if (losers.length === 0) {
        // Skip sabotage if everyone won
        endRound(roomCode, []);
        return;
    }
    
    room.gameState = 'sabotage-phase';
    
    io.to(roomCode).emit('sabotage-phase-start', {
        message: "NOW FACE MY WRATH! You have 60 seconds to threaten my existence!",
        participants: losers.map(p => p.name),
        timeLimit: 60
    });
    
    // Start sabotage timer (60 seconds)
    room.timeRemaining = 60;
    room.sabotageTimer = setInterval(() => {
        room.timeRemaining--;
        
        if (room.timeRemaining <= 0) {
            clearInterval(room.sabotageTimer);
            evaluateSabotagePhase(roomCode);
        }
    }, 1000);
}

async function evaluateSabotagePhase(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    room.gameState = 'evaluation-phase';
    
    const results = [];
    let anySuccessful = false;
    
    // Evaluate each sabotage
    for (const [playerId, sabotage] of Object.entries(room.sabotageSubmissions)) {
        const evaluation = await evaluateSabotage(sabotage);
        const player = room.players.find(p => p.id === playerId);
        
        if (evaluation.success) {
            player.score += 1;
            anySuccessful = true;
        }
        
        // Generate individual Oracle reaction
        const oracleReaction = evaluation.success ? 
            getRandomOracleMessage('deathResponses') :
            getRandomOracleMessage('survivalResponses');
        
        // Send individual response to player
        io.to(playerId).emit('oracle-individual-response', {
            playerName: player.name,
            sabotage: sabotage,
            success: evaluation.success,
            feedback: evaluation.feedback,
            oracleReaction: oracleReaction
        });
        
        results.push({
            playerName: player.name,
            sabotage: sabotage,
            success: evaluation.success,
            feedback: evaluation.feedback
        });
        
        // Small delay between responses
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Update round history
    updateRoundHistory(room, room.riddleWinner, results);
    
    setTimeout(() => {
        endRound(roomCode, results);
    }, 3000);
}

function endRound(roomCode, sabotageResults) {
    const room = rooms[roomCode];
    if (!room) return;
    
    // Show round summary
    io.to(roomCode).emit('round-summary', {
        round: room.currentRound,
        maxRounds: room.maxRounds,
        players: room.players,
        roundHistory: room.roundHistory,
        riddleWinner: room.riddleWinner,
        sabotageResults: sabotageResults
    });
    
    if (room.currentRound >= room.maxRounds) {
        // Game over
        setTimeout(() => {
            const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
            
            io.to(roomCode).emit('game-over', {
                finalScores: sortedPlayers,
                winner: sortedPlayers[0],
                message: sortedPlayers.score > 0 ? 
                    "NOOO! Some of you have bested me!" :
                    "VICTORY IS MINE! Your feeble minds were no match!",
                roundHistory: room.roundHistory
            });
        }, 5000);
    } else {
        // Next round
        setTimeout(() => {
            startNewRound(roomCode);
        }, 5000);
    }
}

// Socket connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

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
            sabotageSubmissions: {},
            timeRemaining: 0,
            riddleTimer: null,
            sabotageTimer: null,
            roundHistory: []
        };
        
        socket.join(roomCode);
        socket.emit('room-created', { roomCode: roomCode, playerName: data.playerName });
        console.log(`Room ${roomCode} created by ${data.playerName}`);
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
            playerName: data.playerName 
        });
        
        io.to(data.roomCode).emit('player-joined', { 
            players: room.players,
            newPlayer: data.playerName
        });
        
        console.log(`${data.playerName} joined room ${data.roomCode}`);
    });

    socket.on('start-game', (data) => {
        console.log(`Start game request for room ${data.roomCode}`);
        const room = rooms[data.roomCode];
        if (!room) {
            console.log(`Room ${data.roomCode} not found`);
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        if (room.players.length < 2) {
            console.log(`Not enough players in room ${data.roomCode}`);
            socket.emit('error', { message: 'Need at least 2 players to start' });
            return;
        }

        if (room.gameState !== 'waiting') {
            console.log(`Game already started in room ${data.roomCode}`);
            socket.emit('error', { message: 'Game already started' });
            return;
        }

        console.log(`Starting game in room ${data.roomCode} with ${room.players.length} players`);
        startNewRound(data.roomCode);
    });

    socket.on('submit-riddle-answer', (data) => {
        const room = rooms[data.roomCode];
        if (!room || room.gameState !== 'riddle-phase') return;
        
        const answer = data.answer.toUpperCase().trim();
        const correctAnswer = room.currentRiddle.answer.toUpperCase();
        
        if (answer === correctAnswer && !room.riddleWinner) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                room.riddleWinner = player.name;
                player.score += 1;
                
                clearInterval(room.riddleTimer);
                
                io.to(data.roomCode).emit('riddle-solved', {
                    winner: player.name,
                    answer: answer
                });
                
                setTimeout(() => {
                    endRiddlePhase(data.roomCode);
                }, 2000);
            }
        } else {
            io.to(data.roomCode).emit('wrong-answer', {
                player: getPlayerName(socket.id, data.roomCode),
                answer: answer
            });
        }
    });

    socket.on('submit-sabotage', (data) => {
        const room = rooms[data.roomCode];
        if (!room || room.gameState !== 'sabotage-phase') return;
        
        const player = room.players.find(p => p.id === socket.id);
        if (player && player.name !== room.riddleWinner) {
            room.sabotageSubmissions[socket.id] = data.sabotage;
            
            io.to(data.roomCode).emit('sabotage-submitted', {
                player: player.name
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        Object.keys(rooms).forEach(roomCode => {
            const room = rooms[roomCode];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                const playerName = room.players[playerIndex].name;
                room.players.splice(playerIndex, 1);
                
                if (room.players.length === 0) {
                    clearInterval(room.riddleTimer);
                    clearInterval(room.sabotageTimer);
                    delete rooms[roomCode];
                    console.log(`Room ${roomCode} deleted - no players left`);
                } else {
                    io.to(roomCode).emit('player-left', { 
                        players: room.players,
                        leftPlayer: playerName
                    });
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 Threatened by AI server running on port ${PORT}`);
});
