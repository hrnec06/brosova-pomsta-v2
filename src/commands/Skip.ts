import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import Utils from "../utils";

export default class SkipCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setName('skip')
				.addBooleanOption(option => option
					.setName('playlist')
					.setDescription('Přeskočit celý playlist')
					.setRequired(false)
				)
				.setDescription('Přeskočí video / playlist ve frontě.'),
			'skip'
		);
	}
	public async dispatch(interaction: DiscordChatInteraction) {
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
			const session = this.client.getSessionManager().getSession(interaction);
			if (!session) {
				const embed = this.client.interactionManager.generateErrorEmbed("Bot není aktivní, použijte příkaz /play nebo /join!");
				interaction.reply({ embeds: [embed], ephemeral: true });
				return false;
			}

			const skipPlaylist = interaction.options.getBoolean('playlist', false) ?? false;

			const currentItem = session.queue.getActiveItem();
			const currentVideo = await session.queue.getActiveVideo();

			var nextVideo: QueuedVideo | false;
			if ((nextVideo = await session.queue.stepQueue(interaction, skipPlaylist, false)) === false) {
				const player = session.getPlayer();
				if (!player) {
					// Player unavailable error
					this.client.handleError(new Error('Player is not available!'), interaction);
					return false;
				}
				if (session.youtubePlayer.isPlaying()) {
					// Skip and stop
					player.stop();
					this.client.interactionManager.respondEmbed(interaction, 'Přehrávání bylo pozastaveno!', 'Ve frotně nejsou žádné další videa.', this.client.interactionManager.DEFAULT_SUCCESS_EMBED_COLOR);
				}
				else {
					// Nothing to skip
					const embed = this.client.interactionManager.generateErrorEmbed("Ve frontě nejsou žádná další videa!");
					this.client.interactionManager.respondEmbed(interaction, [embed]);
					return false;
				}
			} else {
				const activeItem = session.queue.getActiveItem();
				const embed = this.client.interactionManager.generateVideoEmbed(nextVideo, activeItem && Utils.BotUtils.isPlaylistItem(activeItem) ? activeItem : undefined) as EmbedBuilder;
				
				var skipText: string;
				if (currentItem && skipPlaylist && Utils.BotUtils.isPlaylistItem(currentItem)) {
					skipText = `Playlist ${currentItem.playlistDetails.title} byl přeskočen.`;
				}
				else if (currentVideo) {
					skipText = `Video ${currentVideo.videoDetails.title} bylo přeskočeno.`;
				}
				else
					skipText = 'Video bylo přeskočeno.';

				const skippedEmbed = new EmbedBuilder()
					.setTitle(skipText)
					.setColor(this.client.interactionManager.DEFAULT_SUCCESS_EMBED_COLOR);

				await this.client.interactionManager.respondEmbed(interaction, [skippedEmbed, embed]);
			}
			return true;
		} catch (err) {
			this.client.handleError(err, interaction);
			return false;
		}
	}
}