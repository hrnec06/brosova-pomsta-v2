import { ActionRowBuilder, AutocompleteInteraction, ButtonInteraction, CacheType, channelMention, ChannelSelectMenuBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import MusicSession from "../components/MusicSession";
import AdminCommand from "./Admin";

interface SubscribeSession {
	interaction: DiscordChatInteraction,
	last_update: number
}

export default class SubscribeCommand extends DiscordCommand implements DiscordCommandInterface {
	private subscribeSessions: Record<string, SubscribeSession> = {};

	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.setDescription('Odebírat novinky.'),
			'subscribe'
		)
	}
	public async dispatch(interaction: DiscordChatInteraction) {
		const select = new ChannelSelectMenuBuilder()
			.setCustomId(this.makePath('channel', 'subscribe'))
			.setPlaceholder('Vyberte kanál!')
			.setMaxValues(1)
			.setMinValues(1)
			.addChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.AnnouncementThread])

		const actionRow = new ActionRowBuilder<ChannelSelectMenuBuilder>()
			.addComponents(select);

		const response = await this.client.interactionManager.respondEmbed(interaction, 'Vyberte kanál pro odběr novinek.', undefined, 'success', {ephermal: true, components: [actionRow]});
		if (!response) {
			await this.client.handleError('Zpráva se nepodařila odeslat.');
			return false;
		}

		this.subscribeSessions[response.id] = {
			interaction: interaction,
			last_update: Date.now()
		};
		return true;
	}

	public onButton(interaction: ButtonInteraction<CacheType>, path: ComponentPath, session: MusicSession | null) {
	}

	public onAutoComplete(interaction: AutocompleteInteraction<CacheType>, session: MusicSession | null) {
		return [];
	}

	public async onSelect(interaction: DiscordSelectInteraction, path: ComponentPath, session: MusicSession | null) {
		const interactionID = interaction.message.interactionMetadata?.id;

		var subscribeSession: SubscribeSession | undefined;
		if (!interactionID || !(subscribeSession = this.subscribeSessions[interactionID])) {
			await this.client.handleError('Neplatná interakce.', interaction);
			return;
		}

		const value = interaction.values[0];
		if (!value) {
			this.client.handleError('Neplatný požadavek.', interaction);
			return;
		}

		const guildID = interaction.guild?.id;
		if (!guildID) {
			this.client.handleError('Invalid guild.', interaction);
			return;
		}

		const adminCommand = this.client.getCommand<AdminCommand>('admin');
		if (!adminCommand) {
			this.valid = false;
			this.client.handleError('Tento příkaz nefunguje správně!');
			return;
		}

		const r = await adminCommand.updateManager.subscribe(guildID, value);
		if (r) {
			const embed = new EmbedBuilder()
				.setTitle(`Channel ${channelMention(value)} nyní bude odebírat všechna oznámení.`)
				.setColor(this.client.interactionManager.DEFAULT_SUCCESS_EMBED_COLOR);

			await subscribeSession.interaction.editReply({embeds: [embed], components: []});
		}
		else {
			await subscribeSession.interaction.deleteReply();
			await this.client.handleError('Channel nelze nastavit.', interaction);
		}
	}
}