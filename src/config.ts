export const VERSION = '1.4.3';
const isSnowflake = (value: string) => /^[1-9]\d{16,19}$/.test(value);

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const required = (name: string) => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Missing ${name}.`);
    return value;
  };
  const id = (name: string) => {
    const value = env[name]?.trim() || '';
    if (value && !isSnowflake(value)) throw new Error(`${name} must be a Discord ID.`);
    return value;
  };
  const port = Number(env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  const groupId = env.ROBLOX_GROUP_ID?.trim() || '36060455';
  if (!/^[1-9]\d{0,14}$/.test(groupId) || !Number.isSafeInteger(Number(groupId)))
    throw new Error('Invalid ROBLOX_GROUP_ID.');
  const guildId = id('GUILD_ID');
  if (!guildId) throw new Error('Missing GUILD_ID.');
  const labGuildId = id('LAB_GUILD_ID');
  if (labGuildId === guildId) throw new Error('LAB_GUILD_ID must differ from GUILD_ID.');
  return {
    token: required('DISCORD_TOKEN'),
    clientId: id('CLIENT_ID'),
    guildId,
    guildIds: labGuildId ? [guildId, labGuildId] : [guildId],
    port,
    groupId,
    generalChannelId: id('GENERAL_CHANNEL_ID'),
    commandsChannelId: id('COMMANDS_CHANNEL_ID'),
    userAgent:
      env.USER_AGENT?.trim() ||
      `CityMart-Services/${VERSION} (+https://github.com/dvc-labs/CityMart-Services)`,
  };
}
export type Config = ReturnType<typeof readConfig>;
