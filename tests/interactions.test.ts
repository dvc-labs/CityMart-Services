import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MessageFlags,
  StringSelectMenuBuilder,
  type ActionRowBuilder,
  type ButtonBuilder,
  type ChatInputCommandInteraction,
  type Client,
  type EmbedBuilder,
} from 'discord.js';
import { commands } from '../src/commands.js';
import { readConfig, VERSION } from '../src/config.js';
import { Router } from '../src/router.js';
import { help } from '../src/handlers/info.js';
import { literal } from '../src/ui.js';
import type { Roblox } from '../src/services/roblox.js';

const guildId = '100000000000000001';
const labGuildId = '100000000000000002';
const actor = '400000000000000001';
const config = readConfig({ DISCORD_TOKEN: 'fake', GUILD_ID: guildId });

interface Payload {
  embeds: EmbedBuilder[];
  content?: string;
  components?: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[];
  allowedMentions?: { parse: string[] };
}
function mockInteraction(commandName: string, server: string | null = guildId) {
  const replies: Payload[] = [];
  let acknowledgements = 0;
  const raw = {
    commandName,
    id: '600000000000000001',
    guildId: server,
    createdTimestamp: Date.now(),
    deferred: false,
    replied: false,
    ephemeral: false,
    user: { id: actor },
    options: { getString: () => 'Player' },
    isChatInputCommand: () => true,
    isStringSelectMenu: () => false,
    deferReply: async (payload?: { flags?: number }) => {
      raw.deferred = true;
      raw.ephemeral = payload?.flags === MessageFlags.Ephemeral;
      acknowledgements++;
    },
    editReply: async (payload: Payload) => {
      replies.push(payload);
    },
    reply: async (payload: Payload) => {
      raw.replied = true;
      replies.push(payload);
    },
  };
  return {
    interaction: raw as unknown as ChatInputCommandInteraction,
    raw,
    replies,
    get acknowledgements() {
      return acknowledgements;
    },
  };
}
function assertEmbeds(payloads: Payload[]) {
  assert.ok(payloads.length);
  for (const payload of payloads) {
    assert.equal(payload.content, undefined);
    assert.deepEqual(payload.allowedMentions?.parse, []);
    assert.ok(payload.embeds.length > 0 && payload.embeds.length <= 10);
    let total = 0;
    for (const builder of payload.embeds) {
      const data = builder.toJSON();
      assert.ok((data.title?.length || 0) <= 256);
      assert.ok((data.description?.length || 0) <= 4096);
      assert.ok(data.timestamp);
      assert.ok(data.color);
      assert.ok(data.footer?.text.includes(`v${VERSION}`));
      total +=
        (data.title?.length || 0) +
        (data.description?.length || 0) +
        (data.author?.name.length || 0) +
        (data.footer?.text.length || 0);
      for (const field of data.fields || []) {
        assert.ok(field.value.length <= 1024);
        total += field.name.length + field.value.length;
      }
    }
    assert.ok(total <= 6000, `Embed payload too long: ${total}`);
  }
}

const user = {
  id: 123,
  name: 'Player',
  displayName: 'Display',
  description: 'D'.repeat(8000),
  created: '2020-01-01',
  avatar: null,
};
const roblox = {
  lookup: async () => user,
  role: async () => ({ name: 'Member', rank: 1 }),
  count: async () => 1000,
} as unknown as Roblox;
const client = {
  isReady: () => true,
  ws: { ping: 25 },
} as unknown as Client;

test('all registered commands produce branded embeds with the expected visibility', async () => {
  for (const { name } of commands) {
    const context = mockInteraction(name);
    const router = new Router(config, client, roblox);
    router.handle(context.interaction);
    await Promise.all(router.pending);
    assertEmbeds(context.replies);
    assert.equal(context.raw.ephemeral, ['help', 'about', 'ping'].includes(name));
    const data = context.replies[0]!.embeds[0]!.toJSON();
    assert.notEqual(data.title, 'Unable to complete request');
    if (name === 'about') {
      assert.match(data.description!, /CityMart Roblox community/);
      assert.deepEqual(
        data.fields?.map(({ name }) => name),
        ['Version', 'Uptime', 'Discord'],
      );
      assert.equal(data.fields?.[0]?.value, VERSION);
    }
  }
});

test('help covers the registered commands and falls back to the overview for stale selections', async () => {
  const overview = mockInteraction('help');
  await help(overview.interaction, 'stale');
  const menu = overview.replies[0]?.components?.[0]?.components[0];
  assert.ok(menu instanceof StringSelectMenuBuilder);
  const { options, custom_id } = menu.toJSON();
  assert.equal(custom_id, `help:${actor}`);
  assert.deepEqual(
    options.filter((option) => option.default).map((option) => option.value),
    ['overview'],
  );

  const names: string[] = [];
  for (const { value } of options) {
    const { interaction, replies } = mockInteraction('help');
    await help(interaction, value);
    assertEmbeds(replies);
    const description = replies[0]!.embeds[0]!.data.description!;
    names.push(...Array.from(description.matchAll(/`\/([a-z]+)\b/g), (match) => match[1]!));
  }
  assert.deepEqual(names.sort(), commands.map((command) => command.name).sort());
});

test('user text cannot inject mentions', () => {
  assert.equal(literal('<@123> @everyone *hi*').includes('<@'), false);
});

test('router accepts configured labs and denies commands from other servers and DMs', async () => {
  const labs = readConfig({ DISCORD_TOKEN: 'fake', GUILD_ID: guildId, LAB_GUILD_ID: labGuildId });
  for (const server of [guildId, labGuildId, '900000000000000001', null]) {
    const { interaction, replies } = mockInteraction('communitycount', server);
    const router = new Router(labs, client, roblox);
    router.handle(interaction);
    await Promise.all(router.pending);
    assertEmbeds(replies);
    const description = replies[0]!.embeds[0]!.data.description!;
    if (server === guildId || server === labGuildId) assert.match(description, /shoppers/);
    else assert.match(description, /only in configured CityMart servers/);
  }
});

test('router acknowledges network commands before calling the integration and ignores replayed interactions', async () => {
  const context = mockInteraction('memberlookup');
  let calls = 0;
  const checked = {
    ...roblox,
    lookup: async () => {
      assert.equal(context.raw.deferred, true);
      calls++;
      return user;
    },
  } as unknown as Roblox;
  const router = new Router(config, client, checked);
  router.handle(context.interaction);
  await Promise.all(router.pending);
  router.handle(context.interaction);
  await Promise.all(router.pending);
  assert.equal(calls, 1);
  assert.equal(context.acknowledgements, 1);
  assertEmbeds(context.replies);
});
