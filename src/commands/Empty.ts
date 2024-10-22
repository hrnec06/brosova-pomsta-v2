import { SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";

export default class EmptyCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setName('empty')
				.setDescription('empty'),
			'empty'
		)
	}
	public dispatch(interaction: DiscordChatInteraction) {
		interaction.reply('Empty command.');
		return false;
	}
}