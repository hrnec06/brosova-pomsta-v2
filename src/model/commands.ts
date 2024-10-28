import discord, { Interaction, SharedSlashCommand } from "discord.js";
import MusicSession from "../components/MusicSession";

type OnRunCallback = (interaction: DiscordChatInteraction, session: MusicSession | null) => boolean | Promise<boolean>;
type OnAutocompleteCallback = (interaction: discord.AutocompleteInteraction<discord.CacheType>, session: MusicSession | null) => void
type OnButtonCallback = (interaction: discord.ButtonInteraction<discord.CacheType>, id: string, session: MusicSession | null) => void
export default abstract class DiscordCommand {
	public readonly valid: boolean;

	constructor(
		private command: SharedSlashCommand,
		public name: string
	) { 
		this.valid = /^\w+$/.test(name);
		if (!this.valid)
			console.error(`Command name '${name}' includes some illegal characters!`);
	}

	public getCommand(): discord.RESTPostAPIChatInputApplicationCommandsJSONBody {
		return this.command.toJSON();
	}

	public makeButtonPath(id: string): string {
		return `bp.cmd.${this.name}.${id}`;
	}

	public match(interaction: DiscordInteraction): boolean {
		if (!('commandName' in interaction)) return false;

		return this.command.name === interaction.commandName;
	}
}

export interface DiscordCommandInterface {
	dispatch: OnRunCallback,
	onAutoComplete?: OnAutocompleteCallback,
	onButton?: OnButtonCallback
}