import { AutocompleteInteraction, ButtonInteraction, CacheType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import MusicSession from "../components/MusicSession";
import AdminCommand from "./Admin";

export default class UnsubscribeCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.setDescription('Přestat odebírat kanál.'),
			'unsubscribe'
		)
	}
	public async dispatch(interaction: DiscordChatInteraction) {
		const guildID = interaction.guild?.id;
		if (!guildID) {
			this.client.handleError('Invalid guild.', interaction);
			return false;
		}

		const adminCommand = this.client.getCommand<AdminCommand>('admin');
		if (!adminCommand) {
			this.valid = false;
			this.client.handleError('Tento příkaz nefunguje správně!');
			return false;
		}

		const subscribed = adminCommand.updateManager.isSubscribed(guildID);
		if (!subscribed) {
			const errorEmbed = this.client.interactionManager.generateErrorEmbed('Tento server není přihlášen k odběru.');
			await this.client.interactionManager.respond(interaction, [errorEmbed], {ephermal: true});
			return false;
		}

		const r = await adminCommand.updateManager.unsubscribe(guildID);
		if (r) {
			await this.client.interactionManager.respondEmbed(interaction, 'Kanál bych odhlášen od odběru.', undefined, 'success');
		}
		else {
			await this.client.interactionManager.respondEmbed(interaction, 'Kanál se nepodařilo odhlásit od odběru.', undefined, 'error');
			return false;
		}

		return true;
	}
}