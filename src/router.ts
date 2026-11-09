import type { Client, Interaction } from 'discord.js';
import type { Config } from './config.js';
import { RateLimit, UserError, safeLog } from './core.js';
import { defer, respondError } from './ui.js';
import { info, help } from './handlers/info.js';
import { memberLookup } from './handlers/lookups.js';
import type { Roblox } from './services/roblox.js';

export class Router {
  private recent = new Map<string, number>();
  private limits = new RateLimit(20, 60_000);
  readonly pending = new Set<Promise<void>>();
  stopping = false;
  constructor(
    private readonly config: Config,
    private readonly client: Client,
    private readonly roblox: Roblox,
  ) {}
  handle(interaction: Interaction): void {
    const task = this.dispatch(interaction).then(() => undefined);
    this.pending.add(task);
    void task.finally(() => this.pending.delete(task));
  }
  private async dispatch(interaction: Interaction) {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;
    try {
      if (this.stopping) throw new UserError('CityMart is restarting. Please try again shortly.');
      if (!interaction.guildId || !this.config.guildIds.includes(interaction.guildId))
        throw new UserError('These commands are available only in configured CityMart servers.');
      for (const [id, time] of this.recent)
        if (time < Date.now() - 15 * 60_000) this.recent.delete(id);
      if (this.recent.has(interaction.id)) return;
      if (this.recent.size >= 10_000)
        throw new UserError('CityMart is busy. Please try again shortly.');
      this.recent.set(interaction.id, Date.now());
      this.limits.take(interaction.user.id);
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId !== `help:${interaction.user.id}`)
          throw new UserError('Open /help yourself to use its menu.');
        return await help(interaction, interaction.values[0]);
      }
      const { commandName } = interaction;
      await defer(interaction, ['help', 'about', 'ping'].includes(commandName));
      if (commandName === 'memberlookup') return await memberLookup(interaction, this.roblox);
      await info(interaction, this.config, this.client, this.roblox);
    } catch (error) {
      if (!(error instanceof UserError)) safeLog('interaction_failed', error);
      try {
        await respondError(interaction, error);
      } catch (replyError) {
        safeLog('interaction_reply_failed', replyError);
      }
    }
  }
}
