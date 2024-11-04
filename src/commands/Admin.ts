import { AutocompleteInteraction, CacheType, codeBlock, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import moment from "moment";
import Utils from "../utils";
import MusicSession from "../components/MusicSession";
import { v4 as uuidv4} from 'uuid';

export default class AdminCommand extends DiscordCommand implements DiscordCommandInterface {
	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
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
				)
				.addSubcommandGroup(group => group
					.setName('debug')
					.setDescription('Debugovací nástroje')
					.addSubcommand(cmd => cmd
						.setName('fillqueue')
						.setDescription('Fill queue with random items.')
						.addIntegerOption(input => input
							.setName('amount')
							.setDescription('Amount of queue items to add')
							.setRequired(true)
							.setMinValue(0)
							.setMaxValue(100)
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
					case 'debug': {
						return this.groupDebug(interaction);
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

				const activeItem = session.queue.getActiveItem();
				const isPlaylist = activeItem ? Utils.BotUtils.isPlaylistItem(activeItem).toString() : '-';
				const activeVideoLabel: string = (await session.queue.getActiveVideo())?.videoDetails.title ?? '-';

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

	private async groupDebug(interaction: DiscordChatInteraction): Promise<boolean> {
		const subcommand = interaction.options.getSubcommand(true);
		if (!subcommand)
			throw 'Neplatný formát příkazu! (subcommand)';

		switch (subcommand) {
			case 'fillqueue': {
				const amount = interaction.options.getInteger('amount', true);
				const session = this.client.getSessionManager().getSession(interaction);
				if (!session) {
					this.client.handleError('Není aktivní session.', interaction);
					return false;
				}

				if (!this.client.config.developerUser)
					throw 'Developer user must be defined in config!';

				const items: QueuedItem[] = [];

				for (let i = 0; i < amount; i++) {
					const user: UserDetails = {
						id: this.client.config.developerUser.id,
						name: this.client.config.developerUser.displayName,
						avatarURL: this.client.config.developerUser.avatarURL() ?? undefined
					};

					const video: QueuedVideo = {
						id: uuidv4(),
						user: user,
						videoDetails: {
							author: {
								name: `Autor ${i}`,
								url: 'https://youtube.com/',
							},
							length: Utils.randomNumber(30, 1200),
							thumbnail: 'https://images-ext-1.discordapp.net/external/Dp0W2oMcoxSPgBOgMszY0X4WcvbgmJf1lAGQRIpboAU/https/i.ytimg.com/vi_webp/XEolg577-DA/maxresdefault.webp?format=webp&width=1193&height=671',
							title: `Title ${i}`,
							uploadDate: new Date().toString(),
							videoId: 'VLP_tnnDGSQ'
						},
						addedAt: Date.now(),
						deleted: false
					}
					if (Math.random() > .2) {
						// Video
						items.push(video);
					}
					else {
						// Playlist
						const playlist: QueuedPlaylist = {
							id: uuidv4(),
							user: user,
							position: 0,
							playlistID: 'PLjZL-Vq5QSkr6m9KEEQ_JlJrMMXypMdX8',
							activeVideo: Math.random() > .5 ? video : undefined,
							playlistDetails: {
								channelTitle: `Channel title ${i}`,
								description: `Desc ${i}`,
								title: `Playlist title ${i}`,
								thumbnails: {
									standard: {
										height: 100,
										width: 100,
										url: 'https://images-ext-1.discordapp.net/external/Dp0W2oMcoxSPgBOgMszY0X4WcvbgmJf1lAGQRIpboAU/https/i.ytimg.com/vi_webp/XEolg577-DA/maxresdefault.webp?format=webp&width=1193&height=671',
									}
								},
							},
							videoList: ['VLP_tnnDGSQ', 'VLP_tnnDGSQ', 'VLP_tnnDGSQ'],
							addedAt: Date.now(),
							deleted: false
						};

						items.push(playlist);
					}
				}

				session.queue.queue.push(...items);
				this.client.interactionManager.respondEmbed(interaction, `Bylo přidáno ${amount} položek do queue.`, undefined, undefined, {ephermal: true})
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