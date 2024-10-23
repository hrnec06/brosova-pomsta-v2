import deepmerge from "deepmerge";
import MusicBot from "./MusicBot";
import discord from 'discord.js';
import fs from 'fs';
import moment from "moment";

export interface IBotConfig {
	version: string,
	system: IBotConfigSystem,
	bot: {
		bannedItems: IBotConfigBannedItem[],
		volumeShift: number
	}
}

interface IBotConfigSystem {
	developerChannelID: string,
	developerUserID: string,
	developerGuildID: string,
	errorLogging: boolean
}

interface IBotConfigBannedItem {
	userID: string,
	type: 'video' | 'playlist',
	id: string
}

export default class BotConfig {
	private readonly CONFIG_DIRECTORY: string = 'bot-config.json';
	private readonly SYSTEM_DIR: keyof IBotConfig = 'system';
	private readonly BOT_DIR: keyof IBotConfig = 'bot';
	private readonly CONFIG_VERSION: string = '1.1.1';

	public developerChannel?: discord.SendableChannels;
	public developerGuild?: discord.Guild;
	public developerUser?: discord.User;

	private config: IBotConfig;

	constructor(private client: MusicBot) {
		this.config = this.defaultConfig();

		if (!this.CONFIG_DIRECTORY.endsWith('.json')) {
			console.warn('CONFIG_DIRECTORY must end with .json! Automatically correcting the mistake.');
			this.CONFIG_DIRECTORY = this.CONFIG_DIRECTORY + '.json';
		}

		this.loadConfig()
			.then(config => {
				this.config = config;
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
			await fs.promises.writeFile(this.CONFIG_DIRECTORY, JSON.stringify(config || this.defaultConfig()), { encoding: 'utf-8' });
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

				if (!('version' in configJson)) {
					console.warn(`ERROR: 'version' not found in config.`);
					ok = false;
				}
				else if (!(this.SYSTEM_DIR in configJson)) {
					console.warn(`ERROR: '${this.SYSTEM_DIR}' not found in config.`);
					ok = false;
				}
				else if (!(this.BOT_DIR in configJson)) {
					console.warn(`ERROR: '${this.BOT_DIR}' not found in config.`);
					ok = false;
				}

				if (ok) {
					config = deepmerge(this.defaultConfig(), configJson);

					if (config.version !== this.CONFIG_VERSION) {
						console.log(`Older configuration version detected! Saving the upgraded file.`);
						config.version = this.CONFIG_VERSION;
						await this.saveConfig(config);
					}
				}
				else {
					await this.createConfig();
					console.log(`New configuration file ${this.CONFIG_DIRECTORY} successfully created.`);
					config = this.defaultConfig();
				}
			}
			else {
				console.warn('Configuration file not found!');
				await this.createConfig();
				console.log(`New configuration file ${this.CONFIG_DIRECTORY} successfully created.`);
				config = this.defaultConfig();
			}
		} catch (err) {
			console.error('Configuration failed to load. Using default config.');
			console.error(err);
			config = this.defaultConfig();
		}

		console.log('Configration file successfully loaded!\n');

		return config;
	}

	private defaultConfig(): IBotConfig {
		return {
			version: this.CONFIG_VERSION,
			bot: {
				bannedItems: [],
				volumeShift: 0
			},
			system: {
				developerChannelID: '1292190183646564363',
				developerUserID: '470952100726308864',
				developerGuildID: '1071785981923053588',
				errorLogging: true
			}
		}
	}

	public getConfigAsync(callback: (config: IBotConfig) => void) {
		if (this.config)
			callback(this.config);
		else
			this.client.on('configLoad', (value) => callback(value));
	}

	public getConfig(): IBotConfig {
		return this.config;
	}

	public loadDeveloperTools() {
		const developerChannel = this.client.client.channels.cache.get(this.config.system.developerChannelID);
		if (!developerChannel) {
			console.warn(`Developer channel ID ${this.config.system.developerChannelID} wasn't found.`);
		}
		else if (!developerChannel.isSendable()) {
			console.warn(`Specified developer channel is not sendable.`);
		}
		else {
			this.developerChannel = developerChannel;
		}

		this.developerGuild = this.client.client.guilds.cache.get(this.config.system.developerGuildID);
		if (!this.developerGuild) {
			console.warn(`Developer guild ID ${this.config.system.developerGuildID} wasn't found.`);
		}

		this.developerUser = this.client.client.users.cache.get(this.config.system.developerUserID);
		if (!this.developerUser) {
			console.warn(`Developer user ID ${this.config.system.developerGuildID} wasn't found.`);
		}
	}
}