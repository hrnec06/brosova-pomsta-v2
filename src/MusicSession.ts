import discord from 'discord.js';
import MusicBot from "./MusicBot";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, DiscordGatewayAdapterCreator, joinVoiceChannel, NoSubscriberBehavior, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import MusicQueue from './MusicQueue';
import YoutubePlayer from './YoutubePlayer';
import assert from 'assert';

export default class MusicSession {
	private player: AudioPlayer;
	private connection?: VoiceConnection;
	private channel?: discord.VoiceBasedChannel;

	private queue: MusicQueue;
	public youtubePlayer: YoutubePlayer;

	private joining: boolean = false;
	private joined: boolean = false;

	private looping: boolean = false;

	constructor(
		private client: MusicBot,
		private id: string,
		public guild: discord.Guild,
		public interactionChannel: discord.TextBasedChannel
	) {
		this.player = createAudioPlayer({
			behaviors: {
				noSubscriber: NoSubscriberBehavior.Pause
			}
		});

		this.player.on('stateChange', (old, newState) => {
			if (newState.status === AudioPlayerStatus.Idle) {
				this.youtubePlayer.handleEnd();
			}
		})

		this.queue = new MusicQueue(this.client, this);
		this.youtubePlayer = new YoutubePlayer(this.client, this);
	}

	public setInteractionChannel(channel: discord.TextBasedChannel) {
		console.log("Interaction channel changed.");
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
		return new Promise<boolean>((resolve) => {
			if (this.joining) {
				return false;
			}
			this.joining = true;

			try {
				assert(this.channel != undefined, 'Cannot join channel because it\'s undefined.');

				const connection = joinVoiceChannel({
					channelId: this.channel.id,
					guildId: this.guild.id,
					selfDeaf: true,
					selfMute: false,
					adapterCreator: this.channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
				});

				connection.on(VoiceConnectionStatus.Ready, () => {
					this.joined = true;
					resolve(true);
				});

				connection.on(VoiceConnectionStatus.Disconnected, () => {
					this.joined = false;
				})

				this.connection = connection;
			} catch (err) {
				resolve(false);
				this.joining = false;
				this.client.handleError(err, interaction);
			}
		});
	}
	public leave(force: boolean = false) {
		if (!this.connection) throw 'Připojení není aktivní.';
		this.connection.disconnect();
		this.connection.destroy();
		this.connection = undefined;
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
}