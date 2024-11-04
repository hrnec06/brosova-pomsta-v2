import { SlashCommandBuilder } from "discord.js";
import DiscordCommand, { DiscordCommandInterface } from "../model/commands";
import MusicBot from "../MusicBot";
import PlayCommand from "./Play";

export default class YourPhoneLingingCommand extends DiscordCommand implements DiscordCommandInterface {
    constructor(private client: MusicBot) {
        super(
            new SlashCommandBuilder()
                .setDescription('YoUr PHoNe LiNGinG'),
            'yourphonelinging'
        );
    }
    public dispatch(interaction: DiscordChatInteraction) {
        const playcmd = this.client.getCommand<PlayCommand>('play');
        if (!playcmd) {
            this.client.handleError("Play command does not exist.", interaction);
            return false;
        }

        return playcmd.play(interaction, 'https://www.youtube.com/watch?v=VLP_tnnDGSQ&ab_channel=Hattyketchup', true);
    }
}