import type { ChatInputCommandInteraction } from 'discord.js';
import { embed, links, respond, literal } from '../ui.js';
import type { Roblox } from '../services/roblox.js';

export async function memberLookup(interaction: ChatInputCommandInteraction, roblox: Roblox) {
  const user = await roblox.lookup(interaction.options.getString('username', true).trim());
  const role = await roblox.role(user.id);
  const created = Date.parse(user.created);
  const url = `https://www.roblox.com/users/${user.id}/profile`;
  const profile = embed('Roblox member lookup', literal(user.description, 1800), 'roblox')
    .setURL(url)
    .setAuthor({
      name: `${user.displayName} (@${user.name})`,
      url,
      ...(user.avatar ? { iconURL: user.avatar } : {}),
    })
    .addFields(
      {
        name: 'CityMart role',
        value: role ? literal(role.name) : 'Not a community member',
        inline: true,
      },
      { name: 'Rank', value: role ? String(role.rank) : '—', inline: true },
      {
        name: 'Account created',
        value: Number.isFinite(created) ? `<t:${Math.floor(created / 1000)}:D>` : 'Not available',
        inline: true,
      },
      { name: 'Roblox ID', value: String(user.id), inline: true },
    );
  if (user.avatar) profile.setThumbnail(user.avatar);
  return respond(interaction, [profile], [links(['Roblox profile', url])]);
}
