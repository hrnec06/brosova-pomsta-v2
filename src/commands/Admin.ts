import { AutocompleteInteraction, CacheType, codeBlock, SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import moment from "moment";
import Utils from "../utils";
import MusicSession from "../MusicSession";

export default class AdminCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setName('admin')
				.setDescription('Příkaz pro správu bota. Přístup mají pouze vybraní uživatelé.')
				.addSubcommandGroup(group => group
					.setName('session')
					.setDescription('Session management.')
					.addSubcommand(cmd => cmd
						.setName('list')
						.setDescription('Zobrazí list aktivních sessionů.')
					)
					.addSubcommand(cmd => cmd
						.setName('get')
						.setDescription('Zobrazí info o sessionu.')
						.addStringOption(option => option
							.setName('id')
							.setDescription('ID sessionu')
							.setAutocomplete(true)
							.setRequired(true)
						)
					)
					.addSubcommand(cmd => cmd
						.setName('destroy')
						.setDescription('Terminuje session.')
						.addStringOption(option => option
							.setName('id')
							.setDescription('ID sessionu')
							.setAutocomplete(true)
							.setRequired(true)
						)
					)
				),
			'admin'
		)
	}
	public async dispatch(interaction: DiscordChatInteraction) {
		return false;
	}
	public onAutoComplete(interaction: AutocompleteInteraction<CacheType>, session: MusicSession | null) {
		console.log('Autocomplete detected!');
	}

	public async dispatchOld(interaction: DiscordChatInteraction) {
		if (interaction.member.id !== '470952100726308864') {
			this.client.handleError('K tomuto příkazu má přístup jen vybraná skupina lidí!', interaction);
			return false;
		}

		const type = interaction.options.getString('type', true);

		console.log(interaction);

		switch (type) {
			case 'sessions': {
				const sessions = this.client.getSessionManager().getSessionsAsArray();
				const table = new Utils.TableGenerator();
				table.addColumn('Session ID').addColumn('Guild');

				const batches: string[] = [];

				if (!sessions.length) {
					interaction.reply('No active sessions.');
					return true;
				}

				for (let i = 0; i < sessions.length; i++) {
					const newBatch = i % 10 === 9;
					const session = sessions[i];

					table.addRow(session.id, session.guild.name);

					if (newBatch || i >= sessions.length - 1) {
						batches.push(codeBlock(table.build()));
						table.clear('rows');
					}
				}

				for (let i = 1; i < batches.length; i++) {
					const batch = batches[i];
					await interaction.channel?.send(batch);
				}

				interaction.reply(batches[0]);
				break;
			}
			case 'session': {
				var id: string;
				try {
					id = interaction.options.getString('arg1', true);
				} catch (err) {
					interaction.reply('Session ID is required.');
					return false;
				}

				const session = this.client.getSessionManager().getSessionByID(id);
				if (!session) {
					interaction.reply('Session not found.');
					return false;
				}

				console.log(session);

				interaction.reply('Session.');
			}
			default: {
				this.client.handleError('Invalid debug type.', interaction);
			}
		}
		return true;
	}
}