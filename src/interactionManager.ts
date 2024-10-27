import { EmbedBuilder, RGBTuple } from "@discordjs/builders";
import MusicBot from "./MusicBot";
import { error } from "console";
import Utils from "./utils";
import discord, { Embed } from 'discord.js';

interface EmbedOptions {
	title?: string,
	color?: number,
	description?: string,
	stamp?: boolean,
	interaction?: DiscordInteraction
}

interface RespondOptions {
	ephermal?: boolean,
	ephermalRequired?: boolean,
	devChannelFallback?: boolean
}

export default class InteractionManager {
	public readonly DEFAULT_EMBED_COLOR = 0x158ced;
	public readonly DEFAULT_ERROR_EMBED_COLOR = 0xeb4034;

	constructor(private client: MusicBot) {
	}


	generateErrorEmbed(text: string, options?: EmbedOptions): EmbedBuilder;
	generateErrorEmbed(error: any, options?: EmbedOptions): EmbedBuilder;

	public generateErrorEmbed(arg1: string | any, options?: EmbedOptions): EmbedBuilder | void {
		var title: string;
		var description: string | undefined = undefined;
		var color: number = this.DEFAULT_ERROR_EMBED_COLOR;
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

	public generateVideoEmbed(queuedVideo: QueuedVideo, fromQueue: boolean, fromPlaylist: boolean): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setColor(this.DEFAULT_EMBED_COLOR)
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
			.setColor(this.DEFAULT_EMBED_COLOR)
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

	public async respond(interaction: DiscordInteraction | undefined, message: EmbedBuilder | Error | string | discord.InteractionReplyOptions, options?: RespondOptions) {
		var payload: discord.BaseMessageOptions;
		if (typeof message === 'string') {
			payload = {content: message }
		}
		else if (message instanceof Error) {
			const errEmbed = this.generateErrorEmbed(message, { interaction });
			payload = { embeds: [ errEmbed ] }
		}
		else if (message instanceof EmbedBuilder) {
			payload = { embeds: [ message ] }
		}
		else {
			this.client.handleError('Invalid response message.', interaction);
			return false;
		}

		if (interaction && interaction.isRepliable() && !interaction.replied) {

			if (interaction.deferred)
				return await interaction.followUp({...payload, ephemeral: options?.ephermal});
			else
			return await interaction.reply({...payload, ephemeral: options?.ephermal});
		}
		else if (options?.ephermalRequired) {
			const errorEmbed = this.generateErrorEmbed(new Error('ERROR: Message cannot be sent; Option ephermal is required but impossible.'), { interaction });
			await this.respond(interaction, errorEmbed, {...options, devChannelFallback: true});
			return false;
		}
		else if (interaction && interaction.channel && interaction.channel.isSendable()) {
			return await interaction.channel.send(payload);
		}
		else if (options?.devChannelFallback && this.client.config.developerChannel) {
			return await this.client.config.developerChannel.send(payload);
		}
		else {
			console.log(interaction !== undefined, interaction?.isRepliable(), interaction?.isRepliable() && !interaction.replied, interaction?.channel, interaction?.channel?.isSendable(), options?.devChannelFallback, this.client.config.developerChannel);
			const errorEmbed = this.generateErrorEmbed(new Error('Unable to send the message, all methods are unreachable.'), { interaction });
			await this.respond(interaction, errorEmbed, {...options, devChannelFallback: true});
			return false;
		}
	}


	// Embed builder from args
	public async respondEmbed(interaction: DiscordInteraction, title: string, 						description?: string, 				color?: RGBTuple | number, options?: RespondOptions): Promise<false | discord.Message<boolean> | discord.InteractionResponse<boolean>>;
	// Embed builder
	public async respondEmbed(interaction: DiscordInteraction, embed: EmbedBuilder, 				options?: RespondOptions): Promise<false | discord.Message<boolean> | discord.InteractionResponse<boolean>>;
	public async respondEmbed(interaction: DiscordInteraction, arg1: string | EmbedBuilder,	arg2?: string | RespondOptions, 	arg3?: RGBTuple | number, 	arg4?: RespondOptions): Promise<false | discord.Message<boolean> | discord.InteractionResponse<boolean>> {
		const options: RespondOptions | undefined = arg4 ? arg4 : typeof arg2 != 'string' ? arg2 : undefined;

		if (arg1 instanceof EmbedBuilder) {
			return await this.respond(interaction, arg1, options);
		}
		else if (typeof arg2 == 'string') {
			const embed = new EmbedBuilder().setTitle(arg1);
			if (arg2)
				embed.setDescription(arg2);
			if (arg3)
				embed.setColor(arg3);

			return await this.respond(interaction, embed, options);
		}

		return false;
	}
}