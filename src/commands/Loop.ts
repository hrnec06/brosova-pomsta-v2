import { SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import Utils from "../utils";
import MusicSession from "../MusicSession";

export default class LoopCommand extends DiscordCommand implements DiscordCommandInterface {
	private looping: boolean = false;

	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setName('loop')
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

			const newState = interaction.options.getBoolean('state', false) ?? !session.isLooping();

			if (session.isLooping() === newState) {
				const embed = this.client.getInteractionManager().generateErrorEmbed("Looping už je nastavený na: " + Utils.capitalizeString(this.getHumanValue(newState)));
				interaction.reply({ embeds: [embed], ephemeral: true });
				return false;
			}

			session.setLooping(newState);
			interaction.reply('Looping byl nastaven na: ' + Utils.capitalizeString(this.getHumanValue(newState)));
			return true;
		} catch (err) {
			this.client.handleError(err, interaction);
			return false;
		}
	}

	private getHumanValue(state: boolean) {
		return state ? 'zapnutý' : 'vypnutý';
	}
}