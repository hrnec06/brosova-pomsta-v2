import { ActionRowBuilder, AutocompleteInteraction, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, Channel, codeBlock, Embed, EmbedBuilder, ModalBuilder, ModalSubmitInteraction, PermissionsBitField, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import moment from "moment";
import Utils from "../utils";
import MusicSession from "../components/MusicSession";
import { v4 as uuidv4} from 'uuid';
import path from "path";
import FileSystem from "../utils/FileSystem";
import debug from "debug";
import assert from "node:assert";


export default class AdminCommand extends DiscordCommand implements DiscordCommandInterface {
	public updateManager: UpdateManager;
	private UPDATE_POST_MODAL_PATH: string;

	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setDescription('Příkaz pro správu bota. Přístup mají pouze vybraní uživatelé.')
				.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
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
				)
				.addSubcommandGroup(group => group
					.setName('update')
					.setDescription('Příkazy pro zveřejňování updatů.')
					.addSubcommand(cmd => cmd
						.setName('post')
						.setDescription('Napsat nový update.')
					)
				),
			'admin'
		);
		this.UPDATE_POST_MODAL_PATH = this.makePath('post', 'update');

		this.updateManager = new UpdateManager(client);
	}
	public async dispatch(interaction: DiscordChatInteraction) {
		if (!Utils.BotUtils.isValidMember(interaction.member)) {
			this.client.handleError('Invalid member.', interaction);
			return false;
		}

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
					case 'update': {
						return this.groupUpdate(interaction)
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

	private async groupUpdate(interaction: DiscordChatInteraction): Promise<boolean> {
		const subcommand = interaction.options.getSubcommand(true);
		if (!subcommand)
			throw 'Neplatný formát příkazu! (subcommand)';

		switch (subcommand) {
			case 'post': {
				const modal = this.updateManager.buildModal(this.UPDATE_POST_MODAL_PATH);
				await interaction.showModal(modal);
				break;
			}
			default: {
				this.client.handleError(`Neplatný formát příkazu! (${subcommand} nebyl implementován)`, interaction);
			}
		}
		return false;
	}

	public onAutoComplete(interaction: AutocompleteInteraction<CacheType>) {
		const sessions = this.client.getSessionManager().getSessionsAsArray();
		return sessions.map(session => ({
			name: session.guild.name,
			value: session.id
		}));
	}

	public async onModal(interaction: ModalSubmitInteraction<CacheType>, path: ComponentPath, session: MusicSession | null) {
		await this.pathSwitch(path, s => s
			.action('update', action => action
				// UPDATE => POST
				.id('post', async () => {
					if (!this.client.config.developerUser?.id || interaction.user.id != this.client.config.developerUser.id) {
						this.client.handleError('Na toto nemáš práva!', interaction);
						return;
					}

					const feature 	= interaction.fields.getTextInputValue('feature').trim();
					const update 	= interaction.fields.getTextInputValue('update').trim();
					const upgrade 	= interaction.fields.getTextInputValue('upgrade').trim();
					const bug 		= interaction.fields.getTextInputValue('bug').trim();
					const internal = interaction.fields.getTextInputValue('internal').trim();

					if (feature == '' && update == '' && upgrade == '' && bug == '' && internal == '') {
						await this.client.handleError('Nelze vytvořit prázdný update!', interaction);
						return;
					}

					const entry = this.updateManager.buildEntry(feature, update, upgrade, bug, internal);
					const updateEmbeds = this.updateManager.generateUpdateEmbed(entry);

					this.updateManager.createSession(interaction, entry);

					const confirmButton = new ButtonBuilder()
						.setCustomId(this.makePath('confirm', 'update'))
						.setEmoji('1304529308332855337')
						.setStyle(ButtonStyle.Success);

					const editButton = new ButtonBuilder()
						.setCustomId(this.makePath('edit', 'update'))
						.setEmoji('1304529223154929666')
						.setStyle(ButtonStyle.Primary);

					const cancelButton = new ButtonBuilder()
						.setCustomId(this.makePath('cancel', 'update'))
						.setEmoji('1304529399718084608')
						.setStyle(ButtonStyle.Danger);

					const actionRow = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(confirmButton, editButton, cancelButton);

					await this.client.interactionManager.respond(interaction, updateEmbeds, {ephermal: true, components: [actionRow]});
				})
			)
			.default(() => {
				this.client.handleError('Neplatný požadavek.', interaction);
			})
		);
	}

	public async onButton(interaction: ButtonInteraction<CacheType>, path: ComponentPath, session: MusicSession | null) {
		this.pathSwitch(path, s => s
			.action<{session: UpdatePostSession | null}>('update', a => a
				.use(() => {
					const session = this.updateManager.getSession(interaction);

					return {
						session: session
					}
				})
				.check((_id, ctx) => {
					const valid = ctx.session != null;
					if (!valid) {
						this.client.handleError('Neplatná interakce!', interaction);
					}
					return valid;
				})
				.id('confirm', async (ctx) => {
					assert(ctx.session != null, 'Context session is null!');

					await interaction.deferReply();

					await this.updateManager.destroySession();
					const result = await this.updateManager.post(ctx.session.entry);
					await this.client.interactionManager.respondEmbed(interaction, `Update ${ctx.session.entry.version} byl zveřejněn a rozeslán do ${result ?? 0} serverů!`, undefined, 'success', {ephermal: true});
				})
				.id('edit', (ctx) => {
					assert(ctx.session != null, 'Context session is null!');

					const modal = this.updateManager.buildModal(this.UPDATE_POST_MODAL_PATH, ctx.session.entry);
					interaction.showModal(modal);
				})
				.id('cancel', async (ctx) => {
					assert(ctx.session != null, 'Context session is null!');

					await this.updateManager.destroySession();
					await this.client.interactionManager.respondEmbed(interaction, `Update ${ctx.session.entry.version} byl zrušen.`, undefined, 'success', {ephermal: true});
				})
				.default(() => {
					this.client.handleError('Neplatný požadavek!', interaction);
				})
			)
		)
	}
}

interface UpdatePostSession {
	entry: UpdateDataEntry,
	last_update: number,
	interaction: DiscordModalInteraction
}

interface UpdateDataStructure {
	updates: UpdateDataEntry[],
	subscribers: Partial<Record<string, string>>
}

type UpdateDataEntryTypes = 'feature' | 'update' | 'upgrade' | 'bug' | 'internal';
interface UpdateDataEntry {
	id: string,
	create_date: number,
	version: string,
	data: {
		feature: string,
		update: string,
		upgrade: string,
		bug: string,
		internal: string
	}
}
class UpdateManager extends FileSystem<UpdateDataStructure> {
	private SESSION_MAX_AGE = 1000 * 60 * 60;
	private SESSION_CHECK_INTERVAL = 1000 * 60 * 2;
	public updatePostSession?: UpdatePostSession;

	constructor(client: MusicBot) {
		super('data/update.json', client, {
			generateOldFile: true,
			debugger: debug('bp:updateManager')
		});

		setInterval(() => {
			if (!this.updatePostSession) return;

			if (this.updatePostSession.last_update + this.SESSION_MAX_AGE < Date.now()) {
				this.destroySession();
			}
		}, this.SESSION_CHECK_INTERVAL);
	}

	public getSession(interaction: DiscordButtonInteraction) {
		if (!this.updatePostSession) return null;
		if (interaction.user.id !== this.updatePostSession.interaction.user.id) return null;

		return this.updatePostSession;
	}

	public async destroySession() {
		if (!this.updatePostSession) return;

		if (this.updatePostSession.interaction.replied)
			await this.updatePostSession.interaction.deleteReply();

		this.updatePostSession = undefined;
	}

	public async createSession(interaction: DiscordModalInteraction, entry: UpdateDataEntry) {
		if (this.updatePostSession)
			await this.destroySession();

		const session: UpdatePostSession = {
			entry: entry,
			interaction: interaction,
			last_update: Date.now(),
		};

		this.updatePostSession = session;
	}

	public buildEntry(feature: string, update: string, upgrade: string, bug: string, internal: string): UpdateDataEntry {
		const entry: UpdateDataEntry = {
			id: uuidv4(),
			version: this.client.BOT_VERSION,
			create_date: Date.now(),
			data: {
				feature,
				update,
				upgrade,
				bug,
				internal
			}
		};

		return entry;
	}

	public buildModal(modalPath: string, entry?: UpdateDataEntry) {
		const modal = new ModalBuilder()
			.setCustomId(modalPath)
			.setTitle('Přidat nový update')

		const buildInput = (id: UpdateDataEntryTypes, label: string) => {
			const field = new TextInputBuilder()
				.setCustomId(id)
				.setLabel(label)
				.setStyle(TextInputStyle.Paragraph)
				.setRequired(false);

			if (entry)
				field.setValue(entry.data[id]);

			return new ActionRowBuilder<TextInputBuilder>().addComponents(field);
		}

		modal.addComponents(
			buildInput('feature', 'Novinky'),
			buildInput('update', 'Update'),
			buildInput('upgrade', 'Vylepšení'),
			buildInput('bug', 'Opravené bugy'),
			buildInput('internal', 'Interní')
		);

		return modal;
	}

	public async post(entry: UpdateDataEntry): Promise<number | false> {
		this.getData().updates.push(entry);

		try {
			const r = await this.saveData();
			if (!r)
				return false;
		} catch (err) {
			console.error(err);
			return false;
		}

		const embed = this.generateUpdateEmbed(entry);

		const subscribers = Utils.entries(this.getData().subscribers);
		this.debugger('Sending updates to %d subscribers.', subscribers.length);

		const subscribersToRemove: string[] = [];

		for (const subscriber of subscribers) {
			const [guildID, channelID] = subscriber;

			let channel: Channel | null;
			try {
				channel = this.client.client.channels.cache.get(channelID) || (await this.client.client.channels.fetch(channelID));
			} catch {
				channel = null;
			}
			if (!channel) {
				this.debugger('Channel ID %d not found.', channelID);
				subscribersToRemove.push(guildID);
				continue;
			}

			if (!channel.isSendable()) {
				this.debugger('Channel ID %d is not sendable.', channelID);
				subscribersToRemove.push(guildID);
				continue;
			}

			await channel.send({embeds: embed});
		}

		if (subscribersToRemove.length > 0) {
			this.debugger('Removing invalid channels (%d)', subscribersToRemove.length);

			const data = this.getData();

			const newSubscribers = Utils.filter(data.subscribers, (key) => !subscribersToRemove.includes(key));
			data.subscribers = newSubscribers;

			if (!await this.saveData(data)) {
				this.debugger('Failed to remove invalid channels!');
			}
		}

		return subscribers.length - subscribersToRemove.length;
	}

	public generateUpdateEmbed(update: UpdateDataEntry): EmbedBuilder[] {
		const makeEmbed = (title: string, description: string, color: number) => {
			const embed = new EmbedBuilder()
				.setTitle(title)
				.setDescription(description)
				.setColor(color)

			return embed;
		}

		const embeds: EmbedBuilder[] = [];
		
		const header = new EmbedBuilder()
			.setTitle(`Update ${update.version}`)
			.setColor(this.client.interactionManager.DEFAULT_EMBED_COLOR)
			.setTimestamp(update.create_date);

		embeds.push(header);

		if (update.data.feature != '')
			embeds.push(makeEmbed('Novinky', update.data.feature, 0x00CC04));

		if (update.data.update != '')
			embeds.push(makeEmbed('Update', update.data.update, 0xFF8000));

		if (update.data.upgrade != '')
			embeds.push(makeEmbed('Vylepšení', update.data.upgrade, 0xBF00FF));

		if (update.data.bug != '')
			embeds.push(makeEmbed('Opravené bugy', update.data.bug, 0xFF0000));

		if (update.data.internal != '')
			embeds.push(makeEmbed('Interní', update.data.internal, 0xb0b0b0));

		return embeds;
	}

	public isSubscribed(guildID: string): boolean {
		return this.getData().subscribers[guildID] != undefined;
	}

	public async subscribe(guildID: string, channelID: string) {
		const data = this.getData();
		data.subscribers[guildID] = channelID;
		return await this.saveData(data);
	}

	public async unsubscribe(guildID: string) {
		const data = this.getData();
		data.subscribers = Utils.filter(data.subscribers, (key) => key != guildID);
		return await this.saveData(data);
	}

	validateContent(jsonContent: any): boolean {
		const check = (field: string) => {
			return field in jsonContent;
		}

		if (!check('updates')) {
			this.debugger(`ERROR: 'updates' not found in file structure.`);
			return false;
		}
		else if (!check('subscribers')) {
			this.debugger(`ERROR: 'updates' not found in file structure.`);
			return false;
		}

		return true;
	}

	getDefaultData(): UpdateDataStructure {
		return {
			updates: [],
			subscribers: {}
		}
	}
}