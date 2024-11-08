import discord, { GatewayIntentBits } from 'discord.js';
import DiscordCommand, { DiscordCommandInterface, MusicBotCommand } from './model/commands';
import InteractionManager from './components/InteractionManager';
import SessionManager from './components/SessionManager';
import fs from 'fs/promises';
import PingCommand from './commands/Ping';
import PlayCommand from './commands/Play';
import YourPhoneLingingCommand from './commands/YourPhoneLinging';
import SkipCommand from './commands/Skip';
import JoinCommand from './commands/Join';
import StopComamnd from './commands/Stop';
import LoopCommand from './commands/Loop';
import YoutubeAPI from './api/YoutubeAPI';
import AdminCommand from './commands/Admin';
import assert from 'node:assert';
import BotConfig, { IBotConfig } from './components/BotConfig';
import Log from './utils/Log';
import QueueCommand from './commands/Queue';
import debug from 'debug';
import { QueueCacheManager } from './components/MusicQueue';
import PauseCommand from './commands/Pause';
import SubscribeCommand from './commands/Subscribe';
import UnsubscribeCommand from './commands/Unsubscribe';
import InfoCommand from './commands/Info';

type BotEnvironment = 'production' | 'development';

type MusicBotEvents = "load" | 'buttonInteraction' | 'selectInteraction' | 'autocompleteInteraction' | 'configLoad';

interface MusicBotEventsMap extends Record<MusicBotEvents, any> {
	'load': 								discord.Client,
	'configLoad': 						IBotConfig,
	'buttonInteraction': 			DiscordButtonInteraction,
	'selectInteraction': 			DiscordSelectInteraction,
	'autocompleteInteraction': 	DiscordAutocompleteInteraction
}

export default class MusicBot {
	public 	readonly BOT_VERSION: 	string = 	'2.2.1';
	public 	readonly ENVIRONMENT: BotEnvironment;

	private 	debugger 					= debug('bp:core');

	public 	client: 					discord.Client;
	private 	rest: 					discord.REST;
	private 	commands: 				(DiscordCommand & DiscordCommandInterface)[];
	private	BOT_TOKEN:				string;
	private	CLIENT_ID:				string;

	public 	readonly config: 		BotConfig;
	public 	interactionManager: 	InteractionManager;
	private 	sessionManager: 		SessionManager;
	public 	youtubeAPI: 			YoutubeAPI;
	public 	log: 						Log;

	public 	loopingDisabled: 		boolean = 	false;

	private 	eventListners: 		Partial<Record<MusicBotEvents, ((value: any) => void)[]>> = {};


