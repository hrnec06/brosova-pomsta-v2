import deepmerge from "deepmerge";
import MusicBot from "../MusicBot";
import discord from 'discord.js';
import fs from 'fs';
import moment from "moment";
import debug from "debug";
import path from "path";


export default abstract class FileSystem<T extends (Array<any> | Record<any, any> | Partial<Record<any, any>>)> {
	private debugger: debug.Debugger;

	private fileLoaded: boolean = false;
	private content: T;
	private onLoadListeners: ((file: T) => void)[] = [];

	constructor(private directory: string) {
		const fileName = /(?:.+\/)?([\w_\.-]+)\.(\w+)$/.exec(directory);

		if (!fileName)
			throw `Invalid file name "${fileName}"`;

		this.debugger = debug(`bp:fs:${fileName[1]}`);
		this.content = this.getDefaultContent();

		this.loadFile()
			.then(file => {
				this.content = file;
				this.fileLoaded = true;
				this.onLoadListeners.forEach(listener => listener(file));
			})
			.catch((err) => {
				throw err;
			});
	}

	private async createDirectory() {
		this.debugger('Creating a new file.');

		try {
			if (fs.existsSync(this.directory)) {
				this.debugger('exists');
			}
		} catch (err) {
			this.debugger('Failed to detect the old file.');
			throw err;
		}

		try {
			const dir = path.dirname(this.directory);
			if (!fs.existsSync(dir)) {
				await fs.promises.mkdir(dir, {recursive: true});
			}

			await fs.promises.writeFile(this.directory, JSON.stringify(this.getDefaultContent()), { encoding: 'utf-8' });
		} catch (err) {
			this.debugger('Failed to create a file.');
			throw err;
		}

		if (!fs.existsSync(this.directory))
			throw 'New file not detected!';

		return;
	}

	protected async saveFile(content: T) {
		this.debugger('Saving file.');

		try {
			if (!fs.existsSync(this.directory)) {
				await this.createDirectory();
				this.debugger("File doesn't exist! Creating a new one.");
				return;
			}
			this.debugger('Saving');
			await fs.promises.writeFile(this.directory, JSON.stringify(content), {encoding: 'utf-8'});
		} catch (err) {
			this.debugger('Save failed!');
			throw err;
		}

		this.debugger('Save completed.');
	}

	private async loadFile(): Promise<T> {
		this.debugger('Loading file.');
		
		var result: T;

		try {
			if (fs.existsSync(this.directory)) {
				this.debugger('File detected!.');

				const contentsRaw = await fs.promises.readFile(this.directory);
				const contentsJson = JSON.parse(contentsRaw.toString());

				if (this.validateContent(contentsJson)) {
					result = deepmerge(this.getDefaultContent(), contentsJson);

					if (JSON.stringify(result) !== JSON.stringify(contentsJson))
						await this.saveFile(result);
				}
				else {
					await this.createDirectory();
					this.debugger(`New file ${this.directory} successfully created.`);
					result = this.getDefaultContent();
				}
			}
			else {
				this.debugger(`File not found!`);
				await this.createDirectory();
				this.debugger(`New file ${this.directory} successfully created.`);
				result = this.getDefaultContent();
			}
		} catch (err) {
			this.debugger('File failed to load. Using default content.');
			console.error(err);
			result = this.getDefaultContent();
			await this.saveFile(result);
		}

		this.debugger('File successfully loaded!');

		return result;
	}

	public getFileAsync(callback: (content: T) => void) {
		if (this.fileLoaded)
			callback(this.content);
		else {
			this.onLoadListeners.push(callback);
		}
	}

	public getFile(): T {
		return this.content;
	}

	abstract getDefaultContent(): T;
	abstract validateContent(jsonContent: any): boolean;
}