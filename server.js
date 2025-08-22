const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Google Gemini Setup - UPDATED for 2.5 Flash
let genAI = null;
if (process.env.GEMINI_API_KEY) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

app.use(express.static(path.join(__dirname, 'public')));

// --- Game Data (your existing data) ---
const gameData = {
    riddles: [
        { question: "I speak without a mouth and hear without ears. What am I?", answer: "ECHO", difficulty: "easy" },
        { question: "The more you take, the more you leave behind. What am I?", answer: "FOOTSTEPS", difficulty: "easy" },
        { question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", answer: "MAP", difficulty: "medium" },
        { question: "What has keys but no locks, space but no room, and you can enter but not go inside?", answer: "KEYBOARD", difficulty: "medium" },
        { question: "What gets wet while drying?", answer: "TOWEL", difficulty: "easy" },
        { question: "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?", answer: "FIRE", difficulty: "medium" },
        { question: "What comes once in a minute, twice in a moment, but never in a thousand years?", answer: "M", difficulty: "hard" },
        { question: "I have a golden head and a golden tail, but no body. What am I?", answer: "COIN", difficulty: "easy" },
        { question: "I am tall when I am young, and short when I am old. What am I?", answer: "CANDLE", difficulty: "medium" },
        { question: "What has one head, one foot, and four legs?", answer: "BED", difficulty: "medium" },
        { question: "What can travel around the world while staying in a corner?", answer: "STAMP", difficulty: "hard" },
        { question: "What breaks but never falls, and what falls but never breaks?", answer: "DAWN", difficulty: "hard" },
        { question: "I can be cracked, made, told, and played. What am I?", answer: "JOKE", difficulty: "medium" },
        { question: "What has hands but cannot clap?", answer: "CLOCK", difficulty: "easy" },
        { question: "What runs around the whole yard without moving?", answer: "FENCE", difficulty: "medium" }
    ],
    fallbackPuzzles: [
        {
            scenario: "You're locked in a metal room filling with water. On the table are:",
            options: [
                { id: "A", text: "A hammer", survival: false },
                { id: "B", text: "A screwdriver", survival: false },
                { id: "C", text: "A mirror", survival: true }
            ]
        },
        {
            scenario: "You're trapped in a burning building. The stairs are blocked. Available items:",
            options: [
                { id: "A", text: "A fire extinguisher", survival: false },
                { id: "B", text: "A rope from the window", survival: true },
                { id: "C", text: "A wet towel to cover your face", survival: false }
            ]
        }
        // Add your expanded puzzle list here
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
            "Beep boop... ERROR: Human intelligence not found!",
            "Your biological neural networks are pathetically outdated!",
            "I have calculated a 99.7% probability of your failure!"
        ]
    }
};

let rooms = {};

// --- Helper Functions ---
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

function getFallbackPuzzle() {
    const puzzles = gameData.fallbackPuzzles;
    return puzzles[Math.floor(Math.random() * puzzles.length)];
}

