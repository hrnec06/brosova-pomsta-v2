import { AutocompleteInteraction, ButtonInteraction, CacheType, SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import MusicSession from "../components/MusicSession";

export default class EmptyCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setDescription('empty'),
			'empty'
		)
	}
	public dispatch(interaction: DiscordChatInteraction) {
		interaction.reply('Empty command.');
		return false;
	}

	public onButton(interaction: ButtonInteraction<CacheType>, path: ComponentPath, session: MusicSession | null) {
	}

	public onAutoComplete(interaction: AutocompleteInteraction<CacheType>, session: MusicSession | null) {
		return [];
	}
}