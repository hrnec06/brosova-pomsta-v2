import deepmerge from "deepmerge";
import MusicBot from "../MusicBot";
import discord from 'discord.js';
import fs from 'fs';
import moment from "moment";
import debug from "debug";
import FileSystem from "../utils/FileSystem";

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

export default class BotConfig extends FileSystem<IBotConfig> {
	private readonly PRODUCTION_DIR: keyof IBotConfig 		= 'production';
	private readonly DEVELOPMENT_DIR: keyof IBotConfig 	= 'development';
	private readonly BOT_DIR: keyof IBotConfig 				= 'bot';

	public developerChannel?: discord.SendableChannels;
	public developerGuild?: discord.Guild;
	public developerUser?: discord.User;

	private oldVersion?: string;

	constructor(client: MusicBot) {
		super('config.json', client, {
			generateOldFile: true,
			debugger: debug('bp:config')
		});
	}

	public isNewVersion() {
		return this.oldVersion !== this.client.BOT_VERSION;
	}

	public getDefaultData(client: MusicBot): IBotConfig {
		return {
			version: client.BOT_VERSION,
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

	public validateContent(jsonContent: any): boolean {
		const check = (key: string) => {
			const valid = key in jsonContent;
			if (!valid)
				this.debugger(`ERROR: '%s' not found in '%s'`, key, this.fileName);

			return valid;
		}

		// validation
		if (!check('version')) {
			return false;
		}
		else if (!check(this.DEVELOPMENT_DIR)) {
			return false;
		}
		else if (!check(this.PRODUCTION_DIR)) {
			return false;
		}
		else if (!check(this.BOT_DIR)) {
			return false;
		}

		return true;
	}

	public getSystem(): IBotConfigSystem {
		return this.getData()[this.client.ENVIRONMENT];
	}
	public getSystemAsync(callback: (config: IBotConfigSystem) => void) {
		this.getDataAsync((config) => callback(config[this.client.ENVIRONMENT]));
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