import { AutocompleteInteraction, CacheType, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import Utils from "../utils";
import ytdl from '@distube/ytdl-core';
import { GOOGLE_API_KEY } from "..";
import { v4 as uuidv4 } from 'uuid';
import MusicSession from "../components/MusicSession";

export default class PlayCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setName('play')
				.setDescription('Přehrát nebo přidat video do fronty.')
				.addStringOption(option => option
					.setName("video")
					.setDescription("url nebo název videa")
					.setRequired(true)
					.setAutocomplete(true)
				)
				.addBooleanOption(option => option
					.setName("hned")
					.setDescription("přeskočí frontu a přehraje video hned")
					.setRequired(false)
				),
			'play'
		)
	}
	public async dispatch(interaction: DiscordChatInteraction) {
		if (!interaction.member || !Utils.BotUtils.isValidMember(interaction.member)) {
			this.client.handleError("Neplatný uživatel.", interaction);
			return false;
		}

		const query = interaction.options.getString("video", true);
		const playNow = interaction.options.getBoolean("hned", false) ?? false;

		// this.client.log.write('Play command: ', query, playNow, interaction.user.displayName);

		return await this.play(interaction, query, playNow);
	}

	public onAutoComplete(interaction: AutocompleteInteraction<CacheType>, session: MusicSession | null) {
		console.log(interaction);
	}

	public async play(interaction: DiscordChatInteraction, query: string, playNow: boolean): Promise<boolean> {
		const voiceChannel = interaction.member.voice.channel;

		if (!voiceChannel) {
			const embed = this.client.interactionManager.generateErrorEmbed("Nejsi připojen do žádného kanálu!");
			interaction.reply({ embeds: [embed], ephemeral: true });
			return false;
		}

		const interactionChannel = interaction.channel;
		if (!interactionChannel) {
			const embed = this.client.interactionManager.generateErrorEmbed("Neplatný textový channel.");
			interaction.reply({ embeds: [embed], ephemeral: true });
			return false;
		}
		
		try {
			await interaction.deferReply();

			var session = this.client.getSessionManager().getSession(interaction.guild);
			if (!session) {
				session = this.client.getSessionManager().createSession(interaction.guild, interaction.channel, interaction.user);
				this.client.log.write('Create session: ', interaction.user.displayName);
			}

			var itemToQueue: QueuedItem;

			var playlistID: string | null;
			if ((playlistID = this.client.youtubeAPI.getPlaylistIdFromURL(query)) != null) {
				// Is playlist
				this.client.log.write('Query is playlist: ', true);

				const details = await this.client.youtubeAPI.fetchPlaylistDetails(playlistID);
				if (!details) {
					this.client.handleError('Playlist nebyl nalezen.', interaction);
					return false;
				}

				const videos = await this.client.youtubeAPI.fetchVideosFromPlaylist(playlistID);
				if (!videos.length) {
					const embed = this.client.interactionManager.generateErrorEmbed(`Playlist neobsahuje žádná videa.`);
					interaction.followUp({ embeds: [embed], ephemeral: true });
					return false;
				}

				itemToQueue = {
					id: uuidv4(),
					position: 0,
					user: {
						id: interaction.user.id,
						name: interaction.member?.user.username ?? interaction.user.displayName,
						avatarURL: interaction.user.avatarURL() || undefined
					},
					videoList: videos,
					playlistDetails: details,
					playlistID: playlistID,
					activeVideo: undefined
				} as QueuedPlaylist;

				// const result = await session.getQueue().pushToQueue(queuedPlaylist, playNow, interaction);
			} else {
				const videoID = await this.client.youtubeAPI.getVideoIDByQuery(query);

				if (!videoID) {
					console.log("No video found");
					const embed = this.client.interactionManager.generateErrorEmbed(`Video "${query}" nebylo nazeleno.`);
					interaction.followUp({ embeds: [embed], ephemeral: true });
					return false;
				}

				const videoDetails = await this.client.youtubeAPI.getVideoDataByID(videoID);
				itemToQueue = {
					id: uuidv4(),
					videoDetails: videoDetails,
					user: {
						id: interaction.user.id,
						name: interaction.member?.user.username ?? interaction.user.displayName,
						avatarURL: interaction.user.avatarURL() || undefined
					}
				} as QueuedVideo;
			}

			session.setActiveVoiceChannel(voiceChannel);
			const playingNow = await session.getQueue().pushToQueue(itemToQueue, interaction, playNow);

			var embed: EmbedBuilder;
			if (Utils.BotUtils.isVideoItem(itemToQueue)) {
				embed = this.client.interactionManager.generateVideoEmbed(itemToQueue) as EmbedBuilder;
			}
			else {
				embed = this.client.interactionManager.generatePlaylistEmbed(itemToQueue) as EmbedBuilder;
			}

			const embedQueue = playingNow
										? undefined
										: new EmbedBuilder()
											.setTitle(Utils.BotUtils.isVideoItem(itemToQueue) ? 'Video bylo přidáno do fronty.' : 'Playlist byl přidán do fronty.')
											.setColor(this.client.interactionManager.DEFAULT_SUCCESS_EMBED_COLOR);

			await this.client.interactionManager.respondEmbed(interaction, [embedQueue, embed]);

			return true;
		} catch (err) {
			this.client.handleError(err, interaction);
			return false;
		}
	}
}