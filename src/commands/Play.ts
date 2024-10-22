import { SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import Utils from "../utils";
import ytdl from '@distube/ytdl-core';
import { GOOGLE_API_KEY } from "..";
import { v4 as uuidv4 } from 'uuid';

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

		return await this.play(interaction, query, playNow);
	}

	public async play(interaction: DiscordChatInteraction, query: string, playNow: boolean): Promise<boolean> {
		const voiceChannel = interaction.member.voice.channel;

		if (!voiceChannel) {
			const embed = this.client.getInteractionManager().generateErrorEmbed("Nejsi připojen do žádného kanálu!");
			interaction.reply({ embeds: [embed], ephemeral: true });
			return false;
		}

		const interactionChannel = interaction.channel;
		if (!interactionChannel) {
			const embed = this.client.getInteractionManager().generateErrorEmbed("Neplatný textový channel.");
			interaction.reply({ embeds: [embed], ephemeral: true });
			return false;
		}

		await interaction.deferReply();

		try {
			var session = this.client.getSessionManager().getSession(interaction.guild);
			if (!session) {
				session = this.client.getSessionManager().createSession(interaction.guild, interaction.channel);
			}

			var itemToQueue: QueuedItem;
			if (this.client.youtubeAPI.isPlaylist(query)) {
				// Is playlist
				const id = this.client.youtubeAPI.getPlaylistIdFromURL(query);
				if (!id)
					throw new Error('Youtube playlist ID failed to parse.');

				const videos = await this.client.youtubeAPI.fetchVideosFromPlaylist(id);
				if (!videos.length) {
					const embed = this.client.getInteractionManager().generateErrorEmbed(`Playlist neobsahuje žádná videa.`);
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
					videoList: videos
				} as QueuedPlaylist;

				// const result = await session.getQueue().pushToQueue(queuedPlaylist, playNow, interaction);
			} else {
				const videoID = await this.client.youtubeAPI.getVideoIDByQuery(query);

				if (!videoID) {
					console.log("No video found");
					const embed = this.client.getInteractionManager().generateErrorEmbed(`Video "${query}" nebylo nazeleno.`);
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
			const result = await session.getQueue().pushToQueue(itemToQueue, playNow, interaction);

			const title = Utils.BotUtils.isPlaylistItem(itemToQueue) ? itemToQueue.id : (itemToQueue as QueuedVideo).videoDetails.title;
			interaction.followUp(`${title}: ${result}`);
			return true;
		} catch (err) {
			this.client.handleError(err, interaction);
			return false;
		}
	}
}