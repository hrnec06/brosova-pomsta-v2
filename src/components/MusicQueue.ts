import { EmbedBuilder } from "discord.js";
import MusicBot from "../MusicBot";
import MusicSession from "./MusicSession";
import Utils from "../utils";
import { v4 as uuidv4} from 'uuid';

export default class MusicQueue {
	public position: number = 0;
	public queue: QueuedItem[] = [];

	constructor(private client: MusicBot, private session: MusicSession) {

	}

	/**
	 * 
	 * @returns Play right away
	 */
	public async pushToQueue(item: QueuedItem, interaction: DiscordInteraction, playNow: boolean): Promise<boolean> {
		this.queue.push(item);

		if (!this.session.isJoined()) {
			const r = await this.session.join(interaction);
			if (!r) throw 'Bot nelze připojit na server.';
		}

		playNow = playNow || (!this.session.youtubePlayer.isPlaying() && this.position >= this.queue.length - 1);
		if (playNow) {
			this.position = this.queue.length - 1;
			await this.playActiveVideo(false, Utils.BotUtils.isPlaylistItem(item) ? item : undefined, false, interaction);

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
			const newPos = this.position + 1;
			if (newPos > this.queue.length - 1) return false;

			const nextItem = this.queue[newPos];
			this.position = newPos;

			if (Utils.BotUtils.isPlaylistItem(nextItem)) {
				return await this.stepQueue(interaction, false, announceStep);
			}
		}

		return await this.playActiveVideo(true, activeItem && Utils.BotUtils.isPlaylistItem(activeItem) ? activeItem : undefined, announceStep, interaction);
	}

	private async playActiveVideo(fromQueue: boolean, fromPlaylist: QueuedPlaylist | undefined, announceStep: boolean, interaction?: DiscordInteraction) {
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
		return this.queue[this.position] ?? null;
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
					addedAt: activeItem.addedAt
				};
				activeItem.activeVideo = video;

			}

			return activeItem.activeVideo ?? null;
		}
	}
}