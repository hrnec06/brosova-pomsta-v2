import MusicBot from './MusicBot';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw 'BOT_TOKEN wasn\'t specified in .env';

const CLIENT_ID = process.env.CLIENT_ID;
if (!CLIENT_ID) throw 'CLIENT_ID wasn\'t specified in .env';

export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) console.warn("GOOGLE_API_KEY is not defined in .env!");

export const CONFIG_DIRECTORY = "config.json";

const ENVIRONMENT = process.env.ENVIRONMENT;
if (!ENVIRONMENT) throw 'ENVIRONMENT wasn\'t specified in .env';
if (ENVIRONMENT != 'production' && ENVIRONMENT != 'development') throw `ENVIRONMENT must be 'production' or 'development'. Got ${ENVIRONMENT}.`;

const client = new MusicBot(
	BOT_TOKEN,
	CLIENT_ID,
	GOOGLE_API_KEY,
	ENVIRONMENT
);

process.on('unhandledRejection', (error) => {
	client.handleError(error);
});

process.stdin.on('data', (e) => {
	console.log(e.toString());
});