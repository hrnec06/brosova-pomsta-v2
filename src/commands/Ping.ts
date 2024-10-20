import { ChatInputCommandInteraction, CacheType, SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";

export default class PingCommand extends DiscordCommand implements DiscordCommandInterface {
    constructor(private client: MusicBot) {
        super(
            new SlashCommandBuilder()
                .setName('ping')
                .setDescription('Pong?'),
            'ping'
        )
    }
    public dispatch(interaction: DiscordChatInteraction) {
        interaction.reply('Pong!');
		  return true;
    }
}