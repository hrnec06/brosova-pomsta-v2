import { SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import Utils from "../utils";
import ytdl from '@distube/ytdl-core';
import { GOOGLE_API_KEY } from "..";
import { v4 as uuidv4} from 'uuid';

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
		  console.log(1);
        if (!voiceChannel) {
            const embed = this.client.getInteractionManager().generateErrorEmbed("Nejsi připojen do žádného kanálu!");
            interaction.reply({ embeds: [embed], ephemeral: true });
            return false;
        }

		  console.log(2);
        const interactionChannel = interaction.channel;
        if (!interactionChannel) {
            const embed = this.client.getInteractionManager().generateErrorEmbed("Neplatný textový channel.");
            interaction.reply({ embeds: [embed], ephemeral: true });
            return false;
        }

		  console.log(3);
        await interaction.deferReply();

        try {
				console.log(4);
            const videoID = await this.getVideoIDByQuery(query);
				console.log(5);
            if (!videoID) {
                const embed = this.client.getInteractionManager().generateErrorEmbed(`Video "${query}" nebylo nazeleno.`);
                interaction.followUp({ embeds: [embed], ephemeral: true });
                return false;
            }

				console.log(6);
            const videoDetails = await this.getVideoDataByID(videoID);

            const queuedItem: QueuedVideo = {
                id: uuidv4(),
                videoDetails: videoDetails,
                user: {
                    id: interaction.user.id,
                    name: interaction.member?.user.username ?? interaction.user.displayName,
                    avatarURL: interaction.user.avatarURL() || undefined
                }
            }

				console.log(10);

            var session = this.client.getSessionManager().getSession(interaction.guild);
            if (!session) {
                console.log("No session found.");
                session = this.client.getSessionManager().createSession(interaction.guild, interaction.channel);
            }

				console.log(9);

            session.setActiveVoiceChannel(voiceChannel);
            const result = await session.getQueue().pushToQueue(queuedItem, playNow, interaction);

				console.log(7);

            interaction.followUp(`${videoDetails.title}: ${result}`);
				return true;
        } catch (err) {
				console.log(8);
            this.client.handleError(err, interaction);
            return false;
        }
    }

    private async getVideoIDByQuery(query: string) {
        // Search by URL
        if (ytdl.validateURL(query)) {
            return ytdl.getURLVideoID(query);
        }
        // Search by name
        else {
            const videoData = await this.fetchVideoByName(query);
            if (videoData)
                return videoData.id.videoId;
            return null;
        }
    }

    private async fetchVideoByName(name: string) {
        if (!GOOGLE_API_KEY) return null;

        const URL = `https://www.googleapis.com/youtube/v3/search?part=snippet&fields=items&type=video&maxResults=${1}&q=${encodeURIComponent(name)}&key=${GOOGLE_API_KEY}`;
        const response = await fetch(URL);
        const result = (await response.json() as YoutubeSearchResponse);

        if (!result || !result.items) throw new Error('Youtube API returned an invalid response.');

        if (!result.items.length) return null;
        return result.items[0];
    }

    private async getVideoDataByID(id: string) {
        const videoInfo = await ytdl.getInfo(id);

        const thumbnail = videoInfo.videoDetails.videoId;
        const authorAvatar = videoInfo.videoDetails.author.thumbnails != undefined ? videoInfo.videoDetails.author.thumbnails[videoInfo.videoDetails.author.thumbnails.length - 1].url : undefined;

        const response: YtdlInfo = {
            author: {
                name: videoInfo.videoDetails.author.name,
                avatar: authorAvatar,
                url: videoInfo.videoDetails.author.channel_url
            },
            videoId: id,
            length: Utils.parseInteger(videoInfo.videoDetails.lengthSeconds, NaN),
            title: videoInfo.videoDetails.title,
            thumbnail: thumbnail,
            uploadDate: videoInfo.videoDetails.uploadDate,
        };

        return response;
    }
}