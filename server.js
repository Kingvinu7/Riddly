const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

// Expanded places database with much more locations
const gameData = {
    places: [
        // Major World Cities
        {
            name: "TOKYO",
            facts: [
                "World's largest metropolitan area with 37 million people",
                "Hosted the 2020 Summer Olympics",
                "Famous for cherry blossoms in spring",
                "Has the busiest train station in the world",
                "Known as the anime and manga capital"
            ]
        },
        {
            name: "PARIS", 
            facts: [
                "Called the City of Light",
                "Home to the famous Eiffel Tower",
                "World's fashion capital",
                "The Seine River flows through it",
                "Famous for croissants and sidewalk cafes"
            ]
        },
        {
            name: "LONDON",
            facts: [
                "Big Ben is its famous clock tower",
                "Has red double-decker buses",
                "Thames River runs through the city",
                "Home to Buckingham Palace",
                "Known for afternoon tea tradition"
            ]
        },
        {
            name: "NEWYORK",
            facts: [
                "The city that never sleeps",
                "Home to the Statue of Liberty",
                "Has the famous Times Square",
                "Broadway shows are performed here",
                "Central Park is in the heart of the city"
            ]
        },
        {
            name: "SYDNEY",
            facts: [
                "Famous for its Opera House design",
                "Has the iconic Harbour Bridge",
                "Largest city in Australia",
                "Known for beautiful beaches",
                "Hosts spectacular New Year's fireworks"
            ]
        },
        {
            name: "ROME",
            facts: [
                "Called the Eternal City",
                "Home to the ancient Colosseum",
                "Vatican City is located within it",
                "Built on seven hills",
                "Famous for delicious pasta dishes"
            ]
        },
        {
            name: "DUBAI",
            facts: [
                "Has the world's tallest building",
                "Built in the middle of a desert",
                "Famous for luxury shopping malls",
                "Known for artificial palm-shaped islands",
                "Gold and spice markets are popular attractions"
            ]
        },
        {
            name: "MUMBAI",
            facts: [
                "Bollywood film industry is based here",
                "Most populous city in India",
                "Known as the financial capital of India",
                "Famous for street food culture",
                "Gateway of India monument is located here"
            ]
        },
        {
            name: "ISTANBUL",
            facts: [
                "Bridges Europe and Asia continents",
                "Former capital of Byzantine Empire",
                "Famous for the Hagia Sophia",
                "Known for Turkish baths and bazaars",
                "The Bosphorus strait runs through it"
            ]
        },
        {
            name: "BARCELONA",
            facts: [
                "Famous for Sagrada Familia architecture",
                "Capital of Catalonia region",
                "Known for beautiful beaches",
                "Hosted the 1992 Summer Olympics",
                "Famous for tapas and flamenco dancing"
            ]
        },
        // Famous Landmarks & Countries
        {
            name: "EGYPT",
            facts: [
                "Home to the ancient pyramids",
                "The Nile River flows through it",
                "Famous for mummies and pharaohs",
                "The Sphinx guards the pyramids",
                "Cairo is its bustling capital city"
            ]
        },
        {
            name: "BRAZIL",
            facts: [
                "Amazon rainforest covers much of it",
                "Famous for Carnival celebrations",
                "Christ the Redeemer statue overlooks Rio",
                "Portuguese is the official language",
                "Known for soccer and beach culture"
            ]
        },
        {
            name: "ICELAND",
            facts: [
                "Land of fire and ice",
                "Famous for Northern Lights displays",
                "Has active volcanoes and glaciers",
                "Known for hot springs and geysers",
                "Vikings first settled here"
            ]
        },
        {
            name: "SINGAPORE",
            facts: [
                "Modern city-state in Southeast Asia",
                "Famous for the Marina Bay Sands hotel",
                "Known as a food paradise",
                "One of the world's major ports",
                "Has beautiful Gardens by the Bay"
            ]
        },
        {
            name: "THAILAND",
            facts: [
                "Known as the Land of Smiles",
                "Famous for Buddhist temples",
                "Popular for tropical beaches",
                "Bangkok is the vibrant capital",
                "Known for delicious street food"
            ]
        },
        {
            name: "PERU",
            facts: [
                "Home to Machu Picchu ruins",
                "Part of the ancient Inca Empire",
                "The Amazon rainforest covers eastern regions",
                "Famous for llamas and alpacas",
                "Known for colorful traditional textiles"
            ]
        },
        {
            name: "NORWAY",
            facts: [
                "Famous for stunning fjords",
                "Land of the midnight sun",
                "Vikings originated from here",
                "Known for the Northern Lights",
                "Has one of the highest standards of living"
            ]
        },
        {
            name: "MOROCCO",
            facts: [
                "Gateway between Africa and Europe",
                "Famous for colorful markets called souks",
                "Known for beautiful mosaic artwork",
                "The Sahara Desert covers southern regions",
                "Marrakech is called the Red City"
            ]
        },
        {
            name: "GREECE",
            facts: [
                "Birthplace of democracy and Olympics",
                "Famous for ancient ruins and mythology",
                "Has thousands of beautiful islands",
                "Known for delicious Mediterranean food",
                "The Parthenon overlooks Athens"
            ]
        },
        {
            name: "CANADA",
            facts: [
                "Second largest country in the world",
                "Famous for maple syrup and hockey",
                "Niagara Falls is on its border",
                "Known for being extremely polite",
                "Has two official languages"
            ]
        },
        // Asian Cities & Places
        {
            name: "SEOUL",
            facts: [
                "Capital of South Korea",
                "Famous for K-pop music culture",
                "Known for advanced technology",
                "Has ancient palaces and modern skyscrapers",
                "Famous for Korean BBQ and kimchi"
            ]
        },
        {
            name: "BALI",
            facts: [
                "Indonesian island paradise",
                "Famous for beautiful rice terraces",
                "Known for Hindu temples and ceremonies",
                "Popular surfing destination",
                "Called the Island of the Gods"
            ]
        },
        {
            name: "BEIJING",
            facts: [
                "Capital of China for centuries",
                "Home to the Forbidden City",
                "The Great Wall starts near here",
                "Hosted the 2008 Olympics",
                "Famous for Peking duck cuisine"
            ]
        },
        // European Destinations
        {
            name: "AMSTERDAM",
            facts: [
                "Famous for its canal system",
                "Known for colorful tulip flowers",
                "Bicycles outnumber cars here",
                "Has many world-famous museums",
                "Built below sea level"
            ]
        },
        {
            name: "PRAGUE",
            facts: [
                "Called the City of a Hundred Spires",
                "Famous for beautiful medieval architecture",
                "Known for excellent beer culture",
                "The Vltava River flows through it",
                "Has a famous astronomical clock"
            ]
        },
        {
            name: "VENICE",
            facts: [
                "Built on water with no roads",
                "Famous for gondola boat rides",
                "Known for elaborate carnival masks",
                "Has beautiful glass-making tradition",
                "Called the Floating City"
            ]
        },
        // More Exotic Locations
        {
            name: "MADAGASCAR",
            facts: [
                "Large island nation off Africa",
                "Home to unique lemur animals",
                "Most species exist nowhere else",
                "Famous for baobab trees",
                "Known for vanilla production"
            ]
        },
        {
            name: "BHUTAN",
            facts: [
                "Himalayan kingdom measuring happiness",
                "Last country to get television",
                "Carbon negative country",
                "Known for colorful prayer flags",
                "Gross National Happiness over GDP"
            ]
        },
        {
            name: "MALDIVES",
            facts: [
                "Made up of 1200 coral islands",
                "Lowest country in the world",
                "Famous for overwater bungalows",
                "Known for pristine white beaches",
                "Popular honeymoon destination"
            ]
        },
        {
            name: "CHILE",
            facts: [
                "Longest and narrowest country",
                "Atacama Desert is the driest place",
                "Famous for wine production",
                "Has both glaciers and deserts",
                "Easter Island belongs to it"
            ]
        }
    ]
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

function broadcastGameState(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    let displayWord = '';
    if (room.selectedPlace) {
        const placeName = room.selectedPlace.name;
        for (let i = 0; i < placeName.length; i++) {
            if (room.revealedLetters[i]) {
                displayWord += placeName[i];
            } else {
                displayWord += '_';
            }
            displayWord += ' ';
        }
    }
    
    const gameState = {
        players: room.players,
        currentPlayer: room.currentPlayer,
        gameState: room.gameState,
        displayWord: displayWord.trim(),
        selectedFact: room.selectedFact,
        guessedCorrectly: room.guessedCorrectly || []
    };
    
    io.to(roomCode).emit('game-state', gameState);
}

function startGame(roomCode) {
    const room = rooms[roomCode];
    if (!room || room.players.length < 2) return;
    
    room.gameState = 'place-selection';
    
    // Get 5 random places for the current player to choose from
    const shuffledPlaces = [...gameData.places].sort(() => 0.5 - Math.random());
    const placeOptions = shuffledPlaces.slice(0, 5);
    
    // Send place options only to the current player
    const currentPlayerId = room.players[room.currentPlayer].id;
    io.to(currentPlayerId).emit('place-selection', {
        places: placeOptions.map(p => ({ 
            name: p.name, 
            preview: p.name.charAt(0) + '...' + p.name.charAt(p.name.length - 1)
        }))
    });
    
    // Notify other players that selection is happening
    room.players.forEach((player, index) => {
        if (index !== room.currentPlayer) {
            io.to(player.id).emit('waiting-for-selection', {
                chooser: room.players[room.currentPlayer].name,
                type: 'place'
            });
        }
    });
    
    // Start selection timer (15 seconds)
    room.timer = setTimeout(() => {
        // Auto-select first place if no selection made
        handlePlaceSelection(roomCode, placeOptions[0].name);
    }, 15000);
}

function handlePlaceSelection(roomCode, placeName) {
    const room = rooms[roomCode];
    if (!room || room.gameState !== 'place-selection') return;
    
    clearTimeout(room.timer);
    
    const selectedPlace = gameData.places.find(p => p.name === placeName);
    room.selectedPlace = selectedPlace;
    room.gameState = 'fact-selection';
    
    // Send fact options to current player
    const currentPlayerId = room.players[room.currentPlayer].id;
    io.to(currentPlayerId).emit('fact-selection', {
        place: selectedPlace.name,
        facts: selectedPlace.facts
    });
    
    // Notify other players
    room.players.forEach((player, index) => {
        if (index !== room.currentPlayer) {
            io.to(player.id).emit('waiting-for-selection', {
                chooser: room.players[room.currentPlayer].name,
                type: 'fact'
            });
        }
    });
    
    // Start fact selection timer (15 seconds)
    room.timer = setTimeout(() => {
        // Auto-select first fact if no selection made
        handleFactSelection(roomCode, selectedPlace.facts[0]);
    }, 15000);
}

function handleFactSelection(roomCode, selectedFact) {
    const room = rooms[roomCode];
    if (!room || room.gameState !== 'fact-selection') return;
    
    clearTimeout(room.timer);
    
    room.selectedFact = selectedFact;
    room.gameState = 'guessing';
    
    // Initialize letter revelation
    const placeName = room.selectedPlace.name;
    room.revealedLetters = new Array(placeName.length).fill(false);
    
    // Always reveal first and last letters
    room.revealedLetters[0] = true;
    room.revealedLetters[placeName.length - 1] = true;
    
    // Reset guessed correctly array
    room.guessedCorrectly = [];
    
    // Start the guessing phase
    startGuessingPhase(roomCode);
}

function startGuessingPhase(roomCode) {
    const room = rooms[roomCode];
    const placeName = room.selectedPlace.name;
    
    // Send initial game state to all players
    broadcastGameState(roomCode);
    
    // Start progressive letter revelation (every 20 seconds)
    room.revealTimer = setInterval(() => {
        revealNextLetter(roomCode);
    }, 20000);
    
    // End game after 3 minutes if no one guesses
    room.gameTimer = setTimeout(() => {
        if (room.gameState === 'guessing') {
            endRound(roomCode, 'timeout');
        }
    }, 180000);
}

function revealNextLetter(roomCode) {
    const room = rooms[roomCode];
    if (!room || room.gameState !== 'guessing') return;
    
    const placeName = room.selectedPlace.name;
    
    // Find next unrevealed letter
    for (let i = 1; i < placeName.length - 1; i++) {
        if (!room.revealedLetters[i]) {
            room.revealedLetters[i] = true;
            broadcastGameState(roomCode);
            
            // Notify about letter reveal
            io.to(roomCode).emit('letter-revealed', {
                position: i,
                letter: placeName[i]
            });
            break;
        }
    }
    
    // Check if all letters are revealed
    if (room.revealedLetters.every(revealed => revealed)) {
        clearInterval(room.revealTimer);
        clearTimeout(room.gameTimer);
        endRound(roomCode, 'all-revealed');
    }
}

function endRound(roomCode, reason) {
    const room = rooms[roomCode];
    if (!room) return;
    
    clearInterval(room.revealTimer);
    clearTimeout(room.gameTimer);
    clearTimeout(room.timer);
    
    const correctAnswer = room.selectedPlace.name;
    
    // Move to next player
    room.currentPlayer = (room.currentPlayer + 1) % room.players.length;
    
    // Check if game should end (all players had a turn)
    if (room.currentPlayer === 0 && room.roundCount >= room.players.length) {
        room.gameState = 'game-over';
        
        // Sort players by score
        const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
        
        io.to(roomCode).emit('game-over', {
            reason: reason,
            correctAnswer: correctAnswer,
            finalScores: sortedPlayers
        });
    } else {
        // Continue to next round
        room.gameState = 'round-over';
        room.roundCount = (room.roundCount || 0) + 1;
        
        io.to(roomCode).emit('round-over', {
            reason: reason,
            correctAnswer: correctAnswer,
            scores: room.players,
            nextPlayer: room.players[room.currentPlayer].name
        });
        
        // Start next round after 5 seconds
        setTimeout(() => {
            if (room.gameState === 'round-over') {
                startGame(roomCode);
            }
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
            currentPlayer: 0,
            gameState: 'waiting',
            selectedPlace: null,
            selectedFact: null,
            revealedLetters: [],
            guessedCorrectly: [],
            timer: null,
            revealTimer: null,
            gameTimer: null,
            roundCount: 0
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

        if (room.players.length >= 6) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }

        if (room.gameState !== 'waiting') {
            socket.emit('error', { message: 'Game already in progress' });
            return;
        }

        room.players.push({ id: socket.id, name: data.playerName, score: 0 });
        socket.join(data.roomCode);
        
        io.to(data.roomCode).emit('player-joined', { 
            players: room.players,
            newPlayer: data.playerName
        });
        console.log(`${data.playerName} joined room ${data.roomCode}`);
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

        startGame(data.roomCode);
    });

    socket.on('select-place', (data) => {
        handlePlaceSelection(data.roomCode, data.placeName);
    });

    socket.on('select-fact', (data) => {
        handleFactSelection(data.roomCode, data.fact);
    });

    socket.on('guess', (data) => {
        const room = rooms[data.roomCode];
        if (!room || room.gameState !== 'guessing') return;
        
        // Check if player already guessed correctly
        if (room.guessedCorrectly.includes(socket.id)) return;
        
        const guess = data.guess.toUpperCase().trim();
        const correctAnswer = room.selectedPlace.name;
        
        if (guess === correctAnswer) {
            // Correct guess!
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.score += 10; // Base points
                
                // Bonus points for guessing with fewer letters revealed
                const revealedCount = room.revealedLetters.filter(r => r).length;
                const totalLetters = correctAnswer.length;
                const bonus = Math.max(0, (totalLetters - revealedCount) * 2);
                player.score += bonus;
                
                room.guessedCorrectly.push(socket.id);
                
                // Broadcast correct guess
                io.to(data.roomCode).emit('correct-guess', {
                    player: player.name,
                    guess: guess,
                    score: player.score,
                    bonus: bonus
                });
                
                // End round if all guessers got it right
                const totalGuessers = room.players.length - 1; // Exclude chooser
                if (room.guessedCorrectly.length >= totalGuessers) {
                    clearInterval(room.revealTimer);
                    clearTimeout(room.gameTimer);
                    endRound(data.roomCode, 'all-correct');
                }
            }
        } else {
            // Wrong guess - broadcast to room
            io.to(data.roomCode).emit('wrong-guess', {
                player: getPlayerName(socket.id, data.roomCode),
                guess: guess
            });
        }
    });

    socket.on('send-message', (data) => {
        const room = rooms[data.roomCode];
        if (!room) return;
        
        const playerName = getPlayerName(socket.id, data.roomCode);
        
        io.to(data.roomCode).emit('message', {
            player: playerName,
            message: data.message,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Remove player from all rooms
        Object.keys(rooms).forEach(roomCode => {
            const room = rooms[roomCode];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                const playerName = room.players[playerIndex].name;
                room.players.splice(playerIndex, 1);
                
                if (room.players.length === 0) {
                    // Delete empty room
                    delete rooms[roomCode];
                    console.log(`Room ${roomCode} deleted - no players left`);
                } else {
                    // Adjust current player if needed
                    if (room.currentPlayer >= room.players.length) {
                        room.currentPlayer = 0;
                    }
                    
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
    console.log(`Riddly Geography Game server running on port ${PORT}`);
});
