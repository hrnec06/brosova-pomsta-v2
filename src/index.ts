import { generateDependencyReport } from '@discordjs/voice';
import MusicBot from './MusicBot';
import dotenv from 'dotenv';
import discord from 'discord.js';
import fs from 'fs/promises';
import deepmerge from 'deepmerge';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw 'BOT_TOKEN wasn\'t specified in .env';

const CLIENT_ID = process.env.CLIENT_ID;
if (!CLIENT_ID) throw 'CLIENT_ID wasn\'t specified in .env';

export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) console.warn("GOOGLE_API_KEY is not defined in .env!");

export const CONFIG_DIRECTORY = "config.json";

(async () => {
    console.log("Loading config...");
    const config = await loadConfig();

    const client = new MusicBot(
        BOT_TOKEN,
        CLIENT_ID,
        config
    );

    process.on('unhandledRejection', (error) => {
        const channel = client.getDefaultChannel();

        if (!channel) {
            console.error(error);
            return;
        }

        const embed = client.getInteractionManager().generateErrorEmbed(error);
        channel.send({ embeds: [embed] });
    });
})()


async function loadConfig(): Promise<MusicBotConfig> {
    const DEFAULT_CONFIG: MusicBotConfig = {
        banLion5: false,
        test2: true,
        test3: 'idk'
    };

    try {
        const loadedConfig = JSON.parse((await fs.readFile(CONFIG_DIRECTORY, 'utf-8')).toString()) as MusicBotConfig;
        const config = deepmerge(DEFAULT_CONFIG, loadedConfig);

        console.log(config);

        console.log("Config loaded!");
        return config;
    } catch (error) {
        console.error("Config load failed.");
    }

    return DEFAULT_CONFIG;
}