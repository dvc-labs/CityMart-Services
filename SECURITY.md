# Security policy

| Version          | Supported |
| ---------------- | --------- |
| 1.4.x            | Yes       |
| Earlier versions | No        |

Report security issues privately to the repository owner through GitHub's private vulnerability reporting feature when available, or through an established private contact. Do not put credentials or exploitable details in a public issue.

Keep the Discord token in a runtime secret and use a separate test bot. Rotate an exposed token in the Discord Developer Portal. Logs omit request bodies, tokens and raw exception messages. Remove identifying information before sharing diagnostics.

Use the Guilds gateway intent and the channel permissions in [README.md](README.md). Run one production instance and keep the health port internal. Keep the Docker base image and npm dependencies updated. Dependency update PRs must pass tests before deployment.
