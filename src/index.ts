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

(async (BOT_TOKEN: string, CLIENT_ID: string, GOOGLE_API_KEY: string | undefined) => {
	const client = new MusicBot(
		BOT_TOKEN,
		CLIENT_ID,
		GOOGLE_API_KEY
	);

	process.on('unhandledRejection', (error) => {
		client.handleError(error);
	});

	process.stdin.on('data', (e) => {
		console.log(e.toString());
	})
})(BOT_TOKEN, CLIENT_ID, GOOGLE_API_KEY)
.catch((error) => {
	console.error(error);
	process.exit();
});