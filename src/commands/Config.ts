import { SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";

interface ConfigSession {
    id: string,
    interaction: DiscordInteraction,
    expire: number,
    active?: string
}

export default class ConfigCommand extends DiscordCommand implements DiscordCommandInterface {
    private configSessions: Record<string, ConfigSession> = {};

    constructor(private client: MusicBot) {
        super(
            new SlashCommandBuilder()
                .setDescription('Nastavení configu')
                .addStringOption(input => input
                    .setName("action")
                    .setDescription("Vyberte akci")
                    .setChoices([
                        { name: 'edit', value: 'edit' },
                        { name: 'show', value: 'show' }
                    ])
                    .setRequired(true)
                ),
            'config'
        );
    }
    public dispatch(interaction: DiscordChatInteraction) {
		  return true;
    }
}