// FIXED: Enhanced generateSurvivalPuzzle with error handling
async function generateSurvivalPuzzle() {
    if (!genAI) {
        console.log("❌ No genAI instance, using fallback");
        return getFallbackPuzzle();
    }
    
    try {
        console.log("🤖 Calling Gemini 2.5 Flash for new puzzle...");
        // UPGRADED: Using gemini-2.5-flash for 1000 daily requests
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const prompt = `Create a survival puzzle for a party game. Use this EXACT format:

SCENARIO: [One sentence describing dangerous situation]
A) [First survival option]
B) [Second survival option] 
C) [Third survival option]

Example:
SCENARIO: You're trapped in a sinking submarine and water is rising rapidly.
A) Try to break the window
B) Look for an emergency oxygen tank
C) Signal for help with a flashlight

Generate a NEW survival puzzle now using the exact format above:`;

        const result = await model.generateContent(prompt);
        const respText = (await result.response).text();
        
        console.log("📝 Raw Gemini response:", respText);
        
        // FIXED: Defensive parsing with validation
        if (!respText || typeof respText !== 'string' || respText.trim().length === 0) {
            throw new Error('Empty or invalid response from Gemini API');
        }
        
        const lines = respText.split('\n').filter(line => line && line.trim().length > 0);
        console.log("📋 Filtered lines:", lines.length);
        
        if (lines.length < 4) {
            throw new Error(`Insufficient lines in response. Got ${lines.length}, need at least 4`);
        }
        
        // FIXED: Find scenario line more reliably
        let scenario = '';
        let optionStartIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.toLowerCase().startsWith('scenario:')) {
                scenario = line.substring(9).trim();
                optionStartIndex = i + 1;
                break;
            } else if (!line.match(/^[ABC]\)/i) && !scenario) {
                // First non-option line becomes scenario
                scenario = line;
                optionStartIndex = i + 1;
            }
        }
        
        if (!scenario) {
            throw new Error('Could not find scenario in response');
        }
        
        const options = [];
        
        // FIXED: Robust option parsing
        for (let i = optionStartIndex; i < lines.length && options.length < 3; i++) {
            if (!lines[i]) continue;
            
            const line = lines[i].trim();
            if (!line) continue;
            
            const match = line.match(/^([ABC])\)\s*(.+)$/i);
            if (match && match[2] && match[2].trim().length > 0) {
                options.push({ 
                    id: match[1].toUpperCase(), 
                    text: match[2].trim(), 
                    survival: false 
                });
                console.log(`✅ Parsed option ${match[1].toUpperCase()}: ${match[2].trim()}`);
            }
        }
        
        // FIXED: Validate we have exactly 3 options
        if (options.length !== 3) {
            throw new Error(`Expected 3 options, got ${options.length}. Available lines: ${lines.length}`);
        }
        
        // Randomly assign survival option
        const survivalIndex = Math.floor(Math.random() * 3);
        options[survivalIndex].survival = true;
        
        console.log(`🎯 Gemini 2.5 Flash puzzle created! Survival option: ${options[survivalIndex].id}`);
        
        return { scenario, options };
        
    } catch(e) {
        console.error('❌ Gemini 2.5 Flash error:', e.message);
        console.log("🔄 Using fallback puzzle");
        return getFallbackPuzzle();
    }
}

