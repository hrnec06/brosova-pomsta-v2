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
		if (!user || user.id !== this.client.config.getSystem().developerUserID) {
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
					await this.client.interactionManager.respondEmbed(interaction, 'Nejsou aktivní žádné sessiony!', undefined, this.client.interactionManager.DEFAULT_ERROR_EMBED_COLOR, {ephermal: true, ephermalRequired: true});
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

				await this.client.interactionManager.respond(interaction, {content: batches[0], ephemeral: true}, {ephermalRequired: true});

				for (let i = 1; i < batches.length; i++) {
					if (!interaction.channel)
						throw 'Unable to list sessions! Interaction channel is undefined.';

					await this.client.interactionManager.respond(interaction, {content: batches[i], ephemeral: true});
					// await interaction.followUp({content: batches[i], ephemeral: true});
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
				const activeVideoLabel: string = (await session.getQueue().getActiveVideo())?.videoDetails.title ?? '-';

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
					.setColor(this.client.interactionManager.DEFAULT_EMBED_COLOR)
					.setFooter({
						text: session.id
					});

				await this.client.interactionManager.respond(interaction, [ embed ], { ephermal: true, ephermalRequired: true });
				return true;
			}
			case 'destroy': {
				const id = interaction.options.getString('id', true);
				const session = this.client.getSessionManager().getSessionByID(id);

				if (!session)
					throw 'Session nebyla nalezena.';

				const sessionName = session.guild.name;

				const r = this.client.getSessionManager().destroySession(session);
				if (!r)
					throw 'Session nemohla být zrušena!';

				await this.client.interactionManager.respondEmbed(interaction, `Session '${sessionName}' byla zrušena!`, undefined, this.client.interactionManager.DEFAULT_SUCCESS_EMBED_COLOR, {ephermal: true, ephermalRequired: true});
				return true;
			}
			default: {
				this.client.handleError(`Neplatný formát příkazu! (${subcommand} nebyl implementován)`, interaction);
			}
		}

		return false;
	}

	public onAutoComplete(interaction: AutocompleteInteraction<CacheType>) {
		const sessions = this.client.getSessionManager().getSessionsAsArray();
		interaction.respond(sessions.map(session => ({
			name: session.guild.name,
			value: session.id
		})));
	}
}