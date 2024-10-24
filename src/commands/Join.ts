import { SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";

export default class JoinCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setName('join')
				.setDescription('Připojí bota na kanál.'),
			'join'
		)
	}
	public async dispatch(interaction: DiscordChatInteraction) {
		const voiceChannel = interaction.member.voice.channel;

		this.client.log.write('Join command: ', interaction.user.displayName);

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
			let session = this.client.getSessionManager().getSession(interaction);
			if (!session) {
				session = this.client.getSessionManager().createSession(interaction.guild, interaction.channel, interaction.user);
				this.client.log.write('Creating session: ', interaction.user.displayName);
			}

			if (voiceChannel.id == session.getVoiceChannel()?.id) {
				const embed = this.client.getInteractionManager().generateErrorEmbed("Bot už již je připojen.");
				interaction.reply({ embeds: [embed], ephemeral: true });
				return false;
			}

			if (session.isJoined()) {
				session.leave(true);
				// MARK: PAUSE
			}

			session.setActiveVoiceChannel(voiceChannel);
			const r = await session.join(interaction);

			this.client.log.write('Join result: ', r);

			if (!r) {
				this.client.handleError("Bot nelze připojit, zkuste to později.", interaction);
				return false;
			}

			interaction.reply('Bot připojen.');
			return true;
		} catch (err) {
			this.client.handleError(err, interaction);
			return false;
		}
	}
}