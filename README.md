# [![Quality gate](https://sonarcloud.io/api/project_badges/quality_gate?project=DiscordBot)](https://sonarcloud.io/summary/new_code?id=DiscordBot) DiscordBot 

A lightweight Discord bot built with `discord.js` (v14) and `@discordjs/voice`. This repository includes slash commands, event handlers, and tests (Jest).

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DiscordBot&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DiscordBot)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DiscordBot&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DiscordBot)

## Table of Contents
- [Features](#features)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Development](#development)
  - [Run locally](#run-locally)
  - [Testing](#testing)
  - [Code coverage](#code-coverage)
- [Commands (what each command does)](#commands-what-each-command-does)
- [Deploying commands to Discord](#deploying-commands-to-discord)
- [Packaging into an executable](#packaging-into-an-executable)
- [CI / GitHub Actions](#ci--github-actions)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features
- Slash command structure under `src/commands/`
-- Dynamic module loading by scanning `src/commands/` and `src/events/` for command/event modules
- Jest-based tests under `test/` with coverage reports
- Voice playback support using `@discordjs/voice`

## Requirements
- Node.js (development): 22.15.0 (used for development in this repo)
- npm

## Quick Start
1. Clone the repo and install dependencies:

```powershell
git clone <repo-url>
cd DiscordBot
npm install
```

2. Create a `.env` file in the project root (see required variables below).

3. Run the bot locally:

```powershell
npm start
```

## Environment Variables
Create a `.env` file with the following variables:

- `DISCORD_BOT_TOKEN` - Bot token from the Discord Developer Portal
- `CLIENT_ID` - Your application client id (used by `deploy-commands.js`)
- `GUILD_ID` - (optional) Guild ID for registering guild commands quickly in development

Example `.env`:

```
DISCORD_BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_test_guild_id_here
```

Note: The bot loads environment variables from a local `.env` file (project root) by default.

## Development

### Run locally
- Start the bot (development):

```powershell
npm start
```

This runs `node src/index.js`. The code loads command and event modules by scanning `src/commands/` and `src/events/` at startup.

### Testing
Run Jest tests and produce coverage:

```powershell
npm test
```

Specific test file:

```powershell
npm test -- test/commands/learning/channel.test.js
```

Tests are located under `test/`. Files under `src/` are unit tested with mocks where appropriate.

### Code coverage
Coverage reports are produced in the `coverage/` folder. The GitHub Actions workflow uploads this folder as an artifact so other jobs (SonarCloud / SonarQube) can consume the results without re-running tests.

## Commands (what each command does)
All slash command modules live under `src/commands/` and follow the pattern:

```js
module.exports = {
  data: new SlashCommandBuilder() /* ... */,
  async execute(interaction) { /* ... */ }
}
```

Key commands in the repo:

- `ping` (`src/commands/learning/ping.js`): Replies with pong and latency info.
- `play` (`src/commands/llm/play.js`): Joins the caller's voice channel and plays a selected MP3 from `src/assets/audio/`. Cleans up when playback ends or on error.
- `image` (`src/commands/llm/image.js`): Lists images from `src/assets/images/` and sends an image attachment (supports picking by filename or random selection).
- `reload` (`src/commands/utility/reload.js`): Reloads a command module at runtime (development helper).
- `echo`, `info`, `guide`, `user`, `server`, `cupid`, `gif` (various locations)
- `test` (channel-specific example) (`src/commands/learning/channel.js`): Example command that replies differently depending on `interaction.channelId`.

To add a command: create a new `.js` file under `src/commands/<category>/`, export `data` and `execute`, then restart the bot so the new module is loaded.

## Deploying commands to Discord
There is a script to register slash commands with Discord's API:

```powershell
node src/deploy-commands.js
```

This script scans `src/commands/` and registers any command modules it finds. Ensure `CLIENT_ID` and `GUILD_ID` are set in `.env` (or adjust script usage for global commands).

<!-- Packaging/executable notes removed from README: project no longer includes packaging support -->

## CI / GitHub Actions
The repository has a workflow file at `.github/workflows/build.yml` which contains separate jobs:

- `test` → runs `npm install` and `npm test`, and uploads `coverage/` as an artifact
- `sonarcloud` → depends on `test`, downloads coverage artifacts and runs SonarCloud scan
- `sonarqube` → depends on `test`, downloads coverage artifacts and runs SonarQube scan

This avoids re-running the test suite multiple times.

## Troubleshooting
- Bot exits immediately with `TokenInvalid`: ensure the `.env` is present and `DISCORD_BOT_TOKEN` is valid.
- If a command fails at runtime, check logs and ensure that the command module exports `data` and `execute`.

## Contributing
- Fork the repo, branch from `master`, and open a PR. Tests must pass and new features should include tests.
- Run `npm test` and ensure coverage.

## License
This project is provided as-is. Update this section with your preferred license.
