import discord, { SharedSlashCommand } from "discord.js";
import MusicSession from "../MusicSession";

type OnRunCallback = (interaction: DiscordChatInteraction, session: MusicSession | null) => boolean | Promise<boolean>;

export default abstract class DiscordCommand {
    constructor(
        private command: SharedSlashCommand,
        public name: string
    ) { }

    public getCommand(): discord.RESTPostAPIChatInputApplicationCommandsJSONBody {
        return this.command.toJSON();
    }

    public match(interaction: DiscordChatInteraction): boolean {
        return this.command.name === interaction.commandName;
    }
}

export interface DiscordCommandInterface {
    dispatch: OnRunCallback
}