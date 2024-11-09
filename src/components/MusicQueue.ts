import MusicBot from "../MusicBot";
import MusicSession from "./MusicSession";
import Utils from "../utils";
import { v4 as uuidv4} from 'uuid';
import debug from "debug";
import fs from 'fs';
import path from 'path';

export default class MusicQueue {
	public position: number = 0;
	public queue: QueuedItem[] = [];

	public cacheManager: QueueCacheManager;

	constructor(private client: MusicBot, private session: MusicSession) {
		this.cacheManager = new QueueCacheManager(this, session.guild.id);
	}

	public restore() {
		const prevQueue = this.cacheManager.getPreviousQueue();
		if (!prevQueue) return false;

		this.queue = prevQueue.queue;
		this.position = prevQueue.position;

		var activeItem: QueuedItem | null;
		if (this.isPlayerAvailable() && (activeItem = this.getActiveItem()) != null)
			this.playActiveVideo(Utils.BotUtils.isPlaylistItem(activeItem) ? activeItem : undefined, true);

		return true;
	}

	public getQueueAsArray(filterDeleted: boolean = true): QueuedItem[] {
		if (filterDeleted)
			return this.queue.filter(q => !q.deleted);
		
		return this.queue;
	}

	public clearQueue() {
		this.position = 0;
		this.queue = [];

		this.cacheManager.update();
	}

	public removeQueueItem(itemID: string) {
		const length: number = this.queue.length;

		this.queue = this.queue.filter((item) => item.id != itemID);

		const change = length != this.queue.length;
		if (change)
			this.cacheManager.update();

		return change;
	}

	public isPlayerAvailable() {
		return !this.session.youtubePlayer.isPlaying() && this.position >= this.getQueueAsArray().length - 2;
	}

	/**
	 * 
	 * @returns Play right away
	 */
	public async pushToQueue(item: QueuedItem, interaction: DiscordInteraction, playNow: boolean): Promise<boolean> {
		this.queue.push(item);

		this.cacheManager.update();
		
		if (!this.session.isJoined()) {
			const r = await this.session.join();
			if (!r) throw 'Bot nelze připojit na server.';
		}

		playNow = playNow || this.isPlayerAvailable();
		if (playNow) {
			this.position = this.getQueueAsArray().length - 1;
			await this.playActiveVideo(Utils.BotUtils.isPlaylistItem(item) ? item : undefined, false, interaction);
			return true;
		}
		return false;
	}

	public async stepQueue(interaction?: DiscordInteraction, skipPlaylist: boolean = false, announceStep: boolean = true): Promise<false | QueuedVideo> {
		const activeItem = this.getActiveItem();

		if (activeItem != null && Utils.BotUtils.isPlaylistItem(activeItem) && activeItem.position < activeItem.videoList.length - 1 && skipPlaylist !== true) {
			// Play playlist video
			activeItem.position += 1;
		}
		else {
			// Play non-playlist video
			const nextPosition = this.position + 1;
			
			if (nextPosition > this.getQueueAsArray().length - 1) return false;
			
			this.position = nextPosition;
			const nextItem = this.getQueueAsArray()[nextPosition];

			if (Utils.BotUtils.isPlaylistItem(nextItem)) {
				return await this.stepQueue(interaction, false, announceStep);
			}
		}

		this.cacheManager.update();

		return await this.playActiveVideo(activeItem && Utils.BotUtils.isPlaylistItem(activeItem) ? activeItem : undefined, announceStep, interaction);
	}

	private async playActiveVideo(fromPlaylist: QueuedPlaylist | undefined, announceStep: boolean, interaction?: DiscordInteraction) {
		const video = await this.getActiveVideo();
		if (!video)
			throw 'ERROR: Failed to play active video, active video is undefined.';

		// Play video
		this.session.youtubePlayer.play(video, interaction);

		// Announce next video
		if (announceStep) {
			const videoEmbed = this.client.interactionManager.generateVideoEmbed(video, fromPlaylist);
			await this.session.interactionChannel.send({embeds: [ videoEmbed ]});
		}

		return video;
	}

	public getActiveItem(): QueuedItem | null {
		return this.getQueueAsArray()[this.position] ?? null;
	}

