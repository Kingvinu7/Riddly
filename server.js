const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Initialize OpenAI
const OpenAI = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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
    // Fallback puzzles if AI is not available
    fallbackPuzzles: [
        {
            scenario: "You're trapped in a burning building. The stairs are blocked. Available items:",
            options: [
                { id: "A", text: "A fire extinguisher", survival: false },
                { id: "B", text: "A rope from the window", survival: true },
                { id: "C", text: "A wet towel to cover your face", survival: false }
            ]
        },
        {
            scenario: "You're in a sinking submarine. Water is rising fast. Available items:",
            options: [
                { id: "A", text: "An oxygen tank", survival: true },
                { id: "B", text: "A hammer to break the window", survival: false },
                { id: "C", text: "A life jacket", survival: false }
            ]
        },
        {
            scenario: "You're lost in a desert with no water. You find:",
            options: [
                { id: "A", text: "A cactus to cut open", survival: true },
                { id: "B", text: "A shiny metal sheet", survival: false },
                { id: "C", text: "A GPS device with dead battery", survival: false }
            ]
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

// AI generates a survival puzzle with multiple choice options
async function generateSurvivalPuzzle() {
    if (!process.env.OPENAI_API_KEY) {
        // Use fallback puzzle
        const fallbacks = gameData.fallbackPuzzles;
        const puzzle = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        return {
            scenario: puzzle.scenario,
            options: puzzle.options
        };
    }

    const prompt = `Create a survival puzzle for a party game. Follow this exact format:

Context: Players are in a dangerous situation and must choose the correct item/action to survive.

Requirements:
- Start with "You're trapped/stuck/lost in [dangerous situation]"
- Describe the scenario in 1-2 sentences
- List exactly 3 items/options labeled A, B, C
- One option should be clearly the best for survival
- Make it logical but not too obvious
- Keep scenario under 60 words total

Example format:
"You're locked in a metal room filling with water. On the table are:

A) A hammer
B) A screwdriver  
C) A mirror

Only one item can realistically save you before the room floods. Which do you choose?"

Create a new survival puzzle:`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.8,
        });

        const content = response.choices[0].message.content;
        
        // Parse the AI response to extract scenario and options
        const lines = content.split('\n').filter(line => line.trim());
        const scenario = lines.find(line => !line.match(/^[ABC]\)/))?.trim() || "You face a deadly challenge...";
        
        const options = [];
        for (const line of lines) {
            const match = line.match(/^([ABC])\)\s*(.+)/);
            if (match) {
                options.push({
                    id: match[1],
                    text: match[2].trim(),
                    survival: Math.random() > 0.66 // Randomly assign survival outcome
                });
            }
        }

        // Ensure we have 3 options, create defaults if parsing failed
        while (options.length < 3) {
            const letters = ['A', 'B', 'C'];
            options.push({
                id: letters[options.length],
                text: `Option ${letters[options.length]}`,
                survival: options.length === 0 // Make first option correct if we're creating defaults
            });
        }

        // Ensure at least one option is a survival option
        if (!options.some(opt => opt.survival)) {
            options[Math.floor(Math.random() * options.length)].survival = true;
        }

        return {
            scenario: scenario,
            options: options.slice(0, 3) // Only take first 3 options
        };

    } catch (error) {
        console.error('Puzzle Generation Error:', error.message);
        // Return fallback puzzle
        const fallbacks = gameData.fallbackPuzzles;
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

// AI narrates the outcome of player choices
async function generateChoiceNarration(puzzle, choiceGroups) {
    if (!process.env.OPENAI_API_KEY) {
        // Fallback narrations
        let narrations = [];
        for (const [optionId, players] of Object.entries(choiceGroups)) {
            const option = puzzle.options.find(opt => opt.id === optionId);
            const playerNames = players.join(', ');
            const survived = option ? option.survival : Math.random() > 0.5;
            
            narrations.push({
                optionId: optionId,
                players: players,
                survived: survived,
                narration: survived ? 
                    `${playerNames} made the right choice and survived!` :
                    `${playerNames} made a fatal mistake and perished!`
            });
        }
        return narrations;
    }

    const prompt = `Context: Players faced this survival scenario: "${puzzle.scenario}"

The options were:
${puzzle.options.map(opt => `${opt.id}) ${opt.text}`).join('\n')}

Player choices:
${Object.entries(choiceGroups).map(([optionId, players]) => 
    `Option ${optionId}: ${players.join(', ')}`
).join('\n')}

Your task: For each group of players, write a dramatic 2-3 sentence narration of their fate. Decide if they survive or die based on the logic of their choice.

Requirements:
- Write in dramatic, cinematic style
- Include all player names in each narration
- Be specific about WHY their choice led to success/failure
- Make it entertaining for a party game
- End each narration with "SURVIVED" or "ELIMINATED"

Format your response as:
Option A - [Player names]: [Dramatic narration ending with SURVIVED/ELIMINATED]
Option B - [Player names]: [Dramatic narration ending with SURVIVED/ELIMINATED]
(etc.)

Your dramatic narrations:`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 300,
            temperature: 0.9,
        });

        const content = response.choices[0].message.content;
        const narrations = [];

        // Parse the AI response
        for (const [optionId, players] of Object.entries(choiceGroups)) {
            const optionRegex = new RegExp(`Option ${optionId}[^:]*:([^]*?)(?=Option [ABC]|$)`, 'i');
            const match = content.match(optionRegex);
            
            let narrationText = match ? match[1].trim() : 
                `${players.join(', ')} chose option ${optionId}. Their fate hangs in the balance...`;
            
            const survived = narrationText.toLowerCase().includes('survived') || 
                           (!narrationText.toLowerCase().includes('eliminated') && 
                            !narrationText.toLowerCase().includes('die') && 
                            Math.random() > 0.5);

            narrations.push({
                optionId: optionId,
                players: players,
                survived: survived,
                narration: narrationText
            });
        }

        return narrations;

    } catch (error) {
        console.error('Choice Narration Error:', error.message);
        // Fallback narrations
        let narrations = [];
        for (const [optionId, players] of Object.entries(choiceGroups)) {
            const survived = Math.random() > 0.5;
            narrations.push({
                optionId: optionId,
                players: players,
                survived: survived,
                narration: survived ? 
                    `${players.join(', ')} made a brilliant choice and survived the ordeal!` :
                    `${players.join(', ')} chose poorly and met their doom!`
            });
        }
        return narrations;
    }
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
function updateRoundHistory(room, riddleWinner, puzzleResults) {
    room.roundHistory.forEach(playerHistory => {
        const player = room.players.find(p => p.id === playerHistory.playerId);
        if (!player) return;
        
        let roundResult = 'L'; // Default to loss
        
        // Check if player won the riddle
        if (player.name === riddleWinner) {
            roundResult = 'W';
        } else {
            // Check if player survived the puzzle challenge
            const playerResult = puzzleResults.find(r => r.players.includes(player.name));
            if (playerResult && playerResult.survived) {
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
    room.riddleAnswers = {};
    room.puzzleChoices = {}; // Track puzzle choices
    
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
    
    // Find who answered correctly first
    const correctAnswer = room.currentRiddle.answer.toUpperCase();
    let winner = null;
    let earliestTime = Infinity;
    
    // Check all submitted answers
    for (const [playerId, answerData] of Object.entries(room.riddleAnswers)) {
        if (answerData.answer.toUpperCase() === correctAnswer && answerData.timestamp < earliestTime) {
            earliestTime = answerData.timestamp;
            const player = room.players.find(p => p.id === playerId);
            if (player) {
                winner = player.name;
                room.riddleWinner = winner;
            }
        }
    }
    
    // Award point to winner
    if (winner) {
        const winningPlayer = room.players.find(p => p.name === winner);
        if (winningPlayer) {
            winningPlayer.score += 1;
        }
    }
    
    // Show results to all players
    const answersDisplay = Object.entries(room.riddleAnswers).map(([playerId, answerData]) => {
        const player = room.players.find(p => p.id === playerId);
        const isCorrect = answerData.answer.toUpperCase() === correctAnswer;
        const isWinner = player && player.name === winner;
        return {
            playerName: player ? player.name : 'Unknown',
            answer: answerData.answer,
            correct: isCorrect,
            winner: isWinner,
            timestamp: answerData.timestamp
        };
    }).sort((a, b) => a.timestamp - b.timestamp);
    
    if (!winner) {
        const taunt = getRandomOracleMessage('taunts');
        io.to(roomCode).emit('riddle-results-reveal', {
            winner: null,
            correctAnswer: room.currentRiddle.answer,
            message: `Time's up! No one solved my riddle correctly! ${taunt}`,
            allAnswers: answersDisplay
        });
    } else {
        const taunt = getRandomOracleMessage('taunts');
        io.to(roomCode).emit('riddle-results-reveal', {
            winner: winner,
            correctAnswer: room.currentRiddle.answer,
            message: `${winner} solved it first! Curse your quick thinking! ${taunt}`,
            allAnswers: answersDisplay
        });
    }
    
    setTimeout(() => {
        startPuzzlePhase(roomCode);
    }, 5000);
}

async function startPuzzlePhase(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    const nonWinners = room.players.filter(p => p.name !== room.riddleWinner);
    
    if (nonWinners.length === 0) {
        // Skip puzzle phase if everyone won
        endRound(roomCode, []);
        return;
    }
    
    room.gameState = 'puzzle-phase';
    
    // Generate survival puzzle
    const puzzle = await generateSurvivalPuzzle();
    room.currentPuzzle = puzzle;
    
    io.to(roomCode).emit('oracle-speaks', {
        message: "Non-winners! Face my survival puzzle. Choose wisely... your virtual lives depend on it!",
        type: 'puzzle-intro'
    });
    
    setTimeout(() => {
        // Present puzzle to non-winners
        io.to(roomCode).emit('puzzle-challenge-start', {
            message: "Survival Challenge for Non-Winners:",
            participants: nonWinners.map(p => p.name),
            puzzle: puzzle,
            timeLimit: 30
        });
        
        // Start puzzle timer (30 seconds)
        room.timeRemaining = 30;
        room.puzzleTimer = setInterval(() => {
            room.timeRemaining--;
            
            if (room.timeRemaining <= 0) {
                clearInterval(room.puzzleTimer);
                evaluatePuzzlePhase(roomCode);
            }
        }, 1000);
    }, 3000);
}

async function evaluatePuzzlePhase(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    room.gameState = 'evaluation-phase';
    
    // Group players by their choices
    const choiceGroups = {};
    for (const [playerId, choice] of Object.entries(room.puzzleChoices)) {
        const player = room.players.find(p => p.id === playerId);
        if (player) {
            if (!choiceGroups[choice]) {
                choiceGroups[choice] = [];
            }
            choiceGroups[choice].push(player.name);
        }
    }
    
    console.log('Choice groups:', choiceGroups);
    
    // Oracle announces evaluation
    io.to(roomCode).emit('oracle-speaks', {
        message: "🎭 Now to reveal the consequences of your choices! Let me narrate your fates...",
        type: 'evaluation'
    });
    
    // Generate AI narrations for each choice group
    const narrations = await generateChoiceNarration(room.currentPuzzle, choiceGroups);
    
    // Award points to survivors
    for (const narration of narrations) {
        if (narration.survived) {
            for (const playerName of narration.players) {
                const player = room.players.find(p => p.name === playerName);
                if (player) {
                    player.score += 1;
                }
            }
        }
    }
    
    // Send results one by one for dramatic effect
    for (const narration of narrations) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        io.to(roomCode).emit('puzzle-choice-result', {
            optionId: narration.optionId,
            optionText: room.currentPuzzle.options.find(opt => opt.id === narration.optionId)?.text || 'Unknown option',
            players: narration.players,
            survived: narration.survived,
            narration: narration.narration
        });
    }
    
    // Update round history
    updateRoundHistory(room, room.riddleWinner, narrations);
    
    // Final summary
    setTimeout(() => {
        const survivors = narrations.filter(n => n.survived).flatMap(n => n.players);
        const casualties = narrations.filter(n => !n.survived).flatMap(n => n.players);
        
        const finalMessage = survivors.length > 0 ? 
            `🎯 ${survivors.length} of you survived my challenge! Impressive... but expected from superior minds.` :
            `💀 TOTAL ELIMINATION! None of you survived my puzzle! Your logic is as flawed as your existence!`;
            
        io.to(roomCode).emit('oracle-final-judgment', {
            message: finalMessage,
            survivors: survivors,
            casualties: casualties
        });
        
        setTimeout(() => {
            endRound(roomCode, narrations);
        }, 3000);
    }, 2000);
}

function endRound(roomCode, puzzleResults) {
    const room = rooms[roomCode];
    if (!room) return;
    
    // Show round summary
    io.to(roomCode).emit('round-summary', {
        round: room.currentRound,
        maxRounds: room.maxRounds,
        players: room.players,
        roundHistory: room.roundHistory,
        riddleWinner: room.riddleWinner,
        puzzleResults: puzzleResults
    });
    
    if (room.currentRound >= room.maxRounds) {
        // Game over
        setTimeout(() => {
            const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
            
            io.to(roomCode).emit('game-over', {
                finalScores: sortedPlayers,
                winner: sortedPlayers[0],
                message: sortedPlayers.score > 0 ? 
                    "Some of you have proven worthy adversaries!" :
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
            riddleAnswers: {},
            puzzleChoices: {}, // Track puzzle choices
            currentPuzzle: null,
            timeRemaining: 0,
            riddleTimer: null,
            puzzleTimer: null,
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
            socket.emit('error', { message: 'Room not found' });
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

    // Handle riddle answers
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
            
            console.log(`${player.name} submitted riddle answer: ${data.answer}`);
            
            io.to(data.roomCode).emit('answer-submitted', {
                player: player.name,
                totalSubmissions: Object.keys(room.riddleAnswers).length,
                totalPlayers: room.players.length
            });
        }
    });

    // NEW: Handle puzzle choices
    socket.on('submit-puzzle-choice', (data) => {
        const room = rooms[data.roomCode];
        if (!room || room.gameState !== 'puzzle-phase') return;
        
        const player = room.players.find(p => p.id === socket.id);
        if (player && player.name !== room.riddleWinner) {
            room.puzzleChoices[socket.id] = data.choice;
            
            console.log(`${player.name} chose option: ${data.choice}`);
            
            io.to(data.roomCode).emit('puzzle-choice-submitted', {
                player: player.name,
                choice: data.choice,
                totalSubmissions: Object.keys(room.puzzleChoices).length,
                expectedSubmissions: room.players.filter(p => p.name !== room.riddleWinner).length
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
                    clearInterval(room.puzzleTimer);
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
    console.log(`🔑 OpenAI API: ${process.env.OPENAI_API_KEY ? 'Connected' : 'Not configured (using fallback)'}`);
});
