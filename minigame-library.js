/**
 * Pokemon Minigame Library
 * A collection of engaging minigames for earning pokeballs
 * Integrates with existing Pokemon game modal system and styling
 */

class MinigameLibrary {
    static games = {
        'timing-challenge': {
            id: 'timing-challenge',
            name: '🎯 Target Timing',
            description: 'Click when the target is in the green zone',
            difficulty: 'easy',
            rewardPokeballs: 0,
            estimatedTime: '15-30 seconds'
        },
        'memory-match': {
            id: 'memory-match',
            name: '🧠 Pokemon Memory Match',
            description: 'Match pairs of Pokemon cards',
            difficulty: 'easy',
            rewardPokeballs: 0,
            estimatedTime: '1-2 minutes'
        },
        'reflex-challenge': {
            id: 'reflex-challenge', 
            name: '⚡ Lightning Reflexes',
            description: 'Tap Pokemon before they disappear',
            difficulty: 'medium',
            rewardPokeballs: 0,
            estimatedTime: '30-60 seconds'
        },
        'pattern-sequence': {
            id: 'pattern-sequence',
            name: '🔄 Pattern Master',
            description: 'Remember and repeat Pokemon sequences',
            difficulty: 'hard',
            rewardPokeballs: 0,
            estimatedTime: '1-3 minutes'
        },
        'pokemon-quiz': {
            id: 'pokemon-quiz',
            name: '🎓 Pokemon Trivia',
            description: 'Answer Pokemon knowledge questions',
            difficulty: 'medium',
            rewardPokeballs: 0,
            estimatedTime: '1-2 minutes'
        }
    };

    /**
     * Get a random minigame
     * @param {string} difficulty - Optional difficulty filter: 'easy', 'medium', 'hard'
     * @returns {Object} Random minigame configuration
     */
    static getRandomMinigame(difficulty = null) {
        const availableGames = Object.values(this.games);
        const filteredGames = difficulty 
            ? availableGames.filter(game => game.difficulty === difficulty)
            : availableGames;
        
        return filteredGames[Math.floor(Math.random() * filteredGames.length)];
    }

    /**
     * Start a specific minigame
     * @param {string} gameId - ID of the game to start
     * @returns {Promise<Object>} Game result with success status and rewards
     */
    static async startMinigame(gameId) {
        console.log(`🎮 DEBUG: startMinigame called with gameId: ${gameId}`);
        const game = this.games[gameId];
        if (!game) {
            throw new Error(`Minigame '${gameId}' not found`);
        }

        console.log(`🎮 Starting minigame: ${game.name}`);
        
        switch (gameId) {
            case 'timing-challenge':
                console.log('🎮 DEBUG: Calling playTimingChallenge');
                return await this.playTimingChallenge();
            case 'memory-match':
                console.log('🎮 DEBUG: Calling playMemoryMatch');
                return await this.playMemoryMatch();
            case 'reflex-challenge':
                console.log('🎮 DEBUG: Calling playReflexChallenge');
                return await this.playReflexChallenge();
            case 'pattern-sequence':
                console.log('🎮 DEBUG: Calling playPatternSequence');
                return await this.playPatternSequence();
            case 'pokemon-quiz':
                console.log('🎮 DEBUG: Calling playPokemonQuiz');
                return await this.playPokemonQuiz();
            default:
                throw new Error(`Minigame '${gameId}' not implemented`);
        }
    }

