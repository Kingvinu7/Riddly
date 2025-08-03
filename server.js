const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS configuration for Railway deployment
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Serve static files from public directory
app.use(express.static(__dirname + "/public"));

const gameRooms = new Map();

function createGameRoom(roomId, settings) {
    return {
        id: roomId,
        players: [],
        settings: {
            rounds: parseInt(settings.rounds) || 3,
            questionsPerRound: parseInt(settings.questionsPerRound) || 5
        },
        currentWord: '',
        maskedWord: '',
        guessedLetters: [],
        gameActive: false,
        timeLeft: 60,
        currentRound: 1,
        currentQuestion: 1,
        currentSelector: null,
        correctGuessers: [],
        gamePhase: 'waiting',
        selectorHistory: [],
        wordSelectionTimer: null,
        wordSelectionTimeLeft: 10 // 10 seconds to choose word
    };
}

function getNextSelector(room) {
    const availablePlayers = room.players.filter(p => 
        !room.selectorHistory.includes(p.id) || room.selectorHistory.length >= room.players.length
    );
    
    if (availablePlayers.length === 0) {
        room.selectorHistory = [];
        return room.players[Math.floor(Math.random() * room.players.length)];
    }
    
    const nextSelector = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
    room.selectorHistory.push(nextSelector.id);
    
    if (room.selectorHistory.length > room.players.length) {
        room.selectorHistory.shift();
    }
    
    return nextSelector;
}

function maskWord(word) {
    let masked = '';
    const guessedLetters = [];
    for (let i = 0; i < word.length; i++) {
        if (i === 0 || i === word.length - 1) { 
            masked += word[i];
            guessedLetters.push(word[i]);
        } else if (Math.random() < 0.2) { 
            masked += word[i];
            guessedLetters.push(word[i]);
        } else {
            masked += '_';
        }
    }
    return { masked, guessedLetters };
}

function startWordSelection(room) {
    room.currentSelector = getNextSelector(room);
    room.gamePhase = 'wordSelection';
    room.wordSelectionTimeLeft = 10; // 10 seconds to choose
    
    if (room.wordSelectionTimer) {
        clearInterval(room.wordSelectionTimer);
    }
    
    room.wordSelectionTimer = setInterval(() => {
        room.wordSelectionTimeLeft--;
        
        io.to(room.id).emit('wordSelectionTimeUpdate', {
            timeLeft: room.wordSelectionTimeLeft,
            selector: room.currentSelector.name
        });
        
        if (room.wordSelectionTimeLeft <= 0) {
            clearInterval(room.wordSelectionTimer);
            
            io.to(room.id).emit('wordSelectionTimeout', {
                skippedPlayer: room.currentSelector.name
            });
            
            if (room.selectorHistory.length >= room.players.length) {
                const randomWords = ['APPLE', 'BANANA', 'ORANGE', 'GRAPE', 'MANGO', 'CHERRY', 'LEMON'];
                room.currentWord = randomWords[Math.floor(Math.random() * randomWords.length)];
                
                io.to(room.id).emit('randomWordChosen', {
                    word: room.currentWord
                });
                
                startGuessing(room);
            } else {
                setTimeout(() => startWordSelection(room), 2000);
            }
        }
    }, 1000);
    
    io.to(room.id).emit('wordSelectionStarted', {
        selector: room.currentSelector.name,
        round: room.currentRound,
        question: room.currentQuestion,
        maxRounds: room.settings.rounds,
        maxQuestions: room.settings.questionsPerRound,
        timeLimit: room.wordSelectionTimeLeft
    });
    
    io.to(room.currentSelector.id).emit('yourTurnToSelect', {
        timeLimit: room.wordSelectionTimeLeft
    });
}

function startGuessing(room) {
    if (room.wordSelectionTimer) {
        clearInterval(room.wordSelectionTimer);
        room.wordSelectionTimer = null;
    }
    
    room.gameActive = true;
    room.gamePhase = 'playing';
    room.timeLeft = 60;
    room.correctGuessers = [];
    
    const wordData = maskWord(room.currentWord);
    room.maskedWord = wordData.masked;
    room.guessedLetters = wordData.guessedLetters;
    
    room.players.forEach(player => {
        player.hasGuessedWord = false;
    });
    
    io.to(room.id).emit('guessingStarted', {
        selector: room.currentSelector.name,
        maskedWord: room.maskedWord,
        wordLength: room.currentWord.length,
        timeLeft: room.timeLeft,
        players: room.players
    });
}

