import ytdl from "@distube/ytdl-core";
import MusicBot from "../MusicBot";
import MusicSession from "./MusicSession";
import {createAudioResource, demuxProbe } from "@discordjs/voice";

export const ytdlAgent = ytdl.createAgent([
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1757116388.09218,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "__Secure-1PAPISID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "V5HfOOh-xKdSYi1k/AzmbvHjPRojqAlkhl",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1757116388.092103,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-1PSID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "g.a000mgiMZyekaglseNWeYZgiu1ly8Qb2qHeW_dBJ5iG_WIunIlmOB5HBCS7A3vonS492h8ZrUAACgYKAYASARISFQHGX2MiU-fmCrZ5xX5qAj8CabEHsBoVAUF8yKo7Q1kH_-UVoCp9csxK6XZV0076",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1754092477.904466,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-1PSIDCC",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "AKEyXzU2dKEdg7tFfip7vmSwIulMCL8Xtkj2gc6E0bsNy4hl9-6ldnxXqGWA5YyRJsiaZbs6",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1754092388.09208,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-1PSIDTS",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "sidts-CjEB4E2dkX1TNOWJhPv7jxJxgRf1J4QDqc-3eOf30a3W_nk0HvsiHjz-MBpTQtU5qdN_EAA",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1757116388.092251,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "__Secure-3PAPISID",
		 "path": "/",
		 "sameSite": "no_restriction",
		 "secure": true,
		 "value": "V5HfOOh-xKdSYi1k/AzmbvHjPRojqAlkhl",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1757116388.09212,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-3PSID",
		 "path": "/",
		 "sameSite": "no_restriction",
		 "secure": true,
		 "value": "g.a000mgiMZyekaglseNWeYZgiu1ly8Qb2qHeW_dBJ5iG_WIunIlmOpWOWTwjAbDXGbM4eo_6mpwACgYKAYYSARISFQHGX2MiSuQsLsdT_NKlBkdYcKrFaxoVAUF8yKotgnXWLu6dgK8LTCSOw_tk0076",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1754092477.90448,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-3PSIDCC",
		 "path": "/",
		 "sameSite": "no_restriction",
		 "secure": true,
		 "value": "AKEyXzU3oSkgw0gF4CE2fnHwiNJ2Loxs_y6pg-1J0P-xMwXv05aTFstpUyojqb-y2RmvwevVew",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1754092388.092092,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-3PSIDTS",
		 "path": "/",
		 "sameSite": "no_restriction",
		 "secure": true,
		 "value": "sidts-CjEB4E2dkX1TNOWJhPv7jxJxgRf1J4QDqc-3eOf30a3W_nk0HvsiHjz-MBpTQtU5qdN_EAA",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1756684359.928173,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-YEC",
		 "path": "/",
		 "sameSite": "lax",
		 "secure": true,
		 "value": "CgtoODBnaVhpLVVtYyjov7C1BjIiCgJDWhIcEhgSFhMLFBUWFwwYGRobHB0eHw4PIBAREiEgQQ%3D%3D",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1757116388.092155,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "APISID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": false,
		 "value": "J34sSjZCtURqXkx6/AwHlWc8JFe_fOZGA7",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1757116388.092132,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "HSID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": false,
		 "value": "AndW8WPpq4SarY_Tg",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1757116388.294132,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "LOGIN_INFO",
		 "path": "/",
		 "sameSite": "no_restriction",
		 "secure": true,
		 "value": "AFmmF2swRgIhAJ3w_fBcO7dyCbqcto3fXNiAbabtoCE9CUSzjElOGxOyAiEAsQr5Uk-DxQ6xiM3YzdACtRU2RvHUUWmc7Gm739jNKE4:QUQ3MjNmenJ4Y3JFbTlKejYtTlNkWEt5X19URkxnNHFRZ3VzMkNzRGhmc3h2cVktWS0zd3I4WmlkRG9uaWs0VHk5UEdLV0MzNDJiV3lZWmRHRXFIVEFHQzlHY0hSNEZPRW1PWExuSnl4MHZ4SHY3bUx2cmt2bWxQRHBEcFBlalpOcThvZ2tPU2JqVkFaVDlWcDU1Rk8wNTBPbWo0UzV4QzlR",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1757116394.957665,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "PREF",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "tz=Europe.Prague&f6=40000000&f7=100",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1757116388.092166,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "SAPISID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "V5HfOOh-xKdSYi1k/AzmbvHjPRojqAlkhl",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1757116388.092026,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "SID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": false,
		 "value": "g.a000mgiMZyekaglseNWeYZgiu1ly8Qb2qHeW_dBJ5iG_WIunIlmOc4vW8pUp1fIHuXOCbb7oSAACgYKAYYSARISFQHGX2MiKx_S8-W1KHhaDGbUOGuatxoVAUF8yKp49Dhv8rbDvl42lgUg8hUp0076",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1754092477.904411,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "SIDCC",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": false,
		 "value": "AKEyXzVuv24T5ozmVC_RpVcDWCOL9JMeM1ji6uNAw9LqcwkssaM6QqZ1VA9zM7GiSr8b9s_0",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1756684365.418349,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "SOCS",
		 "path": "/",
		 "sameSite": "lax",
		 "secure": true,
		 "value": "CAESEwgDEgk2NTc4MTAwMzEaAmVuIAEaBgiAoKu1Bg",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1757116388.092143,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "SSID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "AKwH41wAA-Ovc52yU",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1722556482,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "ST-3opvp5",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": false,
		 "value": "session_logininfo=AFmmF2swRgIhAJ3w_fBcO7dyCbqcto3fXNiAbabtoCE9CUSzjElOGxOyAiEAsQr5Uk-DxQ6xiM3YzdACtRU2RvHUUWmc7Gm739jNKE4%3AQUQ3MjNmenJ4Y3JFbTlKejYtTlNkWEt5X19URkxnNHFRZ3VzMkNzRGhmc3h2cVktWS0zd3I4WmlkRG9uaWs0VHk5UEdLV0MzNDJiV3lZWmRHRXFIVEFHQzlHY0hSNEZPRW1PWExuSnl4MHZ4SHY3bUx2cmt2bWxQRHBEcFBlalpOcThvZ2tPU2JqVkFaVDlWcDU1Rk8wNTBPbWo0UzV4QzlR",
	}
]);

