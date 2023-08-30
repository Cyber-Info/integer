import type { Client } from "discord.js";
import { OAuth2Scopes } from "discord.js";
import { countingChannelPermissions, countingChannelRootPermissions } from "./discord";

// general
export const homepage = "https://cyber.info";

// documentation
export const docsUrl = `${homepage}/`;
export const cacheHelpUrl = `${docsUrl}/`;
export const flowHelpUrl = `${docsUrl}/`;
export const regexHelpUrl = `${docsUrl}/`;
export const premiumHelpUrl = `${docsUrl}/`;

// miscellaneous
export const supportServerUrl = "https://discord.gg/cyberhub";
export const privacyUrl = `${homepage}/legal/privacy`;
export const termsUrl = `${homepage}/legal/tos`;
export const sourceUrl = "https://github.com/Cyber-Info/integer";
export const uptimeUrl = "https://status.cyber.info";

// invite
export const inviteUrl = (client: Client): string => client.generateInvite({
  scopes: [
    OAuth2Scopes.Bot,
    OAuth2Scopes.ApplicationsCommands,
  ],
  permissions: [
    // basic permissions that some guilds have removed from the @everyone-role
    "ViewChannel",
    "ReadMessageHistory",
    "SendMessages",
    "SendMessagesInThreads",
    "EmbedLinks",
    "AttachFiles",

    // permissions required in a counting channel. optionally, the owner can add these manually to the counting channel. these are mainly added for a smoother experience.
    "ManageChannels",
    "ManageMessages",
    "ManageWebhooks",
    "ManageThreads",
    "CreatePrivateThreads",
    "CreatePublicThreads",

    // manage roles for flows to give out roles as a reward
    "ManageRoles",

    // extras if I forgot them here
    ...countingChannelPermissions,
    ...countingChannelRootPermissions,
  ],
});
