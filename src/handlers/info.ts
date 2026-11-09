import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ActivityType,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
  type Client,
} from 'discord.js';
import type { Config } from '../config.js';
import { VERSION } from '../config.js';
import { UserError } from '../core.js';
import { embed, links, respond } from '../ui.js';
import type { Roblox } from '../services/roblox.js';

const helpSections = {
  overview: [
    'CityMart Services commands',
    'Use the menu to browse community links, Roblox member tools and bot information.',
  ],
  community: [
    'Community links',
    '`/community` — visit the Roblox community\n`/experience` — play CityMart Shopping\n`/lorebook` — read the stories behind CityMart\n`/lamp` — investigate an entirely ordinary lamp',
  ],
  players: [
    'Roblox members',
    '`/memberlookup username` — look up a Roblox account by username and see its CityMart role\n`/communitycount` — check the current CityMart member count',
  ],
  bot: [
    'Bot information',
    '`/about` — see the bot version, uptime and connection status\n`/ping` — check bot responsiveness\n`/help` — open this guide',
  ],
} as const;
export async function help(
  interaction: ChatInputCommandInteraction | StringSelectMenuInteraction,
  section = 'overview',
) {
  const selected = Object.hasOwn(helpSections, section)
    ? (section as keyof typeof helpSections)
    : 'overview';
  const [title, description] = helpSections[selected];
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`help:${interaction.user.id}`)
    .setPlaceholder('Explore CityMart services')
    .addOptions(
      Object.entries(helpSections).map(([value, [label]]) => ({
        label,
        value,
        default: value === selected,
      })),
    );
  const payload = {
    embeds: [embed(title, description)],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    allowedMentions: { parse: [] as const },
  };
  if (interaction.isStringSelectMenu()) await interaction.update(payload);
  else await respond(interaction, payload.embeds, payload.components);
}
export async function info(
  interaction: ChatInputCommandInteraction,
  config: Config,
  client: Client,
  roblox: Roblox,
) {
  const command = interaction.commandName;
  if (command === 'help') return help(interaction);
  if (command === 'about') {
    return respond(interaction, [
      embed(
        'CityMart Services',
        'The Discord companion for the CityMart Roblox community. Open `/help` for community links, Roblox profiles and the member count.\n\nBuilt by Dave Van Cauwenberghe.',
      ).addFields(
        { name: 'Version', value: VERSION, inline: true },
        {
          name: 'Uptime',
          value: `<t:${Math.floor((Date.now() - process.uptime() * 1000) / 1000)}:R>`,
          inline: true,
        },
        { name: 'Discord', value: client.isReady() ? 'Connected' : 'Reconnecting', inline: true },
      ),
    ]);
  }
  if (command === 'ping')
    return respond(interaction, [
      embed('Pong!', 'CityMart Services is responding.').addFields(
        {
          name: 'Gateway latency',
          value: `${Math.max(0, Math.round(client.ws.ping))} ms`,
          inline: true,
        },
        {
          name: 'Interaction age',
          value: `${Math.max(0, Date.now() - interaction.createdTimestamp)} ms`,
          inline: true,
        },
      ),
    ]);
  if (command === 'communitycount') {
    const count = await roblox.count();
    return respond(
      interaction,
      [
        embed(
          'CityMart community',
          `**${count.toLocaleString()}** shoppers and counting.`,
          'roblox',
        ),
      ],
      [links(['Join the community', `https://www.roblox.com/communities/${config.groupId}`])],
    );
  }
  if (command === 'lamp')
    return respond(interaction, [
      embed(
        'The lamp',
        'There is nothing unusual about this lamp. Please continue shopping.',
      ).setImage('https://storage.davevancauwenberghe.be/citymart/visuals/lamp.png'),
    ]);
  const pages: Record<string, [string, string, string, string]> = {
    community: [
      'CityMart Roblox community',
      'Meet the CityMart community and follow the latest news.',
      'Join community',
      `https://www.roblox.com/communities/${config.groupId}`,
    ],
    experience: [
      'CityMart Shopping',
      'Your next shopping trip starts here.',
      'Play CityMart',
      'https://www.roblox.com/games/84931510725955/CityMart-Shopping',
    ],
    lorebook: [
      'CityMart Lore Book',
      'Explore the stories behind CityMart.',
      'Read the Lore Book',
      'https://nervous-flag-247.notion.site/23eee5e2e2ec800db586cd84bf80cbf2?v=23eee5e2e2ec804aa1b3000c2018e0b9',
    ],
  };
  const page = pages[command];
  if (!page)
    throw new UserError('That command has changed. Open /help for the current command list.');
  return respond(interaction, [embed(page[0], page[1])], [links([page[2], page[3]])]);
}

export async function updateCommunity(
  client: Client,
  config: Config,
  roblox: Roblox,
  previous: number | null,
) {
  const count = await roblox.count();
  client.user?.setActivity(`${count.toLocaleString()} shoppers`, { type: ActivityType.Watching });
  if (previous !== null && count !== previous && config.commandsChannelId) {
    const channel = await client.channels.fetch(config.commandsChannelId);
    if (!channel?.isTextBased() || channel.isDMBased() || channel.guildId !== config.guildId)
      throw new UserError('The configured community-update channel is unavailable.');
    const difference = count - previous;
    await channel.send({
      embeds: [
        embed(
          'CityMart community update',
          `**${count.toLocaleString()}** community members\n${difference > 0 ? '+' : ''}${difference.toLocaleString()} since the previous update.`,
          'roblox',
        ),
      ],
      allowedMentions: { parse: [] },
    });
  }
  return count;
}

export async function announceReady(client: Client, config: Config) {
  if (!config.generalChannelId) return;
  const channel = await client.channels.fetch(config.generalChannelId);
  if (!channel?.isTextBased() || channel.isDMBased() || channel.guildId !== config.guildId)
    throw new UserError('The startup announcement channel is unavailable.');
  await channel.send({
    embeds: [
      embed(
        'CityMart Services is ready',
        `Version **${VERSION}** is online. Use /help to browse the command list.`,
        'success',
      ),
    ],
    allowedMentions: { parse: [] },
  });
}
