import { SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";

export default class SkipCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setName('skip')
				.setDescription('Přeskočí video ve frontě.'),
			'skip'
		);
	}
	public dispatch(interaction: DiscordChatInteraction) {
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

		try {
			const session = this.client.getSessionManager().getSession(interaction);
			if (!session) {
				const embed = this.client.getInteractionManager().generateErrorEmbed("Bot není aktivní, použijte příkaz /play nebo /join!");
				interaction.reply({ embeds: [embed], ephemeral: true });
				return false;
			}

			var nextVideo: QueuedVideo | false;
			if ((nextVideo = session.getQueue().playNext(interaction)) == false) {
				if (session.youtubePlayer.isPlaying()) {
					session.getPlayer().stop();
					interaction.reply('Skipping and stop: ' + (session.getQueue().getActiveVideo()?.videoDetails.title ?? 'none'));
				}
				else {
					const embed = this.client.getInteractionManager().generateErrorEmbed("Ve frontě nejsou žádná další videa!");
					interaction.reply({ embeds: [embed], ephemeral: true });
					return false;
				}
			} else {
				interaction.reply('Playing: ' + nextVideo.videoDetails.title);
			}
			return true;
		} catch (err) {
			this.client.handleError(err, interaction);
			return false;
		}
	}
}