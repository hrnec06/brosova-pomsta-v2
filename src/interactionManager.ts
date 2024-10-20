import { EmbedBuilder, RGBTuple } from "@discordjs/builders";
import MusicBot from "./MusicBot";
import { error } from "console";
import Utils from "./utils";

interface EmbedOptions {
    title?: string,
    color?: number,
    description?: string,
    stamp?: boolean,
    interaction?: DiscordInteraction
}

export default class InteractionManager {
    constructor(private client: MusicBot) {
    }


    generateErrorEmbed(text: string, options?: EmbedOptions): EmbedBuilder;
    generateErrorEmbed(error: any, options?: EmbedOptions): EmbedBuilder;

    public generateErrorEmbed(arg1: string | any, options?: EmbedOptions): EmbedBuilder | void {
        var title: string;
        var description: string | undefined =   undefined;
        var color: number =                     0xcf3a50;
        var author: {
            name: string,
            iconURL?: string
        } | undefined =                         undefined;
        var stamp: boolean =                    false;
    

        if (arg1 instanceof Error) {
            title = `${arg1.name}: ${arg1.message}`;
            description = arg1.stack;
            stamp = true;
        }
        else if (typeof arg1 != 'string') {
            return this.generateErrorEmbed('Unknown error has occured.', {stamp: true});
        }
        else {
            title = "Nastala chyba!";
            description = arg1;
        }

        if (options) {
            title = options.title ? options.title : title;
            description = options.description ? options.description : description;
            color = options.color ? options.color : color;

            if (options.interaction) {
                const member = options.interaction.member;
                if (!Utils.BotUtils.isValidMember(member)) return;

                author = {
                    name: member.displayName
                }
                const url = member.avatarURL() ?? member.user.avatarURL();
                if (url)
                    author.iconURL = url;
            }
        }

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
        ;

        if (stamp) {
            embed
                .setTimestamp(new Date())
                .setFooter({ text: 'An Error occured' })
            ;
        }

        if (description)
            embed.setDescription(description);

        if (author) {
            embed.setAuthor(author);
        }


        return embed;
    }
}