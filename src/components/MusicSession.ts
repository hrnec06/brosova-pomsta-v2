import discord, { EmbedBuilder, User } from 'discord.js';
import MusicBot from "../MusicBot";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, DiscordGatewayAdapterCreator, joinVoiceChannel, NoSubscriberBehavior, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import MusicQueue from './MusicQueue';
import YoutubePlayer from './YoutubePlayer';
import assert from 'assert';

export default class MusicSession {
	private 	player?: 					AudioPlayer;
	private 	connection?: 				VoiceConnection;
	private 	channel?: 					discord.VoiceBasedChannel;

	public 	creationDate: 				Date 					= new Date();
	public 	updateDate: 				Date 					= new Date();
	public 	createdBy: 					string;
	public 	updatedBy: 					string;

	public 	queue: 						MusicQueue;
	public 	youtubePlayer: 			YoutubePlayer;

	private 	joining: 					boolean 				= false;
	private 	joined: 						boolean 				= false;
	private 	terminationCountdown?: 	NodeJS.Timeout;
	private 	looping: 					boolean 				= false;
	private	paused:						boolean				= false;

	constructor(
		private client: 				MusicBot,
		public id: 						string,
		public guild: 					discord.Guild,
		public interactionChannel: discord.SendableChannels,
		createdBy: 						User
	) {
		this.queue 					= new MusicQueue(this.client, this);
		this.youtubePlayer 		= new YoutubePlayer(this.client, this);

		this.createdBy 			= createdBy.id;
		this.updatedBy 			= createdBy.id;
	}

	/**
	 * Destroy session in @param time_ms ms
	 */
	public setTerminationCountdown(time_ms: number) {
		if (this.terminationCountdown) return;

		this.terminationCountdown = setTimeout(() => {
			const embed = new EmbedBuilder()
				.setTitle('Bot byl odpojen kvůli neaktivitě.')
			this.interactionChannel.send({embeds: [embed]});

			this.client.getSessionManager().destroySession(this);
		}, time_ms);
	}
	/**
	 * Cancel leaving channel
	 */
	public cancelTerminationCountdown() {
		if (this.terminationCountdown === undefined) return;

		clearTimeout(this.terminationCountdown);
		this.terminationCountdown = undefined;
	}
	/**
	 * Set default text chanel
	 */
	public setInteractionChannel(channel: discord.TextBasedChannel) {
		if (!channel.isSendable())
			throw 'Interaction channel is not sendable.';

		this.interactionChannel = channel;
	}
	/**
	 * Change active voice channel
	 */
	public setActiveVoiceChannel(channel: discord.VoiceBasedChannel) {
		this.channel = channel;
	}
	public getPlayer() {
		return this.player;
	}
	public isJoined(): boolean {
		return this.joined && !this.joining;
	}
	public join() {
		return new Promise<boolean>((resolve, error) => {
			if (this.joining) {
				return error('Bot is already joining.');
			}
			this.joining = true;

			try {
				assert(this.channel != undefined, 'Cannot join channel because it\'s undefined.');

				setTimeout(() => {
					if (this.joining) {
						error('Timed out.');
					}
				}, 10000);

				// Clear old connections
				this.connection?.destroy();
				this.player?.stop(true);

				const connection = joinVoiceChannel({
					channelId: this.channel.id,
					guildId: this.guild.id,
					selfDeaf: true,
					selfMute: false,
					adapterCreator: this.channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
				});

				connection.on('error', (err) => {
					if (this.joining) {
						error(err);
					}
				})

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
	public setPause(state: boolean) {
		const player = this.getPlayer();
		if (!player) return false;

		if (state) {
			player.pause();
		}
		else {
			player.unpause();
		}

		this.paused = state;

		return true;
	}
	public isPaused() {
		return this.paused;
	}
}