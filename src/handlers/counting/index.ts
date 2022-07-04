import type { CountingChannelSchema, GuildDocument } from "../../database/models/Guild";
import type { GuildMember, Message } from "discord.js";
import { bulkDeleteDelay, messagesPerBulkDeletion } from "../../constants/discord";
import { handleFlows, handleFlowsOnFail } from "./flows";
import type { CountingChannelAllowedChannelType } from "../../constants/discord";
import checkBypass from "./bypass";
import checkRegex from "./regex";
import { handleNotifications } from "./notifications";
import { handleTimeouts } from "./timeouts";
import numberSystems from "../../constants/numberSystems";
import repostMessage from "./repost";

export interface CountingData {
  channel: CountingChannelAllowedChannelType;
  count: number;
  countingChannel: CountingChannelSchema;
  countingMessage: Message;
  document: GuildDocument;
  member: GuildMember;
  message: Message<true>;
}

export default async function countingHandler(message: Message & Message<true>, document: GuildDocument, countingChannel: CountingChannelSchema): Promise<void> {
  const member = message.member ?? await message.guild.members.fetch(message.author);
  const channel = message.channel as CountingChannelAllowedChannelType;

  // step 1, check if the user can bypass
  if (message.content.startsWith("!") && checkBypass(member, countingChannel.bypassableRoles)) return;

  // step 2, convert number
  const input = countingChannel.modules.includes("talking") ? message.content.split(/<|:| /u)[0]! : message.content;
  const converted = numberSystems[countingChannel.type].convert(input);

  // step 3, handle if it's invalid
  if (
    converted !== countingChannel.count.number + countingChannel.increment ||
    !countingChannel.modules.includes("allowSpam") && message.author.id === countingChannel.count.userId ||
    await checkRegex(message.content, countingChannel.filters)
  ) {
    const countingData: CountingData = {
      channel,
      count: countingChannel.count.number + countingChannel.increment,
      countingChannel,
      countingMessage: message,
      document,
      member,
      message,
    };
    void handleFlowsOnFail(countingData);
    void handleTimeouts(countingData);
    return queueDelete([message]);
  }

  // step 4, partially update the database cache with new information
  countingChannel.count = {
    number: converted,
    userId: message.author.id,
    messageId: message.id,
  };

  // step 5, repost if configured to do so
  const countingMessage = await repostMessage(message, member, countingChannel);
  if (countingMessage !== message) queueDelete([message]);

  // step 6, update the database and save
  countingChannel.count.messageId = countingMessage.id;
  document.safeSave();

  // step 7, handle flows and notifications
  const countingData: CountingData = { channel, count: converted, countingChannel, countingMessage, document, member, message };
  void handleFlows(countingData);
  void handleNotifications(countingData);
}

const bulks = new Map<CountingChannelAllowedChannelType, Message[]>();
export function queueDelete(messages: Message[]): void {
  if (!messages.length) return;
  const channel = messages[0]!.channel as CountingChannelAllowedChannelType;

  const bulk = bulks.get(channel);
  if (!bulk && messages.length === 1) {
    void messages[0]?.delete();
    bulks.set(channel, []);
  } else if (bulk) return void bulk.push(...messages);
  else bulks.set(channel, messages);

  return void setTimeout(() => bulkDelete(channel), bulkDeleteDelay);
}

function bulkDelete(channel: CountingChannelAllowedChannelType): void {
  const bulk = bulks.get(channel);
  if (!bulk?.length) return;

  if (bulk.length > 1) void channel.bulkDelete(bulk.slice(0, messagesPerBulkDeletion));
  else void bulk[0]!.delete();

  const newBulk = bulk.slice(messagesPerBulkDeletion);
  if (!newBulk.length) return void bulks.delete(channel);

  bulks.set(channel, newBulk);
  return void setTimeout(() => bulkDelete(channel), bulkDeleteDelay);
}
