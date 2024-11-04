import { ChatInputCommandInteraction, CacheType, SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";

export default class PingCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setDescription('Pong?'),
			'ping'
		)
	}
	public dispatch(interaction: DiscordChatInteraction) {
		// MARK: broken?
		const delay = this.client.client.ws.ping;
		this.client.interactionManager.respondEmbed(interaction, 'Pong!', `Delay: ${delay}ms`, 'success');
		return true;
	}
}