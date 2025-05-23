// src/announcer.js

export class Announcer {
    constructor(svgContainer, players) {
        this.svgContainer = svgContainer;
        this.players = players; // Assuming players is the initial array of player objects
        this.messageHistory = [];
        this.previousPlayerStates = new Map();
        this.previousLeaderId = null;
        this.focusComboThreshold = 3;
        this.engagementDropThreshold = 0.3;

        players.forEach(player => {
            this.previousPlayerStates.set(player.id, {
                alphaTheta: player.data.alphaTheta,
                focus: player.data.focus,
                mindWander: player.data.mindWander,
                hp: player.hp,
                combo: player.combo,
                announcedFocusStreak: false
            });
        });

        // Create announcer text overlay element
        this.announcerText = svgContainer.append('text')
            .attr('class', 'announcer-text')
            .attr('x', '50%')
            .attr('y', '50px') // Adjust position as needed
            .attr('text-anchor', 'middle')
            .style('font-size', '24px') // Basic styling
            .style('fill', '#ffffff')
            .style('opacity', 0); // Initially hidden

        // Create call history panel (basic structure)
        this.historyPanel = svgContainer.append('g')
            .attr('class', 'announcer-history-panel')
            .attr('transform', 'translate(10, 10)') // Adjust position
            .style('opacity', 0.8); // Basic styling

        this.historyRect = this.historyPanel.append('rect')
            .attr('width', 200)
            .attr('height', 300)
            .style('fill', '#333333')
            .style('stroke', '#ffffff')
            .attr('rx', 5);

        this.historyTitle = this.historyPanel.append('text')
            .attr('x', 10)
            .attr('y', 20)
            .text('Call History')
            .style('fill', '#ffffff')
            .style('font-size', '16px');

        this.historyLogContainer = this.historyPanel.append('foreignObject')
            .attr('x', 5)
            .attr('y', 30)
            .attr('width', 190)
            .attr('height', 265)
            .append('xhtml:div')
            .style('color', 'white')
            .style('font-size', '12px')
            .style('padding', '5px')
            .style('overflow-y', 'auto')
            .style('height', '265px'); // Ensure div takes full height for scrolling


        // Placeholder for Web Speech API
        this.speechSynthesis = window.speechSynthesis;
    }

    showMessage(message, duration = 3000) {
        this.announcerText
            .text(message)
            .transition()
            .duration(500) // Fade-in duration
            .style('opacity', 1)
            .transition()
            .delay(duration - 1000) // Time message is visible
            .duration(500) // Fade-out duration
            .style('opacity', 0);

        this.addToHistory(message);

        // Optional: Voice synthesis
        if (this.speechSynthesis) {
            // const utterance = new SpeechSynthesisUtterance(message);
            // this.speechSynthesis.speak(utterance);
            // console.log("Placeholder: Speaking message - ", message);
        }
    }

    addToHistory(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.messageHistory.unshift({ message, timestamp }); // Add to beginning
        if (this.messageHistory.length > 20) { // Keep history to a certain length
            this.messageHistory.pop();
        }
        this.renderHistory();
    }

    renderHistory() {
        this.historyLogContainer.html(''); // Clear existing entries
        this.messageHistory.forEach(entry => {
            this.historyLogContainer.append('xhtml:div')
                .html(`<strong>[${entry.timestamp}]</strong> ${entry.message}`);
        });
        // Scroll to top
        this.historyLogContainer.node().scrollTop = 0;
    }

    // Basic show/hide for history panel (can be improved with transitions)
    toggleHistoryPanel(visible) {
        this.historyPanel.style('display', visible ? 'block' : 'none');
    }

    dispatchEvent(eventName, detail) {
        if (!this.svgContainer || !this.svgContainer.node()) return; // Ensure container is valid
        const event = new CustomEvent(eventName, { detail });
        this.svgContainer.node().dispatchEvent(event);
    }

