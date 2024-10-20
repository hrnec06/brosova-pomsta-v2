import MusicBot from "./MusicBot";
import discord from 'discord.js';
import MusicSession from "./MusicSession";
import Utils from "./utils";
import { v4 as uuidv4 } from 'uuid';

export default class SessionManager {
	private sessions: Record<string, MusicSession> = {};

	constructor(private client: MusicBot) {

	}

	public createSession(guild: discord.Guild, activationChannel: discord.TextBasedChannel): MusicSession {
		if (this.getSession(guild)) throw 'Session již je na tomto serveru aktivní!';

		const id = uuidv4();
		const session = new MusicSession(
			this.client,
			id,
			guild,
			activationChannel
		);

		this.sessions[id] = session;

		return session;
	}

	public getSessionByID(id: string): MusicSession | null {
		return this.sessions[id] || null;
	}

	getSession(interaction: DiscordInteraction): MusicSession | null;
	getSession(guild: discord.Guild): MusicSession | null;
	public getSession(arg1: DiscordInteraction | discord.Guild) {
		const guild = arg1 instanceof discord.Guild ? arg1 : arg1.guild;
		const session = Utils.findValue(this.sessions, (_id, session) => session.guild.id === guild.id);

		return session || null;
	}
}