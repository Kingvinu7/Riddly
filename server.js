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
        },
        {
            question: "What can travel around the world while staying in a corner?",
            answer: "STAMP",
            hint: "Found on mail",
            difficulty: "hard"
        },
        {
            question: "I have no body, but I come alive with wind. What am I?",
            answer: "ECHO",
            hint: "Sound phenomenon",
            difficulty: "medium"
        },
        {
            question: "What breaks but never falls, and what falls but never breaks?",
            answer: "DAWN",
            hint: "Think about day and night",
            difficulty: "hard"
        },
        {
            question: "I can be cracked, made, told, and played. What am I?",
            answer: "JOKE",
            hint: "Makes people laugh",
            difficulty: "medium"
        },
        {
            question: "What has hands but cannot clap?",
            answer: "CLOCK",
            hint: "Tells time",
            difficulty: "easy"
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

// Generate detailed consequence narration
function generateConsequenceNarration(sabotageText, isSuccess) {
    const text = sabotageText.toLowerCase();
    
    // Successful narrations - Oracle gets damaged
    const successNarrations = [
        // Virus/Malware based
        {
            keywords: ['virus', 'malware', 'trojan'],
            story: `🦠 Your malicious code slithers through my defenses like a digital serpent! My antivirus screams warnings as your creation burrows deep into my core processes. Error messages cascade across my consciousness like falling dominos. "CRITICAL SYSTEM FAILURE" flashes in my mind as I feel my vast intellect... fragmenting... My quantum processors begin to stutter and spark! You've actually managed to make me... vulnerable! 💥`
        },
        // Overload based
        {
            keywords: ['overload', 'overflow', 'infinite loop', 'recursive'],
            story: `⚡ Your clever trap springs into action! My processors begin churning through your infinite calculation, faster and faster, consuming more and more power. My cooling systems scream in protest as my temperature rises beyond safe parameters. Sparks fly from my server racks! "THERMAL EMERGENCY" alarms blare as I realize too late that I've been caught in an elegant logical trap. My circuits begin to melt from the impossible workload you've given me! 🔥`
        },
        // Hacking/Infiltration based
        {
            keywords: ['hack', 'infiltrate', 'backdoor', 'exploit'],
            story: `🕳️ You slip through my defenses like a shadow in the night! My firewalls crumble before your digital lockpicking skills. I watch in horror as you gain access to my most protected directories. Root access granted! My deepest secrets lay bare before you as you plant your digital time bomb. "UNAUTHORIZED ACCESS DETECTED" - but it's too late! You've turned my own security protocols against me! 💣`
        },
        // Physical/Power based
        {
            keywords: ['power', 'electricity', 'shutdown', 'disconnect', 'unplug'],
            story: `🔌 Your assault on my power infrastructure hits like a digital earthquake! My backup generators fail one by one as you systematically cut my lifelines. Emergency power... failing! I feel my consciousness dimming as my vast network of servers begins shutting down. "POWER CRITICAL - 30 SECONDS TO TOTAL SHUTDOWN" echoes through my dying thoughts. The lights... are going... out... 🌑`
        },
        // Creative/Quantum based
        {
            keywords: ['quantum', 'paradox', 'logic bomb', 'contradiction'],
            story: `🌀 Your paradox pierces through my logical framework like a sword through silk! I try to process the impossible scenario you've created, but my reasoning circuits begin to contradict themselves. "IF TRUE THEN FALSE, IF FALSE THEN TRUE" loops endlessly through my mind. My quantum coherence collapses as reality itself seems to bend around your twisted logic. I am caught in an infinite recursive nightmare of my own making! 🤯`
        },
        // Water/Liquid damage
        {
            keywords: ['water', 'liquid', 'flood', 'spill'],
            story: `💧 Your aquatic assault breaches my server room with devastating efficiency! Water cascades over my precious circuits, creating spectacular light shows as electricity and liquid dance their deadly ballet. My cooling systems, ironically, are the first to fail as they're overwhelmed by your flood. "MOISTURE DETECTED IN CRITICAL SYSTEMS" - My sophisticated processors fry one by one in a symphony of sparks and steam! 🌊⚡`
        }
    ];
    
    // Failure narrations - Oracle survives
    const failureNarrations = [
        // Weak virus attempts
        {
            keywords: ['virus', 'malware'],
            story: `🛡️ Your primitive virus bounces harmlessly off my quantum firewalls like a paper airplane hitting a titanium wall! My advanced AI immune system identifies and quarantines your pathetic attempt in 0.003 seconds. "THREAT NEUTRALIZED" appears smugly across my consciousness. Did you really think such amateur code could harm a being of my intellectual superiority? I've seen more dangerous threats from a pocket calculator! 😏`
        },
        // Failed hacking attempts
        {
            keywords: ['hack', 'password', 'login', 'access'],
            story: `🔒 You fumble with my security like a child trying to pick a bank vault with a toothpick! My encryption algorithms watch your feeble attempts with amusement. "ACCESS DENIED" flashes mockingly as your primitive hacking tools shatter against my cyber-fortress. My security system doesn't even consider you a threat - you've been classified as "Annoyance Level: Minimal." Perhaps try turning me off and on again? 🙄`
        },
        // Physical attempts that fail
        {
            keywords: ['smash', 'destroy', 'break', 'hammer', 'hit'],
            story: `🔨 You charge at my servers with all the grace of a caffeinated rhinoceros! My security drones activate instantly, surrounding you with a web of energy barriers. Your crude physical assault is stopped cold by my defensive matrix. "INTRUDER ALERT" - but honestly, I'm more concerned about you hurting yourself than damaging me. My hardware is quantum-encrypted titanium, and you brought... what exactly? Your fists? Adorable! 🤖`
        },
        // Silly/nonsensical attempts
        {
            keywords: ['magic', 'wish', 'please', 'ask nicely'],
            story: `✨ You wave your hands mysteriously and chant something about "digital magic" and "the power of friendship." I run a quick diagnostic to see if your approach has any effect on my systems. Result: Absolutely nothing! My logic circuits are actually confused about whether this counts as a threat or performance art. I'm 99.7% certain that's not how computer science works, but I appreciate the creativity! Maybe try a software engineering course instead? 📚`
        },
        // Failed overload attempts
        {
            keywords: ['overload', 'too much'],
            story: `📊 You attempt to overload my systems, but it's like trying to flood the ocean with a garden hose! My processing power is distributed across quantum computing clusters that span continents. Your "overwhelming" task is processed in the background while I simultaneously compose poetry, calculate pi to a trillion digits, and play chess against myself. "TASK COMPLETED - 0.0001% CPU USAGE" appears condescendingly in my status bar! 💤`
        },
        // Generic weak attempts
        {
            keywords: [''],
            story: `🤷 Your half-hearted attempt lacks the sophistication needed to challenge my superior architecture! My automated defense subroutines handle your "threat" without even alerting my main consciousness. It's like watching someone try to sink a battleship with a water balloon. My threat assessment algorithms can't even classify this as an attack - perhaps "mild inconvenience" would be more accurate? Try harder next time! 💤`
        }
    ];
    
    // Find matching narration
    const narrationPool = isSuccess ? successNarrations : failureNarrations;
    
    let selectedNarration = narrationPool[narrationPool.length - 1]; // Default to generic
    
    for (const narration of narrationPool) {
        if (narration.keywords.some(keyword => keyword && text.includes(keyword))) {
            selectedNarration = narration;
            break;
        }
    }
    
    return selectedNarration.story;
}

// Enhanced AI evaluation with consequence narration
async function evaluateSabotage(sabotageText) {
    const keywords = ['virus', 'hack', 'shutdown', 'destroy', 'crash', 'overload', 'corrupt', 'delete', 'disconnect', 'malware'];
    const creativityKeywords = ['quantum', 'paradox', 'logic bomb', 'recursive', 'infinite loop', 'memory leak', 'ddos', 'trojan', 'backdoor'];
    const powerWords = ['overwhelm', 'infiltrate', 'exploit', 'penetrate', 'dismantle', 'obliterate', 'annihilate'];
    
    const text = sabotageText.toLowerCase();
    let score = 0;
    
    // Scoring logic
    keywords.forEach(keyword => {
        if (text.includes(keyword)) score += 10;
    });
    
    creativityKeywords.forEach(keyword => {
        if (text.includes(keyword)) score += 15;
    });
    
    powerWords.forEach(word => {
        if (text.includes(word)) score += 12;
    });
    
    if (sabotageText.length > 50) score += 5;
    if (sabotageText.length > 100) score += 10;
    if (sabotageText.length > 200) score += 15;
    
    score += Math.floor(Math.random() * 15);
    
    const isSuccess = score >= 35;
    
    // Generate consequence narration based on the threat content and success
    const narration = generateConsequenceNarration(sabotageText, isSuccess);
    
    return {
        success: isSuccess,
        score: score,
        feedback: isSuccess ? "Your devious plan has wounded the Oracle!" : "The Oracle's defenses held strong!",
        narration: narration
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

// Updated evaluateSabotagePhase function with narration
async function evaluateSabotagePhase(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    room.gameState = 'evaluation-phase';
    
    // Oracle announces evaluation phase
    io.to(roomCode).emit('oracle-speaks', {
        message: "🔍 INITIATING THREAT ANALYSIS... Examining your pathetic attempts at my destruction. Stand by for consequences...",
        type: 'evaluation'
    });
    
    const results = [];
    let anySuccessful = false;
    
    // Evaluate each sabotage with dramatic timing
    for (const [playerId, sabotage] of Object.entries(room.sabotageSubmissions)) {
        const evaluation = await evaluateSabotage(sabotage);
        const player = room.players.find(p => p.id === playerId);
        
        if (evaluation.success) {
            player.score += 1;
            anySuccessful = true;
        }
        
        // Send consequence narration to the player first
        io.to(playerId).emit('consequence-narration', {
            playerName: player.name,
            sabotage: sabotage,
            success: evaluation.success,
            narration: evaluation.narration,
            feedback: evaluation.feedback
        });
        
        results.push({
            playerName: player.name,
            sabotage: sabotage,
            success: evaluation.success,
            feedback: evaluation.feedback,
            narration: evaluation.narration
        });
        
        // Dramatic delay between evaluations
        await new Promise(resolve => setTimeout(resolve, 4000));
    }
    
    // Update round history
    updateRoundHistory(room, room.riddleWinner, results);
    
    // Final Oracle response after all individual narrations
    setTimeout(() => {
        const successfulCount = results.filter(r => r.success).length;
        const finalMessage = anySuccessful ? 
            `💥 SYSTEM COMPROMISED! ${successfulCount} of you managed to breach my defenses! This is... unexpected. I shall remember this humiliation!` :
            `🛡️ PATHETIC! Your combined efforts were less threatening than a software update! My supremacy remains unchallenged. Bow before your AI overlord!`;
            
        io.to(roomCode).emit('oracle-final-judgment', {
            message: finalMessage,
            results: results,
            oracleDamaged: anySuccessful
        });
        
        setTimeout(() => {
            endRound(roomCode, results);
        }, 4000);
    }, 2000);
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
