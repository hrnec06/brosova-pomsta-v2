import { SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";

export default class StopComamnd extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setName('stop')
				.setDescription('Zastaví bota a zruší session. Vhodné pro odbugování v případě bugu.'),
			'stop'
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

			session.leave();
			interaction.reply('Stopping...');
			return true;
		} catch (err) {
			this.client.handleError(err, interaction);
			return false;
		}
	}
}