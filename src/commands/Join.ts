import { SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";

export default class JoinCommand extends DiscordCommand implements DiscordCommandInterface {
    constructor(private client: MusicBot) {
        super(
            new SlashCommandBuilder()
                .setName('join')
                .setDescription('Připojí bota na kanál.'),
            'join'
        )
    }
    public async dispatch(interaction: DiscordChatInteraction) {
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            const embed = this.client.getInteractionManager().generateErrorEmbed("Nejsi připojen do žádného kanálu!");
            interaction.reply({ embeds: [embed], ephemeral: true });
            return false;
        }

        const interactionChannel = interaction.channel;
        if (!interactionChannel) {
            const embed = this.client.getInteractionManager().generateErrorEmbed("Neplatný textový channel.");
            interaction.reply({ embeds: [embed], ephemeral: true });
            return false;
        }

        interaction.deferReply();

        try {
            let session = this.client.getSessionManager().getSession(interaction);
            if (!session) {
                session = this.client.getSessionManager().createSession(interaction.guild, interaction.channel);
            }

            session.setActiveVoiceChannel(voiceChannel);
            const r = await session.join(interaction);

            if (!r) {
                const embed = this.client.getInteractionManager().generateErrorEmbed("Bot nelze připojit, zkuste to později.");
                interaction.followUp({ embeds: [embed], ephemeral: true });
                return false;
            }

            interaction.followUp('Bot připojen.');
				return true;
        } catch (err) {
            this.client.handleError(err, interaction);
				return false;
        }
    }
}