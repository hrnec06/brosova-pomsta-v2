import discord, { ActionRowBuilder, ButtonBuilder, ButtonStyle, GatewayIntentBits } from 'discord.js';
import DiscordCommand, { DiscordCommandInterface } from './model/commands';
import InteractionManager from './interactionManager';
import SessionManager from './sessionManager';
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
import DebugCommand from './commands/Debug';
import assert from 'node:assert';
import BotConfig, { IBotConfig } from './BotConfig';

type MusicBotEvents = "load" | 'buttonInteraction' | 'stringSelectInteraction' | 'configLoad';

interface MusicBotEventsMap extends Record<MusicBotEvents, any> {
	'load': discord.Client,
	'configLoad': IBotConfig,
	'buttonInteraction': discord.ButtonInteraction<discord.CacheType>,
	'stringSelectInteraction': discord.StringSelectMenuInteraction<discord.CacheType>
}

export default class MusicBot {
	public client: discord.Client;
	private rest: discord.REST;
	private commands: (DiscordCommand & DiscordCommandInterface)[];

	private interactionManager: InteractionManager;
	private sessionManager: SessionManager;
	public youtubeAPI: YoutubeAPI;

	public loopingDisabled: boolean = false;

	private eventListners: Partial<Record<MusicBotEvents, ((value: any) => void)[]>> = {};

	private readonly botConfig: BotConfig;

	constructor(
		private BOT_TOKEN: string,
		private CLIENT_ID: string,
		GOOGLE_API_KEY: string | undefined
	) {
		const BOT_LOAD_START = Date.now();
		console.log("Loggin in...");

		this.youtubeAPI = new YoutubeAPI(this, GOOGLE_API_KEY);

		this.client = this.createClient();
		this.rest = this.createREST();

		this.botConfig = new BotConfig(this);

		this.commands = [
			new PingCommand(this),
			new PlayCommand(this),
			new YourPhoneLingingCommand(this),
			new SkipCommand(this),
			new JoinCommand(this),
			new StopComamnd(this),
			new LoopCommand(this),
			new DebugCommand(this)
			// new ConfigCommand(this)
		];

		this.interactionManager = new InteractionManager(this);
		this.sessionManager = new SessionManager(this);

		this.client.on('ready', async () => {
			this.emit('load', this.client);
			console.log(`\n\nBot logged-in as ${this.client.user?.username} after ${((Date.now() - BOT_LOAD_START) / 1000).toFixed(2)}s.`);

			try {
				this.client.user?.setActivity('yOuR pHOnE liNgiNg', { type: discord.ActivityType.Custom });
			} catch (err) {
				console.error('An error occured while loading the bot.');
				console.error(err);
			}

			this.registerCommands();
		});

		this.client.on('voiceStateUpdate', (oldState, newState) => {
			const session = this.sessionManager.getSession(newState.guild);
			if (!session || !session.isJoined()) return;

			if (!newState.channel && newState.member?.id === this.client.user?.id) {
				this.handleDisconnect(oldState, newState);
			}

			if (!newState.channel && newState.member?.id !== this.client.user?.id) {
				const voice = session.getVoiceChannel();
				assert(voice != undefined, 'Voice channel is not defined.');

				if (voice.members.size <= 1) {
					// Start the countdown
					session.setTerminationCountdown(5000);
				}
			}
		});


		this.client.on('error', (error) => this.handleError(error));
		this.client.on('interactionCreate', async (interaction) => this.handleInteraction(interaction));
	}

	public getInteractionManager() {
		return this.interactionManager;
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
		if (interaction.isChatInputCommand()) {
			if (this.loopingDisabled && interaction.commandName === 'loop') {
				this.handleError(`Loop příkaz je vypnut kvůli interní chybě.`, interaction);
				return;
			}

			const command = this.commands.find((command) => command.match(interaction));
			if (!command) {
				this.handleError(`Failed to recognize command "${interaction.commandName}"!`, interaction);
				return;
			}

			var session = this.sessionManager.getSession(interaction);

			if (await command.dispatch(interaction, session) && interaction.channel?.isSendable())
				(session || this.sessionManager.getSession(interaction))?.setInteractionChannel(interaction.channel);
				
		}
		else if (interaction.isButton()) {
			this.emit('buttonInteraction', interaction);
			this.handleError('Buttons are not supported!', interaction);
		}
		else if (interaction.isStringSelectMenu()) {
			this.emit("stringSelectInteraction", interaction);
		}
		else if (interaction.isRepliable()) {
			this.handleError('Unknown interaction.', interaction);
		}
		else {
			this.handleError('Failed to recognize interaction.', interaction);
		}
	}

	private handleDisconnect(oldState: discord.VoiceState, newState: discord.VoiceState) {
		const guild = oldState.channel?.guild;
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

		const FILE_NAME = "last-commands.json";
		try {
			const prev = await fs.readFile(FILE_NAME);
			if (stringifiedCommands === prev.toString()) {
				console.log(`Skipping registering commands. (${parsedCommands.length})`);
				return;
			}
		} catch {
		}

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

	public handleError(error: any, interaction?: DiscordInteraction) {
		const embed = this.interactionManager.generateErrorEmbed(error, { interaction: interaction });

		if (interaction && interaction.isRepliable() && !interaction.replied) {
			if (interaction.deferred) {
				interaction.followUp({ embeds: [embed], ephemeral: true });
			} else {
				interaction.reply({ embeds: [embed], ephemeral: true });
			}
		}
		else if (interaction && interaction.channel && interaction.channel.isSendable()) {
			interaction.channel.send({ embeds: [embed] });
		}
		else if (this.botConfig.developerChannel) {
			this.botConfig.developerChannel.send({ embeds: [embed] });
		}
		else {
			console.error(error);
		}
	}

	public on<KEY extends MusicBotEvents>(event: KEY, execute: (value: MusicBotEventsMap[KEY]) => void) {
		if (!this.eventListners[event])
			this.eventListners[event] = [];

		this.eventListners[event].push(execute);
	}

	public emit<KEY extends MusicBotEvents>(event: KEY, value: MusicBotEventsMap[KEY]) {
		if (!this.eventListners[event]) return;

		this.eventListners[event].forEach((callback) => callback(value));
	}
}