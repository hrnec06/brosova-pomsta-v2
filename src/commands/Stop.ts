import discord, { SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import Utils from "../utils";

export default class StopComamnd extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setDescription('Zastaví bota a zruší session. Vhodné pro odbugování v případě bugu.'),
			'stop'
		);
	}

	public dispatch(interaction: DiscordChatInteraction) {
		if (!Utils.BotUtils.isValidMember(interaction.member)) {
			this.client.handleError('Invalid member', interaction);
			return false;
		}
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

			session.leave();
			this.client.interactionManager.respondEmbed(interaction, 'Bot byl zastaven.', undefined, this.client.interactionManager.DEFAULT_SUCCESS_EMBED_COLOR);
			return true;
		} catch (err) {
			this.client.handleError(err, interaction);
			return false;
		}
	}
}