    // Placeholder for update method to be called in game loop
    update(gameState, combatEvents) {
        // Process combatEvents
        combatEvents.forEach(event => {
            if (event.type === 'alphaBurst') {
                this.showMessage(`Alpha Surge from ${event.source.name}! Inflicting ${event.payload.damage} damage on ${event.target.name}.`);
                // Optional voice line can be added here
                this.dispatchEvent('announcer:alphaburst', {
                    sourcePlayer: event.source,
                    targetPlayer: event.target,
                    damage: event.payload.damage
                });
            }
        });

        // Process gameState.players
        gameState.players.forEach(player => {
            let previousPlayerState = this.previousPlayerStates.get(player.id);

            // Fallback if somehow a new player appears mid-game or initialization failed for one
            if (!previousPlayerState) {
                console.warn(`Announcer: No previous state for player ${player.id}, initializing.`);
                previousPlayerState = {
                    alphaTheta: player.data.alphaTheta,
                    focus: player.data.focus,
                    mindWander: player.data.mindWander,
                    hp: player.hp,
                    combo: player.combo,
                    announcedFocusStreak: false
                };
                this.previousPlayerStates.set(player.id, { ...previousPlayerState }); // ensure a copy is stored
            }


            // Knockout Detection
            if (player.hp <= 0 && previousPlayerState.hp > 0) {
                this.showMessage(`${player.name} is out of the fight!`);
                this.dispatchEvent('announcer:knockout', {
                    player: player
                });
            }

            this.detectFocusComboStreak(player, previousPlayerState);
            this.detectEngagementDrop(player, previousPlayerState);

            // Update this.previousPlayerStates for the current player
            // Retrieve the potentially updated announcedFocusStreak from the map,
            // as detectFocusComboStreak might have modified it.
            const currentAnnouncedFocusStreak = this.previousPlayerStates.get(player.id)?.announcedFocusStreak || false;

            this.previousPlayerStates.set(player.id, {
                ...player.data, // for alphaTheta, focus, mindWander
                hp: player.hp,
                combo: player.combo,
                announcedFocusStreak: currentAnnouncedFocusStreak // Use the value that might have been updated by detectFocusComboStreak
            });
        });

        // Process leaderboard
        this.detectLeaderboardReversal(gameState.players);
    }

    detectFocusComboStreak(player, previousPlayerState) {
        if (player.combo >= this.focusComboThreshold && !previousPlayerState.announcedFocusStreak) {
            this.showMessage(`${player.name} is on a Focus Combo Streak! (${player.combo}x)`);
            this.dispatchEvent('announcer:focuscombostreak', {
                player: player,
                comboLevel: player.combo
            });
            // Update the state for this player in this.previousPlayerStates
            const currentState = this.previousPlayerStates.get(player.id);
            if (currentState) {
                this.previousPlayerStates.set(player.id, { ...currentState, announcedFocusStreak: true });
            }
        } else if (player.combo < this.focusComboThreshold && previousPlayerState.announcedFocusStreak) {
            // Optional: Add announcer:combobreak event dispatch here if needed in the future
            // this.dispatchEvent('announcer:combobreak', { player: player });
            // Update the state for this player in this.previousPlayerStates
            const currentState = this.previousPlayerStates.get(player.id);
            if (currentState) {
                this.previousPlayerStates.set(player.id, { ...currentState, announcedFocusStreak: false });
            }
        }
    }

    detectEngagementDrop(player, previousPlayerState) {
        const currentData = player.data;
        let dropDetected = false;

        if (previousPlayerState.focus > 0) {
            const focusDrop = (previousPlayerState.focus - currentData.focus) / previousPlayerState.focus;
            if (focusDrop >= this.engagementDropThreshold) {
                dropDetected = true;
            }
        }

        if (!dropDetected && previousPlayerState.alphaTheta > 0) { // Check alphaTheta only if focus drop wasn't already detected
            const alphaThetaDrop = (previousPlayerState.alphaTheta - currentData.alphaTheta) / previousPlayerState.alphaTheta;
            if (alphaThetaDrop >= this.engagementDropThreshold) {
                dropDetected = true;
            }
        }

        if (dropDetected) {
            this.showMessage(`${player.name} seems to be losing focus!`);
            this.dispatchEvent('announcer:engagementdrop', {
                player: player,
                droppedMetrics: {
                    focus: previousPlayerState.focus > 0 ? (previousPlayerState.focus - currentData.focus) / previousPlayerState.focus : 0,
                    alphaTheta: previousPlayerState.alphaTheta > 0 ? (previousPlayerState.alphaTheta - currentData.alphaTheta) / previousPlayerState.alphaTheta : 0
                }
            });
            // Consider adding a cooldown mechanism here for this specific message type for this player
        }
    }

    detectLeaderboardReversal(currentPlayers) {
        const alivePlayers = currentPlayers.filter(p => p.hp > 0);

        if (alivePlayers.length === 0) {
            this.previousLeaderId = null;
            return;
        }

        alivePlayers.sort((a, b) => {
            if (b.roundWins !== a.roundWins) {
                return b.roundWins - a.roundWins; // Primary: roundWins descending
            }
            return b.hp - a.hp; // Secondary: hp descending
        });

        const currentLeader = alivePlayers[0];
        const currentLeaderId = currentLeader.id;

        if (this.previousLeaderId !== null && currentLeaderId !== null && this.previousLeaderId !== currentLeaderId) {
            this.showMessage(`${currentLeader.name} takes the lead!`);
            this.dispatchEvent('announcer:leadchange', {
                newLeader: currentLeader,
                previousLeaderId: this.previousLeaderId
            });
        }
        this.previousLeaderId = currentLeaderId;
    }
}

// Helper function for clamp, if needed elsewhere or prefer to keep it local
// function clamp(v, a, b) { return Math.max(a, Math.min(v, b)); }
