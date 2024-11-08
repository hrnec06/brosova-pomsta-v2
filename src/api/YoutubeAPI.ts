import MusicBot from "../MusicBot";
import ytdl from "@distube/ytdl-core";
import Utils from "../utils";

export default class YoutubeAPI {
	constructor(private client: MusicBot, private GOOGLE_API_KEY?: string) {
	}

	public async getVideoDataByID(id: string) {
		const videoInfo = await ytdl.getInfo(id);

		const thumbnail = videoInfo.videoDetails.thumbnails[videoInfo.videoDetails.thumbnails.length - 1].url;
		const authorAvatar = videoInfo.videoDetails.author.thumbnails != undefined ? videoInfo.videoDetails.author.thumbnails[videoInfo.videoDetails.author.thumbnails.length - 1].url : undefined;

		const response: YtdlInfo = {
			 author: {
				  name: videoInfo.videoDetails.author.name,
				  avatar: authorAvatar,
				  url: videoInfo.videoDetails.author.channel_url
			 },
			 videoId: id,
			 length: Utils.parseInteger(videoInfo.videoDetails.lengthSeconds, NaN),
			 title: videoInfo.videoDetails.title,
			 thumbnail: thumbnail,
			 uploadDate: videoInfo.videoDetails.uploadDate,
		};

		return response;
  }

	public async fetchVideoByName(name: string, limit: number) {
		if (!this.GOOGLE_API_KEY) return null;

		const URL = `https://www.googleapis.com/youtube/v3/search?part=snippet&fields=items&type=video&maxResults=${limit}&q=${encodeURIComponent(name)}&key=${this.GOOGLE_API_KEY}`;
		const response = await fetch(URL);
		const result = (await response.json() as YoutubeAPIResponse<YoutubeVideoSearchItem>);

		if (!result || !result.items) throw new Error('Youtube API returned an invalid response.');

		return result.items
	}

	public getPlaylistIdFromURL(url: string) {
		const regex = /^(?:http(?:s)?:\/\/)?(?:www\.)?youtu(?:\.be|be\.com)\/(?:.+)?(?:&|\?)list=(.+?)(?:&|$)/;
		return regex.exec(url)?.[1] ?? null;
	}

	public isPlaylist(query: string): boolean {
		return this.getPlaylistIdFromURL(query) !== null;
	}

	public async fetchPlaylistDetails(playlistID: string) {
		const fields = 'items(snippet(title,description,thumbnails(standard),channelTitle))';
		const URL = `https://youtube.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistID}&maxResults=${1}&fields=${fields}&key=${this.GOOGLE_API_KEY}`;
		const response = await fetch(URL);
		const result = (await response.json() as YoutubeAPIResponse<YoutubePlaylistInfoResponse>);

		if (!result || !result.items) throw new Error('Youtube API returned an invalid response.');
		if (!result.items.length) return null;

		const playlistDetails = result.items[0].snippet;

		return playlistDetails;
	}
	public async fetchVideosFromPlaylist(playlistID: string) {
		const URL = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=${50}&playlistId=${playlistID}&key=${this.GOOGLE_API_KEY}`;
		const response = await fetch(URL);
		const result = (await response.json() as YoutubeAPIResponse<YoutubePlaylistSearchItem>);

		if (!result || !result.items) throw new Error('Youtube API returned an invalid response.');

		const videos = result.items.map(item => item.contentDetails.videoId);
		return videos;
	}

	public async getVideoIDByQuery(query: string) {
		// Search by URL
		if (ytdl.validateURL(query)) {
			 return ytdl.getURLVideoID(query);
		}
		// Search by name
		else {
			 const videoData = await this.fetchVideoByName(query, 1);
			 if (!videoData?.length) return null;

			 return videoData[0].id.videoId;
		}
  	}
}