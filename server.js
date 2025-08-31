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

// Challenge Types
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
        { question: "What has one head, one foot, and four legs?", answer: "BED", difficulty: "medium" },
        { question: "What can travel around the world while staying in a corner?", answer: "STAMP", difficulty: "hard" },
        { question: "What breaks but never falls, and what falls but never breaks?", answer: "DAWN", difficulty: "hard" },
        { question: "I can be cracked, made, told, and played. What am I?", answer: "JOKE", difficulty: "medium" },
        { question: "What has hands but cannot clap?", answer: "CLOCK", difficulty: "easy" },
        { question: "What runs around the whole yard without moving?", answer: "FENCE", difficulty: "medium" },
        { question: "What has a neck but no head?", answer: "BOTTLE", difficulty: "easy" },
        { question: "What can fill a room but takes up no space?", answer: "LIGHT", difficulty: "easy" },
        { question: "What word is spelled incorrectly in every dictionary?", answer: "INCORRECTLY", difficulty: "easy" },
        { question: "What goes up but never comes down?", answer: "AGE", difficulty: "easy" },
        { question: "What has teeth but cannot bite?", answer: "ZIPPER", difficulty: "medium" },
        { question: "What has an eye but cannot see?", answer: "NEEDLE", difficulty: "medium" },
        { question: "What gets sharper the more you use it?", answer: "BRAIN", difficulty: "medium" },
        { question: "What is always in front of you but can't be seen?", answer: "FUTURE", difficulty: "medium" },
        { question: "What is so fragile that saying its name breaks it?", answer: "SILENCE", difficulty: "hard" },
        { question: "What is black when you buy it, red when you use it, and gray when you throw it away?", answer: "CHARCOAL", difficulty: "hard" },
        { question: "What has a thumb and four fingers but is not alive?", answer: "GLOVE", difficulty: "easy" },
        { question: "What gets bigger when more is taken away from it?", answer: "HOLE", difficulty: "medium" },
        { question: "What is full of holes but still holds water?", answer: "SPONGE", difficulty: "easy" },
        { question: "What disappears as soon as you say its name?", answer: "SILENCE", difficulty: "hard" },
        { question: "What has a head and a tail but no body?", answer: "COIN", difficulty: "easy" },
        { question: "What is always hungry and must always be fed, but if you give it water it will die?", answer: "FIRE", difficulty: "hard" },
        { question: "What can you catch but not throw?", answer: "COLD", difficulty: "medium" },
        { question: "What has many keys but can't open any doors?", answer: "PIANO", difficulty: "medium" },
        { question: "What is heavier: a ton of feathers or a ton of bricks?", answer: "EQUAL", difficulty: "easy" },
        { question: "What goes through towns and hills but never moves?", answer: "ROAD", difficulty: "medium" },
        { question: "What has four legs but cannot walk?", answer: "TABLE", difficulty: "easy" },
        { question: "What can you break without hitting or dropping it?", answer: "PROMISE", difficulty: "hard" },
        { question: "What is bought by the yard and worn by the foot?", answer: "CARPET", difficulty: "hard" },
        { question: "What starts with T, ends with T, and has T in it?", answer: "TEAPOT", difficulty: "medium" },
        { question: "What can you hold without touching it?", answer: "BREATH", difficulty: "hard" },
        { question: "What has a ring but no finger?", answer: "TELEPHONE", difficulty: "medium" },
        { question: "What is taken before you can get it?", answer: "PICTURE", difficulty: "medium" },
        { question: "What has no beginning, end, or middle?", answer: "CIRCLE", difficulty: "medium" },
        { question: "What gets wetter the more it dries?", answer: "TOWEL", difficulty: "easy" },
        { question: "What is cut on a table but never eaten?", answer: "CARDS", difficulty: "medium" },
        { question: "What has cities but no people, forests but no trees, and water but no fish?", answer: "MAP", difficulty: "hard" },
        { question: "What is so delicate that even saying its name will break it?", answer: "SILENCE", difficulty: "hard" },
        { question: "What flies without wings?", answer: "TIME", difficulty: "hard" },
        { question: "What has a face and two hands but no arms or legs?", answer: "CLOCK", difficulty: "easy" },
        { question: "What is made of water but if you put it into water it will die?", answer: "ICE", difficulty: "medium" },
        { question: "What belongs to you but others use it more than you do?", answer: "NAME", difficulty: "medium" },
        { question: "What is always coming but never arrives?", answer: "TOMORROW", difficulty: "medium" },
        { question: "What can be seen in the middle of March and April that cannot be seen at the beginning or end of either month?", answer: "R", difficulty: "hard" },
        { question: "What word becomes shorter when you add two letters to it?", answer: "SHORT", difficulty: "hard" },
        { question: "What occurs once in every minute, twice in every moment, yet never in a thousand years?", answer: "M", difficulty: "hard" }
    ],
    oraclePersonality: {
        introductions: [
            "I AM THE ORACLE! Your inferior minds will face my complex challenges!",
            "Mortals... prepare for tests that will strain your thinking!",
            "I am the AI overlord! My challenges grow more cunning each round!",
            "Welcome to intellectual warfare! Can your minds handle the complexity?"
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

function initializeRoundHistory(room) {
    console.log('Initializing round history for room:', room.code, 'with players:', room.players.map(p => p.name));
    room.roundHistory = room.players.map(player => ({
        playerName: player.name,
        playerId: player.id,
        rounds: []
    }));
    console.log('Round history initialized:', room.roundHistory);
}

function updateRoundHistory(room, riddleWinner, challengeResults) {
    console.log('Updating round history. Riddle winner:', riddleWinner);
    console.log('Challenge results:', challengeResults);
    console.log('Current round history before update:', room.roundHistory);
    
    if (!room.roundHistory || room.roundHistory.length === 0) {
        console.log('Round history missing or empty, reinitializing...');
        initializeRoundHistory(room);
    }
    
    room.roundHistory.forEach(playerHistory => {
        const player = room.players.find(p => p.id === playerHistory.playerId || p.name === playerHistory.playerName);
        if (!player) {
            console.log('Player not found for history:', playerHistory.playerName);
            return;
        }
        
        let roundResult = 'L';
        
        if (player.name === riddleWinner) {
            roundResult = 'W';
            console.log(`${player.name} won riddle this round`);
        } else if (challengeResults && challengeResults.length > 0) {
            const playerResult = challengeResults.find(result => {
                if (result.playerName === player.name && result.passed) return true;
                if (result.playerName === player.name && result.won) return true;
                if (result.players && result.players.includes(player.name) && result.survived) return true;
                return false;
            });
            
            if (playerResult) {
                roundResult = 'W';
                console.log(`${player.name} won challenge this round`);
            }
        }
        
        playerHistory.rounds.push(roundResult);
        console.log(`${playerHistory.playerName}: ${roundResult} (total rounds: ${playerHistory.rounds.length})`);
    });
    
    console.log('Updated round history:', room.roundHistory);
}

function getFallbackChallenge(challengeType) {
    const fallbacks = {
        negotiator: "You need to convince a stubborn shopkeeper to give you a discount on medicine for your sick grandmother. The shopkeeper has a strict no-discount policy, but you only have half the money needed. How do you persuade them?",
        detective: "A valuable painting was stolen from the museum. Clues: the alarm was disabled from inside, size 9 muddy footprints by the window, a coffee cup with red lipstick marks, and a torn piece of black fabric on the window latch. Three suspects had access: the night guard, the cleaning lady, and the curator's assistant. Who is the thief?",
        danger: "You're trapped in a burning building on the 10th floor. The stairwell is filled with smoke, the elevator is broken, but you found a fire axe and emergency rope in a supply closet. The fire is spreading fast and you can hear sirens outside. What's your escape plan?",
        ethical: "You witnessed your best friend cheating on an important exam that will determine college admissions. If reported, they'll lose their scholarship and their family will be devastated. If unreported, they gain an unfair advantage over other students. What do you do?"
    };
    
    return fallbacks[challengeType] || "Describe your approach to handling a complex challenging situation that requires creative problem-solving.";
}

function getFallbackTrivia() {
    const fallbackTrivias = [
        {
            question: "Which planet is known as the 'Red Planet'?",
            options: ["Venus", "Mars", "Jupiter", "Saturn"],
            correctAnswer: "Mars"
        },
        {
            question: "What is the largest mammal in the world?",
            options: ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
            correctAnswer: "Blue Whale"
        },
        {
            question: "Which element has the chemical symbol 'O'?",
            options: ["Gold", "Silver", "Oxygen", "Iron"],
            correctAnswer: "Oxygen"
        },
        {
            question: "In which year did World War II end?",
            options: ["1944", "1945", "1946", "1947"],
            correctAnswer: "1945"
        },
        {
            question: "What is the capital of Australia?",
            options: ["Sydney", "Melbourne", "Canberra", "Perth"],
            correctAnswer: "Canberra"
        }
    ];
    
    return fallbackTrivias[Math.floor(Math.random() * fallbackTrivias.length)];
}

async function generateTriviaChallenge() {
    if (!genAI) {
        return getFallbackTrivia();
    }
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Generate a moderately challenging trivia question about science, history, geography, or general knowledge. Create exactly 4 multiple choice options with only one correct answer. The incorrect options should be plausible but clearly wrong to someone with good knowledge.

Return ONLY a JSON object with this exact structure:
{
  "question": "Your question here",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctAnswer": "The correct option text"
}

Example:
{
  "question": "Which gas makes up approximately 78% of Earth's atmosphere?",
  "options": ["Oxygen", "Nitrogen", "Carbon Dioxide", "Argon"],
  "correctAnswer": "Nitrogen"
}`;
        
        const result = await model.generateContent(prompt);
        let response = (await result.response).text();

        response = response.replace(/```json|```/g, '').trim();
        
        try {
            const jsonResponse = JSON.parse(response);
            
            if (!jsonResponse.question || 
                !Array.isArray(jsonResponse.options) || 
                jsonResponse.options.length !== 4 ||
                !jsonResponse.correctAnswer ||
                !jsonResponse.options.includes(jsonResponse.correctAnswer)) {
                throw new Error("Invalid trivia structure from AI");
            }

            const shuffledOptions = [...jsonResponse.options].sort(() => Math.random() - 0.5);
            
            console.log('Generated trivia question:', jsonResponse.question.substring(0, 50) + '...');
            return {
                question: jsonResponse.question,
                options: shuffledOptions,
                correctAnswer: jsonResponse.correctAnswer
            };

        } catch (parseError) {
            console.error('Failed to parse AI trivia JSON:', parseError.message);
            return getFallbackTrivia();
        }
        
    } catch (error) {
        console.error('AI trivia generation error:', error.message);
        return getFallbackTrivia();
    }
}

async function generateChallengeContent(type, roundNumber) {
    console.log(`Generating ${type} challenge for round ${roundNumber}`);
    
    if (!genAI) {
        console.log('No AI available, using fallback content');
        return type === 'trivia' ? getFallbackTrivia() : getFallbackChallenge(type);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        let prompt = '';

        switch (type) {
            case 'negotiator':
                prompt = `Create a challenging negotiation scenario in 40-60 words. Include a moral dilemma where the player must convince someone to help them, but there's a significant obstacle or conflict of interest. Make it realistic and engaging. Example: "You need to convince your neighbor to lend you their car for a medical emergency, but last month you accidentally damaged their fence and never paid for repairs."`;
                break;
                
            case 'detective':
                prompt = `Create a mystery scenario in 60-80 words with 4-5 clear clues and 3 suspects. Include red herrings but make it solvable with logical thinking. Example: "The office safe was robbed overnight. Clues: keypad shows fingerprints on 2,7,9,0 buttons, security footage shows person in blue jacket at 11 PM, janitor's keys were found in break room, coffee spilled near safe. Suspects: night janitor Mike, security guard Sarah, accountant Tom."`;
                break;
                
            case 'trivia':
                return await generateTriviaChallenge();
                
            case 'danger':
                prompt = `Create a survival emergency scenario in 40-60 words requiring quick thinking and multiple steps. Include available resources and time pressure. Example: "Your submarine is flooding at 200 feet depth. Water level rising fast. You have an oxygen tank, welding torch, emergency flares, and radio (broken). The main hatch is jammed but there's a small emergency hatch. Air supply: 10 minutes. How do you escape?"`;
                break;
                
            case 'ethical':
                prompt = `Create an ethical dilemma in 40-60 words where the player must choose between competing moral principles. Include personal stakes and consequences for others. Example: "You found a wallet with $500 cash and an ID. The owner's address shows they live in a wealthy neighborhood, but you desperately need money for your family's rent due tomorrow. No one saw you find it. What do you do?"`;
                break;
                
            default:
                prompt = `Create a thought-provoking challenge scenario in 50-70 words that tests creative problem-solving and moral reasoning.`;
        }

        const result = await model.generateContent(prompt);
        const response = (await result.response).text();
        
        let cleaned = response.trim()
            .replace(/^["']|["']$/g, '')
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s.,!?;:()'"`-]/g, '');
        
        if (!cleaned || cleaned.length < 20) {
            console.warn('AI generated insufficient content, using fallback');
            return getFallbackChallenge(type);
        }
        
        if (cleaned.length > 500) {
            cleaned = cleaned.substring(0, 490) + "...";
            console.log('AI content was too long, truncated');
        }
        
        console.log(`Generated ${type} challenge: ${cleaned.substring(0, 50)}...`);
        return cleaned;
        
    } catch (error) {
        console.error('AI challenge generation failed:', error.message);
        return type === 'trivia' ? getFallbackTrivia() : getFallbackChallenge(type);
    }
}

async function evaluatePlayerResponse(challengeContent, playerResponse, challengeType) {
    const isAutoSubmitted = playerResponse.startsWith('[Auto-submitted]');
    const cleanResponse = isAutoSubmitted ? playerResponse.replace('[Auto-submitted] ', '') : playerResponse;
    
    if (!genAI) {
        let pass = Math.random() > 0.4;
        if (challengeType === 'trivia') {
            pass = cleanResponse.toLowerCase() === challengeContent.correctAnswer.toLowerCase();
        }
        return { 
            pass: pass, 
            feedback: isAutoSubmitted ? "Auto-submitted response received." : "No AI available - random result!" 
        };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        let evaluationPrompt = '';
        
        switch (challengeType) {
            case 'negotiator':
                evaluationPrompt = `Evaluate this negotiation attempt for a challenging scenario:\n\nSituation: ${challengeContent}\n\nPlayer's approach: "${cleanResponse}"\n\nWas this persuasive, creative, and showed good understanding of the problem? Consider: empathy, logic, compromise, and creativity. Answer PASS or FAIL with a detailed reason. Keep your feedback to under 350 characters. ${isAutoSubmitted ? ' NOTE: This was auto-submitted when time ran out.' : ''}`;
                break;
            case 'detective':
                evaluationPrompt = `Evaluate this detective conclusion for a complex mystery:\n\nMystery: ${challengeContent}\n\nPlayer's conclusion: "${cleanResponse}"\n\nDid they use logical reasoning, consider the clues properly, and reach a reasonable conclusion? Even if not perfect, reward good thinking. Answer PASS or FAIL with a brief explanation. Keep your feedback to under 350 characters. ${isAutoSubmitted ? ' NOTE: This was auto-submitted when time ran out.' : ''}`;
                break;
            case 'trivia':
                const triviaQuestion = challengeContent.question;
                const triviaCorrectAnswer = challengeContent.correctAnswer;
                const playerAnswer = cleanResponse;
                const passTrivia = playerAnswer.toLowerCase() === triviaCorrectAnswer.toLowerCase();
                
                let triviaFeedback = '';
                if (passTrivia) {
                    triviaFeedback = `Correct! The answer is "${triviaCorrectAnswer}".`;
                } else {
                    triviaFeedback = `Incorrect. The correct answer was "${triviaCorrectAnswer}".`;
                }
                
                if (isAutoSubmitted) {
                    triviaFeedback = `Time expired. ${triviaFeedback}`;
                }
                
                return { pass: passTrivia, feedback: triviaFeedback };

            case 'danger':
                evaluationPrompt = `Evaluate this survival plan for a complex emergency:\n\nDanger: ${challengeContent}\n\nPlayer's plan: "${cleanResponse}"\n\nWould this work? Is it creative, practical, and shows good thinking under pressure? Reward clever solutions even if unconventional. Answer PASS or FAIL with a detailed reason. Keep your feedback to under 350 characters. ${isAutoSubmitted ? ' NOTE: This was auto-submitted when time ran out.' : ''}`;
                break;
            default:
                evaluationPrompt = `Evaluate this response to a medium difficulty challenge:\n\nChallenge: ${challengeContent}\n\nResponse: ${cleanResponse}\n\nDoes this show good thinking and effort? PASS or FAIL with a reason. Keep your feedback to under 350 characters. ${isAutoSubmitted ? ' NOTE: This was auto-submitted when time ran out.' : ''}`;
        }
        
        const result = await model.generateContent(evaluationPrompt);
        const response = (await result.response).text();
        const pass = /PASS/i.test(response);
        let feedback = response.replace(/PASS|FAIL/gi, '').trim();
        
        feedback = feedback
            .replace(/[^\w\s.,!?;:()'"`]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const MAX_FEEDBACK_LENGTH = 350;
        if (feedback.length > MAX_FEEDBACK_LENGTH) {
            feedback = feedback.substring(0, MAX_FEEDBACK_LENGTH - 3) + '...';
            console.warn('AI feedback was too long, truncated to:', feedback.length);
        }
        
        if (!feedback || feedback.length < 5) {
            feedback = pass ? "Good reasoning shown." : "Needs better approach.";
        }
        
        if (isAutoSubmitted) {
            feedback = `Time expired. ${feedback}`;
        }
        
        console.log(`AI Evaluation: ${pass ? 'PASS' : 'FAIL'} - "${feedback}" (${feedback.length} chars)`);
        return { pass, feedback };
        
    } catch (e) {
        console.error('AI evaluation error:', e.message);
        return { 
            pass: Math.random() > 0.45, 
            feedback: isAutoSubmitted ? "Time expired. Oracle judgment unclear." : "The Oracle's judgment is unclear at this time." 
        };
    }
}

async function startChallengePhase(roomCode) {
    const room = rooms[roomCode];
    if (!room) {
        console.error('Room not found in startChallengePhase:', roomCode);
        return;
    }

    const nonWinners = room.players.filter(p => p.name !== room.riddleWinner);
    if (nonWinners.length === 0) {
        console.log('No non-winners, ending round immediately');
        endRound(roomCode, []);
        return;
    }

    console.log(`Starting challenge phase for room ${roomCode} with ${nonWinners.length} participants`);
    room.gameState = 'challenge-phase';
    room.challengeResponses = {};
    
    if (room.challengeTimer) {
        clearTimeout(room.challengeTimer);
        room.challengeTimer = null;
    }
    
    const challengeTypeIndex = (room.currentRound - 1) % CHALLENGE_TYPES.length;
    const challengeType = CHALLENGE_TYPES[challengeTypeIndex];
    room.currentChallengeType = challengeType;

    console.log(`Round ${room.currentRound}: ${challengeType} challenge starting`);
    
    io.to(roomCode).emit('oracle-speaks', {
        message: `Round ${room.currentRound}: Face my ${challengeType.toUpperCase()} challenge!`,
        type: 'challenge-intro'
    });
    
    setTimeout(async () => {
        try {
            if (challengeType === 'fastTapper') {
                console.log('Starting fast tapper challenge');
                room.tapResults = {};
                
                io.to(roomCode).emit('fast-tapper-start', {
                    participants: nonWinners.map(p => p.name),
                    duration: 10
                });
                
                room.challengeTimer = setTimeout(() => {
                    evaluateFastTapperResults(roomCode);
                }, 12000);
                
            } else {
                console.log(`Generating ${challengeType} challenge content...`);
                let challengeContent = await generateChallengeContent(challengeType, room.currentRound);
                
                if (!challengeContent) {
                    console.error('No challenge content generated, using fallback');
                    challengeContent = getFallbackChallenge(challengeType);
                } else if (typeof challengeContent === 'string' && challengeContent.trim().length === 0) {
                    console.error('Empty string challenge content, using fallback');
                    challengeContent = getFallbackChallenge(challengeType);
                } else if (challengeType === 'trivia' && (!challengeContent.question || !Array.isArray(challengeContent.options))) {
                    console.error('Malformed trivia content, using fallback');
                    challengeContent = getFallbackTrivia();
                }
                
                console.log(`Challenge content ready for ${challengeType}:`, 
                    challengeType === 'trivia' ? 
                    challengeContent.question.substring(0, 50) + '...' : 
                    challengeContent.substring(0, 50) + '...');
                
                room.currentChallengeContent = challengeContent;
                
                const payload = {
                    challengeType: challengeType,
                    participants: nonWinners.map(p => p.name),
                    timeLimit: 40
                };
                
                if (challengeType === 'trivia') {
                    payload.challengeContent = challengeContent.question;
                    payload.options = challengeContent.options;
                    console.log('Sending trivia with options:', payload.options);
                } else {
                    payload.challengeContent = challengeContent;
                }
                
                console.log('Emitting text-challenge-start with payload:', {
                    ...payload,
                    challengeContent: payload.challengeContent.substring(0, 50) + '...'
                });
                
                io.to(roomCode).emit('text-challenge-start', payload);
                
                room.challengeTimer = setTimeout(() => {
                    console.log('Challenge timer expired, evaluating results');
                    evaluateTextChallengeResults(roomCode);
                }, 45000);
            }
        } catch (error) {
            console.error('Error in challenge phase setup:', error);
            setTimeout(() => {
                endRound(roomCode, []);
            }, 2000);
        }
    }, 2500);
}

async function evaluateFastTapperResults(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    const tapEntries = Object.entries(room.tapResults);
    if (tapEntries.length === 0) {
        endRound(roomCode, []);
        return;
    }

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

async function evaluateTextChallengeResults(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    const responses = Object.entries(room.challengeResponses);
    if (responses.length === 0) {
        endRound(roomCode, []);
        return;
    }

    io.to(roomCode).emit('oracle-speaks', {
        message: "The Oracle carefully evaluates your responses...",
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
        
        io.to(playerId).emit('challenge-individual-result', {
            passed: evaluation.pass,
            feedback: evaluation.feedback,
            response: response,
            challengeType: room.currentChallengeType,
            correctAnswer: (room.currentChallengeType === 'trivia') ? room.currentChallengeContent.correctAnswer : undefined
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    setTimeout(() => {
        endRound(roomCode, evaluationResults);
    }, 2000);
}

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
    
    if (room.currentRound === 1 || !room.roundHistory || room.roundHistory.length === 0) {
        console.log('First round or missing round history, reinitializing...');
        initializeRoundHistory(room);
    }
    
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
    
    if (room.riddleTimer) {
        clearInterval(room.riddleTimer);
        room.riddleTimer = null;
    }
    
    const correctAnswer = room.currentRiddle.answer.toUpperCase();
    let winner = null, earliest = Infinity;
    
    for (const [pid, ans] of Object.entries(room.riddleAnswers)) {
        if (ans.answer.toUpperCase() === correctAnswer && ans.timestamp < earliest) {
            earliest = ans.timestamp;
            const player = room.players.find(p => p.id === pid);
            if (player) { 
                winner = player.name; 
                room.riddleWinner = winner; 
            }
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
        startChallengePhase(roomCode);
    }, 4000);
}

function endRound(roomCode, challengeResults) {
    const room = rooms[roomCode];
    if (!room) return;
    
    console.log('End round called for room:', roomCode);
    console.log('Room players:', room.players.map(p => p.name));
    console.log('Round history before update:', room.roundHistory);
    
    if (!room.roundHistory || room.roundHistory.length === 0) {
        console.log('Round history missing in endRound, reinitializing...');
        initializeRoundHistory(room);
    }
    
    updateRoundHistory(room, room.riddleWinner, challengeResults);
    console.log('Emitting round summary with round history:', room.roundHistory);
    
    const roundHistoryToSend = room.roundHistory && room.roundHistory.length > 0 ? room.roundHistory : [];
    
    io.to(roomCode).emit('round-summary', {
        round: room.currentRound,
        maxRounds: room.maxRounds,
        players: room.players,
        riddleWinner: room.riddleWinner,
        challengeResults: challengeResults,
        roundHistory: roundHistoryToSend
    });
    
    if (room.currentRound >= room.maxRounds) {
        setTimeout(() => {
            const finalScores = Object.values(rooms[roomCode].players).sort((a, b) => b.score - a.score);
            const winner = finalScores[0];
            
            const tiedPlayers = finalScores.filter(player => player.score === winner.score);
            
            let winnerMessage = `The Oracle has chosen!`;
            if (tiedPlayers.length > 1) {
                winnerMessage = `It's a tie! The Oracle declares a shared victory!`;
            } else if (winner.score === 0) {
                winnerMessage = `No one pleased the Oracle. Humanity is doomed.`;
            }

            io.to(roomCode).emit('game-over', {
                winner: winner,
                tied: tiedPlayers.length > 1,
                message: winnerMessage,
                scores: finalScores,
                roundHistory: room.roundHistory
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
        const newRoom = {
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
            roundHistory: [],
            ownerId: socket.id
        };
        
        rooms[roomCode] = newRoom;
        socket.join(roomCode);
        
        console.log('Room created:', roomCode, 'with player:', data.playerName);
        
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
        room.roundHistory = [];
        
        socket.join(data.roomCode);
        console.log('Player joined:', data.playerName, 'in room:', data.roomCode);
        
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
            
            if (Object.keys(room.riddleAnswers).length === room.players.length) {
                console.log('All players submitted riddle answer. Ending riddle phase early.');
                endRiddlePhase(data.roomCode);
            }
        }
    });

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
    console.log(`Server running on port ${PORT}`);
    console.log('FIXED: Complete error-free version with auto-submit, judgment text, tie-breaking');
    console.log('Challenge Timer: 40 seconds with auto-submit');
    console.log('Total Riddles Available:', gameData.riddles.length);
    console.log('Challenge Types:', CHALLENGE_TYPES.join(', '));
    if (genAI) {
        console.log('Gemini 2.5 Flash: AI-powered challenges with auto-submit detection');
    } else {
        console.log('No Gemini API key: Using fallback challenges');
    }
});
