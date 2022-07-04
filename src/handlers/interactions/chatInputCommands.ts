import type { ChatInputCommandInteraction, Snowflake } from "discord.js";
import type { CountingChannelSchema, GuildDocument } from "../../database/models/Guild";
import type { ChatInputCommand } from "../../commands/chatInput";
import { inspect } from "util";
import { mainLogger } from "../../utils/logger/main";
import { selectedCountingChannels } from "../../constants/selectedCountingChannel";

export default async function chatInputCommandHandler(interaction: ChatInputCommandInteraction<"cached">, document: GuildDocument): Promise<void> {
  try {
    const { default: command } = await import(`../../commands/chatInput/${[
      interaction.commandName,
      interaction.options.getSubcommandGroup(false),
      interaction.options.getSubcommand(false),
    ].filter(Boolean).join("/")}`) as { default: ChatInputCommand };

    const countingChannel = document.channels.get(interaction.channelId);
    if (command.disableInCountingChannel && countingChannel) return void interaction.reply({ content: "❌ This command is disabled in counting channels.", ephemeral: true });

    const selectedCountingChannelId = countingChannel ? interaction.channelId : selectedCountingChannels.get(interaction.user.id)?.channel;
    const selectedCountingChannel: [Snowflake, CountingChannelSchema] | undefined = selectedCountingChannelId ? [selectedCountingChannelId, document.channels.get(selectedCountingChannelId)!] : document.getDefaultCountingChannel() ?? undefined; // eslint-disable-line no-undefined

    if (command.requireSelectedCountingChannel && !selectedCountingChannel) return void interaction.reply({ content: "💥 You need a counting channel selected to run this command. Type `/select` to select a counting channel and then run this command again.", ephemeral: true });

    return await command.execute(interaction, Boolean(countingChannel), document, (selectedCountingChannel ?? [null, null]) as never);
  } catch (err) {
    mainLogger.error(`Failed to run command ${interaction.commandName}: ${inspect(err)}`);
  }
}
