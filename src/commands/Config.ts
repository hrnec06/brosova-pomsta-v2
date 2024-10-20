import { ActionRowBuilder, BaseSelectMenuBuilder, ButtonBuilder, EmbedBuilder, SlashCommandBuilder, SlashCommandSubcommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import Utils from "../utils";
import { v4 as uuidv4} from 'uuid';

interface ConfigSession {
    id: string,
    interaction: DiscordInteraction,
    expire: number,
    active?: string
}

export default class ConfigCommand extends DiscordCommand implements DiscordCommandInterface {
    private configSessions: Record<string, ConfigSession> = {};

    constructor(private client: MusicBot) {
        super(
            new SlashCommandBuilder()
                .setName('config')
                .setDescription('Nastavení configu')
                .addStringOption(input => input
                    .setName("action")
                    .setDescription("Vyberte akci")
                    .setChoices([
                        { name: 'edit', value: 'edit' },
                        { name: 'show', value: 'show' }
                    ])
                    .setRequired(true)
                ),
            'config'
        );

        this.client.on('buttonInteraction', (buttonInteraction) => {
            if (buttonInteraction.replied || buttonInteraction.deferred) return;

            console.log(buttonInteraction);
        });

        this.client.on('stringSelectInteraction', async (selectInteraction) => {
            if (selectInteraction.replied || selectInteraction.deferred) return;

            const value = selectInteraction.values.find(value => value.startsWith("config-field-select@"));
            if (!value) return;

            const item = value.split('@')[1];
            if (!item) return;

            const session = Utils.findValue(this.configSessions, (_key, value) => value.interaction.user.id === selectInteraction.user.id);

            selectInteraction.deferUpdate();

            if (!session || !session.interaction.isRepliable()) {
                await selectInteraction.message.delete();
                this.startConfig(selectInteraction);
                return;
            }

            session.active = item;

            if (session.interaction.replied) {
                session.interaction.editReply(item);
            } else {
                session.interaction.reply(item);
            }
        })
    }
    private startConfig(interaction: DiscordInteraction) {
        if (!interaction.isRepliable()) {
            this.client.handleError("Zde nemůžeš nastavovat config.");
            return;
        }

        const userID = interaction.user.id;
        var session: ConfigSession | undefined = Utils.findValue(this.configSessions, (key, value) => value.interaction.user.id === userID);
        if (!session) {
            session = {
                active: undefined,
                id: uuidv4(),
                expire: Date.now() + (1000 * 60 * 15),
                interaction: interaction
            }
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId("config-field-select")
            .setPlaceholder("Vyber položku v konfiguraci.")
            .addOptions(
                Utils.map(this.client.config, (key, value) => {
                    key = key.toString().trim();

                    return new StringSelectMenuOptionBuilder()
                        .setLabel(key)
                        .setDescription(`Accepts ${typeof value}`)
                        .setValue(`config-field-select@${key.toLowerCase()}`)
                        .setDefault(true)
                })
            )
            ;

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(select)
            ;

        const embed = new EmbedBuilder()
            .setTitle("Test")
            ;

        this.configSessions[session.id] = session;
        if (interaction.replied) {
            interaction.editReply({ embeds: [embed], components: [row] });
        } else {
            interaction.reply({ embeds: [embed], components: [row] });
        }
    }
    public dispatch(interaction: DiscordChatInteraction) {
        const action = interaction.options.getString("action", true);

        if (action === 'edit') {
            this.startConfig(interaction);
        }
        else if (action === 'show') {
            interaction.reply('Show.');
        }
        else {
            this.client.handleError('Invalid action.', interaction);
        }

		  return true;
    }
}