	public async getActiveVideo(): Promise<QueuedVideo | null> {
		const activeItem = this.getActiveItem();
		if (!activeItem) return null;

		if (Utils.BotUtils.isVideoItem(activeItem)) {
			return activeItem;
		}
		else {
			if (activeItem.videoList.length - 1 < activeItem.position) return null;

			const nextID = activeItem.videoList[activeItem.position];

			if (!activeItem.activeVideo || activeItem.activeVideo.videoDetails.videoId !== nextID) {
				if (activeItem.videoList.length - 1 < activeItem.position) return null;

				const videoInfo = await this.client.youtubeAPI.getVideoDataByID(nextID);
				const video: QueuedVideo = {
					id: uuidv4(),
					user: activeItem.user,
					videoDetails: videoInfo,
					addedAt: activeItem.addedAt,
					deleted: false
				};
				activeItem.activeVideo = video;

			}

			return activeItem.activeVideo ?? null;
		}
	}
}


interface CachedQueueData {
	queue: QueuedItem[],
	position: number
}
interface CachedQueue {
	update_time: number,
	previousQueue: CachedQueueData,
}
export class QueueCacheManager {
	private static debugger = debug('bp:queue:cache');
	private static CACHE_DIRECTORY: string = 'cache';
	private static CACHE_MAX_AGE: number = 1000 * 60 * 60 * 8; // 8 hours
	// public static CACHE_MAX_AGE: number = 1000 * 10; // 10 seconds

	private cachedQueue: CachedQueueData | null = null;
	private readonly fileName: string;

	constructor(private queue: MusicQueue, private guildID: string) {
		this.fileName = path.join(QueueCacheManager.CACHE_DIRECTORY, `${this.guildID}.json`);

		this.init();
	}

	public getPreviousQueue() {
		return this.cachedQueue;
	}

	private async init() {
		try {
			if (!fs.existsSync(QueueCacheManager.CACHE_DIRECTORY)) {
				QueueCacheManager.debugger('Cache directory not found. Creating cache directory.');
				fs.mkdirSync(QueueCacheManager.CACHE_DIRECTORY);
				return;
			}
		} catch (err) {
			console.error(err);
			QueueCacheManager.debugger('Failed to create cache directory.');
		}

		await this.loadCache();
	}

	private async loadCache() {
		if (fs.existsSync(this.fileName)) {
			await this.loadPrevQueue();
		}
		
		await this.update();
	}

	private async loadPrevQueue() {
		try {
			const content = await fs.promises.readFile(this.fileName, {encoding: 'utf-8'});
			const json_content = JSON.parse(content) as CachedQueue;
			if (!('previousQueue' in json_content))
				throw 'Queue cache file is invalid.';

			if (json_content.previousQueue.queue.length != 0)
				this.cachedQueue = json_content.previousQueue;
		}
		catch (err) {
			console.error(err);
			await fs.promises.rm(this.fileName);
			QueueCacheManager.debugger('An error occured while loading cached queue.');
		}
	}

	public async update() {
		try {
			const cache: CachedQueue = {
				previousQueue: {
					queue: this.queue.getQueueAsArray(),
					position: this.queue.position
				},
				update_time: Date.now()
			}

			const json_content = JSON.stringify(cache);
			await fs.promises.writeFile(this.fileName, json_content, {encoding: 'utf-8'});
		}
		catch (err) {
			console.error(err);
			QueueCacheManager.debugger('An error has occured while updating cache file.');
		}
	}

	public static async clearOldCache() {
		if (!fs.existsSync(QueueCacheManager.CACHE_DIRECTORY)) return;
		const dateNow = Date.now();

		try {
			const files = await fs.promises.readdir(QueueCacheManager.CACHE_DIRECTORY);
			for (const file of files) {
				const filePath = path.join(QueueCacheManager.CACHE_DIRECTORY, file);
				const contents = await fs.promises.readFile(filePath, {encoding: 'utf-8'});
				const contents_json = JSON.parse(contents) as CachedQueue;
				if (!('update_time' in contents_json) || contents_json.update_time + QueueCacheManager.CACHE_MAX_AGE < dateNow) {
					await fs.promises.rm(filePath);
				}
			}
		}
		catch (err) {
			console.error(err);
			QueueCacheManager.debugger('Failed to delete old cache files.');
		}
	}
}