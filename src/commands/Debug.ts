import { codeBlock, SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import moment from "moment";

export default class DebugCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setName('debug')
				.addStringOption(option => option
					.setName('type')
					.setDescription('type')
					.setRequired(true)
				)
				.setDescription('debug'),
			'debug'
		)
	}
	public dispatch(interaction: DiscordChatInteraction) {
		if (interaction.member.id !== '470952100726308864') {
			this.client.handleError('K tomuto příkazu má přístup jen vybraná skupina lidí!', interaction);
			return false;
		}

		const type = interaction.options.getString('type', true);

		switch (type) {
			case 'sessions': {
				const sessions = this.client.getSessionManager().getSessionsAsArray().map(session => {
					return {
						id: session.id,
						creation_date: moment(session.creationDate).format('HH:mm:ss DD.MM'),
						connection: session.getConnection()?.state.status ?? false,
						player: session.getPlayer()?.state.status ?? false,
						queue: {
							position: session.getQueue().position,
							hash: session.getQueue().queue
						},
						guild: session.guild.id,
						interactionChannel: session.interactionChannel?.id ?? false,
						isJoined: session.isJoined(),
						isLoopEnabled: session.isLooping()
					}
				})

				const code = codeBlock('json', JSON.stringify(sessions, undefined, '\t'));
				interaction.reply(code);
				break;
			}
			default: {
				this.client.handleError('Invalid debug type.', interaction);
			}
		}
		return true;
	}
}