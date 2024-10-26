import discord, { User } from 'discord.js';
import MusicBot from "./MusicBot";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, DiscordGatewayAdapterCreator, joinVoiceChannel, NoSubscriberBehavior, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import MusicQueue from './MusicQueue';
import YoutubePlayer from './YoutubePlayer';
import assert from 'assert';

export default class MusicSession {
	private player?: AudioPlayer;
	private connection?: VoiceConnection;
	private channel?: discord.VoiceBasedChannel;

	public creationDate: Date;
	public updateDate: Date;
	public createdBy: string;
	public updatedBy: string;

	private queue: MusicQueue;
	public youtubePlayer: YoutubePlayer;

	private joining: boolean = false;
	private joined: boolean = false;
	private terminationCountdown?: NodeJS.Timeout;
	private looping: boolean = false;

	constructor(
		private client: MusicBot,
		public id: string,
		public guild: discord.Guild,
		public interactionChannel: discord.SendableChannels,
		createdBy: User
	) {
		this.queue = new MusicQueue(this.client, this);
		this.youtubePlayer = new YoutubePlayer(this.client, this);

		this.creationDate = new Date();
		this.updateDate = new Date();

		this.createdBy = createdBy.id;
		this.updatedBy = createdBy.id;
	}

	public setTerminationCountdown(time_ms: number) {
		if (this.terminationCountdown) return;

		this.terminationCountdown = setTimeout(() => {
			console.log('Automatically destroying session.');
			this.interactionChannel?.send('Opustili jste mě sráči, lívuju.');
			this.client.getSessionManager().destroySession(this);
		}, time_ms);
	}
	public cancelTerminationCountdown() {
		if (this.terminationCountdown === undefined) return;

		clearTimeout(this.terminationCountdown);
		this.terminationCountdown = undefined;
	}
	public setInteractionChannel(channel: discord.TextBasedChannel) {
		if (!channel.isSendable())
			throw 'Interaction channel is not sendable.';

		this.interactionChannel = channel;
	}
	public setActiveVoiceChannel(channel: discord.VoiceBasedChannel) {
		this.channel = channel;
	}
	public getQueue() {
		return this.queue;
	}
	public getPlayer() {
		return this.player;
	}
	public isJoined(): boolean {
		return this.joined;
	}
	public join(interaction?: DiscordInteraction) {
		return new Promise<boolean>((resolve, error) => {
			if (this.joining) {
				return error('Bot is already joining.');
			}
			this.joining = true;

			try {
				assert(this.channel != undefined, 'Cannot join channel because it\'s undefined.');

				this.connection?.destroy();
				this.player?.stop(true);

				const connection = joinVoiceChannel({
					channelId: this.channel.id,
					guildId: this.guild.id,
					selfDeaf: true,
					selfMute: false,
					adapterCreator: this.channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
				});

				connection.on(VoiceConnectionStatus.Ready, () => {
					this.joined = true;
					this.joining = false;
					resolve(true);
				});

				connection.on(VoiceConnectionStatus.Disconnected, () => {
					this.joined = false;
				});

				this.player = createAudioPlayer({
					behaviors: {
						noSubscriber: NoSubscriberBehavior.Pause,
					},
				});
		
				this.player.on('stateChange', (old, newState) => {
					if (newState.status === AudioPlayerStatus.Idle) {
						this.youtubePlayer.handleEnd();
					}
				});

				this.player.on('error', (err) => {
					this.client.handleError(err);
				});

				this.connection = connection;
			} catch (err) {
				error(err);
				this.joining = false;
				this.joined = false;
			}
		});
	}
	public leave(force: boolean = false) {
		if (!this.connection) throw 'Připojení není aktivní.';
		this.connection.disconnect();
	}
	public getConnection() {
		return this.connection;
	}
	public isLooping() {
		return this.looping;
	}
	public setLooping(state: boolean) {
		this.looping = state;
	}
	public getVoiceChannel() {
		return this.channel;
	}
}