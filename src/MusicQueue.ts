import MusicBot from "./MusicBot";
import MusicSession from "./MusicSession";

export default class MusicQueue {
    private position: number = 0;
    private queue: QueuedVideo[] = [];

    constructor(private client: MusicBot, private session: MusicSession) {

    }

    public async pushToQueue(video: QueuedVideo, playNow: boolean, interaction: DiscordInteraction) {
        this.queue.push(video);

        if (!this.session.isJoined()) {
            await this.session.join(interaction);
        }

        if (playNow || (!this.session.youtubePlayer.isPlaying() && this.position >= this.queue.length - 2)) {
            this.position = this.queue.length - 1;
            this.session.youtubePlayer.play(video, interaction);
        }

        return playNow;
    }

    public playNext(interaction?: DiscordInteraction) {
        const newPos = this.position + 1;
        if (newPos > this.queue.length - 1) return false;

        const nextVideo = this.queue[newPos];
        if (!nextVideo) return false;

        this.position = newPos;
        this.session.youtubePlayer.play(nextVideo, interaction);
		  return nextVideo;
    }

	 public getActiveVideo(): QueuedVideo | null {
		return this.queue[this.position] ?? null;
	 }
}