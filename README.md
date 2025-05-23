# EEG Visualization Experience

This project is a browser-based interactive experience for live EEG visualization, designed as an experimental digital performance piece. The core of the project is to create a gamified visualization system that receives real-time EEG metrics via OSC (later through a WebSocket bridge), and presents them as a competitive “mental battle” between participants. The experience is designed for gallery or classroom-sized installations where spectators can observe contestants’ mental focus visualized as dynamic energy tracks.

## Key EEG Metrics

* Alpha power
* Theta power
* Alpha-Theta (αθ) product
* Microstate C (mind-wandering), D (focused attention), and E (self-awareness)

## Repository Structure

* `index.html`, `style.css`: Core layout and styling
* `main.js`: Orchestrates the app, initializes UI modules
* `lanes.js`: Draws race lanes for participants
* `combat.js`: Contains logic for alpha-burst calculations and scoring
* `hud.js`, `scoreboard.js`: Heads-up display with player scores and performance indicators
* `mockFeed.js`: Simulated data for development/testing
* `utils.js`: Shared helpers
* `bridge.js`: Placeholder for WebSocket OSC bridge
* `tests/`: Contains unit tests for the project.

## Setup

[Instructions for setting up and running the project will be added here later.]
