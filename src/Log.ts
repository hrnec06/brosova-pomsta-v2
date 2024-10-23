import moment from "moment";
import MusicBot from "./MusicBot";
import fs, { WriteStream } from 'fs';
import assert from "node:assert";

type LogData = (string | number | boolean | Record<any, any> | Array<any>);

interface LogEntry {
	label: string,
	data: LogData
}

export default class Log {
	private readonly LOG_FOLDER = 'logs/';
	private readonly LOG_FILE_FORMAT = '[date].log';
	private ready: boolean = false;
	private error: boolean = false;

	private stack: LogEntry[] = [];

	private stream?: WriteStream;

	constructor(private client: MusicBot) {
		if (client.config.getConfig().system.debugLogging) {
			this.stream = this.openLogFile();

			this.ready = this.stream != undefined;

			if (this.stream && this.stack.length) {
				this.stack.forEach(item => {
					this.write(item.label, item.data);
				})
			}
		}
		else
			this.error = true;

		this.write('ERROR', 'data', [1, 2, 3], false, {'d': true});
		this.write('ERROR', 'data', [1, 2, 3], false, {'d': true});
	}

	private openLogFile() {
		if (!fs.existsSync(this.LOG_FOLDER)) {
			fs.mkdirSync(this.LOG_FOLDER);
		}

		try {
			const date = moment().format('HH-mm-ss.DD-MM-YYYY');
			const name = this.LOG_FILE_FORMAT.replace(/\[date\]/g, date);

			return fs.createWriteStream(this.LOG_FOLDER + name, {autoClose: true, encoding: 'utf-8'});
		} catch (err) {
			this.error = true;
			this.client.handleError(err);
		}
	}

	public write(label: string, ...data: LogData[]) {
		if (this.error) return;
		if (!this.ready) {
			this.stack.push({
				label,
				data
			});
			return;
		}

		assert(this.stream !== undefined, 'Log stream is undefined.');

		var dataStr: string = label;
		if (data.length === 1) {
			dataStr += ': ' + this.convertDataItem(data[0]);
		}
		else if (data.length > 1) {
			dataStr += ': ';
			for (const item of data) {
				dataStr += '\n - ' + this.convertDataItem(item);
			}
		}

		dataStr += '\n';

		this.stream.write(dataStr);
	}

	private convertDataItem(item: LogData) {
		switch (typeof item) {
			case 'string': return item;
			case 'number': return item.toString();
			case 'boolean': return item ? 'true' : 'false';
		}

		return JSON.stringify(item);
	}
}