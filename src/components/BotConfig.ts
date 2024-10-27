import deepmerge from "deepmerge";
import MusicBot from "../MusicBot";
import discord from 'discord.js';
import fs from 'fs';
import moment from "moment";

type AppEnvironment = 'production' | 'development';

export interface IBotConfig {
	version: string,
	environment: AppEnvironment,
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
	private readonly CONFIG_DIRECTORY: string = 'bot-config.json';
	private readonly PRODUCTION_DIR: keyof IBotConfig = 'production';
	private readonly DEVELOPMENT_DIR: keyof IBotConfig = 'development';
	private readonly BOT_DIR: keyof IBotConfig = 'bot';

	public developerChannel?: discord.SendableChannels;
	public developerGuild?: discord.Guild;
	public developerUser?: discord.User;

	private config: IBotConfig;
	private configLoaded: boolean = false;

	constructor(private client: MusicBot) {
		this.config = this.getDefaultConfig();

		if (!this.CONFIG_DIRECTORY.endsWith('.json')) {
			console.warn('CONFIG_DIRECTORY must end with .json! Automatically correcting the mistake.');
			this.CONFIG_DIRECTORY = this.CONFIG_DIRECTORY + '.json';
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
		console.log('Creating a new configuration file.');

		try {
			if (fs.existsSync(this.CONFIG_DIRECTORY)) {
				console.log('Renaming old configuration file...');
				const newName = this.CONFIG_DIRECTORY.replace(/\.json$/, `.${moment().format('HH-mm-ss DD-MM-YYYY')}.old.json`);
				await fs.promises.rename(this.CONFIG_DIRECTORY, newName);
			}
		} catch (err) {
			console.error('Failed to rename the old configuratuion file.');
			throw err;
		}

		try {
			await fs.promises.writeFile(this.CONFIG_DIRECTORY, JSON.stringify(config || this.getDefaultConfig()), { encoding: 'utf-8' });
		} catch (err) {
			console.error('Failed to create a new configuration file.');
			throw err;
		}

		if (!fs.existsSync(this.CONFIG_DIRECTORY))
			throw 'New configuration file not detected!';

		return;
	}

	private async saveConfig(config: IBotConfig) {
		console.log('Saving config.');

		try {
			if (!fs.existsSync(this.CONFIG_DIRECTORY)) {
				await this.createConfig(config);
				console.error("Configuration file doesn't exist! Creating a new one.");
				return;
			}
			await fs.promises.writeFile(this.CONFIG_DIRECTORY, JSON.stringify(config), {encoding: 'utf-8'});
		} catch (err) {
			console.error('Configuration save failed!');
			throw err;
		}

		console.log('Save complete.');
	}

	private async loadConfig(): Promise<IBotConfig> {
		console.log('Loading configuration.');
		
		var config: IBotConfig;

		try {
			if (fs.existsSync(this.CONFIG_DIRECTORY)) {
				console.log('Configuration file detected.')

				const configRaw = await fs.promises.readFile(this.CONFIG_DIRECTORY);
				const configJson = JSON.parse(configRaw.toString());
	
				var ok = true;

				// validation
				if (!('version' in configJson)) {
					console.warn(`ERROR: 'version' not found in config.`);
					ok = false;
				}
				else if (!('environment' in configJson)) {
					console.warn(`ERROR: 'environment' not found in config.`);
					ok = false;
				}
				else if (configJson.environment !== 'development' && configJson.environment !== 'production') {
					console.warn(`ERROR: 'environment' must be either 'development' or 'production'`);
					ok = false;
				}
				else if (!(this.DEVELOPMENT_DIR in configJson)) {
					console.warn(`ERROR: '${this.DEVELOPMENT_DIR}' not found in config.`);
					ok = false;
				}
				else if (!(this.PRODUCTION_DIR in configJson)) {
					console.warn(`ERROR: '${this.PRODUCTION_DIR}' not found in config.`);
					ok = false;
				}
				else if (!(this.BOT_DIR in configJson)) {
					console.warn(`ERROR: '${this.BOT_DIR}' not found in config.`);
					ok = false;
				}

				if (ok) {
					config = deepmerge(this.getDefaultConfig(), configJson);

					if (config.version !== this.client.BOT_VERSION) {
						console.log(`Older configuration version detected! Saving the upgraded file.`);
						config.version = this.client.BOT_VERSION;
					}

					if (JSON.stringify(config) !== JSON.stringify(configJson))
						await this.saveConfig(config);
				}
				else {
					await this.createConfig();
					console.log(`New configuration file ${this.CONFIG_DIRECTORY} successfully created.`);
					config = this.getDefaultConfig();
				}
			}
			else {
				console.warn('Configuration file not found!');
				await this.createConfig();
				console.log(`New configuration file ${this.CONFIG_DIRECTORY} successfully created.`);
				config = this.getDefaultConfig();
			}
		} catch (err) {
			console.error('Configuration failed to load. Using default config.');
			console.error(err);
			config = this.getDefaultConfig();
		}

		console.log('Configration file successfully loaded!\n');

		return config;
	}

	private getDefaultConfig(): IBotConfig {
		return {
			version: this.client.BOT_VERSION,
			bot: {
				bannedItems: [],
				volumeShift: 0
			},
			environment: 'development',
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

	public getEnvironment(): AppEnvironment {
		return this.getConfig().environment;
	}
	public getEnvironmentAsync(callback: (config: AppEnvironment) => void) {
		this.getConfigAsync((config) => callback(config.environment));
	}
	public getSystem(): IBotConfigSystem {
		return this.config[this.config.environment];
	}
	public getSystemAsync(callback: (config: IBotConfigSystem) => void) {
		this.getConfigAsync((config) => callback(config[config.environment]));
	}

	public loadDeveloperVariables() {
		const developerChannel = this.client.client.channels.cache.get(this.getSystem().developerChannelID);
		if (!developerChannel) {
			console.warn(`Developer channel ID ${this.getSystem().developerChannelID} wasn't found.`);
		}
		else if (!developerChannel.isSendable()) {
			console.warn(`Specified developer channel is not sendable.`);
		}
		else {
			this.developerChannel = developerChannel;
		}

		this.developerGuild = this.client.client.guilds.cache.get(this.getSystem().developerGuildID);
		if (!this.developerGuild) {
			console.warn(`Developer guild ID ${this.getSystem().developerGuildID} wasn't found.`);
		}

		this.developerUser = this.client.client.users.cache.get(this.getSystem().developerUserID);
		if (!this.developerUser) {
			console.warn(`Developer user ID ${this.getSystem().developerGuildID} wasn't found.`);
		}
	}
}