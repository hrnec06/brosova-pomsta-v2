import { EmbedBuilder, RGBTuple } from "@discordjs/builders";
import MusicBot from "./MusicBot";
import { error } from "console";
import Utils from "./utils";
import discord from 'discord.js';

interface EmbedOptions {
	title?: string,
	color?: number,
	description?: string,
	stamp?: boolean,
	interaction?: DiscordInteraction
}

export default class InteractionManager {
	constructor(private client: MusicBot) {
	}


	generateErrorEmbed(text: string, options?: EmbedOptions): EmbedBuilder;
	generateErrorEmbed(error: any, options?: EmbedOptions): EmbedBuilder;

	public generateErrorEmbed(arg1: string | any, options?: EmbedOptions): EmbedBuilder | void {
		var title: string;
		var description: string | undefined = undefined;
		var color: number = 0xcf3a50;
		var author: {
			name: string,
			iconURL?: string
		} | undefined = undefined;
		var stamp: boolean = false;


		if (arg1 instanceof Error) {
			title = `${arg1.name}: ${arg1.message}`;
			description = arg1.stack;
			stamp = true;
		}
		else if (typeof arg1 != 'string') {
			return this.generateErrorEmbed('Unknown error has occured.', { stamp: true });
		}
		else {
			title = "Nastala chyba!";
			description = arg1;
		}

		if (options) {
			title = options.title ? options.title : title;
			description = options.description ? options.description : description;
			color = options.color ? options.color : color;

			if (options.interaction) {
				const member = options.interaction.member;
				if (!Utils.BotUtils.isValidMember(member)) return;

				author = {
					name: member.displayName
				}
				const url = member.avatarURL() ?? member.user.avatarURL();
				if (url)
					author.iconURL = url;
			}
		}

		const embed = new EmbedBuilder()
			.setTitle(title)
			.setColor(color)
			;

		if (stamp) {
			embed
				.setTimestamp(new Date())
				.setFooter({ text: 'An Error occured' })
				;
		}

		if (description)
			embed.setDescription(description);

		if (author) {
			embed.setAuthor(author);
		}


		return embed;
	}

	public generateVideoEmbed(queuedVideo: QueuedVideo): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setColor(0x158ced)
			.setTitle(queuedVideo.videoDetails.title)
			.setURL(`https://youtube.com/watch?v=${queuedVideo.videoDetails.videoId}`)
			.setDescription(queuedVideo.videoDetails.author.name)
			.setImage(queuedVideo.videoDetails.thumbnail)
			.setAuthor({
				name: queuedVideo.user.name,
				iconURL: queuedVideo.user.avatarURL
			})
			.addFields([
				{ name: 'Délka videa', value: Utils.formatTime(queuedVideo.videoDetails.length * 1000) }
			]);

		if (queuedVideo.videoDetails.author.avatar) {
			embed.setThumbnail(queuedVideo.videoDetails.author.avatar);
		}

		return embed;
	}

	public generatePlaylistEmbed(queuedPlaylist: QueuedPlaylist) {
		const embed = new EmbedBuilder()
			.setColor(0x158ced)
			.setTitle(queuedPlaylist.id)
			.setURL(`https://youtube.com/watch?list=${queuedPlaylist.id}v=${queuedPlaylist.videoList[queuedPlaylist.position]}`)
			// .setDescription(discord.hyperlink(queuedVideo.videoDetails.author.name, queuedVideo.videoDetails.author.url))
			.setAuthor({
				name: queuedPlaylist.user.name,
				iconURL: queuedPlaylist.user.avatarURL
			})
			// .setImage(queuedVideo.videoDetails.thumbnail)
			// .setThumbnail(queuedVideo.videoDetails.author.avatar ?? null)
			.addFields([
				{ name: 'Délka playlistu', value: queuedPlaylist.videoList.length.toString() }
			]);

		return embed;
	}
}