import { SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import AdminCommand from "./Admin";

export default class InfoCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setDescription('Zobrazí poslední oznámení.'),
			'info'
		)
	}
	public async dispatch(interaction: DiscordChatInteraction) {
		const adminCommand = this.client.getCommand<AdminCommand>('admin');
		if (!adminCommand) {
			this.valid = false;
			this.client.handleError('Tento příkaz nefunguje správně!');
			return false;
		}

		const updates = adminCommand.updateManager.getData();
		if (!updates.updates.length) {
			const error = this.client.interactionManager.generateErrorEmbed('Momentálně neexistují žádná oznámení.');
			this.client.interactionManager.respond(interaction, [error], {ephermal: true});
			return false;
		}

		const lastUpdate = updates.updates[updates.updates.length - 1];
		const embed = adminCommand.updateManager.generateUpdateEmbed(lastUpdate);
		await this.client.interactionManager.respond(interaction, embed, {ephermal: true});
		return true;
	}
}