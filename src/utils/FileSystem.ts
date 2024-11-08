import deepmerge from "deepmerge";
import MusicBot from "../MusicBot";
import discord from 'discord.js';
import fs from 'fs';
import moment from "moment";
import debug from "debug";
import path from "path";

interface FileSystemOptions {
	generateOldFile?: boolean,
	debugger?: debug.Debugger
}

export default abstract class FileSystem<T extends (Array<any> | Record<any, any> | Partial<Record<any, any>>)> {
	protected debugger: debug.Debugger;
	private OLD_DIR: string = 'old';

	protected fileName: string;
	protected fileExtension: string;
	protected fileDirectory: string;

	private fileLoaded: boolean = false;

	private data: T;
	private onLoadListeners: ((file: T) => void)[] = [];

	constructor(
		private directory: string,
		protected client: MusicBot,
		private options?: FileSystemOptions
	) {
		// const fileName = /(?:.+\/)?([\w_\.-]+)\.(\w+)$/.exec(directory);

		try {
			this.fileExtension = path.extname(this.directory);
			this.fileName = path.basename(this.directory, this.fileExtension);
			this.fileDirectory = path.dirname(this.directory);
		} catch (err) {
			console.error(err);
			throw `Invalid file name "${this.directory}"`;
		}


		this.debugger = this.options?.debugger ? this.options.debugger : debug(`bp:fs:${this.fileName}`);
		this.data = this.getDefaultData(this.client);

		this.loadFile()
			.then(data => {
				this.data = data;
				this.fileLoaded = true;
				this.onLoadListeners.forEach(listener => listener(data));
			})
			.catch((err) => {
				throw err;
			});
	}

	private async createDirectory(data?: T) {
		this.debugger(`Creating new '%s' file.`, this.fileName);

		// create old file
		try {
			if (this.options?.generateOldFile === true && fs.existsSync(this.directory)) {
				this.debugger(`Generating old '%s' file.`, this.fileName);
				if (!fs.existsSync(this.OLD_DIR))
					await fs.promises.mkdir(this.OLD_DIR);

				const date = moment().format('YYYY-MM-DD HH-mm-ss');
				const newName = `${this.fileName}.${date}${this.fileExtension}`;
				const newPath = path.join(this.OLD_DIR, newName);
				await fs.promises.rename(this.directory, newPath);
			}
		} catch (err) {
			this.debugger(`Failed to check for old '%s' file.`, this.fileName);
			throw err;
		}

		try {
			if (!fs.existsSync(this.fileDirectory)) {
				await fs.promises.mkdir(this.fileDirectory, {recursive: true});
			}

			await fs.promises.writeFile(this.directory, JSON.stringify(data || this.getDefaultData(this.client)), { encoding: 'utf-8' });
			this.debugger(`File '%s' successfully created.`, this.fileName);
		} catch (err) {
			this.debugger(`Failed to create '%s' file.`, this.fileName);
			throw err;
		}

		if (!fs.existsSync(this.directory))
			throw 'New file not detected!';
	}

	protected async saveData(data: T = this.data) {
		this.debugger(`Saving '%s' file.`, this.fileName);

		try {
			if (!fs.existsSync(this.directory)) {
				await this.createDirectory(data);
				this.debugger("File '%s' doesn't exist! Creating a new one.", this.fileName);
				return true;
			}
			this.debugger(`Saving '%s' file.`, this.fileName);
			await fs.promises.writeFile(this.directory, JSON.stringify(data), {encoding: 'utf-8'});

			this.data = data;
			this.debugger('Save completed.');
			return true;
		} catch (err) {
			this.debugger('Save failed!');
			throw err;	
		}
	}

	private async loadFile(): Promise<T> {
		this.debugger('Loading file.');
		
		var result: T;

		try {
			if (fs.existsSync(this.directory)) {
				this.debugger(`File '%s' detected!`, this.fileName);

				const contentsRaw = await fs.promises.readFile(this.directory);
				const contentsJson = JSON.parse(contentsRaw.toString());

				if (this.validateContent(contentsJson)) { // Here
					result = deepmerge(this.getDefaultData(this.client), contentsJson);

					if (JSON.stringify(result) !== JSON.stringify(contentsJson))
						await this.saveData(result);
				}
				else {
					this.debugger(`Invalid '%s' file.`, this.fileName);
					await this.createDirectory();
					result = this.getDefaultData(this.client);
				}
			}
			else {
				this.debugger(`File '%s' not found!`, this.fileName);
				await this.createDirectory();
				result = this.getDefaultData(this.client);
			}
		} catch (err) {
			this.debugger(`File '%s' failed to load. Using default data.`, this.fileName);
			console.error(err);
			result = this.getDefaultData(this.client);
			await this.saveData(result);
		}

		this.debugger(`File '%s' successfully loaded!`, this.fileName);

		return result;
	}

	public getDataAsync(callback: (data: T) => void) {
		if (this.fileLoaded)
			callback(this.data);
		else {
			this.onLoadListeners.push(callback);
		}
	}

	public getData(): T {
		return this.data;
	}

	// CANNOT CONTAIN ANY THIS PARAMS
	abstract getDefaultData(client: MusicBot): T;
	abstract validateContent(jsonContent: any): boolean;
}