function endQuestion(room) {
    room.gameActive = false;
    
    if (room.wordSelectionTimer) {
        clearInterval(room.wordSelectionTimer);
        room.wordSelectionTimer = null;
    }
    
    io.to(room.id).emit('questionEnded', {
        word: room.currentWord,
        correctGuessers: room.correctGuessers,
        players: room.players,
        selector: room.currentSelector.name
    });
    
    if (room.currentQuestion < room.settings.questionsPerRound) {
        room.currentQuestion++;
        setTimeout(() => startWordSelection(room), 3000);
    } else if (room.currentRound < room.settings.rounds) {
        room.currentRound++;
        room.currentQuestion = 1;
        setTimeout(() => startWordSelection(room), 5000);
    } else {
        setTimeout(() => endGame(room), 3000);
    }
}

function endGame(room) {
    room.gamePhase = 'gameEnd';
    
    if (room.wordSelectionTimer) {
        clearInterval(room.wordSelectionTimer);
        room.wordSelectionTimer = null;
    }
    
    const finalScores = room.players.sort((a, b) => b.score - a.score);
    
    io.to(room.id).emit('gameEnded', {
        finalScores: finalScores,
        winner: finalScores[0],
        gameStats: {
            totalRounds: room.settings.rounds,
            totalQuestions: room.settings.rounds * room.settings.questionsPerRound,
            totalPlayers: room.players.length
        }
    });
}

function resetGameRoom(room) {
    if (room.wordSelectionTimer) {
        clearInterval(room.wordSelectionTimer);
        room.wordSelectionTimer = null;
    }
    
    room.players.forEach(player => {
        player.score = 0;
        player.hasGuessedWord = false;
    });
    room.currentRound = 1;
    room.currentQuestion = 1;
    room.gamePhase = 'waiting';
    room.selectorHistory = [];
    room.correctGuessers = [];
    room.gameActive = false;
    room.wordSelectionTimeLeft = 10;
}

