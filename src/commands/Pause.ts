import { ActionRowBuilder, AutocompleteInteraction, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import MusicSession from "../components/MusicSession";
import Utils from "../utils";

export default class PauseCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot, commandName: string, description: string, private setter: boolean) {
		super(
			new SlashCommandBuilder()
				.setDescription(description),
				commandName
		)
	}
	public async dispatch(interaction: DiscordChatInteraction, session: MusicSession | null) {
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

		if (!session) {
			const embed = this.client.interactionManager.generateErrorEmbed("Není aktivní žádná relace.");
			interaction.reply({ embeds: [embed], ephemeral: true });
			return false;
		}

		const paused = session.isPaused();
		if (paused === this.setter) {
			await this.client.interactionManager.respondEmbed(interaction, this.setter ? 'Video již bylo pozastaveno.' : 'Video není pozastaveno.', undefined, 'error');
			return false;
		}

		const result = session.setPause(this.setter);

		if (result) {
			await this.client.interactionManager.respondEmbed(interaction, this.setter ? `Přehrávání bylo pozastaveno.` : `Přehrávání bylo spuštěno.`, undefined, 'success');
		}
		else {
			await this.client.interactionManager.respondEmbed(interaction, `Přehrávání se nepovedlo ${this.setter ? 'zastavit' : 'spustit'}`, undefined, 'error');
		}

		return result;
	}
}