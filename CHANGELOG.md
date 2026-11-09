# Changelog

## 1.4.3

- Limit the command list to community links, Roblox member tools and bot information. Refresh `/help` and `/about`.
- Remove retired integrations, their configuration and background jobs. The container runs as the unprivileged `node` user and can be deployed without a persistent mount.
- Register commands in the primary and optional labs servers. Keep startup announcements and community count updates scoped to the primary server.

## 1.4.1

- Refresh the guild command registry on startup.
- Support Node.js 24.15+ and 26, and verify both major versions in CI.