    /**
     * Show minigame selection modal
     */
    static showMinigameSelection() {
        console.log('🎮 DEBUG: showMinigameSelection called');
        // Add a visible alert for debugging
        alert('DEBUG: Minigame selection is about to show');
        const games = Object.values(this.games);
        
        const selectionModal = document.createElement('div');
        selectionModal.className = 'modal-overlay';
        selectionModal.id = 'minigameSelectionModal';
        selectionModal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <h2 style="color: #333; text-align: center; margin-bottom: 20px;">
                    🎮 Choose Your Minigame!
                </h2>
                <p style="text-align: center; color: #666; margin-bottom: 30px;">
                    Complete a minigame to catch this Pokemon without using Pokéballs!
                </p>
                <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                    ${games.map(game => `
                        <div class="minigame-option" 
                             onclick="MinigameLibrary.selectMinigame('${game.id}')"
                             style="border: 2px solid #ddd; border-radius: 10px; padding: 15px; 
                                    cursor: pointer; transition: all 0.3s ease;
                                    background: linear-gradient(145deg, #f8f9fa, #e9ecef);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <h3 style="margin: 0 0 5px 0; color: #333;">${game.name}</h3>
                                    <p style="margin: 0 0 5px 0; color: #666; font-size: 0.9rem;">${game.description}</p>
                                    <small style="color: #999;">
                                        Difficulty: ${game.difficulty.toUpperCase()} | 
                                        Time: ${game.estimatedTime}
                                    </small>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 1.2rem; color: #ffcc02;">⚾</div>
                                    <small style="color: #333;">+${game.rewardPokeballs}</small>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="text-align: center; margin-top: 25px;">
                    <button onclick="MinigameLibrary.selectRandomMinigame()" 
                            style="background: linear-gradient(145deg, #28a745, #20c997); 
                                   color: white; padding: 12px 25px; border: none; 
                                   border-radius: 25px; font-size: 1rem; cursor: pointer; margin-right: 10px;">
                        🎲 Surprise Me!
                    </button>
                    <button onclick="MinigameLibrary.closeMinigameSelection()" 
                            style="background: linear-gradient(145deg, #6c757d, #5a6268); 
                                   color: white; padding: 12px 25px; border: none; 
                                   border-radius: 25px; font-size: 1rem; cursor: pointer;">
                        Cancel
                    </button>
                </div>
            </div>
            <style>
                .minigame-option:hover {
                    border-color: #007bff !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,123,255,0.2) !important;
                }
            </style>
        `;
        
        document.body.appendChild(selectionModal);
    }

    /**
     * Select and start a specific minigame
     */
    static async selectMinigame(gameId) {
        console.log(`🎮 DEBUG: selectMinigame called with gameId: ${gameId}`);
        this.closeMinigameSelection();
        
        try {
            console.log(`🎮 DEBUG: Starting minigame: ${gameId}`);
            const result = await this.startMinigame(gameId);
            console.log(`🎮 DEBUG: Minigame ${gameId} completed with result:`, result);
            await this.handleMinigameResult(result, gameId);
        } catch (error) {
            console.error('Minigame error:', error);
            alert(`Error starting minigame: ${error.message}`);
        }
    }

    /**
     * Select and start a random minigame
     */
    static async selectRandomMinigame() {
        console.log('🎮 DEBUG: selectRandomMinigame called');
        const randomGame = this.getRandomMinigame();
        console.log(`🎮 DEBUG: Random game selected: ${randomGame.id}`);
        await this.selectMinigame(randomGame.id);
    }

    /**
     * Close minigame selection modal
     */
    static closeMinigameSelection() {
        const modal = document.getElementById('minigameSelectionModal');
        if (modal) {
            document.body.removeChild(modal);
        }
    }

    /**
     * Handle minigame completion result
     */
    static async handleMinigameResult(result, gameId) {
        const game = this.games[gameId];
        
        if (result.success) {
            // Catch the Pokemon directly - either works or fails
            console.log('🎮 Minigame completed successfully - catching Pokemon directly');
            await catchPokemonViaMinigame();
        } else {
            // Show failure message with retry option
            this.showMinigameFailure(game, result.reason);
        }
    }

    /**
     * Show minigame success modal
     */
    static showMinigameSuccess(game, statusMessage) {
        // The success is handled by the existing catchPokemonViaMinigame() function
        // which shows the Pokemon catch success message and redirects appropriately
        // This function is only called if there's an error, so we don't need to show anything
        console.log('🎮 Minigame success - Pokemon catch handled by existing flow');
    }

    /**
     * Show minigame failure modal
     */
    static showMinigameFailure(game, reason) {
        const failureModal = document.createElement('div');
        failureModal.className = 'modal-overlay';
        failureModal.innerHTML = `
            <div style="text-align: center; color: white; padding: 40px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">😅</div>
                <h2 style="color: #ffc107; font-size: 2rem; margin-bottom: 15px;">
                    Almost There!
                </h2>
                <p style="font-size: 1.2rem; margin-bottom: 10px;">
                    You didn't quite complete <strong>${game.name}</strong>
                </p>
                <p style="font-size: 1rem; color: #ccc; margin-bottom: 30px;">
                    ${reason || 'Try again to earn those Pokéballs!'}
                </p>
                <button onclick="MinigameLibrary.retryMinigame('${game.id}')" 
                        style="background: linear-gradient(145deg, #ffc107, #ffcd39); 
                               color: #212529; padding: 15px 30px; border: none; 
                               border-radius: 25px; font-size: 1.1rem; cursor: pointer; margin-right: 10px;">
                    Try Again
                </button>
                <button onclick="MinigameLibrary.closeFailureModal()" 
                        style="background: linear-gradient(145deg, #6c757d, #5a6268); 
                               color: white; padding: 15px 30px; border: none; 
                               border-radius: 25px; font-size: 1.1rem; cursor: pointer;">
                    Maybe Later
                </button>
            </div>
        `;
        
        document.body.appendChild(failureModal);
    }

    /**
     * Close success modal and return to game
     */
    static closeSuccessModal() {
        const modals = document.querySelectorAll('.modal-overlay:not(#encounterModal):not(#throwModal)');
        modals.forEach(modal => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        });
        
        // Return to Pokemon encounter with updated pokeball count
        if (typeof showUIState !== 'undefined') {
            showUIState('encounter');
        }
    }

    /**
     * Close failure modal
     */
    static closeFailureModal() {
        const modals = document.querySelectorAll('.modal-overlay:not(#encounterModal):not(#throwModal)');
        modals.forEach(modal => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Retry a minigame
     */
    static async retryMinigame(gameId) {
        this.closeFailureModal();
        await this.selectMinigame(gameId);
    }

    // =================
    // MINIGAME IMPLEMENTATIONS
    // =================

    /**
     * Target Timing Game - Click when target is in green zone (existing game)
     */
    static async playTimingChallenge() {
        console.log('🎮 DEBUG: playTimingChallenge started');
        return new Promise((resolve) => {
            console.log('🎯 Starting timing challenge');
            
            // Create minigame modal
            const gameModal = document.createElement('div');
            gameModal.className = 'modal-overlay';
            gameModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0,0,0,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            
            gameModal.innerHTML = `
                <div style="text-align: center; color: white; padding: 40px; background: linear-gradient(145deg, #4ecdc4, #44a08d); border-radius: 20px; max-width: 90vw;">
                    <h2 style="margin-bottom: 20px; font-size: 1.5rem;">🎯 Catch the Moving Target!</h2>
                    <p style="margin-bottom: 20px;">Click the button when the target is in the green zone!</p>
                    
                    <div style="position: relative; width: 200px; height: 20px; background: #ccc; margin: 20px auto; border-radius: 10px;">
                        <div style="position: absolute; width: 60px; height: 20px; background: #4CAF50; left: 70px; border-radius: 10px;"></div>
                        <div id="timingTarget" style="position: absolute; width: 20px; height: 20px; background: #ff6b6b; border-radius: 50%; top: 0; transition: left 0.1s;"></div>
                    </div>
                    
                    <button id="timingCatchButton" style="background: linear-gradient(145deg, #feca57, #ff9ff3); color: #333; font-size: 1.2rem; font-weight: bold; padding: 15px 30px; border: none; border-radius: 25px; cursor: pointer; margin: 10px;">
                        🎯 CATCH!
                    </button>
                    
                    <div id="timingResult" style="margin-top: 15px; padding: 10px; border-radius: 10px; font-weight: bold; display: none;"></div>
                </div>
            `;
            
            document.body.appendChild(gameModal);
            
            // Game variables
            let targetPosition = 0;
            let direction = 1;
            let gameActive = true;
            let gameInterval;
            
            const target = document.getElementById('timingTarget');
            const catchButton = document.getElementById('timingCatchButton');
            const result = document.getElementById('timingResult');
            
            // Start the moving target
            gameInterval = setInterval(() => {
                if (!gameActive) return;
                
                targetPosition += direction * 3;
                
                // Bounce at edges
                if (targetPosition >= 180) {
                    direction = -1;
                    targetPosition = 180;
                } else if (targetPosition <= 0) {
                    direction = 1;
                    targetPosition = 0;
                }
                
                target.style.left = targetPosition + 'px';
            }, 50);
            
            // Handle catch attempt
            catchButton.onclick = () => {
                console.log('🎮 DEBUG: Timing challenge catch button clicked');
                if (!gameActive) return;
                
                gameActive = false;
                clearInterval(gameInterval);
                
                // Check if target is in green zone (70px to 130px)
                const isInGreenZone = targetPosition >= 70 && targetPosition <= 130;
                console.log(`🎮 DEBUG: Target position: ${targetPosition}, isInGreenZone: ${isInGreenZone}`);
                
                result.style.display = 'block';
                
                if (isInGreenZone) {
                    console.log('🎮 DEBUG: Timing challenge SUCCESS');
                    result.style.background = 'rgba(76, 175, 80, 0.3)';
                    result.style.color = '#4CAF50';
                    result.textContent = '🎉 Perfect! Catching Pokemon...';
                    
                    setTimeout(() => {
                        document.body.removeChild(gameModal);
                        resolve({ success: true });
                    }, 1500);
                } else {
                    console.log('🎮 DEBUG: Timing challenge FAILED');
                    result.style.background = 'rgba(244, 67, 54, 0.3)';
                    result.style.color = '#f44336';
                    result.textContent = '❌ Missed! Try again?';
                    
                    setTimeout(() => {
                        document.body.removeChild(gameModal);
                        resolve({ success: false, reason: 'missed_target' });
                    }, 2000);
                }
            };
        });
    }

    /**
     * Memory Match Game - Match pairs of Pokemon cards
     */
    static async playMemoryMatch() {
        return new Promise((resolve) => {
            const gameModal = document.createElement('div');
            gameModal.className = 'modal-overlay';
            gameModal.id = 'memoryMatchGame';
            
            // Pokemon symbols for cards (using emojis as placeholders)
            const pokemonSymbols = ['🔥', '💧', '🌿', '⚡', '🌟', '🌙', '☀️', '❄️'];
            const gridSize = 4; // 4x4 grid
            const totalPairs = (gridSize * gridSize) / 2;
            
            // Create pairs and shuffle
            const cardSymbols = [];
            for (let i = 0; i < totalPairs; i++) {
                const symbol = pokemonSymbols[i % pokemonSymbols.length];
                cardSymbols.push(symbol, symbol);
            }
            cardSymbols.sort(() => Math.random() - 0.5);
            
            let flippedCards = [];
            let matchedPairs = 0;
            let moves = 0;
            let gameStartTime = Date.now();
            
            gameModal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <h2 style="text-align: center; color: #333; margin-bottom: 15px;">
                        🧠 Pokemon Memory Match
                    </h2>
                    <div style="text-align: center; margin-bottom: 20px; color: #666;">
                        <span>Moves: <span id="moveCounter">0</span></span> | 
                        <span>Pairs: <span id="pairCounter">0</span>/${totalPairs}</span>
                    </div>
                    <div id="memoryGrid" style="display: grid; grid-template-columns: repeat(${gridSize}, 1fr); 
                                                 gap: 8px; margin-bottom: 20px;">
                        ${cardSymbols.map((symbol, index) => `
                            <div class="memory-card" data-index="${index}" data-symbol="${symbol}"
                                 style="aspect-ratio: 1; background: linear-gradient(145deg, #f8f9fa, #e9ecef);
                                        border: 2px solid #ddd; border-radius: 8px; display: flex;
                                        align-items: center; justify-content: center; font-size: 1.5rem;
                                        cursor: pointer; transition: all 0.3s ease;">
                                ?
                            </div>
                        `).join('')}
                    </div>
                    <div style="text-align: center;">
                        <button onclick="MinigameLibrary.endMemoryMatch(false)" 
                                style="background: linear-gradient(145deg, #6c757d, #5a6268); 
                                       color: white; padding: 10px 20px; border: none; 
                                       border-radius: 20px; cursor: pointer;">
                            Give Up
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(gameModal);
            
            // Add click handlers to cards
            const cards = gameModal.querySelectorAll('.memory-card');
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    const index = parseInt(card.dataset.index);
                    const symbol = card.dataset.symbol;
                    
                    // Ignore if card already flipped or matched
                    if (card.classList.contains('flipped') || card.classList.contains('matched')) {
                        return;
                    }
                    
                    // Flip card
                    card.textContent = symbol;
                    card.classList.add('flipped');
                    card.style.background = 'linear-gradient(145deg, #007bff, #0056b3)';
                    card.style.color = 'white';
                    flippedCards.push({ element: card, symbol, index });
                    
                    // Check for match when 2 cards are flipped
                    if (flippedCards.length === 2) {
                        moves++;
                        document.getElementById('moveCounter').textContent = moves;
                        
                        setTimeout(() => {
                            if (flippedCards[0].symbol === flippedCards[1].symbol) {
                                // Match found
                                flippedCards.forEach(cardData => {
                                    cardData.element.classList.add('matched');
                                    cardData.element.style.background = 'linear-gradient(145deg, #28a745, #20c997)';
                                });
                                matchedPairs++;
                                document.getElementById('pairCounter').textContent = matchedPairs;
                                
                                // Check win condition
                                if (matchedPairs === totalPairs) {
                                    const gameTime = Math.round((Date.now() - gameStartTime) / 1000);
                                    MinigameLibrary.endMemoryMatch(true, { moves, time: gameTime });
                                }
                            } else {
                                // No match - flip back
                                flippedCards.forEach(cardData => {
                                    cardData.element.textContent = '?';
                                    cardData.element.classList.remove('flipped');
                                    cardData.element.style.background = 'linear-gradient(145deg, #f8f9fa, #e9ecef)';
                                    cardData.element.style.color = 'black';
                                });
                            }
                            flippedCards = [];
                        }, 1000);
                    }
                });
            });
            
            // Store resolve function for game end
            MinigameLibrary._memoryMatchResolve = resolve;
        });
    }

    static endMemoryMatch(success, stats = {}) {
        const gameModal = document.getElementById('memoryMatchGame');
        if (gameModal) {
            document.body.removeChild(gameModal);
        }
        
        if (MinigameLibrary._memoryMatchResolve) {
            MinigameLibrary._memoryMatchResolve({
                success,
                reason: success ? `Completed in ${stats.moves} moves and ${stats.time} seconds!` : 'Game cancelled'
            });
            delete MinigameLibrary._memoryMatchResolve;
        }
    }

    /**
     * Reflex Challenge Game - Tap Pokemon before they disappear
     */
    static async playReflexChallenge() {
        return new Promise((resolve) => {
            const gameModal = document.createElement('div');
            gameModal.className = 'modal-overlay';
            gameModal.id = 'reflexChallengeGame';
            
            let score = 0;
            let missed = 0;
            let gameActive = true;
            let currentTarget = null;
            const maxMisses = 3;
            const targetCount = 10;
            
            gameModal.innerHTML = `
                <div class="modal-content" style="max-width: 500px; height: 400px; position: relative;">
                    <h2 style="text-align: center; color: #333; margin-bottom: 10px;">
                        ⚡ Lightning Reflexes
                    </h2>
                    <div style="text-align: center; margin-bottom: 15px; color: #666;">
                        <span>Score: <span id="reflexScore">0</span>/${targetCount}</span> | 
                        <span>Misses: <span id="reflexMisses">0</span>/${maxMisses}</span>
                    </div>
                    <div id="gameArea" style="width: 100%; height: 250px; border: 2px solid #ddd; 
                                              border-radius: 10px; position: relative; 
                                              background: linear-gradient(145deg, #f8f9fa, #e9ecef);
                                              overflow: hidden;">
                        <div id="gameInstructions" style="position: absolute; top: 50%; left: 50%; 
                                                           transform: translate(-50%, -50%); text-align: center; color: #666;">
                            <p>Tap the Pokemon when they appear!</p>
                            <p><small>Game starts in 3 seconds...</small></p>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 15px;">
                        <button onclick="MinigameLibrary.endReflexChallenge(false)" 
                                style="background: linear-gradient(145deg, #6c757d, #5a6268); 
                                       color: white; padding: 10px 20px; border: none; 
                                       border-radius: 20px; cursor: pointer;">
                            Give Up
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(gameModal);
            
            const gameArea = document.getElementById('gameArea');
            const pokemonEmojis = ['🔥', '💧', '🌿', '⚡', '🌟', '🌙', '☀️', '❄️', '🌸', '⭐'];
            
            // Start game after countdown
            setTimeout(() => {
                document.getElementById('gameInstructions').style.display = 'none';
                spawnTarget();
            }, 3000);
            
            function spawnTarget() {
                if (!gameActive || score >= targetCount) return;
                
                // Remove previous target if exists
                if (currentTarget) {
                    gameArea.removeChild(currentTarget);
                    missed++;
                    document.getElementById('reflexMisses').textContent = missed;
                    
                    if (missed >= maxMisses) {
                        MinigameLibrary.endReflexChallenge(false);
                        return;
                    }
                }
                
                // Create new target
                currentTarget = document.createElement('div');
                currentTarget.style.cssText = `
                    position: absolute;
                    width: 50px; height: 50px;
                    font-size: 2rem;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    background: rgba(255,255,255,0.8);
                    border-radius: 50%;
                    transition: all 0.3s ease;
                    border: 2px solid #007bff;
                `;
                
                // Random position
                const maxX = gameArea.clientWidth - 50;
                const maxY = gameArea.clientHeight - 50;
                currentTarget.style.left = Math.random() * maxX + 'px';
                currentTarget.style.top = Math.random() * maxY + 'px';
                
                // Random Pokemon
                currentTarget.textContent = pokemonEmojis[Math.floor(Math.random() * pokemonEmojis.length)];
                
                // Click handler
                currentTarget.addEventListener('click', () => {
                    if (currentTarget && gameActive) {
                        score++;
                        document.getElementById('reflexScore').textContent = score;
                        gameArea.removeChild(currentTarget);
                        currentTarget = null;
                        
                        if (score >= targetCount) {
                            MinigameLibrary.endReflexChallenge(true);
                            return;
                        }
                        
                        // Spawn next target faster as score increases
                        const delay = Math.max(800 - score * 50, 300);
                        setTimeout(spawnTarget, delay);
                    }
                });
                
                gameArea.appendChild(currentTarget);
                
                // Target disappears after time limit
                setTimeout(() => {
                    if (currentTarget && gameActive) {
                        setTimeout(spawnTarget, 500);
                    }
                }, Math.max(2000 - score * 100, 800));
            }
            
            MinigameLibrary._reflexChallengeResolve = resolve;
        });
    }

    static endReflexChallenge(success) {
        const gameModal = document.getElementById('reflexChallengeGame');
        if (gameModal) {
            document.body.removeChild(gameModal);
        }
        
        if (MinigameLibrary._reflexChallengeResolve) {
            const score = parseInt(document.getElementById('reflexScore')?.textContent || '0');
            MinigameLibrary._reflexChallengeResolve({
                success,
                reason: success ? `Perfect! Hit all 10 targets!` : `You hit ${score}/10 targets. Need all 10 to win!`
            });
            delete MinigameLibrary._reflexChallengeResolve;
        }
    }

    /**
     * Pattern Sequence Game - Remember and repeat Pokemon sequences
     */
    static async playPatternSequence() {
        return new Promise((resolve) => {
            const gameModal = document.createElement('div');
            gameModal.className = 'modal-overlay';
            gameModal.id = 'patternSequenceGame';
            
            const pokemonSymbols = ['🔥', '💧', '🌿', '⚡'];
            let sequence = [];
            let playerSequence = [];
            let currentLevel = 1;
            let isShowingSequence = false;
            const maxLevel = 5;
            
            gameModal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <h2 style="text-align: center; color: #333; margin-bottom: 15px;">
                        🔄 Pattern Master
                    </h2>
                    <div style="text-align: center; margin-bottom: 20px; color: #666;">
                        <span>Level: <span id="patternLevel">1</span>/${maxLevel}</span>
                    </div>
                    <div id="sequenceDisplay" style="text-align: center; margin-bottom: 20px; 
                                                   min-height: 60px; display: flex; align-items: center; 
                                                   justify-content: center; font-size: 2rem;">
                        Watch the sequence...
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                        ${pokemonSymbols.map((symbol, index) => `
                            <button class="pattern-btn" data-symbol="${symbol}" data-index="${index}"
                                    style="aspect-ratio: 1; font-size: 2rem; border: 2px solid #ddd; 
                                           border-radius: 10px; background: linear-gradient(145deg, #f8f9fa, #e9ecef);
                                           cursor: pointer; transition: all 0.3s ease;"
                                    disabled>
                                ${symbol}
                            </button>
                        `).join('')}
                    </div>
                    <div style="text-align: center;">
                        <button onclick="MinigameLibrary.endPatternSequence(false)" 
                                style="background: linear-gradient(145deg, #6c757d, #5a6268); 
                                       color: white; padding: 10px 20px; border: none; 
                                       border-radius: 20px; cursor: pointer;">
                            Give Up
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(gameModal);
            
            const buttons = gameModal.querySelectorAll('.pattern-btn');
            const sequenceDisplay = document.getElementById('sequenceDisplay');
            
            // Add click handlers
            buttons.forEach(button => {
                button.addEventListener('click', () => {
                    if (isShowingSequence) return;
                    
                    const symbol = button.dataset.symbol;
                    playerSequence.push(symbol);
                    
                    // Flash button
                    button.style.background = 'linear-gradient(145deg, #007bff, #0056b3)';
                    button.style.color = 'white';
                    setTimeout(() => {
                        button.style.background = 'linear-gradient(145deg, #f8f9fa, #e9ecef)';
                        button.style.color = 'black';
                    }, 200);
                    
                    // Check if sequence matches so far
                    if (playerSequence[playerSequence.length - 1] !== sequence[playerSequence.length - 1]) {
                        MinigameLibrary.endPatternSequence(false);
                        return;
                    }
                    
                    // Check if sequence is complete
                    if (playerSequence.length === sequence.length) {
                        if (currentLevel >= maxLevel) {
                            MinigameLibrary.endPatternSequence(true);
                            return;
                        }
                        
                        // Next level
                        currentLevel++;
                        document.getElementById('patternLevel').textContent = currentLevel;
                        setTimeout(() => {
                            playerSequence = [];
                            showNextSequence();
                        }, 1000);
                    }
                });
            });
            
            function showNextSequence() {
                isShowingSequence = true;
                buttons.forEach(btn => btn.disabled = true);
                
                // Add new symbol to sequence
                sequence.push(pokemonSymbols[Math.floor(Math.random() * pokemonSymbols.length)]);
                
                sequenceDisplay.textContent = 'Watch carefully...';
                
                // Show sequence with delays
                sequence.forEach((symbol, index) => {
                    setTimeout(() => {
                        sequenceDisplay.textContent = symbol;
                        
                        if (index === sequence.length - 1) {
                            setTimeout(() => {
                                sequenceDisplay.textContent = 'Your turn! Repeat the sequence.';
                                isShowingSequence = false;
                                buttons.forEach(btn => btn.disabled = false);
                            }, 800);
                        }
                    }, index * 800);
                });
            }
            
            // Start game
            setTimeout(showNextSequence, 2000);
            
            MinigameLibrary._patternSequenceResolve = resolve;
        });
    }

    static endPatternSequence(success) {
        const gameModal = document.getElementById('patternSequenceGame');
        if (gameModal) {
            document.body.removeChild(gameModal);
        }
        
        if (MinigameLibrary._patternSequenceResolve) {
            const level = parseInt(document.getElementById('patternLevel')?.textContent || '1');
            MinigameLibrary._patternSequenceResolve({
                success,
                reason: success ? `Amazing! Completed all 5 levels!` : `Made it to level ${level}. Need to complete all 5 levels to win!`
            });
            delete MinigameLibrary._patternSequenceResolve;
        }
    }

    /**
     * Pokemon Quiz Game - Answer Pokemon trivia questions
     */
    static async playPokemonQuiz() {
        return new Promise((resolve) => {
            const questions = [
                {
                    question: "What type is super effective against Fire-type Pokemon?",
                    options: ["Water", "Grass", "Electric", "Normal"],
                    correct: 0
                },
                {
                    question: "Which Pokemon is known as the 'Electric Mouse Pokemon'?",
                    options: ["Raichu", "Pikachu", "Voltorb", "Electabuzz"],
                    correct: 1
                },
                {
                    question: "What is the first Pokemon in the National Pokedex?",
                    options: ["Pikachu", "Mew", "Bulbasaur", "Charmander"],
                    correct: 2
                },
                {
                    question: "How many evolutions does Eevee have?",
                    options: ["6", "7", "8", "9"],
                    correct: 2
                },
                {
                    question: "What type combination does Charizard have?",
                    options: ["Fire/Dragon", "Fire/Flying", "Fire/Steel", "Fire only"],
                    correct: 1
                }
            ];
            
            let currentQuestion = 0;
            let correctAnswers = 0;
            const requiredCorrect = 4; // Need 4/5 to win
            
            const gameModal = document.createElement('div');
            gameModal.className = 'modal-overlay';
            gameModal.id = 'pokemonQuizGame';
            
            function showQuestion() {
                const q = questions[currentQuestion];
                gameModal.innerHTML = `
                    <div class="modal-content" style="max-width: 500px;">
                        <h2 style="text-align: center; color: #333; margin-bottom: 15px;">
                            🎓 Pokemon Trivia
                        </h2>
                        <div style="text-align: center; margin-bottom: 20px; color: #666;">
                            Question ${currentQuestion + 1} of ${questions.length} | 
                            Score: ${correctAnswers}/${requiredCorrect} needed
                        </div>
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                            <h3 style="color: #333; text-align: center; margin-bottom: 20px;">
                                ${q.question}
                            </h3>
                            <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                                ${q.options.map((option, index) => `
                                    <button class="quiz-option" data-index="${index}"
                                            style="padding: 15px; border: 2px solid #ddd; border-radius: 8px;
                                                   background: linear-gradient(145deg, #fff, #f8f9fa);
                                                   cursor: pointer; transition: all 0.3s ease;
                                                   text-align: left; font-size: 1rem;">
                                        ${String.fromCharCode(65 + index)}. ${option}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        <div style="text-align: center;">
                            <button onclick="MinigameLibrary.endPokemonQuiz(false)" 
                                    style="background: linear-gradient(145deg, #6c757d, #5a6268); 
                                           color: white; padding: 10px 20px; border: none; 
                                           border-radius: 20px; cursor: pointer;">
                                Give Up
                            </button>
                        </div>
                    </div>
                `;
                
                // Add option click handlers
                const options = gameModal.querySelectorAll('.quiz-option');
                options.forEach(option => {
                    option.addEventListener('click', () => {
                        const selectedIndex = parseInt(option.dataset.index);
                        const isCorrect = selectedIndex === q.correct;
                        
                        // Disable all options
                        options.forEach(opt => opt.style.pointerEvents = 'none');
                        
                        // Show correct/incorrect
                        if (isCorrect) {
                            option.style.background = 'linear-gradient(145deg, #28a745, #20c997)';
                            option.style.color = 'white';
                            correctAnswers++;
                        } else {
                            option.style.background = 'linear-gradient(145deg, #dc3545, #c82333)';
                            option.style.color = 'white';
                            // Highlight correct answer
                            options[q.correct].style.background = 'linear-gradient(145deg, #28a745, #20c997)';
                            options[q.correct].style.color = 'white';
                        }
                        
                        setTimeout(() => {
                            currentQuestion++;
                            if (currentQuestion >= questions.length) {
                                MinigameLibrary.endPokemonQuiz(correctAnswers >= requiredCorrect);
                            } else {
                                showQuestion();
                            }
                        }, 2000);
                    });
                });
            }
            
            document.body.appendChild(gameModal);
            showQuestion();
            
            MinigameLibrary._pokemonQuizResolve = resolve;
        });
    }

    static endPokemonQuiz(success) {
        const gameModal = document.getElementById('pokemonQuizGame');
        if (gameModal) {
            document.body.removeChild(gameModal);
        }
        
        if (MinigameLibrary._pokemonQuizResolve) {
            MinigameLibrary._pokemonQuizResolve({
                success,
                reason: success ? 'Excellent Pokemon knowledge!' : 'Need at least 4/5 correct answers to win!'
            });
            delete MinigameLibrary._pokemonQuizResolve;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MinigameLibrary;
}