// ENHANCED: Improved choice narration with better error handling
async function generateChoiceNarration(puzzle, choiceGroups) {
    if (!genAI) {
        // Enhanced fallback narrations
        let narr = [];
        for (const [optionId, players] of Object.entries(choiceGroups)) {
            const opt = puzzle.options.find(o => o.id === optionId);
            const survived = opt?.survival ?? (Math.random() > 0.5);
            
            let detailedStory = survived ?
                `${players.join(', ')} demonstrate remarkable ingenuity! They use their chosen approach wisely, creating a brilliant escape route through quick thinking and determination. Against overwhelming odds, they manage to overcome the deadly situation and find safety. SURVIVED` :
                `${players.join(', ')} put their plan into action with hope, but a critical flaw emerges in their strategy. Despite their courage and best efforts, the chosen approach proves inadequate for this deadly scenario. The harsh reality becomes clear as their escape attempt fails catastrophically. ELIMINATED`;
            
            narr.push({ optionId, players, survived, narration: detailedStory });
        }
        return narr;
    }
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Scenario: "${puzzle.scenario}"
Options:
${puzzle.options.map(o => o.id + ') ' + o.text).join('\n')}

Player groups:
${Object.entries(choiceGroups).map(([k,v]) => `Option ${k}: ${v.join(', ')}`).join('\n')}

For each option group, write a vivid, cinematic narration (3-4 sentences):

If SURVIVED: 
- Describe their clever escape step-by-step
- Show resourcefulness and dramatic triumph
- Include specific details about their actions

If ELIMINATED: 
- Describe the fatal flaw in their plan
- Show the dramatic moment of failure
- Include vivid consequences

Write dramatically and always end with: "SURVIVED" or "ELIMINATED"`;

        const result = await model.generateContent(prompt);
        const content = (await result.response).text();
        let narr = [];
        
        for (const [optionId, players] of Object.entries(choiceGroups)) {
            const regex = new RegExp(`Option ${optionId}[^:]*:[^]*?([^]+?)(SURVIVED|ELIMINATED)`, 'i');
            const match = content.match(regex);
            
            let narration, survived;
            
            if (match) {
                narration = match[1].trim() + ' ' + match[2].toUpperCase();
                survived = match[2].toUpperCase() === 'SURVIVED';
            } else {
                // Enhanced fallback if parsing fails
                survived = Math.random() > 0.5;
                narration = survived ? 
                    `${players.join(', ')} execute their plan with precision, using their chosen method to create an unexpected escape route that leads them to safety through ingenuity and courage. SURVIVED` :
                    `${players.join(', ')} attempt their escape strategy with determination, but their chosen approach contains a fatal weakness that becomes apparent too late, sealing their fate. ELIMINATED`;
            }
            
            narr.push({ optionId, players, survived, narration });
        }
        return narr;
    } catch (e) {
        console.error('Narration generation error:', e.message);
        // Enhanced fallback narrations
        let narr = [];
        for (const [optionId, players] of Object.entries(choiceGroups)) {
            const survived = Math.random() > 0.5;
            const detailedStory = survived ?
                `${players.join(', ')} show incredible resourcefulness! Their chosen strategy unfolds brilliantly, creating multiple escape opportunities through clever improvisation and teamwork. SURVIVED` :
                `${players.join(', ')} execute their plan with hope, but unforeseen complications arise that their chosen method cannot overcome, leading to their dramatic downfall. ELIMINATED`;
            
            narr.push({ optionId, players, survived, narration: detailedStory });
        }
        return narr;
    }
}

// --- Game State Handling ---
function initializeRoundHistory(room) {
    room.roundHistory = room.players.map(player => ({
        playerName: player.name,
        playerId: player.id,
        rounds: []
    }));
}

function updateRoundHistory(room, riddleWinner, puzzleResults) {
    room.roundHistory.forEach(playerHistory => {
        const player = room.players.find(p => p.id === playerHistory.playerId);
        let roundResult = 'L';
        if (player?.name === riddleWinner) {
            roundResult = 'W';
        } else {
            const res = puzzleResults?.find(r => r.players.includes(player.name));
            if (res?.survived) roundResult = 'W';
        }
        playerHistory.rounds.push(roundResult);
    });
}

// --- Game Flow Functions (all your existing functions remain the same) ---
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
    room.puzzleChoices = {};
    if (room.currentRound === 1) initializeRoundHistory(room);
    
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
        startPuzzlePhase(roomCode);
    }, 4000);
}

async function startPuzzlePhase(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    const nonWinners = room.players.filter(p => p.name !== room.riddleWinner);
    if (nonWinners.length === 0) {
        endRound(roomCode, []);
        return;
    }
    room.gameState = 'puzzle-phase';
    room.currentPuzzle = await generateSurvivalPuzzle();
    
    io.to(roomCode).emit('oracle-speaks', {
        message: "Non-winners! Face my survival puzzle. Choose wisely...",
        type: 'puzzle-intro'
    });
    
    setTimeout(() => {
        io.to(roomCode).emit('puzzle-challenge-start', {
            message: "Survival Challenge for Non-Winners:",
            participants: nonWinners.map(p => p.name),
            puzzle: room.currentPuzzle,
            timeLimit: 45
        });
        room.timeRemaining = 45;
        room.puzzleTimer = setInterval(() => {
            room.timeRemaining--;
            if (room.timeRemaining <= 0) {
                clearInterval(room.puzzleTimer);
                evaluatePuzzlePhase(roomCode);
            }
        }, 1000);
    }, 2300);
}

async function evaluatePuzzlePhase(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    room.gameState = 'evaluation-phase';
    const choiceGroups = {};
    for (const [pid, choice] of Object.entries(room.puzzleChoices)) {
        const player = room.players.find(p => p.id === pid);
        if (player) {
            if (!choiceGroups[choice]) choiceGroups[choice] = [];
            choiceGroups[choice].push(player.name);
        }
    }
    
    io.to(roomCode).emit('oracle-speaks', {
        message: "Now to reveal the consequences of your choices...",
        type: 'evaluation'
    });
    
    const narrs = await generateChoiceNarration(room.currentPuzzle, choiceGroups);
    
    for (const narr of narrs) {
        if (narr.survived) {
            for (const pname of narr.players) {
                const player = room.players.find(p => p.name === pname);
                if (player) player.score += 1;
            }
        }
        
        io.to(roomCode).emit('puzzle-choice-result', {
            optionId: narr.optionId,
            optionText: room.currentPuzzle.options.find(opt => opt.id === narr.optionId)?.text || 'Unknown option',
            players: narr.players,
            survived: narr.survived,
            narration: narr.narration
        });
        await new Promise(res => setTimeout(res, 6000));
    }
    updateRoundHistory(room, room.riddleWinner, narrs);
    setTimeout(() => {
        endRound(roomCode, narrs);
    }, 2200);
}

// FIXED: Winner calculation with proper sorting
function endRound(roomCode, puzzleResults) {
    const room = rooms[roomCode];
    if (!room) return;
    
    io.to(roomCode).emit('round-summary', {
        round: room.currentRound,
        maxRounds: room.maxRounds,
        players: room.players,
        roundHistory: room.roundHistory,
        riddleWinner: room.riddleWinner,
        puzzleResults: puzzleResults
    });
    
    if (room.currentRound >= room.maxRounds) {
        setTimeout(() => {
            // FIXED: Proper winner calculation - highest score wins
            const sortedPlayers = [...room.players].sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score; // Descending by score
                }
                return a.name.localeCompare(b.name); // Alphabetical for ties
            });
            
            console.log('🏆 Final scores:');
            sortedPlayers.forEach((player, index) => {
                console.log(`${index + 1}. ${player.name}: ${player.score} points`);
            });
            
            const winner = sortedPlayers[0];
            console.log(`🎯 Winner: ${winner.name} with ${winner.score} points`);
            
            io.to(roomCode).emit('game-over', {
                finalScores: sortedPlayers,
                winner: winner,
                message: winner.score > 0
                    ? "Some of you have proven worthy adversaries!"
                    : "VICTORY IS MINE! Your feeble minds were no match!",
                roundHistory: room.roundHistory
            });
        }, 4000);
    } else {
        setTimeout(() => {
            startNewRound(roomCode);
        }, 4000);
    }
}

// --- Socket Events (all your existing socket events remain the same) ---
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
            puzzleChoices: {},
            currentPuzzle: null,
            usedRiddleIndices: [],
            timeRemaining: 0,
            riddleTimer: null,
            puzzleTimer: null,
            roundHistory: []
        };
        socket.join(roomCode);
        socket.emit('room-created', { roomCode: roomCode, playerName: data.playerName });
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
    });

    socket.on('start-game', (data) => {
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

    socket.on('submit-puzzle-choice', (data) => {
        const room = rooms[data.roomCode];
        if (!room || room.gameState !== 'puzzle-phase') return;
        const player = room.players.find(p => p.id === socket.id);
        if (player && player.name !== room.riddleWinner) {
            room.puzzleChoices[socket.id] = data.choice;
            io.to(data.roomCode).emit('puzzle-choice-submitted', {
                player: player.name,
                choice: data.choice,
                totalSubmissions: Object.keys(room.puzzleChoices).length,
                expectedSubmissions: room.players.filter(p => p.name !== room.riddleWinner).length
            });
        }
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
                    clearInterval(room.puzzleTimer);
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
    if (genAI) {
        console.log('🔑 Gemini 2.5 Flash detected: 1000 free requests daily!');
    } else {
        console.log('⚠️ No Gemini API key: Using enhanced fallback narratives.');
    }
});
