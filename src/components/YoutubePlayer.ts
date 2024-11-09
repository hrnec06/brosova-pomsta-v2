import ytdl from "@distube/ytdl-core";
import MusicBot from "../MusicBot";
import MusicSession from "./MusicSession";
import {createAudioResource, demuxProbe } from "@discordjs/voice";
const {getRandomIPv6 } = require('@distube/ytdl-core/lib/utils');

export const ytdlAgent = ytdl.createAgent([
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1765752384.991949,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "__Secure-1PAPISID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "huzXEkE_oY_Eb79t/Anss0s608hBrbc6xy",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1765752384.991973,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-1PSID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "g.a000qAh-Kgiic1JLXy4vy3dMxFoT47tkHZ0RXQXzwz4mvAC368zsOBamPdKNXrwvjsmZIBo9oQACgYKAbASARQSFQHGX2MitwSGfIUR9PGCLyW5_0QoghoVAUF8yKo4_IbyDDHZLo3zJNHW612I0076",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1762728449.327367,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-1PSIDCC",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "AKEyXzWSkjzb7mCapLdCklL3jyZBzbUtCnWfrPihnaiX6TxDjowa9tjq5wxO52eZqxCa-DG5",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1762728384.99186,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-1PSIDTS",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "sidts-CjEBQT4rX-sc96UW6Q8Z5lOjaPtTX9AZ7V8IC1ymzds4zJfAuM3AFAV_53Ve-4l_NgRPEAA",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1765752384.991957,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "__Secure-3PAPISID",
		 "path": "/",
		 "sameSite": "no_restriction",
		 "secure": true,
		 "value": "huzXEkE_oY_Eb79t/Anss0s608hBrbc6xy",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1765752384.991981,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-3PSID",
		 "path": "/",
		 "sameSite": "no_restriction",
		 "secure": true,
		 "value": "g.a000qAh-Kgiic1JLXy4vy3dMxFoT47tkHZ0RXQXzwz4mvAC368zsm8rPFMSPf1Vv3Oq8IAJL5QACgYKAbISARQSFQHGX2MixYgOVYK0SL6WRxXc7svGqBoVAUF8yKrkXzGqzwH5n3NkBxK_XkhF0076",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1762728449.327401,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-3PSIDCC",
		 "path": "/",
		 "sameSite": "no_restriction",
		 "secure": true,
		 "value": "AKEyXzXl-Jkoz5kBoJpLfLnymD5-htSF5NQMfQizZP5_sLV02jt9tOmoYOMJ39TE6ft35Q3o6w",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1762728384.991905,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-3PSIDTS",
		 "path": "/",
		 "sameSite": "no_restriction",
		 "secure": true,
		 "value": "sidts-CjEBQT4rX-sc96UW6Q8Z5lOjaPtTX9AZ7V8IC1ymzds4zJfAuM3AFAV_53Ve-4l_NgRPEAA",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1765320246.727828,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "__Secure-YEC",
		 "path": "/",
		 "sameSite": "lax",
		 "secure": true,
		 "value": "CgtxNncwNmtwSW5kWSjpzL-5BjIiCgJDWhIcEhgSFhMLFBUWFwwYGRobHB0eHw4PIBAREiEgJA%3D%3D",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1765752384.991933,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "APISID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": false,
		 "value": "uTIARvJLlNn9Eup2/AguAsEnYrDaKpmelo",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1731192992,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "CONSISTENCY",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "AKreu9urjAVCbbmtomZCt__BtDxjP4gD8G-d65fJ8K-mGcmuLfYXn8tW7fa_-x3NkkfGqjxOUkwumNAa9ypTQcAihZXgsmoSNKPzhDAb0CmfYzXx4sR7_LbkFCpAuFEm5pFNO9zti8bxHELyTCCzoY21",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1765752384.991917,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "HSID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": false,
		 "value": "Auy6aXC0rRgbiHURp",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1765752385.25058,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "LOGIN_INFO",
		 "path": "/",
		 "sameSite": "no_restriction",
		 "secure": true,
		 "value": "AFmmF2swRQIhANrE_YnSdKwht5eryE5uHq6UStnKNGVy90j0oO0YU8TmAiBre-g69gt7Or90dCIWceBVymcq-0XRyTRMnbKM2NJsvw:QUQ3MjNmeW96NlBfbE5NZW5RZWVCYWZ6Um9zYTlGR0JVMDg2Q2dpaWw0dXVrZEM5RXFMR3p3Mjk0cXFmTEpoN040QXpvUllEdzVLU0M0dTZPajdBYzc4ZW9ELWQ0ejI1MGRkcjVYMGVxTEVDdGZyZGtWM19kQzlMa3BWTlRsQ0RMeTF1WXg2X2lpTFJkckowTWt3dTRybXBFYXVDaWMyRjl3",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1747003587.92631,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "NID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "519=ghcnStD0IBa8Vgg2MbL1jRncyzxMtqY31PfhmMtzREZbYoUSJxZ4BJvqiRgqDPOjZ0mBqV-EEQqCzHY_esgVFIxTK3ZWWD640SKgsSDy2XqRb8D-qgHTnsSJSKTbemVujIiYuYgv3xXYj-wyuILyrAvANLpK7MuMd9tdy64d-drk6S6Y0RXg14SyMOHV_Gy76zm7sgMsyGsjAQ",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1765752425.277618,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "PREF",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "f6=40000000&tz=Europe.Budapest",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1765752384.991942,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "SAPISID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "huzXEkE_oY_Eb79t/Anss0s608hBrbc6xy",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1765752384.991964,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "SID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": false,
		 "value": "g.a000qAh-Kgiic1JLXy4vy3dMxFoT47tkHZ0RXQXzwz4mvAC368zs-KRHHhjkw5IbPhAVv4GYFwACgYKAbASARQSFQHGX2MiDGYUgmv6Bex2fyEnDXURPhoVAUF8yKrg36XY4D622NsTOWC-bEBm0076",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1762728449.327299,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "SIDCC",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": false,
		 "value": "AKEyXzX4dUr2GqHeWntXaqDq62q655667WsjlQGlKXH0il_yS4udF0Cc6TMuWExox-dzgC47OA",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1765320251.190272,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "SOCS",
		 "path": "/",
		 "sameSite": "lax",
		 "secure": true,
		 "value": "CAESEwgDEgk2OTM5MDI3NDkaAmVuIAEaBgiAzLq5Bg",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1765752384.991926,
		 "hostOnly": false,
		 "httpOnly": true,
		 "name": "SSID",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": true,
		 "value": "AwyJHGkYm6Nex8TkW",
	},
	{
		 "domain": ".youtube.com",
		 "expirationDate": 1731192454,
		 "hostOnly": false,
		 "httpOnly": false,
		 "name": "ST-3opvp5",
		 "path": "/",
		 "sameSite": "unspecified",
		 "secure": false,
		 "value": "session_logininfo=AFmmF2swRQIhANrE_YnSdKwht5eryE5uHq6UStnKNGVy90j0oO0YU8TmAiBre-g69gt7Or90dCIWceBVymcq-0XRyTRMnbKM2NJsvw%3AQUQ3MjNmeW96NlBfbE5NZW5RZWVCYWZ6Um9zYTlGR0JVMDg2Q2dpaWw0dXVrZEM5RXFMR3p3Mjk0cXFmTEpoN040QXpvUllEdzVLU0M0dTZPajdBYzc4ZW9ELWQ0ejI1MGRkcjVYMGVxTEVDdGZyZGtWM19kQzlMa3BWTlRsQ0RMeTF1WXg2X2lpTFJkckowTWt3dTRybXBFYXVDaWMyRjl3",
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