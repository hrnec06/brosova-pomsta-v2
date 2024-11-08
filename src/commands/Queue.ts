import { ActionRow, ActionRowBuilder, AutocompleteInteraction, blockQuote, bold, ButtonBuilder, ButtonComponent, ButtonInteraction, ButtonStyle, CacheType, channelLink, codeBlock, EmbedBuilder, escapeBold, escapeCodeBlock, escapeNumberedList, hyperlink, SlashCommandBuilder, userMention } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import MusicSession from "../components/MusicSession";
import Utils from "../utils";

interface QueueListSession {
	id: string,
	lastUsedAt: number,
	lastUser: UserSimple,
	interaction: DiscordChatInteraction,
	channelID: string,
	page: number,
}

interface QueueRemoveSession {
	id: string,
	user: UserSimple,
	interaction: DiscordChatInteraction,
	queuePosition: number,
	queueItem: QueuedItem,
	musicSessionID: string,
	createdAt: number
}

export default class QueueCommand extends DiscordCommand implements DiscordCommandInterface {
	private readonly ITEMS_PER_PAGE: number = 				10;
	private readonly SESSION_EXPIRY: number = 				1000 * 60 * 10;
	// private readonly SESSION_EXPIRY: number = 				1000 * 10;
	private readonly SESSION_CLEANUP_INTERVAL: number = 	1000 * 60 * 2;
	// private readonly SESSION_CLEANUP_INTERVAL: number = 	1000 * 10;

