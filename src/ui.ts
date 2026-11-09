import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  escapeMarkdown,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
  type InteractionReplyOptions,
} from 'discord.js';
import { VERSION } from './config.js';
import { UserError } from './core.js';

export const BRAND_ICON =
  'https://storage.davevancauwenberghe.be/citymart/visuals/citymart_group_icon.png';
type Category = 'info' | 'success' | 'warning' | 'error' | 'roblox';
const colors: Record<Category, number> = {
  info: 0x5865f2,
  success: 0x2ecc71,
  warning: 0xf1c40f,
  error: 0xe74c3c,
  roblox: 0x00a2ff,
};
const clip = (value: string, length: number) =>
  value.length <= length ? value : value.slice(0, length - 1) + '…';
export const literal = (value: string, length = 1000) =>
  clip(
    escapeMarkdown(value).replace(/@/g, '@\u200b').replace(/</g, '‹').replace(/>/g, '›'),
    length,
  );
export function embed(title: string, description: string, category: Category = 'info') {
  return new EmbedBuilder()
    .setColor(colors[category])
    .setTitle(clip(title, 256))
    .setDescription(clip(description, 4096))
    .setThumbnail(BRAND_ICON)
    .setFooter({
      text: `CityMart Services • ${category} • v${VERSION}`,
    })
    .setTimestamp();
}
export function links(...items: [string, string][]) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    items.map(([label, url]) =>
      new ButtonBuilder().setLabel(label).setURL(url).setStyle(ButtonStyle.Link),
    ),
  );
}
type ReplyInteraction = ChatInputCommandInteraction | StringSelectMenuInteraction;
export async function defer(interaction: ChatInputCommandInteraction, privateReply: boolean) {
  if (!interaction.deferred && !interaction.replied)
    await interaction.deferReply(privateReply ? { flags: MessageFlags.Ephemeral } : {});
}
export async function respond(
  interaction: ReplyInteraction,
  embeds: EmbedBuilder[],
  components: InteractionReplyOptions['components'] = [],
) {
  const payload = { embeds, components, allowedMentions: { parse: [] as const } };
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  return interaction.reply({
    ...payload,
    flags: MessageFlags.Ephemeral,
  });
}
export async function respondError(interaction: ReplyInteraction, error: unknown) {
  const description =
    error instanceof UserError
      ? error.message
      : 'The request could not be completed. Please try again shortly. If it keeps happening, contact the server owner.';
  await respond(interaction, [
    embed(
      'Unable to complete request',
      description,
      error instanceof UserError ? 'warning' : 'error',
    ),
  ]);
}
