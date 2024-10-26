import MusicBot from "./MusicBot";
import MusicSession from "./MusicSession";
import Utils from "./utils";
import { v4 as uuidv4} from 'uuid';

export default class MusicQueue {
	public position: number = 0;
	public queue: QueuedItem[] = [];

	constructor(private client: MusicBot, private session: MusicSession) {

	}

	public async pushToQueue(item: QueuedItem, interaction: DiscordInteraction, playNow: boolean) {
		this.queue.push(item);

		if (!this.session.isJoined()) {
			const r = await this.session.join(interaction);
			if (!r) throw 'Bot nelze připojit na server.';
		}

		playNow = playNow || (!this.session.youtubePlayer.isPlaying() && this.position >= this.queue.length - 1);
		if (playNow) {
			this.position = this.queue.length - 1;
			await this.playActiveVideo(false, Utils.BotUtils.isPlaylistItem(item), interaction);
		}
	}

	public async playNext(interaction?: DiscordInteraction, skipPlaylist: boolean = false): Promise<false | QueuedVideo> {
		const activeItem = this.getActiveItem();

		var nextVideo: QueuedVideo;

		if (activeItem != null && Utils.BotUtils.isPlaylistItem(activeItem) && activeItem.position && activeItem.position < activeItem.videoList.length && skipPlaylist !== true) {
			// Play playlist video
			const videoInfo = await this.client.youtubeAPI.getVideoDataByID(activeItem.videoList[activeItem.position]);
			activeItem.position += 1;

			nextVideo = {
				id: uuidv4(),
				user: activeItem.user,
				videoDetails: videoInfo
			}

			activeItem.activeVideo = nextVideo;
		}
		else {
			// Play non-playlist video
			const newPos = this.position + 1;
			if (newPos > this.queue.length - 1) return false;

			const nextItem = this.queue[newPos];
			this.position = newPos;

			if (Utils.BotUtils.isPlaylistItem(nextItem)) {
				return await this.playNext(interaction, false);
			}
			else if (Utils.BotUtils.isVideoItem(nextItem)) {
				nextVideo = nextItem;
			}
			else
				throw new Error('Invalid queue item.');
		}

		await this.playActiveVideo(true, activeItem != null && Utils.BotUtils.isPlaylistItem(activeItem));

		return nextVideo;
	}

	private async playActiveVideo(fromQueue: boolean, fromPlaylist: boolean, interaction?: DiscordInteraction) {
		const video = this.getActiveVideo();
		if (!video)
			throw 'ERROR: Failed to play active video, active video is undefined.';

		// Announce next video
		const videoEmbed = this.client.getInteractionManager().generateVideoEmbed(video, fromQueue, fromPlaylist);
		this.session.interactionChannel.send({embeds: [videoEmbed]});

		// Play video
		return await this.session.youtubePlayer.play(video, interaction);
	}

	// public async pushToQueue(video: QueuedItem, playNow: boolean, interaction: DiscordInteraction) {
	// 	this.queue.push(video);

	// 	if (!this.session.isJoined()) {
	// 		const r = await this.session.join(interaction);
	// 		if (!r) throw 'Bot nelze připojit na server.';
	// 	}

	// 	// Should start playing right away
	// 	if (playNow || (!this.session.youtubePlayer.isPlaying() && this.position >= this.queue.length - 2)) {
	// 		this.position = this.queue.length - 1;

	// 		if (Utils.BotUtils.isPlaylistItem(video)) {
	// 			return await this.playNext(interaction) !== false;
	// 		}
	// 		else if (Utils.BotUtils.isVideoItem(video)) {
	// 			await this.session.youtubePlayer.play(video, interaction);
	// 		}
	// 		else
	// 			throw new Error('Invalid queue item.');
	// 	}

	// 	return true;
	// }

	public getActiveItem(): QueuedItem | null {
		return this.queue[this.position] ?? null;
	}

	public getActiveVideo(): QueuedVideo | null {
		const activeItem = this.getActiveItem();
		if (!activeItem) return null;

		if (Utils.BotUtils.isVideoItem(activeItem)) {
			return activeItem;
		}
		else {
			return activeItem.activeVideo ?? null;
		}
	}
}