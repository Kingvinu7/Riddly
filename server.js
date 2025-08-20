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

// --- Game Data ---

const gameData = {
    riddles: [
        { question: "I speak without a mouth and hear without ears. What am I?", answer: "ECHO", difficulty: "easy" },
        { question: "The more you take, the more you leave behind. What am I?", answer: "FOOTSTEPS", difficulty: "easy" },
        { question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", answer: "MAP", difficulty: "medium" },
        { question: "What has keys but no locks, space but no room, and you can enter but not go inside?", answer: "KEYBOARD", difficulty: "medium" },
        { question: "What gets wet while drying?", answer: "TOWEL", difficulty: "easy" }
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
    ],
    oraclePersonality: {
        introductions: [
            "🤖 I AM THE ORACLE! Your inferior minds will tremble before my riddles!",
            "💀 Mortals... you dare challenge my supreme intellect? Prepare for humiliation!"
        ],
        taunts: [
            "Too slow, meat-based processors! My quantum brain operates at light speed!",
            "Beep boop... ERROR: Human intelligence not found!"
        ]
    }
};
let rooms = {};

// --- Helpers ---

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
function getFallbackPuzzle() {
    const puzzles = gameData.fallbackPuzzles;
    return puzzles[Math.floor(Math.random() * puzzles.length)];
}

// --- AI Generation Sections ---

async function generateSurvivalPuzzle() {
    if (!genAI) return getFallbackPuzzle();
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Create a survival puzzle for a party game. Use this format:

You're trapped in [describe scenario in 1-2 sentences]
A) [item 1]
B) [item 2]
C) [item 3]

One item logically increases survival the most (but not too obvious). Only one should be "correct".

Just output the scenario & options.`;
        const result = await model.generateContent(prompt);
        const resp = (await result.response).text();
        const lines = resp.split('\n').filter(x => x);
        // Simple parse logic:
        const scenario = lines[0];
        const options = [];
        for (let line of lines.slice(1)) {
            const match = line.match(/^([ABC])\)[\s.:-]*(.+)$/i);
            if (match) {
                options.push({ id: match[1].toUpperCase(), text: match[2], survival: false });
            }
        }
        // Ensure one survival:
        if (options.length === 3) options[Math.floor(Math.random()*3)].survival = true;
        return { scenario, options: options.slice(0, 3) };
    } catch(e) {
        console.error('Gemini puzzle error:', e.message);
        return getFallbackPuzzle();
    }
}

async function generateChoiceNarration(puzzle, choiceGroups) {
    if (!genAI) {
        // Fallback narration
        let narr = [];
        for (const [optionId, players] of Object.entries(choiceGroups)) {
            const opt = puzzle.options.find(o => o.id === optionId);
            const survived = opt?.survival;
            narr.push({
                optionId, players,
                survived,
                narration: survived
                    ? `${players.join(', ')} survive thanks to their clever choice!`
                    : `${players.join(', ')} meet their doom for picking ${optionId}.`
            });
        }
        return narr;
    }
    // Use Gemini
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Scenario: "${puzzle.scenario}"
Options:
${puzzle.options.map(o => o.id + ') ' + o.text).join('\n')}

Player groups:
${Object.entries(choiceGroups).map(([k,v]) => `Option ${k}: ${v.join(', ')}`).join('\n')}

For each option, narrate the fate of those players (be dramatic), and decide if they survived or died. End each story with "SURVIVED" or "ELIMINATED".`;
        const result = await model.generateContent(prompt);
        const content = (await result.response).text();
        let narr = [];
        for (const [optionId, players] of Object.entries(choiceGroups)) {
            const regex = new RegExp(`Option ${optionId}[^:]*:[^\n]*(?:\\n|)([^]+?)(SURVIVED|ELIMINATED)`, 'i');
            const match = content.match(regex);
            let narration = match ? match[1].trim() + (match[2] ? ' ' + match[2].toUpperCase() : '') : `${players.join(', ')} face their fate.`;
            const survived = narration.toLowerCase().includes('survived');
            narr.push({ optionId, players, survived, narration });
        }
        return narr;
    } catch (e) {
        // fallback quick path
        let narr = [];
        for (const [optionId, players] of Object.entries(choiceGroups)) {
            const survived = Math.random() > 0.5;
            narr.push({
                optionId, players, survived,
                narration: survived
                    ? `${players.join(', ')} survived heroically! SURVIVED`
                    : `${players.join(', ')} were eliminated. ELIMINATED`
            });
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

// --- Core Game Flow ---

function startNewRound(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    room.currentRound++;
    room.gameState = 'riddle-phase';
    room.currentRiddle = getRandomRiddle();
    room.riddleWinner = null;
    room.riddleAnswers = {};
    room.puzzleChoices = {};
    if (room.currentRound === 1) initializeRoundHistory(room);
    // Oracle intro
    io.to(roomCode).emit('oracle-speaks', {
        message: getRandomOracleMessage('introductions'),
        type: 'introduction'
    });
    setTimeout(() => {
        // Riddle phase start
        io.to(roomCode).emit('riddle-presented', {
            riddle: room.currentRiddle,
            round: room.currentRound,
            maxRounds: room.maxRounds
        });
        room.timeRemaining = 30;
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
    // First correct answer wins
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
        message: winner
            ? `${winner} solved it first!`
            : `No one solved my riddle!`,
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
        // Everyone won, skip
        endRound(roomCode, []);
        return;
    }
    room.gameState = 'puzzle-phase';
    // Generate puzzle
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
            timeLimit: 30
        });
        room.timeRemaining = 30;
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
    // Get fate narrations for each group
    const narrs = await generateChoiceNarration(room.currentPuzzle, choiceGroups);
    // Score and notify
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
        await new Promise(res => setTimeout(res, 1800));
    }
    updateRoundHistory(room, room.riddleWinner, narrs);
    setTimeout(() => {
        endRound(roomCode, narrs);
    }, 2200);
}

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
            const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
            io.to(roomCode).emit('game-over', {
                finalScores: sortedPlayers,
                winner: sortedPlayers[0],
                message: sortedPlayers.score > 0
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

// --- Socket Events ---

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

// --- Server Listen ---

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 Threatened by AI server running on port ${PORT}`);
    if (genAI) {
        console.log('🔑 Gemini API key detected: Using Google AI for narratives.');
    } else {
        console.log('⚠️ No Gemini API key: Using fallback hardcoded responses.');
    }
});
