import { AutocompleteInteraction, CacheType, codeBlock, EmbedBuilder, SlashCommandBuilder } from "discord.js";
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
		const user = interaction.member.user;
		if (!user || user.id !== this.client.config.getConfig().system.developerUserID) {
			this.client.handleError('K tomuto příkazu nemáš přístup!', interaction);
			return false;
		}

		try {
			const group = interaction.options.getSubcommandGroup(true);
			if (group) {
				switch (group) {
					case 'session': {
						return this.groupSession(interaction);
					}
					default: {
						this.client.handleError('Neplatný formát příkazu! (group)', interaction);
					}
				}
			}
			else {
				this.client.handleError('Neplatný formát příkazu!', interaction);
			}
		} catch (err) {
			this.client.handleError(err, interaction);
		}

		return false;
	}

	private async groupSession(interaction: DiscordChatInteraction): Promise<boolean> {
		const subcommand = interaction.options.getSubcommand(true);
		if (!subcommand)
			throw 'Neplatný formát příkazu! (subcommand)';
		
		switch (subcommand) {
			case 'list': {
				const sessions = this.client.getSessionManager().getSessionsAsArray();
				if (!sessions.length) {
					interaction.reply({content: 'Nejsou aktivní žádné sessiony!', ephemeral: true})
					return false;
				}

				const table = new Utils.TableGenerator();
				table.addColumn('ID').addColumn('Guild');

				const batches: string[] = [];

				for (let i = 0; i < sessions.length; i++) {
					const session = sessions[i];
					table.addRow(session.id, session.guild.name);

					if (i % 10 == 9 || i >= sessions.length - 1) {
						batches.push(codeBlock(table.build()));
						table.clear('rows');
					}
				}

				await interaction.reply({content: batches[0], ephemeral: true});

				for (let i = 1; i < batches.length; i++) {
					if (!interaction.channel)
						throw 'Unable to list sessions! Interaction channel is undefined.';

					await interaction.followUp({content: batches[i], ephemeral: true});
				}

				return true;
			}
			case 'get': {
				const id = interaction.options.getString('id', true);
				const session = this.client.getSessionManager().getSessionByID(id);

				if (!session)
					throw 'Session nebyla nalezena.';

				const activeItem = session.getQueue().getActiveItem();
				const isPlaylist = activeItem ? Utils.BotUtils.isPlaylistItem(activeItem).toString() : '-';
				const activeVideoLabel: string = session.getQueue().getActiveVideo()?.videoDetails.title ?? '-';

				const creatorUser = this.client.client.users.cache.get(session.createdBy);
				const updateUser = this.client.client.users.cache.get(session.updatedBy);

				const vc = session.getVoiceChannel();
				let listeners: number;
				if (vc) {
					listeners = vc.members.size - 1;
				}
				else
					listeners = NaN;

				const embed = new EmbedBuilder()
					.setTitle(Utils.repeatString('\u200b', 256))
					.setAuthor({
						name: session.guild.name,
						iconURL: session.guild.iconURL() ?? undefined
					})
					.addFields([
						{ name: 'Vytvořena', value: moment(session.creationDate).format('HH:mm:ss DD.MM YYYY'), inline: true },
						{ name: 'Poslední využití', value: moment(session.updateDate).format('HH:mm:ss DD.MM YYYY'), inline: true },
						{ name: '\u200b', value: '\u200b' },
						{ name: 'Vytvořil', value: creatorUser ? creatorUser.displayName : '-', inline: true },
						{ name: 'Naposled využil', value: updateUser ? updateUser.displayName : '-', inline: true },
						{ name: '\u200b', value: '\u200b' },
						{ name: 'Kanál', value: session.getVoiceChannel()?.name ?? 'nepřipojen', inline: true },
						{ name: 'Připojen', value: session.isJoined() ? 'true' : 'false', inline: true },
						{ name: 'Posluchači', value: isNaN(listeners) ? '-' : listeners.toString(), inline: true },
						{ name: '\u200b', value: '\u200b' },
						{ name: 'Hraje', value: session.youtubePlayer.isPlaying() ? 'true' : 'false', inline: true },
						{ name: 'Playlist', value: isPlaylist, inline: true },
						{ name: 'Video', value: activeVideoLabel, inline: true },
						{ name: '\u200b', value: '\u200b' },
						{ name: 'Loop', value: session.isLooping() ? 'true' : 'false', inline: true },
					])
					.setColor(this.client.getInteractionManager().DEFAULT_EMBED_COLOR)
					.setFooter({
						text: session.id
					})

				await interaction.reply({embeds: [embed], ephemeral: true});
				return true;
			}
			case 'destroy': {
				const id = interaction.options.getString('id', true);
				const session = this.client.getSessionManager().getSessionByID(id);

				if (!session)
					throw 'Session nebyla nalezena.';

				const r = this.client.getSessionManager().destroySession(session);
				if (!r)
					throw 'Session nemohla být zrušena!';

				interaction.reply({content: 'Session zrušena!', ephemeral: true});

				return true;
			}
			default: {
				this.client.handleError(`Neplatný formát příkazu! (${subcommand} nebyl implementován)`, interaction);
			}
		}

		return false;
	}

	public onAutoComplete(interaction: AutocompleteInteraction<CacheType>, session: MusicSession | null) {
		const sessions = this.client.getSessionManager().getSessionsAsArray();
		interaction.respond(sessions.map(session => ({
			name: session.guild.name,
			value: session.id
		})));
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