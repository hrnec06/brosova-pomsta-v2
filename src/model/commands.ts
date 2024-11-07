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

	protected pathSwitch(path: ComponentPath, pathSwitchCallback: (pathSwitch: PathSwitch) => PathSwitch) {
		const pathSwitch = pathSwitchCallback(new PathSwitch());
		pathSwitch.run(path);
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
	private idList: Record<string, () => void> = {};
	private _default?: () => void;

	public action(action: string, callback: (action: PathSwitchAction) => PathSwitchAction) {
		this.actionList[action] = callback(new PathSwitchAction());
		return this;
	}

	public id(id: string, callback: () => void) {
		this.idList[id] = callback;
		return this;
	}

	public default(callback: () => void) {
		this._default = callback;
		return this;
	}

	public run(path: ComponentPath) {
		var matchingId: (() => void) | undefined;

		if (path.action != undefined && this.actionList[path.action]) {
			this.actionList[path.action].run(path);
		}
		else if (path.action == undefined && (matchingId = this.idList[path.id]) != undefined) {
			matchingId();
		}
		else if (this._default) {
			this._default();
		}
	}
}

class PathSwitchAction {
	private idList: Record<string, () => void> = {};
	private _default?: () => void;

	public id(id: string, callback: () => void) {
		this.idList[id] = callback;
		return this;
	}

	public default(callback: () => void) {
		this._default = callback;
		return this;
	}

	public run(path: ComponentPath) {
		const idCallback = this.idList[path.id];
		if (idCallback != undefined) {
			idCallback();
		}
		else if (this._default) {
			this._default();
		}
	}
}