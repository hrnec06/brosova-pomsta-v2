import discord, { Interaction, SharedSlashCommand, SlashCommandBuilder } from "discord.js";
import MusicSession from "../components/MusicSession";
import debug from "debug";
import Utils from "../utils";

export type MusicBotCommand = DiscordCommand & DiscordCommandInterface;

type OnRunCallback = (interaction: DiscordChatInteraction, session: MusicSession | null) => boolean | Promise<boolean>;
type OnAutocompleteCallback = (interaction: discord.AutocompleteInteraction<discord.CacheType>, session: MusicSession | null) => discord.ApplicationCommandOptionChoiceData[] | Promise<discord.ApplicationCommandOptionChoiceData[]>;
type OnButtonCallback = (interaction: discord.ButtonInteraction<discord.CacheType>, path: ComponentPath, session: MusicSession | null) => void;
type OnModalCallback = (interaction: discord.ModalSubmitInteraction<discord.CacheType>, path: ComponentPath, session: MusicSession | null) => void;

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

	public match(interaction: DiscordInteraction): boolean {
		if (!('commandName' in interaction)) return false;

		return this.command.name === interaction.commandName;
	}

	protected makePath(id: string, action?: string): string {
		const neutralize = (s: string) => s.replace(/[^\w-]/g, '');

		id = neutralize(id);
		action = action ? neutralize(action) : undefined;

		if (id == '' || action == '')
			throw 'Invalid button path.';

		const base = 'bp.cmd.' + this.name;
		if (action)
			return `${base}.${action}[${id}]`;
		return `${base}.${id}`;
	}

	protected async pathSwitch(path: ComponentPath, pathSwitchCallback: (pathSwitch: PathSwitch) => PathSwitch) {
		const pathSwitch = pathSwitchCallback(new PathSwitch());
		await pathSwitch.run(path);
	}
}

export interface DiscordCommandInterface {
	dispatch: OnRunCallback,
	onAutoComplete?: OnAutocompleteCallback,
	onButton?: OnButtonCallback,
	onModal?: OnModalCallback
}


class PathSwitch {
	private actionList: Record<string, PathSwitchAction> = {}
	private idList: Record<string, (() => Promise<void> | void)> = {};
	private _default?: (() => Promise<void> | void);

	public action(action: string, callback: (action: PathSwitchAction) => PathSwitchAction) {
		this.actionList[action] = callback(new PathSwitchAction());
		return this;
	}

	public async id(id: string, callback: (() => Promise<void>)) {
		this.idList[id] = callback;
		return this;
	}

	public default(callback: (() => Promise<void> | void)) {
		this._default = callback;
		return this;
	}

	public async run(path: ComponentPath) {
		var matchingId: (() => Promise<void> | void) | undefined;

		if (path.action != undefined && this.actionList[path.action]) {
			const handled = await this.actionList[path.action].run(path);
			if (!handled && this._default)
				await this._default();
		}
		else if (path.action == undefined && (matchingId = this.idList[path.id]) != undefined) {
			await matchingId();
		}
		else if (this._default) {
			await this._default();
		}
	}
}

class PathSwitchAction {
	private idList: Record<string, () => Promise<void> | void> = {};
	private _default?: (() => Promise<void> | void);

	public id(id: string, callback: (() => Promise<void> | void)) {
		this.idList[id] = callback;
		return this;
	}

	public default(callback: (() => Promise<void> | void)) {
		this._default = callback;
		return this;
	}

	public async run(path: ComponentPath): Promise<boolean> {
		const idCallback = this.idList[path.id];
		if (idCallback != undefined) {
			await idCallback();
			return true;
		}
		else if (this._default) {
			await this._default();
			return true;
		}
		return false;
	}
}