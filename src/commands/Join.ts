import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import Utils from "../utils";

export default class JoinCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setDescription('Připojí bota na kanál.'),
			'join'
		)
	}
	public async dispatch(interaction: DiscordChatInteraction) {
		if (!Utils.BotUtils.isValidMember(interaction.member)) {
			this.client.handleError('Invalid member', interaction);
			return false;
		}
		const voiceChannel = interaction.member.voice.channel;

		if (!interaction.guild) {
			this.client.handleError('Invalid guild.', interaction);
			return false;
		}

		if (!voiceChannel) {
			const embed = this.client.interactionManager.generateErrorEmbed("Nejsi připojen do žádného kanálu!");
			interaction.reply({ embeds: [embed], ephemeral: true });
			return false;
		}

		const interactionChannel = interaction.channel;
		if (!interactionChannel || !interactionChannel.isSendable()) {
			const embed = this.client.interactionManager.generateErrorEmbed("Neplatný textový channel.");
			interaction.reply({ embeds: [embed], ephemeral: true });
			return false;
		}

		try {
			let session = this.client.getSessionManager().getSession(interaction);
			if (!session) {
				session = this.client.getSessionManager().createSession(interaction.guild, interactionChannel, interaction.user);
				// this.client.log.write('Creating session: ', interaction.user.displayName);
			}

			if (voiceChannel.id == session.getVoiceChannel()?.id) {
				const embed = this.client.interactionManager.generateErrorEmbed("Bot už již je připojen.");
				interaction.reply({ embeds: [embed], ephemeral: true });
				return false;
			}

			if (session.isJoined()) {
				session.leave(true);
				// MARK: PAUSE
			}

			session.setActiveVoiceChannel(voiceChannel);
			const r = await session.join();

			if (!r) {
				this.client.handleError("Bot nelze připojit, zkuste to později.", interaction);
				return false;
			}

			const joinEmbed = new EmbedBuilder()
				.setTitle('Bot byl úspěšně připojen!')
				.setFields([
					{ name: 'Kanál', value: voiceChannel.name }
				])
				.setColor(this.client.interactionManager.DEFAULT_SUCCESS_EMBED_COLOR);

			this.client.interactionManager.respondEmbed(interaction, [joinEmbed]);
			return true;
		} catch (err) {
			this.client.handleError(err, interaction);
			return false;
		}
	}
}