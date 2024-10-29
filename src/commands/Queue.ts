import { ActionRow, ActionRowBuilder, AutocompleteInteraction, blockQuote, bold, ButtonBuilder, ButtonComponent, ButtonInteraction, ButtonStyle, CacheType, channelLink, codeBlock, EmbedBuilder, escapeBold, escapeCodeBlock, escapeNumberedList, SlashCommandBuilder, userMention } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import MusicSession from "../components/MusicSession";
import Utils from "../utils";
import { v4 as uuidv4} from 'uuid';
import { it } from "node:test";

interface QueueListSession {
	lastUsedAt: number,
	lastUser: {
		id: string,
		name: string
	},
	interaction: DiscordChatInteraction,
	page: number,
}

export default class QueueCommand extends DiscordCommand implements DiscordCommandInterface {
	private readonly ITEMS_PER_PAGE: number = 10;

	private queueListSessions: Record<string, QueueListSession> = {};

	constructor(private client: MusicBot) {
		super(
			new SlashCommandBuilder()
				.setName('queue')
				.setDescription('Funkce pro ovládání fronty.')
				.addSubcommand(cmd => cmd
					.setName('list')
					.setDescription('Zobrazí frontu.')
					.addIntegerOption(input => input
						.setName('page')
						.setDescription('Stránka.')
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
	}

	public async dispatch(interaction: DiscordChatInteraction) {
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
				const embed = this.client.interactionManager.generateErrorEmbed("Bot není aktivní, použijte příkaz /play nebo /join!");
				interaction.reply({ embeds: [embed], ephemeral: true });
				return false;
			}

			const subcommand = interaction.options.getSubcommand(true);

			switch (subcommand) {
				case 'list': {
					const [embed, actionRow] = this.generateQueueList(interaction, session);
					const response = await this.client.interactionManager.respondEmbed(interaction, [embed], {
						components: [ actionRow ]
					});

					if (!response) {
						this.client.handleError(new Error('Failed to create session.'));
						return false;
					}

					this.queueListSessions[response.id] = {
						lastUsedAt: Date.now(),
						lastUser: {
							id: interaction.user.id,
							name: interaction.user.displayName
						},
						page: 0,
						interaction: interaction
					}

					break;
				}
				default: {
					this.client.handleError(new Error('Unknown subcommand: ' + subcommand));
					return false;
				}
			}
		}
		catch (err) {
			this.client.handleError(err, interaction);
			return false;
		}

		return true;
	}

	public onAutoComplete(interaction: AutocompleteInteraction<CacheType>, session: MusicSession | null) {
		interaction.respond([{name: 'test', value: 1}]);
	}

	public onButton(interaction: ButtonInteraction<CacheType>, id: string, session: MusicSession | null) {
		const interactionID = interaction.message.interactionMetadata?.id;

		if (!session)
			throw 'Session is required.';

		var queueSession: QueueListSession;
		if (!interactionID || !(queueSession = this.queueListSessions[interactionID])) {
			interaction.message.deletable && interaction.message.delete();
			this.client.handleError('Neplatná interakce.', interaction);
			return;
		}

		const queue = this.transformQueue(session.getQueue().queue, session.getQueue().position);
		
		if (id == 'prev') {
			queueSession.page = Math.max(queueSession.page - 1, 0);
		}
		else if (id == 'next') {
			queueSession.page = Math.min(Math.ceil(queue.length / this.ITEMS_PER_PAGE), queueSession.page + 1);
		}
		else {
			interaction.deferUpdate();
			this.client.handleError(`Invalid button id '${id}'`);
			return;
		}

		interaction.deferUpdate();
		const [embed, actionRow] = this.generateQueueList(interaction, session, queueSession);
		queueSession.interaction.editReply({embeds: [embed], components: [actionRow]});
	}

	private transformQueue(queue: QueuedItem[], position: number): QueuedItem[] {
		return queue.filter((_v, i) => i >= position);
	}

	private generateQueueList(interaction: DiscordInteraction, session: MusicSession, queueSession?: QueueListSession): [EmbedBuilder, ActionRowBuilder<ButtonBuilder>] {
		const page = queueSession ? queueSession.page : 0;
		console.log(page);

		const queuePosition = session.getQueue().position;
		const filteredQueue = this.transformQueue(session.getQueue().queue, queuePosition);
		const maxPage = Math.ceil(filteredQueue.length / this.ITEMS_PER_PAGE);

		const vc = session.getVoiceChannel();

		const embed = new EmbedBuilder()
			.setTitle(`Fronta pro ${vc ? channelLink(vc.id) : session.guild.name}`)
			.setColor(this.client.interactionManager.DEFAULT_SUCCESS_EMBED_COLOR)
			.setFooter({
				text: `Strana ${page + 1}/${Math.max(Math.ceil(filteredQueue.length / this.ITEMS_PER_PAGE), 1)}`
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
				description += `${i}. `;
				description += '`' + col2[i].padStart(col2Width, ' ') + '` ';
				description += bold(Utils.BotUtils.isVideoItem(item) ? item.videoDetails.title : item.playlistDetails.title);
				description += ` - ${userMention(item.user.id)}`
				description += '\n';
			}
			embed.setDescription(description);
		}

		const actionRow = this.generatePagination(page, maxPage);

		return [embed, actionRow];
	}

	private generatePagination(page: number, maxPage: number): ActionRowBuilder<ButtonBuilder> {
		const buttonPrev = new ButtonBuilder()
			.setCustomId(this.makeButtonPath('prev'))
			.setDisabled(page <= 0)
			.setEmoji('◀')
			.setStyle(ButtonStyle.Primary)

		const buttonNext = new ButtonBuilder()
			.setCustomId(this.makeButtonPath('next'))
			.setDisabled(page >= maxPage)
			.setEmoji('▶')
			.setStyle(ButtonStyle.Primary)

		const buttonClose = new ButtonBuilder()
			.setCustomId(this.makeButtonPath('close'))
			.setEmoji('1300533556287897700')
			.setStyle(ButtonStyle.Danger)

		const actionRow = new ActionRowBuilder<ButtonBuilder>()
			.setComponents(buttonPrev, buttonNext, buttonClose)

		return actionRow;
	}
}