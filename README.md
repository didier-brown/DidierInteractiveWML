# EEG Mental Battle

## Project Purpose

This project is a browser-based interactive experience for live EEG visualisation, presented as a competitive “mental battle”. It is designed for gallery or classroom environments. The experience utilizes various EEG metrics, including Alpha power, Theta power, Alpha-Theta product, and Microstates C, D, and E, to drive the gameplay.

## Repository Structure

*   `public/index.html`: The main HTML file that serves as the entry point for the application.
*   `public/style.css`: Contains all CSS styles for the application, defining the visual appearance of the game.
*   `src/main.js`: This is the core JavaScript file that orchestrates the overall application logic, including UI interactions and game mechanics.
*   `src/ui/lanes.js`: Responsible for rendering and updating the race lanes for each participant in the mental battle.
*   `src/combat.js`: Contains the essential logic for calculating scores, detecting alpha-bursts, and will soon include round mechanics.
*   `src/ui/hud.js`: Manages the heads-up display (HUD) elements, providing real-time information to the users.
*   `src/ui/scoreboard.js`: (To be created) This file will handle the display of a dynamic leaderboard, showing participant scores and rankings.
*   `src/net/mockFeed.js`: Provides simulated EEG data. This is crucial for development and testing purposes, allowing for offline work and consistent data streams.
*   `src/utils.js`: A collection of shared helper functions used across various modules of the application.
*   `src/net/bridge.js`: A placeholder for the WebSocket OSC (Open Sound Control) bridge. This component is intended to receive real-time EEG data from external sensors.
*   `tests/`: (To be created) This directory will house all unit tests for the project, ensuring code quality and reliability.

## Setup and Running

This project is a client-side web application. To run it, you need to serve the `public` directory using a simple HTTP server.

1.  Open your terminal or command prompt.
2.  Navigate to the root directory of this project.
3.  Execute one of the following commands:
    *   If you have Python installed: `python -m http.server`
    *   If you have Node.js and npx installed: `npx serve`
    *   Alternatively, any other simple HTTP server can be used by pointing it to the `public` directory.
4.  Once the server is running, open your web browser and navigate to `http://localhost:<port>`, where `<port>` is the port number shown by the HTTP server (e.g., `http://localhost:8000` or `http://localhost:3000`).

**Note:** JavaScript module dependencies (like D3.js) are loaded via Content Delivery Networks (CDNs). Therefore, an active internet connection is required during development and when running the application.

## WebSocket API for EEG Data (`src/net/bridge.js`)

The `src/net/bridge.js` module is intended to connect to a WebSocket server to receive real-time EEG data for the participants. This data drives the core gameplay mechanics.

### Message Format

The WebSocket server should send messages as JSON strings. Each message should be an array of objects, where each object represents the data for a single player.

The `playerId` in each object must correspond to the `id` field of the player objects defined in `state.players` array in `src/main.js`.

### Player Data Object Structure

Each object in the array should have the following structure and metrics:

*   `playerId`: (Number) Unique identifier for the player (e.g., `1`, `2`). This ID must match an existing player ID in the application.
*   `alphaPower`: (Number) Normalized alpha wave power, ideally between 0.0 and 1.0.
*   `thetaPower`: (Number) Normalized theta wave power, ideally between 0.0 and 1.0.
*   `alphaThetaProduct`: (Number) Calculated as `alphaPower * thetaPower`. This is a key derived metric used in the game.
*   `microstateC`: (Number) Normalized value representing the prevalence of Microstate C (often associated with mind-wandering), ideally between 0.0 and 1.0.
*   `microstateD`: (Number) Normalized value representing the prevalence of Microstate D (often associated with focused attention), ideally between 0.0 and 1.0.
*   `microstateE`: (Number) Normalized value representing the prevalence of Microstate E (often associated with self-awareness/sentinel state), ideally between 0.0 and 1.0.

All metric values should be numbers. Normalization (e.g., to a 0-1 range) is highly recommended for consistent processing.

### Example JSON Message (Array-based)

```json
[
  {
    "playerId": 1,
    "alphaPower": 0.8,
    "thetaPower": 0.6,
    "alphaThetaProduct": 0.48,
    "microstateC": 0.2,
    "microstateD": 0.7,
    "microstateE": 0.4
  },
  {
    "playerId": 2,
    "alphaPower": 0.5,
    "thetaPower": 0.7,
    "alphaThetaProduct": 0.35,
    "microstateC": 0.4,
    "microstateD": 0.3,
    "microstateE": 0.5
  }
]
```

### `src/net/bridge.js` Implementation Notes

The current `src/net/bridge.js` is a placeholder. A full implementation will need to:

1.  Establish a WebSocket connection to the specified EEG data server.
2.  Listen for incoming messages.
3.  Parse the JSON string into JavaScript objects.
4.  For each player data object in the received array:
    *   Find the corresponding player in the `state.players` array (in `main.js`) using `playerId`.
    *   Update the `player.data` object with the new values. Specifically:
        *   `player.data.alphaTheta` should be updated with the `alphaThetaProduct` from the message.
        *   `player.data.focus` should be updated with the `microstateD` value (focused attention).
        *   `player.data.mindWander` should be updated with the `microstateC` value (mind-wandering).
        *   Other received metrics (raw `alphaPower`, `thetaPower`, `microstateE`) can also be stored in `player.data` if they are needed for display or other future mechanics.
5.  Handle WebSocket connection errors, disconnections, and reconnections as appropriate.
6.  Provide a clear way to configure the WebSocket server address.
