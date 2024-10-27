import discord, { Interaction, SharedSlashCommand } from "discord.js";
import MusicSession from "../components/MusicSession";

type OnRunCallback = (interaction: DiscordChatInteraction, session: MusicSession | null) => boolean | Promise<boolean>;
type onAutocompleteCallback = (interaction: discord.AutocompleteInteraction<discord.CacheType>, session: MusicSession | null) => void
export default abstract class DiscordCommand {
	constructor(
		private command: SharedSlashCommand,
		public name: string
	) { }

	public getCommand(): discord.RESTPostAPIChatInputApplicationCommandsJSONBody {
		return this.command.toJSON();
	}

	public match(interaction: DiscordInteraction): boolean {
		if (!('commandName' in interaction)) return false;

		return this.command.name === interaction.commandName;
	}
}

export interface DiscordCommandInterface {
	dispatch: OnRunCallback,
	onAutoComplete?: onAutocompleteCallback
}