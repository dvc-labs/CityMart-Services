import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import type { Config } from './config.js';
const base = (name: string, description: string) =>
  new SlashCommandBuilder().setName(name).setDescription(description);

export const commands = [
  base('help', 'Browse the CityMart Services commands'),
  base('about', 'See what CityMart Services does and check its status'),
  base('ping', 'Check bot responsiveness'),
  base('community', 'Open the CityMart Roblox community'),
  base('experience', 'Play CityMart Shopping on Roblox'),
  base('lorebook', 'Read the CityMart Lore Book'),
  base('lamp', 'Investigate a suspiciously ordinary lamp'),
  base('memberlookup', 'View a Roblox profile and CityMart community role').addStringOption(
    (option) =>
      option
        .setName('username')
        .setDescription('Roblox account username')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(20),
  ),
  base('communitycount', 'View the current CityMart community member count'),
].map((command) => command.toJSON());

export async function registerCommands(config: Config, applicationId: string) {
  const rest = new REST({ version: '10', timeout: 15_000 }).setToken(config.token);
  // Guild-scoped replacement also removes deprecated commands/subcommands.
  const results = [];
  for (const guildId of config.guildIds)
    results.push(
      await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
        body: commands,
      }),
    );
  return results;
}
