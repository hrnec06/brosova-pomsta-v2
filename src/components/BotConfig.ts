import deepmerge from "deepmerge";
import MusicBot from "../MusicBot";
import discord from 'discord.js';
import fs from 'fs';
import moment from "moment";
import debug from "debug";

type AppEnvironment = 'production' | 'development';

export interface IBotConfig {
	version: string,
	production: IBotConfigSystem,
	development: IBotConfigSystem,
	bot: {
		bannedItems: IBotConfigBannedItem[],
		volumeShift: number
	}
}

interface IBotConfigSystem {
	developerChannelID: string,
	developerUserID: string,
	developerGuildID: string,
	errorLogging: boolean,
	debugLogging: boolean,
	maxLogFiles: number
}

interface IBotConfigBannedItem {
	userID: string,
	type: 'video' | 'playlist',
	id: string
}

export default class BotConfig {
	private readonly CONFIG_DIRECTORY: string 				= 'bot-config.json';
	private readonly PRODUCTION_DIR: keyof IBotConfig 		= 'production';
	private readonly DEVELOPMENT_DIR: keyof IBotConfig 	= 'development';
	private readonly BOT_DIR: keyof IBotConfig 				= 'bot';

	private debugger													= debug('bp:config');

	public developerChannel?: discord.SendableChannels;
	public developerGuild?: discord.Guild;
	public developerUser?: discord.User;

	private config: IBotConfig;
	private configLoaded: boolean 								= false;
	private oldVersion?: string;

	constructor(private client: MusicBot) {
		this.config = this.getDefaultConfig();

		if (!this.CONFIG_DIRECTORY.endsWith('.json')) {
			this.debugger('CONFIG_DIRECTORY must be in JSON format! Automatically correcting the mistake.');
			this.CONFIG_DIRECTORY = this.CONFIG_DIRECTORY + '.json';
			this.debugger('CONFIG_DIRECTORY set to %s', this.CONFIG_DIRECTORY);
		}

		this.loadConfig()
			.then(config => {
				this.config = config;
				this.configLoaded = true;
				this.client.emit('configLoad', config);
			})
			.catch((err) => {
				client.handleError(err);
			});
	}

	private async createConfig(config?: IBotConfig) {
		this.debugger('Creating a new configuration file.');

		try {
			if (fs.existsSync(this.CONFIG_DIRECTORY)) {
				this.debugger('Renaming old configuration file.');
				const newName = this.CONFIG_DIRECTORY.replace(/\.json$/, `.${moment().format('HH-mm-ss DD-MM-YYYY')}.old.json`);
				await fs.promises.rename(this.CONFIG_DIRECTORY, newName);
			}
		} catch (err) {
			this.debugger('Failed to rename the old configuratiion file.');
			throw err;
		}

		try {
			await fs.promises.writeFile(this.CONFIG_DIRECTORY, JSON.stringify(config || this.getDefaultConfig()), { encoding: 'utf-8' });
		} catch (err) {
			this.debugger('Failed to create a new configuration file.');
			throw err;
		}

		if (!fs.existsSync(this.CONFIG_DIRECTORY))
			throw 'New configuration file not detected!';

		return;
	}

	private async saveConfig(config: IBotConfig) {
		this.debugger('Saving configuration file.');

		try {
			if (!fs.existsSync(this.CONFIG_DIRECTORY)) {
				await this.createConfig(config);
				this.debugger("Configuration file doesn't exist! Creating a new one.");
				return;
			}
			await fs.promises.writeFile(this.CONFIG_DIRECTORY, JSON.stringify(config), {encoding: 'utf-8'});
		} catch (err) {
			this.debugger('Configuration save failed!');
			throw err;
		}

		this.debugger('Save completed.');
	}

