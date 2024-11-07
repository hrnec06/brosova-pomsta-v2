import discord, { Interaction, SharedSlashCommand, SlashCommandBuilder } from "discord.js";
import MusicSession from "../components/MusicSession";
import debug from "debug";
import Utils from "../utils";

export type MusicBotCommand = DiscordCommand & DiscordCommandInterface;

type OnRunCallback = (interaction: DiscordChatInteraction, session: MusicSession | null) => boolean | Promise<boolean>;
type OnAutocompleteCallback = (interaction: discord.AutocompleteInteraction<discord.CacheType>, session: MusicSession | null) => discord.ApplicationCommandOptionChoiceData[] | Promise<discord.ApplicationCommandOptionChoiceData[]>;
type OnButtonCallback = (interaction: discord.ButtonInteraction<discord.CacheType>, path: ButtonPath, session: MusicSession | null) => void;
export default abstract class DiscordCommand {
	public valid: 						boolean;
	protected readonly debugger: 	debug.Debugger;

	constructor(
		private command: discord.SharedSlashCommand & discord.SharedNameAndDescription,
		public name: string
	) { 
		this.valid = /^\w+$/.test(name);
		if (!this.valid)
			console.error(`Command name '${name}' includes some illegal characters!`);

		this.debugger = debug(`bp:cmd:${name}`);

		command.setName(name);
	}

	public getCommand(): discord.RESTPostAPIChatInputApplicationCommandsJSONBody {
		return this.command.toJSON();
	}

	public makeButtonPath(id: string, action?: string): string {
		const neutralize = (s: string) => s.replace(/[^\w]/g, '');

		id = neutralize(id);
		action = action ? neutralize(action) : undefined;

		if (id == '' || action == '')
			throw 'Invalid button path.';

		const base = 'bp.cmd.' + this.name;
		if (action)
			return `${base}.${action}[${id}]`;
		return `${base}.${id}`;
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