	private queueListSessions: Record<string, QueueListSession> = {};
	private queueRemoveSessions: Record<string, QueueRemoveSession> = {};

	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setDescription('Funkce pro ovládání fronty.')
				.addSubcommand(cmd => cmd
					.setName('list')
					.setDescription('Zobrazí frontu.')
					.addIntegerOption(input => input
						.setName('page')
						.setDescription('Stránka.')
						.setMinValue(0)
					)
				)
				.addSubcommand(cmd => cmd
					.setName('remove')
					.setDescription('Odstraní položku z fronty.')
					.addIntegerOption(input => input
						.setName('position')
						.setDescription('Pozice ve frontě.')
						.setRequired(true)
						.setAutocomplete(true)
						.setMinValue(0)
					)
				)
				.addSubcommand(cmd => cmd
					.setName('clear')
					.setDescription('Vyprázdní frontu.')
				)
				.addSubcommand(cmd => cmd
					.setName('restore')
					.setDescription('Obnoví předchozí frontu z doby před odpojením robota.')
				),
			'queue'
		);

		setInterval(async () => {
			// Session cleanup
			const listSessions = Utils.values(this.queueListSessions);
			for (const session of listSessions) {
				if (session.lastUsedAt + this.SESSION_EXPIRY < Date.now()) {
					this.debugger(`Destory list session ${session.id}`);
					this.destroyListSession(session);
				}
			}

			const removeSessions = Utils.values(this.queueRemoveSessions);
			for (const session of removeSessions) {
				if (session.createdAt + this.SESSION_EXPIRY < Date.now()) {
					this.debugger(`Destroy remove session ${session.id}`);

					this.destroyRemoveSession(session);
				}
			}

		}, this.SESSION_CLEANUP_INTERVAL);
	}

	// Session managment
	private async destroyListSession(session: QueueListSession) {
		await session.interaction.deleteReply();
		delete this.queueListSessions[session.id];
	}

	private async destroyRemoveSession(queueSession: QueueRemoveSession) {
		delete this.queueRemoveSessions[queueSession.id];

		const session = this.client.getSessionManager().getSessionByID(queueSession.musicSessionID);
		if (queueSession.queueItem.deleted) {
			if (!session) return;

			await queueSession.interaction.deleteReply();

			const r = session.queue.removeQueueItem(queueSession.queueItem.id);
			
			if (!r) {
				await this.client.handleError('Video ve frontě se nepovedlo smazat.', queueSession.interaction);
				queueSession.queueItem.deleted = false;
				return;
			}
		}
		else {
			const embed = new EmbedBuilder()
						.setTitle(Utils.BotUtils.isVideoItem(queueSession.queueItem) ? 'Video bylo vráceno.' : 'Playlist byl vrácen.')
						.setColor(this.client.interactionManager.DEFAULT_SUCCESS_EMBED_COLOR)

			await queueSession.interaction.editReply({embeds: [embed], components: []});
		}
	}

	/**
	 * Handle interaction
	 */
	public async dispatch(interaction: DiscordChatInteraction, session: MusicSession | null) {
		if (!Utils.BotUtils.isValidMember(interaction.member)) {
			this.client.handleError('Invalid member.', interaction);
			return false;
		}

		const voiceChannel = interaction.member.voice.channel;

		if (!voiceChannel) {
			const embed = this.client.interactionManager.generateErrorEmbed("Nejsi připojen do žádného kanálu!");
			interaction.reply({ embeds: [embed], ephemeral: true });
			return false;
		}

		const interactionChannel = interaction.channel;
		if (!interactionChannel) {
			const embed = this.client.interactionManager.generateErrorEmbed("Neplatný textový channel.");
			interaction.reply({ embeds: [embed], ephemeral: true });
			return false;
		}

		try {
			const session = this.client.getSessionManager().getSession(interaction);
			if (!session) {
				const embed = this.client.interactionManager.generateErrorEmbed("Relace není aktivní, použijte příkaz /play nebo /join!");
				interaction.reply({ embeds: [embed], ephemeral: true });
				return false;
			}

			const subcommand = interaction.options.getSubcommand(true);

			switch (subcommand) {
				case 'list': {
					const sameChannelSession = Utils.findValue(this.queueListSessions, (_id, session) => session.channelID == interaction.channelId);
					if (sameChannelSession)
						await this.destroyListSession(sameChannelSession);

					const page = (interaction.options.getInteger('page', false) ?? 1) - 1;

					const [embed, actionRow] = this.generateQueueList(interaction, session, page);
					const response = await this.client.interactionManager.respondEmbed(interaction, [embed], {
						components: [ actionRow ]
					});

					if (!response) {
						interaction.deleteReply();
						this.client.handleError(new Error('Failed to create queue session.'));
						return false;
					}

					this.queueListSessions[response.id] = {
						id: response.id,
						channelID: interaction.channelId,
						lastUsedAt: Date.now(),
						lastUser: {
							id: interaction.user.id,
							name: interaction.user.displayName
						},
						page: page,
						interaction: interaction
					}

					break;
				}
				case 'remove': {
					const ix = interaction.options.getInteger('position', true) - 1;
					if (ix < 0) {
						const embed = this.client.interactionManager.generateErrorEmbed("Pozice nemůže být menší než 1!");
						await interaction.reply({ embeds: [embed], ephemeral: true });
						return false;
					}

					const queue = this.getQueue(session);
					if (ix > queue.length - 1) {
						const embed = this.client.interactionManager.generateErrorEmbed(`Vybraná pozice přesahuje délku fronty! (${queue.length})`);
						await interaction.reply({ embeds: [embed], ephemeral: true });
						return false;
					}

					const itemToRemove = queue[ix];
					if ((await session.queue.getActiveVideo())?.id == itemToRemove?.id) {
						const embed = this.client.interactionManager.generateErrorEmbed(`Video se právě přehrává, nelze smazat.`);
						await interaction.reply({ embeds: [embed], ephemeral: true });
						return false;
					}
					
					const [embed, actionRow] = this.generateRemoveEmbed(itemToRemove, ix);
					const response = await this.client.interactionManager.respondEmbed(interaction, [embed], {ephermal: true, components: [actionRow]});

					if (!response) {
						interaction.deleteReply();
						this.client.handleError(new Error('Failed to create "remove" session.'));
						return false;
					}

					itemToRemove.deleted = true;

					this.queueRemoveSessions[response.id] = {
						id: response.id,
						createdAt: Date.now(),
						interaction: interaction,
						queueItem: itemToRemove,
						queuePosition: ix,
						user: {
							id: interaction.user.id,
							name: interaction.user.displayName
						},
						musicSessionID: session.id
					}
					break;
				}
				case 'clear': {
					const queueLenth = session.queue.getQueueAsArray().length;
					if (!queueLenth) {
						await this.client.interactionManager.respondEmbed(interaction, 'Ve frontě nejsou žádná videa!', undefined, 'error', {ephermal: true});
						return false;
					}
					session.queue.clearQueue();
					await this.client.interactionManager.respondEmbed(interaction, 'Fronta byla vyčištěna!', `Bylo odstraněno ${queueLenth} položek.`, 'success');

					break;
				}
				case 'restore': {
					const result = session.queue.restore();
					if (result) {
						await this.client.interactionManager.respondEmbed(interaction, 'Fronta byla obnovena.', `Bylo obnoveno ${session.queue.getQueueAsArray().length} položek.`, 'success');
					}
					else {
						await this.client.interactionManager.respondEmbed(interaction, 'Fronta nelze obnovit.', undefined, 'error');
					}

					break;
				}
				default: {
					await this.client.handleError(new Error('Unknown subcommand: ' + subcommand), interaction);
					return false;
				}
			}
		}
		catch (err) {
			await this.client.handleError(err, interaction);
			return false;
		}

		return true;
	}

	/**
	 * Handle Autocomplete
	 */
	public onAutoComplete(interaction: AutocompleteInteraction<CacheType>, session: MusicSession | null) {
		if (!session) {
			return [];
		}
		const search = interaction.options.getFocused().toLowerCase().trim();

		const subCmd = interaction.options.getSubcommand(true);
		switch (subCmd) {
			case 'remove': {
				const queue = this.getQueue(session);
				const response = queue.slice(0, 25)
				.map((item, ix) => ({
					name: Utils.BotUtils.isVideoItem(item) ? item.videoDetails.title : item.playlistDetails.title,
					value: ix + 1
				}))
				.filter(item => item.name.toLowerCase().trim().includes(search));

				return response;
			}
			default: {
				return [];
			}
		}
	}

	/**
	 * Handle button
	 */
	public async onButton(interaction: ButtonInteraction<CacheType>, path: ComponentPath, session: MusicSession | null) {
		const interactionID = interaction.message.interactionMetadata?.id;

		await interaction.deferUpdate();

		if (path.action == 'list') {
			var queueSession: QueueListSession;
			if (!interactionID || !(queueSession = this.queueListSessions[interactionID])) {
				interaction.message.deletable && interaction.message.delete();
				this.client.handleError('Neplatná interakce.', interaction);
				return;
			}

			if (!session) {
				this.client.handleError('Není aktivní žádná relace.', interaction);
				return;
			}

			const queue = this.getQueue(session);

			switch (path.id) {
				case 'prev': {
					queueSession.page = Math.max(queueSession.page - 1, 0);
					break;
				}
				case 'next': {
					queueSession.page = Math.min(Math.ceil(queue.length / this.ITEMS_PER_PAGE) - 1, queueSession.page + 1);
					break;
				}
				case 'close': {
					await this.destroyListSession(queueSession);
					return;
				}
				default: {
					this.client.handleError(`Invalid button id '${path.id}'`);
					return;
				}
			}

			queueSession.lastUsedAt = Date.now();
			queueSession.lastUser = {
				id: interaction.user.id,
				name: interaction.user.displayName
			};

			const [embed, actionRow] = this.generateQueueList(interaction, session, queueSession.page);
			queueSession.interaction.editReply({embeds: [embed], components: [actionRow]});
		}
		else if (path.action == 'remove') {
			var removeSession: QueueRemoveSession;
			if (!interactionID || !(removeSession = this.queueRemoveSessions[interactionID])) {
				interaction.message.deletable && interaction.message.delete();
				this.client.handleError('Neplatná interakce.', interaction);
				return;
			}

			switch (path.id) {
				case 'confirm': {
					await this.destroyRemoveSession(removeSession);
					break;
				}
				case 'revert': {
					removeSession.queueItem.deleted = false;
					await this.destroyRemoveSession(removeSession);
					break;
				}
				default: {
					this.client.handleError(`Invalid button id '${path.id}'`);
					return;
				}
			}
		}
		else {
			interaction.message?.deletable && interaction.message.delete();
			this.client.handleError(`Neplatná interakce. (${path.action ?? 'Akce nedefinována.'})`, interaction);
			return;
		}
	}

	/**
	 * Prepare queue for list
	 */
	private getQueue(session: MusicSession, position?: number): QueuedItem[] {
		return session.queue.getQueueAsArray().filter((_v, i) => i >= (position != undefined ? position : session.queue.position));
	}

	/**
	 * Generate queue list embed
	 */
	private generateQueueList(interaction: DiscordInteraction, session: MusicSession, page: number): [EmbedBuilder, ActionRowBuilder<ButtonBuilder>] {
		const filteredQueue = this.getQueue(session);
		const maxPage = Math.ceil(filteredQueue.length / this.ITEMS_PER_PAGE);
		page = Math.min(Math.max(page, 0), maxPage);

		const vc = session.getVoiceChannel();

		const embed = new EmbedBuilder()
			.setTitle(`Fronta pro ${vc ? channelLink(vc.id) : session.guild.name}`)
			.setColor(this.client.interactionManager.DEFAULT_SUCCESS_EMBED_COLOR)
			.setFooter({
				text: `Strana ${page + 1}/${maxPage}`
			});

		if (!filteredQueue.length) {
			embed.setDescription('Ve frontě nejsou žádná videa!');
		}
		else {
			var description = '';
			const col2: string[] = [];
			let col2Width: number = 0;

			for (let i = this.ITEMS_PER_PAGE * page; i < Math.min(this.ITEMS_PER_PAGE * (page + 1), filteredQueue.length); i++) {
				const item = filteredQueue[i];

				const col2Item = Utils.BotUtils.isVideoItem(item) ? `[${Utils.formatTime2(item.videoDetails.length * 1000)}]` : `[${item.videoList.length} videos]`;	
				if (col2Item.length > col2Width)
					col2Width = col2Item.length;
				
				col2.push(col2Item);
			}

			for (let i = this.ITEMS_PER_PAGE * page; i < Math.min(this.ITEMS_PER_PAGE * (page + 1), filteredQueue.length); i++) {
				const item = filteredQueue[i];
				if (!item) {
					description += 'Invalid item.\n'
					continue;
				}

				description += `${i + 1}. `;
				description += '`' + col2[i % this.ITEMS_PER_PAGE].padStart(col2Width, ' ') + '` ';
				description += bold(Utils.BotUtils.isVideoItem(item) ? item.videoDetails.title : item.playlistDetails.title);
				description += ` - ${userMention(item.user.id)}`
				description += '\n';
			}
			embed.setDescription(description);
		}

		const actionRow = this.generateListPagination(page, maxPage);

		return [embed, actionRow];
	}

	/**
	 * Generate remove embed
	 */
	private generateRemoveEmbed(item: QueuedItem, position: number): [EmbedBuilder, ActionRowBuilder<ButtonBuilder>] {
		const title = Utils.BotUtils.getTitle(item);

		const embed = new EmbedBuilder()
			.setTitle(Utils.BotUtils.isVideoItem(item) ? `Video "${title}" bylo odstraněno z fronty.` : `Playlist "${title}" byl odstraněn z fronty.`)
			.setURL(Utils.BotUtils.getLink(item))
			.setThumbnail(Utils.BotUtils.getThumbnail(item))
			.addFields([
				{ name: 'Pozice', value: (position + 1).toString(), inline: true },
			])
			.setColor(this.client.interactionManager.DEFAULT_SUCCESS_EMBED_COLOR)
			.setFooter({
				text: item.user.name,
				iconURL: item.user.avatarURL
			})
			.setTimestamp(item.addedAt);

		if (Utils.BotUtils.isVideoItem(item)) {
			embed.addFields({name: 'Délka videa', value: Utils.formatTime2(item.videoDetails.length * 1000), inline: true});
		}
		else {
			embed.addFields({name: 'Délka playlistu', value: item.videoList.length.toString(), inline: true});
		}


		const confirmButton = new ButtonBuilder()
			.setCustomId(this.makePath('confirm', 'remove'))
			.setEmoji('1304529308332855337')
			.setStyle(ButtonStyle.Success)

		const revertButton = new ButtonBuilder()
			.setCustomId(this.makePath('revert', 'remove'))
			.setLabel('Vrátit')
			.setStyle(ButtonStyle.Secondary)

		const actionRow = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(confirmButton, revertButton);

		return [embed, actionRow];
	}

	/**
	 * Generate action row for list
	 */
	private generateListPagination(page: number, maxPage: number): ActionRowBuilder<ButtonBuilder> {
		const buttonPrev = new ButtonBuilder()
			.setCustomId(this.makePath('prev', 'list'))
			.setDisabled(page <= 0)
			.setEmoji('1304529878259073054')
			.setStyle(ButtonStyle.Primary)

		const buttonNext = new ButtonBuilder()
			.setCustomId(this.makePath('next', 'list'))
			.setDisabled(page >= maxPage - 1)
			.setEmoji('1304529852962967574')
			.setStyle(ButtonStyle.Primary)

		const buttonClose = new ButtonBuilder()
			.setCustomId(this.makePath('close', 'list'))
			.setEmoji('1304529399718084608')
			.setStyle(ButtonStyle.Danger)

		const actionRow = new ActionRowBuilder<ButtonBuilder>()
			.setComponents(buttonPrev, buttonNext, buttonClose)

		return actionRow;
	}
}