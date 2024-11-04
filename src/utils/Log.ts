import moment from "moment";
import MusicBot from "../MusicBot";
import fs, { WriteStream } from 'fs';
import assert from "node:assert";
import discord from 'discord.js';
import Utils from ".";
import { debug } from "debug";

type LogDataPrimitive = string | boolean | number;
interface LogDataObject {
	[key: string | number | symbol]: LogDataPrimitive | LogDataObject | LogDataArray | LogDataExtra
}
type LogDataArray = Array<LogDataPrimitive | LogDataObject | LogDataArray | LogDataExtra>;

type LogDataExtra = discord.BaseInteraction | Error | undefined | null;

type LogDataAdvanced = LogDataPrimitive | LogDataArray | LogDataObject | LogDataExtra;



interface LogEntry {
	label: string,
	data: LogDataAdvanced
}

export default class Log {
	private readonly MAX_LOG_FILES: number = 		1;
	private readonly LOG_DIR: string = 				'logs/';
	private readonly LOG_FILE_FORMAT: string = 	'[date].log';

	private debugger 										= debug('bp:log');

	private ready: boolean 								= false;
	private error: boolean 								= false;

	private stack: LogEntry[] 							= [];

	private stream?: WriteStream;

	constructor(private client: MusicBot) {
		this.MAX_LOG_FILES = Math.max(this.MAX_LOG_FILES - 1, 0);

		this.client.config.getConfigAsync(async (config) => {
			const logEnabled = this.client.config.getSystem().debugLogging;

			this.debugger('State: %s', logEnabled ? 'enabled' : 'disabled');

			if (!logEnabled) {
				this.error = true;
				return;
			}
			const result = await this.removeOldLogs();
			if (!result)
				return;

			this.stream = this.openLogFile();
			this.ready = this.stream != undefined;

			if (this.stream && this.stack.length) {
				this.stack.forEach(item => this.write(item.label, item.data));
			}
		});
	}

	private parseDate(date: string): Date | null {
		const match = /^(\d+)-(\d{2})-(\d{2})\.(\d{2})-(\d{2})-(\d{2})\.log$/.exec(date);
		if (!match) return null;
		return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`);
	}

	private async removeOldLogs(): Promise<boolean> {
		try {
			let files = (await fs.promises.readdir(this.LOG_DIR)).sort((a, b) => {
				const dateA = this.parseDate(a);
				const dateB = this.parseDate(b);

				if (dateA == null) return 1;
				if (dateB == null) return -1;
				
				return dateB.getTime() - dateA.getTime();
			});

			const toDelete = files.length - this.MAX_LOG_FILES;
			if (toDelete > 0) {
				var deleted = 0;
				this.debugger('Deleting %d old log files!', toDelete);
				for (let i = this.MAX_LOG_FILES; i < files.length; i++) {
					const file = files[i];
					try {
						await fs.promises.rm(this.LOG_DIR + file);
						deleted++;
					}
					catch {
						this.debugger('Failed to delete file "%s"', file);
					}
				}
				this.debugger('Successfully deleted %d/%d files.', deleted, toDelete);
			}

			return true;
		} catch (err) {
			this.debugger('Failed to delete old log files.');
			this.error = true;
			this.client.handleError(err);
		}
		return false;
	}

	private openLogFile() {
		if (!fs.existsSync(this.LOG_DIR)) {
			fs.mkdirSync(this.LOG_DIR);
		}

		try {
			const date = moment().format('YYYY-MM-DD.HH-mm-ss');
			const name = this.LOG_FILE_FORMAT.replace(/\[date\]/g, date);

			return fs.createWriteStream(this.LOG_DIR + name, {autoClose: true, encoding: 'utf-8'});
		} catch (err) {
			this.error = true;
			this.client.handleError(err);
		}
	}

	public write(label: string, ...data: LogDataAdvanced[]) {
		if (this.error) return;
		if (!this.ready) {
			this.stack.push({
				label,
				data
			});
			return;
		}

		assert(this.stream !== undefined, 'Log stream is undefined.');

		const date = moment().format('HH:mm:ss DD-MM-YYYY');
		var builder = `${date}\n${label}: `;

		var stack: string[] = [];
		for (const item of data) {
			const str = this.convertData(item);
			stack.push(str);
		}

		const stackStr = stack.join('\n');
		if (!stackStr.indexOf('\n')) {
			builder += stackStr;
		}
		else {
			builder += '\n' + stackStr;
		}

		builder += '\n\n';

		return this.stream.write(builder);
	}


	private convertData(data: LogDataAdvanced): string {
		try {
			if (data == null || undefined)
				return String(data);

			if (data instanceof Error)
				return data.toString();

			if (data instanceof discord.BaseInteraction) {
				var interactionBuilder = '  DISCORD INTERACTION';
				interactionBuilder += `\n  - user: ${data.user.displayName}`
				interactionBuilder += `\n  - user_id: ${data.user.id}`;
				if (data.guild) {
					interactionBuilder += `\n  - guild: ${data.guild.name}`;
					interactionBuilder += `\n  - guild_id: ${data.guild.id}`;
				}
				if (data.isCommand())
					interactionBuilder += `\n  - command: ${data.commandName}`;

				interactionBuilder += `\n  - type: ${data.type}`;

				return interactionBuilder;
			}

			switch (typeof data) {
				case 'string':
				case 'boolean':
				case 'number': return data.toString();
			}

			return JSON.stringify(data, (key, value) => {
				if (value instanceof Error) return {
					name: value.name,
					message: value.message,
					stack: value.stack
				}
				return value;
			}, '\t');
		}
		catch (err) {
			console.log(err, data);
			return '[conversion-error]';
		}
	}
}