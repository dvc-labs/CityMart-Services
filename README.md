# CityMart Services 1.4.3

CityMart Services is the Discord companion for the CityMart Roblox community. It uses TypeScript, Node.js and discord.js.

## Commands

| Command                  | Purpose                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `/help`                  | Browse the interactive command guide.                                     |
| `/about`                 | See the bot's version, uptime and Discord connection status.              |
| `/ping`                  | Check gateway latency and interaction age.                                |
| `/community`             | Open the CityMart Roblox community.                                       |
| `/experience`            | Open CityMart Shopping on Roblox.                                         |
| `/lorebook`              | Read the stories behind CityMart.                                         |
| `/lamp`                  | Investigate an entirely ordinary lamp.                                    |
| `/memberlookup username` | Look up a Roblox account and its CityMart role. Use the account username. |
| `/communitycount`        | Check the current CityMart member count.                                  |

## Upgrade an existing Coolify deployment

1. Deploy v1.4.3. Startup replaces the slash-command list in the primary server and the optional labs server.
2. Wait for `CityMart Services v1.4.3 ready as ... Slash commands registered.` in the runtime logs. Check `/help` and `/about` in each configured server.
3. Remove obsolete CityMart runtime variables using the table below. In **Configuration → Persistent Storage**, remove the mount whose destination is `/data`. Export its contents first if you need the records for reference or rollback. Save the settings and redeploy.

## Coolify configuration

| Setting             | Value         |
| ------------------- | ------------- |
| Branch              | `main`        |
| Build pack          | Dockerfile    |
| Base directory      | `/`           |
| Dockerfile location | `/Dockerfile` |
| Ports exposes       | `8080`        |
| Port mappings       | Empty         |
| Domains             | Empty         |
| Persistent Storage  | Empty         |

Use one production instance. Keep PR previews disabled unless they use a separate test bot and guild. The image runs as the unprivileged `node` user.

Install the Discord application with the `bot` and `applications.commands` scopes. Use the Guilds gateway intent. Grant View Channel, Send Messages and Embed Links in the bot's channels, plus Send Messages in Threads where used.

Set these in the application's production **Environment Variables** with runtime availability enabled. Mark the bot token as a secret.

| Variable              | Purpose                                                                       |
| --------------------- | ----------------------------------------------------------------------------- |
| `DISCORD_TOKEN`       | Required Discord bot token.                                                   |
| `GUILD_ID`            | Required primary Discord server ID.                                           |
| `LAB_GUILD_ID`        | Optional second Discord server ID for the same bot.                           |
| `CLIENT_ID`           | Optional application ID at startup. Required for manual command registration. |
| `ROBLOX_GROUP_ID`     | Roblox community ID. Defaults to `36060455`.                                  |
| `GENERAL_CHANNEL_ID`  | Optional primary server channel for startup announcements.                    |
| `COMMANDS_CHANNEL_ID` | Optional primary server channel for community count changes.                  |
| `PORT`                | Internal health port. Defaults to `8080`.                                     |
| `USER_AGENT`          | Optional identifier for outbound Roblox requests.                             |

### Optional labs server

Invite the same bot to your labs server before setting `LAB_GUILD_ID`, then redeploy. Startup checks access and registers commands in both servers before marking the bot ready. Startup announcements and community count updates go to the configured channels in the primary server.

To retire the labs installation, remove the bot from that server, clear `LAB_GUILD_ID` and redeploy.

### Health and shutdown

- `GET /health` returns HTTP 200 once the health listener is up.
- `GET /ready` returns HTTP 200 when Discord is connected and commands are registered, or HTTP 503 while the bot is unready.
- Both endpoints accept HEAD requests and disable response caching. Docker checks `/ready` every 30 seconds after a startup grace period.
- SIGTERM and SIGINT stop interaction intake, cancel outbound requests and drain active tasks.

## Development

Use Node.js 24.15 or newer in the 24.x line (see `.nvmrc`), or Node.js 26. CI checks both major versions and Docker uses Node.js 26.

```bash
npm ci
cp .env.example .env
# Set the token and server ID for a separate development bot.
npm run dev
```

```bash
npm run format:check
npm run check
npm test
npm run build
npm audit --omit=dev
```

`npm start` runs the compiled application. To refresh commands manually, build the project, set `CLIENT_ID` and run `npm run commands`. Tests use mocked Discord interactions and Roblox responses, plus local HTTP servers. CI builds the production image and checks health on a read-only filesystem without a storage mount.

See [CHANGELOG.md](CHANGELOG.md) for release changes and [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance. Licensed under the [MIT License](LICENSE).
