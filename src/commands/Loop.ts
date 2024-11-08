import { SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import Utils from "../utils";
import MusicSession from "../components/MusicSession";

export default class LoopCommand extends DiscordCommand implements DiscordCommandInterface {
	private looping: boolean = false;

	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setDescription('Přepne loopování hudby.')
				.addBooleanOption(option => option
					.setName('state')
					.setDescription('zapnout nebo vypnout')
					.setRequired(false)
				),
			'loop'
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

			const newState = interaction.options.getBoolean('state', false) ?? !session.isLooping();

			if (session.isLooping() === newState) {
				const embed = this.client.interactionManager.generateErrorEmbed("Looping už je nastavený na: " + Utils.capitalizeString(this.getHumanValue(newState)));
				interaction.reply({ embeds: [embed], ephemeral: true });
				return false;
			}

			session.setLooping(newState);
			this.client.interactionManager.respondEmbed(interaction, `Loop byl nastaven na: ${this.getHumanValue(newState)}!`, undefined, this.client.interactionManager.DEFAULT_SUCCESS_EMBED_COLOR);
			return true;
		} catch (err) {
			this.client.handleError(err, interaction);
			return false;
		}
	}

	private getHumanValue(state: boolean) {
		return Utils.capitalizeString(state ? 'zapnutý' : 'vypnutý');
	}
}