io.on('connection', (socket) => {
    console.log('Riddly: Player connected:', socket.id);
    
    socket.on('createRoom', (data) => {
        const { username, roomName, rounds, questionsPerRound } = data;
        
        if (gameRooms.has(roomName)) {
            socket.emit('error', { message: 'Room already exists!' });
            return;
        }
        
        const room = createGameRoom(roomName, { rounds, questionsPerRound });
        room.players.push({
            id: socket.id,
            name: username,
            score: 0,
            hasGuessedWord: false
        });
        
        gameRooms.set(roomName, room);
        socket.join(roomName);
        
        socket.emit('roomCreated', {
            roomId: roomName,
            players: room.players,
            settings: room.settings
        });
    });
    
    socket.on('joinRoom', (data) => {
        const { username, roomName } = data;
        const room = gameRooms.get(roomName);
        
        if (!room) {
            socket.emit('error', { message: 'Room not found!' });
            return;
        }
        
        if (room.players.find(p => p.name === username)) {
            socket.emit('error', { message: 'Username already taken in this room!' });
            return;
        }
        
        room.players.push({
            id: socket.id,
            name: username,
            score: 0,
            hasGuessedWord: false
        });
        
        socket.join(roomName);
        
        socket.emit('roomJoined', {
            roomId: roomName,
            players: room.players,
            settings: room.settings,
            gamePhase: room.gamePhase,
            currentRound: room.currentRound,
            currentQuestion: room.currentQuestion
        });
        
        io.to(roomName).emit('playerJoined', {
            players: room.players,
            message: `${username} joined the room!`
        });
        
        if (room.players.length >= 2 && room.gamePhase === 'waiting') {
            setTimeout(() => startWordSelection(room), 2000);
        }
    });
    
    socket.on('submitWord', (data) => {
        const { roomId, word } = data;
        const room = gameRooms.get(roomId);
        
        if (!room || room.gamePhase !== 'wordSelection' || socket.id !== room.currentSelector.id) {
            return;
        }
        
        if (room.wordSelectionTimer) {
            clearInterval(room.wordSelectionTimer);
            room.wordSelectionTimer = null;
        }
        
        room.currentWord = word.toUpperCase();
        startGuessing(room);
    });
    
    socket.on('playerGuess', (data) => {
        const { roomId, playerName, guess, isLetter } = data;
        const room = gameRooms.get(roomId);
        
        if (!room || !room.gameActive || room.currentSelector.name === playerName) return;
        
        const player = room.players.find(p => p.name === playerName);
        if (!player) return;
        
        let isCorrect = false;
        let points = 0;
        
        if (isLetter) {
            if (!room.guessedLetters.includes(guess) && room.currentWord.includes(guess)) {
                room.guessedLetters.push(guess);
                
                let newMasked = '';
                for (let i = 0; i < room.currentWord.length; i++) {
                    if (room.currentWord[i] === guess || room.maskedWord[i] !== '_') {
                        newMasked += room.currentWord[i];
                    } else {
                        newMasked += '_';
                    }
                }
                room.maskedWord = newMasked;
                isCorrect = true;
                points = 5;
                player.score += points;
                
                io.to(roomId).emit('wordUpdate', { 
                    maskedWord: room.maskedWord,
                    players: room.players
                });
                
                if (!room.maskedWord.includes('_')) {
                    setTimeout(() => endQuestion(room), 1000);
                }
            }
            
            io.to(roomId).emit('playerGuess', {
                playerName: playerName,
                guess: guess,
                isCorrect: isCorrect,
                points: points,
                players: room.players,
                isLetter: true
            });
            
        } else {
            if (guess === room.currentWord && !player.hasGuessedWord) {
                isCorrect = true;
                player.hasGuessedWord = true;
                room.correctGuessers.push(playerName);
                
                const basePoints = 100;
                const positionBonus = Math.max(0, (room.players.length - room.correctGuessers.length) * 20);
                const timeBonus = Math.floor(room.timeLeft / 2);
                points = basePoints + positionBonus + timeBonus;
                
                player.score += points;
                
                io.to(roomId).emit('playerGuess', {
                    playerName: playerName,
                    guess: "got it right!",
                    isCorrect: true,
                    points: points,
                    players: room.players,
                    wordGuess: true
                });
                
                const nonSelectorPlayers = room.players.filter(p => p.id !== room.currentSelector.id);
                const allGuessed = nonSelectorPlayers.every(p => p.hasGuessedWord);
                
                if (allGuessed) {
                    setTimeout(() => endQuestion(room), 1000);
                }
            }
        }
    });
    
    socket.on('playAgain', (data) => {
        const { roomId } = data;
        const room = gameRooms.get(roomId);
        
        if (!room) return;
        
        resetGameRoom(room);
        
        io.to(roomId).emit('gameRestarted', {
            players: room.players,
            settings: room.settings
        });
        
        if (room.players.length >= 2) {
            setTimeout(() => startWordSelection(room), 2000);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Riddly: Player disconnected:', socket.id);
        
        for (const [roomId, room] of gameRooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const playerName = room.players[playerIndex].name;
                
                if (room.currentSelector && room.currentSelector.id === socket.id) {
                    if (room.gamePhase === 'wordSelection') {
                        if (room.wordSelectionTimer) {
                            clearInterval(room.wordSelectionTimer);
                            room.wordSelectionTimer = null;
                        }
                        setTimeout(() => startWordSelection(room), 1000);
                    } else if (room.gameActive) {
                        endQuestion(room);
                    }
                }
                
                room.players.splice(playerIndex, 1);
                
                io.to(roomId).emit('playerLeft', {
                    players: room.players,
                    message: `${playerName} left the room`
                });
                
                if (room.players.length === 0) {
                    if (room.wordSelectionTimer) {
                        clearInterval(room.wordSelectionTimer);
                    }
                    gameRooms.delete(roomId);
                }
            }
        }
    });
});

// Game timer for guessing phase
setInterval(() => {
    for (const [roomId, room] of gameRooms.entries()) {
        if (room.gameActive && room.timeLeft > 0) {
            room.timeLeft--;
            
            io.to(roomId).emit('timeUpdate', { timeLeft: room.timeLeft });
            
            if (room.timeLeft % 12 === 0 && room.timeLeft > 0) {
                const hiddenIndices = [];
                for (let i = 0; i < room.currentWord.length; i++) {
                    if (room.maskedWord[i] === '_') {
                        hiddenIndices.push(i);
                    }
                }
                
                if (hiddenIndices.length > 0) {
                    const randomIndex = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
                    const letter = room.currentWord[randomIndex];
                    
                    let newMasked = '';
                    for (let i = 0; i < room.currentWord.length; i++) {
                        if (i === randomIndex || room.maskedWord[i] !== '_') {
                            newMasked += room.currentWord[i];
                        } else {
                            newMasked += '_';
                        }
                    }
                    room.maskedWord = newMasked;
                    room.guessedLetters.push(letter);
                    
                    io.to(roomId).emit('letterRevealed', { 
                        letter: letter, 
                        maskedWord: room.maskedWord 
                    });
                    
                    if (!room.maskedWord.includes('_')) {
                        endQuestion(room);
                    }
                }
            }
            
            if (room.timeLeft <= 0) {
                endQuestion(room);
            }
        }
    }
}, 1000);

// Change the port configuration for Railway deployment
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Riddly server running on port ${PORT}`);
});
