import discord, { ActionRowBuilder, ButtonBuilder, ButtonStyle, GatewayIntentBits } from 'discord.js';
import DiscordCommand, { DiscordCommandInterface } from './model/commands';
import InteractionManager from './components/InteractionManager';
import SessionManager from './components/SessionManager';
import fs from 'fs/promises';
import PingCommand from './commands/Ping';
import PlayCommand from './commands/Play';
import ConfigCommand from './commands/Config';
import deepmerge from 'deepmerge';
import Utils from './utils';
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

type MusicBotEvents = "load" | 'buttonInteraction' | 'stringSelectInteraction' | 'autocompleteInteraction' | 'configLoad';

interface MusicBotEventsMap extends Record<MusicBotEvents, any> {
	'load': 								discord.Client,
	'configLoad': 						IBotConfig,
	'buttonInteraction': 			discord.ButtonInteraction<discord.CacheType>,
	'stringSelectInteraction': 	discord.StringSelectMenuInteraction<discord.CacheType>,
	'autocompleteInteraction': 	discord.AutocompleteInteraction<discord.CacheType>
}

export default class MusicBot {
	public readonly BOT_VERSION: 	string = 	'1.1.1';

	public 	client: 					discord.Client;
	private 	rest: 					discord.REST;
	private 	commands: 				(DiscordCommand & DiscordCommandInterface)[];

	public 	readonly config: 		BotConfig;
	public 	interactionManager: 	InteractionManager;
	private 	sessionManager: 		SessionManager;
	public 	youtubeAPI: 			YoutubeAPI;
	public 	log: 						Log;

	public 	loopingDisabled: 		boolean = 	false;

	private 	eventListners: 		Partial<Record<MusicBotEvents, ((value: any) => void)[]>> = {};


	constructor(
		private BOT_TOKEN: 		string,
		private CLIENT_ID:	 	string,
		GOOGLE_API_KEY: 			string | undefined
	) {
		// Init bot
		const BOT_LOAD_START = Date.now();
		console.log("Loggin in...");

		// Init managers
		this.youtubeAPI = 			new YoutubeAPI(this, GOOGLE_API_KEY);
		this.config = 					new BotConfig(this);
		this.log = 						new Log(this);
		this.interactionManager = 	new InteractionManager(this);
		this.sessionManager = 		new SessionManager(this);

		// Init bot client
		this.client = this.createClient();
		this.rest = this.createREST();

		this.commands = [
			new PingCommand(this),
			new PlayCommand(this),
			new YourPhoneLingingCommand(this),
			new SkipCommand(this),
			new JoinCommand(this),
			new StopComamnd(this),
			new LoopCommand(this),
			new AdminCommand(this)
			// new ConfigCommand(this)
		];

		// On client ready
		this.client.on('ready', async () => {
			// Emit event
			this.emit('load', this.client);
			console.log(`\n\nBot logged-in as ${this.client.user?.username} after ${((Date.now() - BOT_LOAD_START) / 1000).toFixed(2)}s.`);

			this.registerCommands();
			this.config.getConfigAsync((config) => {
				try {
					// Setting developer channels and user.
					this.config.loadDeveloperVariables()
					
					// Activity
					this.client.user?.setActivity(config.environment == 'production' ? 'yOuR pHOnE liNgiNg' : 'Bot running in development mode.', { type: discord.ActivityType.Custom });
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

			console.log(isLeave, isBot);

			// On bot disconnect
			if (isLeave && isBot)
				this.handleDisconnect(oldState, newState);

			// On user join
			if (!isLeave && !isBot) {
				const voice = session.getVoiceChannel();
				assert(voice != undefined, 'Voice channel is not defined.');

				if (voice.members.size > 1)
					session.cancelTerminationCountdown();
			}

			// On user disconnect
			if (isLeave && !isBot) {
				const voice = session.getVoiceChannel();
				assert(voice != undefined, 'Voice channel is not defined.');

				if (voice.members.size <= 1)
					session.setTerminationCountdown(5000);
			}
		});


		this.client.on('error', (error) => this.handleError(error));
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
			console.error('Login failed!');
			process.exit();
		})

		return client;
	}
	private createREST(): discord.REST {
		const rest = new discord.REST({ version: '10' }).setToken(this.BOT_TOKEN);

		return rest;
	}

	private async handleInteraction(interaction: DiscordInteraction) {
		const command = this.commands.find((command) => command.match(interaction));
		const session = this.sessionManager.getSession(interaction);

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
			this.emit('buttonInteraction', interaction);
			this.handleError('Buttons are not supported!', interaction);
		}
		// Select menu
		else if (interaction.isStringSelectMenu()) {
			this.emit("stringSelectInteraction", interaction);
		}
		// Autocomplete
		else if (interaction.isAutocomplete()) {
			if (command && command.onAutoComplete)
				command.onAutoComplete(interaction, session);

			this.emit('autocompleteInteraction', interaction);
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
		const parsedCommands = this.commands.map(command => command.getCommand());
		const stringifiedCommands = JSON.stringify(parsedCommands);

		// Skip registation if commands didnt update
		const FILE_NAME = "last-commands.json";
		try {
			const prev = await fs.readFile(FILE_NAME);
			if (stringifiedCommands === prev.toString()) {
				console.log(`Skipping registering commands. (${parsedCommands.length})`);
				return;
			}
		} catch {
			// No last-commands.json found, continue with registration
		}

		// Register
		try {
			console.log("Registering commands...");

			await this.rest.put(
				discord.Routes.applicationCommands(this.CLIENT_ID),
				{
					body: parsedCommands
				}
			);
			await fs.writeFile(FILE_NAME, stringifiedCommands, 'utf-8');

			console.log(`Commands Registered (${parsedCommands.length}).`);
		} catch (err) {
			fs.rm(FILE_NAME);
			this.handleError(err);
		}
	}

	public getCommand<C extends (DiscordCommand & DiscordCommandInterface)>(name: string): C | null {
		const command = this.commands.find((cmd) => cmd.name === name);
		return command as C || null;
	}

	/**
	 * Handles an object Error or string error.
	 * Replies to the interaction, follows up, or send a completely new message.
	 * If none of the methods work, sends the error to console
	 */
	public async handleError(error: any, interaction?: DiscordInteraction) {
		const embed = this.interactionManager.generateErrorEmbed(error, { interaction: interaction });
		console.log(error, interaction);
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