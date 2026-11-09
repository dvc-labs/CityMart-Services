import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cache, RateLimit, ServiceError, safeLog } from '../src/core.js';
import { readConfig } from '../src/config.js';
import { REST, Routes } from 'discord.js';
import { commands, registerCommands } from '../src/commands.js';
const env = { DISCORD_TOKEN: 'test-token', GUILD_ID: '100000000000000001' };

test('validates startup settings while keeping deployed variable names', () => {
  const config = readConfig(env);
  assert.equal(config.groupId, '36060455');
  assert.equal(config.port, 8080);
  assert.throws(() => readConfig({ ...env, PORT: '0' }), /Invalid PORT/);
  assert.throws(() => readConfig({ ...env, GUILD_ID: 'oops' }), /GUILD_ID/);
  assert.throws(() => readConfig({ ...env, DISCORD_TOKEN: '' }), /Missing DISCORD_TOKEN/);
  assert.throws(() => readConfig({ ...env, ROBLOX_GROUP_ID: 'oops' }), /Invalid ROBLOX_GROUP_ID/);
});

test('labs are opt-in and require a distinct Discord server ID', () => {
  assert.deepEqual(readConfig(env).guildIds, [env.GUILD_ID]);
  const labGuildId = '100000000000000002';
  const config = readConfig({ ...env, LAB_GUILD_ID: labGuildId });
  assert.deepEqual(config.guildIds, [env.GUILD_ID, labGuildId]);
  assert.throws(() => readConfig({ ...env, LAB_GUILD_ID: 'oops' }), /LAB_GUILD_ID/);
  assert.throws(() => readConfig({ ...env, LAB_GUILD_ID: env.GUILD_ID }), /must differ/);
});

test('startup/manual registration replaces commands in each configured server and propagates failures', async (t) => {
  const calls: { route: string; body: unknown }[] = [];
  let fail = false;
  t.mock.method(REST.prototype, 'put', async (route: string, options?: { body?: unknown }) => {
    if (fail && route.includes('100000000000000002')) throw new Error('Labs bot not installed');
    calls.push({ route, body: options?.body });
    return [];
  });
  const applicationId = '500000000000000001';
  for (const labGuildId of ['', '100000000000000002']) {
    calls.length = 0;
    const config = readConfig({ ...env, LAB_GUILD_ID: labGuildId });
    await registerCommands(config, applicationId);
    assert.deepEqual(
      calls.map((call) => call.route),
      config.guildIds.map((id) => Routes.applicationGuildCommands(applicationId, id)),
    );
    assert.ok(calls.every((call) => call.body === commands));
  }
  fail = true;
  await assert.rejects(
    registerCommands(readConfig({ ...env, LAB_GUILD_ID: '100000000000000002' }), applicationId),
    /not installed/,
  );
});

test('negative results are cached and concurrent requests are coalesced', async () => {
  let loads = 0,
    now = 100;
  const cache = new Cache<null>(10, 5, () => now);
  const load = async () => {
    loads++;
    return null;
  };
  assert.deepEqual(await Promise.all([cache.get('x', load), cache.get('x', load)]), [null, null]);
  await cache.get('x', load);
  assert.equal(loads, 1);
  now += 11;
  await cache.get('x', load);
  assert.equal(loads, 2);
});

test('fixed-window limits reset and do not discard active users under pressure', () => {
  let now = 0;
  const rate = new RateLimit(2, 100, 1, () => now);
  rate.take('a');
  rate.take('a');
  assert.throws(() => rate.take('a'), /try again/);
  assert.throws(() => rate.take('b'), /busy/);
  now = 100;
  assert.doesNotThrow(() => rate.take('b'));
});

test('the registry contains exactly the current commands and valid schemas', () => {
  assert.deepEqual(commands.map((command) => command.name).sort(), [
    'about',
    'community',
    'communitycount',
    'experience',
    'help',
    'lamp',
    'lorebook',
    'memberlookup',
    'ping',
  ]);
  const lookup = commands.find((command) => command.name === 'memberlookup')!;
  assert.equal(lookup.options?.length, 1);
  assert.equal(lookup.options?.[0]?.name, 'username');
  assert.equal(lookup.options?.[0]?.required, true);
  assert.ok(commands.every((command) => command.description.length <= 100));
  assert.ok(commands.every((command) => !('dm_permission' in JSON.parse(JSON.stringify(command)))));
});

test('logs omit upstream bodies, tokens, URL credentials and arbitrary exception messages', (t) => {
  const lines: string[] = [];
  t.mock.method(console, 'error', (value: string) => lines.push(value));
  safeLog('request_failed', new Error('token=VERY_SECRET&body=private'));
  safeLog('request_failed', new ServiceError('Roblox', 429));
  assert.ok(!lines.join('').includes('VERY_SECRET'));
  assert.ok(!lines.join('').includes('private'));
  assert.equal(JSON.parse(lines[1]!).status, 429);
});