	constructor(
		BOT_TOKEN:			string,
		CLIENT_ID:	 		string,
		GOOGLE_API_KEY: 	string | undefined,
		ENVIRONMENT:		BotEnvironment
	) {
		// Init bot
		this.debugger(`Bot loaded in ${ENVIRONMENT} mode.`);
		this.debugger('Logging in');

		this.ENVIRONMENT = ENVIRONMENT;

		this.BOT_TOKEN = BOT_TOKEN;
		this.CLIENT_ID = CLIENT_ID;

		// Init managers
		this.youtubeAPI = 			new YoutubeAPI(this, GOOGLE_API_KEY);
		this.config = 					new BotConfig(this);
		this.log = 						new Log(this);
		this.interactionManager = 	new InteractionManager(this);
		this.sessionManager = 		new SessionManager(this);

		// Init bot client
		this.client = this.createClient();
		this.rest = this.createREST();

		// Init commands
		this.commands = [
			new PingCommand(this),
			new PlayCommand(this),
			new YourPhoneLingingCommand(this),
			new SkipCommand(this),
			new JoinCommand(this),
			new StopComamnd(this),
			new LoopCommand(this),
			new AdminCommand(this),
			new QueueCommand(this),
			new PauseCommand(this, 'pause', 'Zastaví přehrávání', true),
			new PauseCommand(this, 'unpause', 'Odzastaví přehrávání', false),
			new SubscribeCommand(this),
			new UnsubscribeCommand(this),
			new InfoCommand(this)
			// new ConfigCommand(this)
		];

		// On client ready
		this.client.on('ready', async () => {
			// Emit event
			this.emit('load', this.client);
			this.debugger('Bot logged in as %s.', this.client.user?.username ?? 'unknown');

			this.registerCommands();
			this.config.getDataAsync((config) => {
				try {
					// Setting developer channels and user.
					this.config.loadDeveloperVariables()
					
					// Activity
					this.client.user?.setActivity(this.ENVIRONMENT == 'production' ? 'yOuR pHOnE liNgiNg' : 'Bot running in development mode.', { type: discord.ActivityType.Custom });
				} catch (err) {
					console.error('An error occured while loading the bot.');
					console.error(err);
				}
			});

		});

		// Voice update (disconnect, connect)
		this.client.on('voiceStateUpdate', (oldState, newState) => {
			const session = this.sessionManager.getSession(newState.guild);
			if (!session) return;
			
			// Did bot leave / join
			const isBot = newState.member?.id === this.client.user?.id;
			// Is leave event?
			const isLeave = oldState.channel != null && newState.channel == null;

			// On bot disconnect
			if (isLeave && isBot)
				this.handleDisconnect(oldState, newState);

			// On user join
			if (!isLeave && !isBot) {
				const voice = session.getVoiceChannel();
				assert(voice != undefined, 'Voice channel is not defined.');

				const nonBotMembers = voice.members.filter(member => !member.user.bot);

				if (nonBotMembers.size > 1)
					session.cancelTerminationCountdown();
			}

			// On user disconnect
			if (isLeave && !isBot) {
				const voice = session.getVoiceChannel();
				assert(voice != undefined, 'Voice channel is not defined.');

				const nonBotMembers = voice.members.filter(member => !member.user.bot);

				if (nonBotMembers.size <= 1)
					session.setTerminationCountdown(5000);
			}
		});

		// Delete old cache files
		QueueCacheManager.clearOldCache();
		setInterval(() => {
			QueueCacheManager.clearOldCache();
		}, 1000 * 60 * 60);

		// Error handling
		this.client.on('error', (error) => this.handleError(error));

		// Interaction handling
		this.client.on('interactionCreate', async (interaction) => this.handleInteraction(interaction));

		// Debug
	}

	public getSessionManager() {
		return this.sessionManager;
	}