	private async loadConfig(): Promise<IBotConfig> {
		this.debugger('Loading configuration.');
		
		var config: IBotConfig;

		try {
			if (fs.existsSync(this.CONFIG_DIRECTORY)) {
				this.debugger('Configuration file detected!.');

				const configRaw = await fs.promises.readFile(this.CONFIG_DIRECTORY);
				const configJson = JSON.parse(configRaw.toString());
	
				var ok = true;

				// validation
				if (!('version' in configJson)) {
					this.debugger('ERROR: \'version\' not found in config..');
					ok = false;
				}
				else if (!('environment' in configJson)) {
					this.debugger(`ERROR: 'environment' not found in config.`);
					ok = false;
				}
				else if (!(this.DEVELOPMENT_DIR in configJson)) {
					this.debugger(`ERROR: '${this.DEVELOPMENT_DIR}' not found in config.`);
					ok = false;
				}
				else if (!(this.PRODUCTION_DIR in configJson)) {
					this.debugger(`ERROR: '${this.PRODUCTION_DIR}' not found in config.`);
					ok = false;
				}
				else if (!(this.BOT_DIR in configJson)) {
					this.debugger(`ERROR: '${this.BOT_DIR}' not found in config.`);
					ok = false;
				}

				if (ok) {
					config = deepmerge(this.getDefaultConfig(), configJson);

					this.oldVersion = config.version;

					if (config.version !== this.client.BOT_VERSION) {
						this.debugger('Older configuration version detected (%s)! Saving the upgraded file.', config.version);
						config.version = this.client.BOT_VERSION;
					}

					if (JSON.stringify(config) !== JSON.stringify(configJson))
						await this.saveConfig(config);
				}
				else {
					await this.createConfig();
					this.debugger(`New configuration file ${this.CONFIG_DIRECTORY} successfully created.`);
					config = this.getDefaultConfig();
				}
			}
			else {
				this.debugger(`Configuration file not found!`);
				await this.createConfig();
				this.debugger(`New configuration file ${this.CONFIG_DIRECTORY} successfully created.`);
				config = this.getDefaultConfig();
			}
		} catch (err) {
			this.debugger('Configuration failed to load. Using default config.');
			console.error(err);
			config = this.getDefaultConfig();
		}

		this.debugger('Configration file successfully loaded!');

		return config;
	}

	public isNewVersion() {
		return this.oldVersion !== this.client.BOT_VERSION;
	}

	private getDefaultConfig(): IBotConfig {
		return {
			version: this.client.BOT_VERSION,
			bot: {
				bannedItems: [],
				volumeShift: 0
			},
			production: {
				developerChannelID: '1292190183646564363',
				developerUserID: '470952100726308864',
				developerGuildID: '1071785981923053588',
				errorLogging: true,
				debugLogging: true,
				maxLogFiles: 1
			},
			development: {
				developerChannelID: '1292190183646564363',
				developerUserID: '470952100726308864',
				developerGuildID: '1071785981923053588',
				errorLogging: true,
				debugLogging: true,
				maxLogFiles: 20
			}
		}
	}

	public getConfigAsync(callback: (config: IBotConfig) => void) {
		if (this.configLoaded)
			callback(this.config);
		else
			this.client.on('configLoad', (value) => callback(value));
	}

	public getConfig(): IBotConfig {
		return this.config;
	}

	public getSystem(): IBotConfigSystem {
		return this.config[this.client.ENVIRONMENT];
	}
	public getSystemAsync(callback: (config: IBotConfigSystem) => void) {
		this.getConfigAsync((config) => callback(config[this.client.ENVIRONMENT]));
	}

	public async loadDeveloperVariables() {
		const developerChannel = await this.client.client.channels.fetch(this.getSystem().developerChannelID);
		if (!developerChannel) {
			this.debugger(`Developer channel ID ${this.getSystem().developerChannelID} wasn't found.`);
		}
		else if (!developerChannel.isSendable()) {
			this.debugger(`Specified developer channel is not sendable.`);
		}
		else {
			this.developerChannel = developerChannel;
		}

		this.developerGuild = await this.client.client.guilds.fetch(this.getSystem().developerGuildID);
		if (!this.developerGuild) {
			this.debugger(`Developer guild ID ${this.getSystem().developerGuildID} wasn't found.`);
		}

		this.developerUser = await this.client.client.users.fetch(this.getSystem().developerUserID);
		if (!this.developerUser) {
			this.debugger(`Developer user ID ${this.getSystem().developerGuildID} wasn't found.`);
		}
	}
}