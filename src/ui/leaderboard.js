// src/ui/leaderboard.js

/**
 * Updates the leaderboard display with the current player scores.
 * @param {Array<Object>} players - The array of player objects.
 *                                  Each player object is expected to have:
 *                                  - id (or name)
 *                                  - roundWins
 *                                  - hp
 *                                  - (optional) data: { focus, alphaTheta }
 */
export function updateLeaderboard(players) {
  const leaderboardList = document.getElementById('leaderboard-list');
  if (!leaderboardList) {
    console.error('Leaderboard list element not found!');
    return;
  }

  // Sort players:
  // 1. Primary: roundWins (descending)
  // 2. Secondary: hp (descending)
  // 3. Tertiary: focus (descending, if available)
  // 4. Quaternary: alphaTheta (descending, if available)
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.roundWins !== a.roundWins) {
      return b.roundWins - a.roundWins;
    }
    if (b.hp !== a.hp) {
      return b.hp - a.hp;
    }
    // Optional: if data object and focus/alphaTheta are available
    if (b.data && a.data) {
      if (b.data.focus !== a.data.focus) {
        return (b.data.focus || 0) - (a.data.focus || 0);
      }
      if (b.data.alphaTheta !== a.data.alphaTheta) {
        return (b.data.alphaTheta || 0) - (a.data.alphaTheta || 0);
      }
    }
    return 0; // Keep original order if all tie-breakers are equal
  });

  // Clear existing leaderboard items
  leaderboardList.innerHTML = '';

  // Populate leaderboard
  sortedPlayers.forEach(player => {
    const listItem = document.createElement('li');
    let scoreInfo = `Wins: ${player.roundWins}, HP: ${player.hp.toFixed(0)}`;
    if (player.data) {
      scoreInfo += `, Focus: ${(player.data.focus * 100).toFixed(0)}%, αΘ: ${(player.data.alphaTheta * 100).toFixed(0)}%`;
    }
    listItem.textContent = `Player ${player.id}: ${scoreInfo}`;
    // You might want to add classes for styling, e.g., based on player ID or rank
    // listItem.className = `player-entry player-${player.id}`;
    leaderboardList.appendChild(listItem);
  });
}

/**
 * Initializes the leaderboard. Currently, this function doesn't do much,
 * but it's here for future enhancements (e.g., setting up event listeners
 * if the leaderboard data were to be pushed instead of pulled).
 */
export function initLeaderboard(players = []) {
  // Initial render with empty or provided players
  updateLeaderboard(players);
}