	private createClient(): discord.Client {
		const client = new discord.Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildVoiceStates
			]
		});

		client.login(this.BOT_TOKEN).catch((error) => {
			this.debugger('Failed to log in.');
			process.exit();
		})
		
		return client;
	}

	private createREST(): discord.REST {
		const rest = new discord.REST({ version: '10' }).setToken(this.BOT_TOKEN);

		return rest;
	}

	private async handleInteraction(interaction: DiscordInteraction) {
		var command = this.commands.find((command) => command.match(interaction)) ?? null;
		const session = this.sessionManager.getSession(interaction);

		if (command && !command.valid) {
			this.handleError(`Příkaz '${command.name}' není aktivní.`, interaction);
			return;
		}

		// Command
		if (interaction.isChatInputCommand()) {
			if (!command) {
				this.handleError(`Failed to recognize command "${interaction.commandName}"!`, interaction);
				return;
			}
			if (this.loopingDisabled && interaction.commandName === 'loop') {
				this.handleError(`Loop příkaz je vypnut kvůli interní chybě.`, interaction);
				return;
			}

			var execResult: boolean;
			try {
				execResult = await command.dispatch(interaction, session);
			}
			catch (error) {
				execResult = false;
				this.handleError(error, interaction);
			}

			if (execResult) {
				let session_ = (session || this.sessionManager.getSession(interaction));
				
				if (session_ && interaction.channel?.isSendable()) {
					session_.setInteractionChannel(interaction.channel);
				}

				if (session_) {
					session_.updateDate = new Date();
					session_.updatedBy = interaction.user.id;
				}
			}	
		}
		// Button
		else if (interaction.isButton()) {
			const buttonPath = this.parsePath(interaction.customId);

			if (buttonPath && (command = this.getCommand(buttonPath.commandName)) != null && command.onButton) {
				try {
					command.onButton(interaction, buttonPath, session);
				} catch (err) {
					this.handleError(err, interaction);
				}
			}

			this.emit('buttonInteraction', interaction);
		}
		// Select menu
		else if (interaction.isAnySelectMenu()) {
			const path = this.parsePath(interaction.customId);

			if (path && (command = this.getCommand(path.commandName)) != null && command.onSelect) {
				try {
					command.onSelect(interaction, path, session);
				} catch (err) {
					this.handleError(err);
				}
			}

			this.emit("selectInteraction", interaction);
		}
		// Autocomplete
		else if (interaction.isAutocomplete()) {
			if (command && command.onAutoComplete) {
				try {
					const response = await command.onAutoComplete(interaction, session);
					interaction.respond(response);
				} catch (err) {
					this.handleError(err, interaction);
				}
			}

			this.emit('autocompleteInteraction', interaction);
		}
		// Modal
		else if (interaction.isModalSubmit()) {
			const modalPath = this.parsePath(interaction.customId);

			if (modalPath && (command = this.getCommand(modalPath.commandName)) != null && command.onModal) {
				try {
					command.onModal(interaction, modalPath, session);
				} catch (err) {
					this.handleError(err, interaction);
				}
			}
		}
		// None above, but repliable
		else if (interaction.isRepliable()) {
			this.handleError('Unknown interaction.', interaction);
		}
		// Unrecognized
		else {
			this.handleError('Failed to recognize interaction.', interaction);
		}
	}

	// On bot disconnect
	private handleDisconnect(oldState: discord.VoiceState, newState: discord.VoiceState) {
		const guild = oldState.channel?.guild;
		// Destroy session
		if (guild) {
			const session = this.sessionManager.getSession(guild);

			let result: boolean;
			if (!session || !(result = this.sessionManager.destroySession(session)))
				this.handleError(new Error('Session was not found therefore couldn\'t be deleted! Risking memory leak.'));
		}
		else
			this.handleError(new Error('Guild was not provided therefore the session (if exists) was not found and deleted. Risking memory leak.'));
	}

	private async registerCommands() {
		this.debugger('Validating commands (%d)', this.commands.length);

		for (const command of this.commands) {
			const cmds = this.commands.filter(cmd => cmd.name == command.name && cmd.valid);
			if (cmds.length > 1) {
				cmds.forEach(cmd => {
					this.debugger('Duplicate command with name "%s". Invalidating the comamnd.', cmd.name);
					cmd.valid = false;
				});
			}
		}

		const parsedCommands = this.commands.filter(command => command.valid).map(command => command.getCommand());
		const stringifiedCommands = JSON.stringify(parsedCommands);

		// Skip registation if commands didnt update
		const FILE_NAME = "last-commands.json";
		try {
			const prev = await fs.readFile(FILE_NAME);
			if (stringifiedCommands === prev.toString()) {
				this.debugger('Skipping registering commands. (%d)', parsedCommands.length);
				return;
			}
		} catch {
			// No last-commands.json found, continue with registration
		}

		// Register
		try {
			this.debugger('Registering commands.');

			await this.rest.put(
				discord.Routes.applicationCommands(this.CLIENT_ID),
				{
					body: parsedCommands
				}
			);
			await fs.writeFile(FILE_NAME, stringifiedCommands, 'utf-8');

			this.debugger('Commands registered (%d).', parsedCommands.length);
		} catch (err) {
			fs.rm(FILE_NAME);
			this.handleError(err);
		}
	}

	private parsePath(path: string): ComponentPath | null {
		const match = /^bp\.cmd\.(\w+)\.(\w+)(?:\[(\w+)\])?$/.exec(path);
		if (!match) return null;

		return {
			commandName: match[1],
			action: match[3] != undefined ? match[2] : undefined,
			id: match[3] != undefined ? match[3] : match[2],
			path: path
		};
	}

	public getCommand<C extends (DiscordCommand & DiscordCommandInterface)>(name: string): C | null {
		const command = this.commands.find((cmd) => cmd.name === name && cmd.valid);
		return command as C || null;
	}

	/**
	 * Handles an object Error or string error.
	 * Replies to the interaction, follows up, or send a completely new message.
	 * If none of the methods work, sends the error to console
	 */
	public async handleError(error: any, interaction?: DiscordInteraction) {
		const embed = this.interactionManager.generateErrorEmbed(error, { interaction: interaction });
		await this.interactionManager.respond(interaction, [embed], { devChannelFallback: true, ephermal: true });
	}

	/**
	 * Register event listener
	 */
	public on<KEY extends MusicBotEvents>(event: KEY, execute: (value: MusicBotEventsMap[KEY]) => void) {
		if (!this.eventListners[event])
			this.eventListners[event] = [];

		this.eventListners[event].push(execute);
	}
	/**
	 * Trigger event listener
	 */
	public emit<KEY extends MusicBotEvents>(event: KEY, value: MusicBotEventsMap[KEY]) {
		if (!this.eventListners[event]) return;

		this.eventListners[event].forEach((callback) => callback(value));
	}
}