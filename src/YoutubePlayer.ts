import ytdl from "@distube/ytdl-core";
import MusicBot from "./MusicBot";
import MusicSession from "./MusicSession";
import { AudioPlayerStatus, createAudioResource, demuxProbe } from "@discordjs/voice";
import LoopCommand from "./commands/Loop";

export default class YoutubePlayer {
	private playing: boolean = false;

	constructor(private client: MusicBot, private session: MusicSession) {
	}

	public isPlaying() {
		return this.playing;
	}

	public async play(queuedVideo: QueuedVideo, interaction?: DiscordInteraction) {
		if (!this.session.isJoined()) {
			this.client.handleError(new Error('Attempted to play a video without being joined.'), interaction);
			return;
		}

		const conn = this.session.getConnection();
		if (!conn) {
			this.client.handleError(new Error('Connection is undefined.'), interaction);
			return;
		}

		const audio = ytdl(queuedVideo.videoDetails.videoId, {
			quality: 'highestaudio',
			highWaterMark: 1 << 62,
			liveBuffer: 1 << 62,
			dlChunkSize: 0
		});

		const { stream, type } = await demuxProbe(audio);

		stream.on('error', (err) => {
			this.playing = false;
			this.session.getPlayer().stop();
			this.client.handleError(err, interaction);
		})

		const res = createAudioResource(stream, {
			inputType: type
		});

		const player = this.session.getPlayer();

		player.play(res);
		conn.subscribe(player);

		this.playing = true;
	}

	public handleEnd(forced: boolean = false) {
		if (this.session.isLooping()) {
			const activeVideo = this.session.getQueue().getActiveVideo();
			activeVideo && this.play(activeVideo);
			return;
		}
		this.playing = false;
		this.session.getQueue().playNext();
	}
}