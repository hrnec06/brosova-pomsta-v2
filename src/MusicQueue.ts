import MusicBot from "./MusicBot";
import MusicSession from "./MusicSession";
import Utils from "./utils";
import { v4 as uuidv4} from 'uuid';

export default class MusicQueue {
	public position: number = 0;
	public queue: QueuedItem[] = [];

	constructor(private client: MusicBot, private session: MusicSession) {

	}

	public async pushToQueue(video: QueuedItem, playNow: boolean, interaction: DiscordInteraction) {
		this.queue.push(video);

		if (!this.session.isJoined()) {
			await this.session.join(interaction);
		}

		if (playNow || (!this.session.youtubePlayer.isPlaying() && this.position >= this.queue.length - 2)) {
			this.position = this.queue.length - 1;
			if (Utils.BotUtils.isPlaylistItem(video)) {
				console.log('PLAY PLAYLIST');
				this.playNext(interaction);
			}
			else if (Utils.BotUtils.isVideoItem(video)) {
				console.log('PLAY VIDEO');
				this.session.youtubePlayer.play(video, interaction);
			}
			else
				throw new Error('Invalid queue item.');
		}

		return playNow;
	}

	public async playNext(interaction?: DiscordInteraction, skipPlaylist?: boolean): Promise<QueuedVideo | false> {
		var nextVideo: QueuedVideo;

		const activeItem = this.getActiveVideo();

		if (activeItem != null && Utils.BotUtils.isPlaylistItem(activeItem) && activeItem.position < activeItem.videoList.length && skipPlaylist !== true) {
			const videoInfo = await this.client.youtubeAPI.getVideoDataByID(activeItem.videoList[activeItem.position]);
			activeItem.position += 1;

			nextVideo = {
				id: uuidv4(),
				user: activeItem.user,
				videoDetails: videoInfo
			}
		}
		else {
			const newPos = this.position + 1;
			if (newPos > this.queue.length - 1) return false;

			const nextItem = this.queue[newPos];
			this.position = newPos;

			if (Utils.BotUtils.isPlaylistItem(nextItem)) {
				return await this.playNext(interaction);
			}
			else if (Utils.BotUtils.isVideoItem(nextItem)) {
				nextVideo = nextItem;
			}
			else
				throw new Error('Invalid queue item.');
		}

		if (!nextVideo) return false;
		this.session.youtubePlayer.play(nextVideo, interaction);

		return nextVideo;
	}

	public getActiveVideo(): QueuedItem | null {
		return this.queue[this.position] ?? null;
	}
}