export default class YoutubePlayer {
	private playing: boolean = false;

	constructor(private client: MusicBot, private session: MusicSession) {
	}

	public isPlaying() {
		return this.playing;
	}

	public async play(queuedVideo: QueuedVideo, interaction?: DiscordInteraction) {
		if (!this.session.isJoined()) {
			this.client.handleError(new Error('Attempted to play a video without being joined.'), interaction);
			return;
		}

		const conn = this.session.getConnection();
		if (!conn) {
			this.client.handleError(new Error('Connection is undefined.'), interaction);
			return;
		}

		const audio = ytdl(queuedVideo.videoDetails.videoId, {
			quality: 'highestaudio',
			filter: 'audioonly',
			agent: ytdlAgent,
			highWaterMark: 16384,
			dlChunkSize: 65536,
			requestOptions: {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
				}
			}
		});
		// const audio = ytdl(queuedVideo.videoDetails.videoId, {
		// 	quality: 'highestaudio',
		// 	agent: ytdlAgent,
		// 	highWaterMark: 1 << 62,
		// 	liveBuffer: 1 << 62,
		// 	dlChunkSize: 0
		// });

		const { stream, type } = await demuxProbe(audio);

		stream.on('error', (err) => {
			this.playing = false;
			this.session.getPlayer()?.stop();
			this.client.handleError(err, interaction);
		})

		const res = createAudioResource(stream, {
			inputType: type
		});

		const player = this.session.getPlayer();

		if (!player) {
			this.client.handleError(new Error('Player is not available!'), interaction);
			return;
		}

		player.play(res);
		conn.subscribe(player);

		this.playing = true;

		console.log('PLAYING');
	}

	public async handleEnd(forced: boolean = false) {
		if (this.session.isLooping()) {
			const activeVideo = await this.session.queue.getActiveVideo();
			activeVideo && this.play(activeVideo);
			return;
		}
		this.playing = false;
		this.session.queue.stepQueue();
	}
}