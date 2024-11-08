import discord, { Interaction, SharedSlashCommand, SlashCommandBuilder } from "discord.js";
import MusicSession from "../components/MusicSession";
import debug from "debug";
import Utils from "../utils";

export type MusicBotCommand = DiscordCommand & DiscordCommandInterface;

type OnRunCallback = (interaction: DiscordChatInteraction, session: MusicSession | null) => boolean | Promise<boolean>;
type OnAutocompleteCallback = (interaction: DiscordAutocompleteInteraction, session: MusicSession | null) => discord.ApplicationCommandOptionChoiceData[] | Promise<discord.ApplicationCommandOptionChoiceData[]>;
type OnButtonCallback = (interaction: DiscordButtonInteraction, path: ComponentPath, session: MusicSession | null) => void;
type OnModalCallback = (interaction: DiscordModalInteraction, path: ComponentPath, session: MusicSession | null) => void;

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
	private actionList: Record<string, PathSwitchAction<any, boolean>> = {}
	private idList: Record<string, (() => Promise<void> | void)> = {};
	private _default?: (() => Promise<void> | void);

	public action<T>(action: string, callback: (action: PathSwitchAction<T, false>) => PathSwitchAction<T, boolean>) {
		this.actionList[action] = callback(new PathSwitchAction<T, false>());
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

class PathSwitchAction<T, U extends boolean> {
	private idList: Record<string, (context: U extends true ? T : undefined) => Promisable<void>> = {};
	private _default?: ((context: U extends true ? T : undefined) => Promisable<void>);

	private _use?: (id: string) => Promisable<T>;
	private _check?: (id: string, context: U extends true ? T : undefined) => Promisable<boolean>;

	public use(callback: ((id: string) => Promise<T> | T)): PathSwitchAction<T, true> {
		this._use = callback;
		return this as PathSwitchAction<T, true>;
	}

	public check(callback: (id: string, context: U extends true ? T : undefined) => Promisable<boolean>) {
		this._check = callback;
		return this as PathSwitchAction<T, U>;
	}

	public id(id: string, callback: ((context: U extends true ? T : undefined) => Promise<void> | void)): PathSwitchAction<T, U> {
		this.idList[id] = callback;
		return this;
	}

	public default(callback: (() => Promise<void> | void)): PathSwitchAction<T, U> {
		this._default = callback;
		return this;
	}

	public async run(path: ComponentPath): Promise<boolean> {
		const idCallback = this.idList[path.id];
		const ctx = this._use ? (await this._use(path.id)) : undefined;
		const check = this._check ? (await this._check(path.id, ctx as U extends true ? T : undefined)) : true;

		if (!check)
			return false;

		if (idCallback != undefined) {
			await idCallback(ctx as U extends true ? T : undefined);
			return true;
		}
		else if (this._default) {
			await this._default(ctx as U extends true ? T : undefined);
			return true;
		}
		return false;
	}
}