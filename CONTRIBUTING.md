# Contributing

Create a branch or fork and open a pull request against `main`. Use Node.js 24.15+ or 26 and a separate Discord development bot and guild. Keep tokens and local `.env` files out of commits.

```bash
npm ci
npm run format
npm run check
npm test
npm run build
npm audit --omit=dev
```

Keep command definitions in `src/commands.ts`, interaction routing in `src/router.ts`, presentation in `src/ui.ts` and external APIs in `src/services`. Use embeds for Discord messages and disable automatic mentions. Acknowledge interactions before network access.

Validate external data, bound request time and response size, and keep raw responses and credentials out of logs. Add focused regression tests for bugs and update the command guide and environment documentation when behavior changes.

Use a separate bot token for development and preview deployments.
