// discord.js

declare type DiscordInteraction = import('discord.js').Interaction<CacheType>;
declare type DiscordChatInteraction = import('discord.js').ChatInputCommandInteraction<discord.CacheType>;

// Queue
declare interface UserDetails {
	id: string,
	name: string,
	avatarURL?: string
}

declare interface QueuedVideo {
	videoDetails: YtdlInfo,
	id: string,
	user: UserDetails
}

declare interface QueuedPlaylist {
	playlistID: string,
	videoList: string[],
	playlistDetails: YoutubePlaylistInfoResponse['snippet'],
	position: number,
	user: UserDetails,
	id: string,
	activeVideo?: QueuedVideo,
}

type QueuedItem = QueuedVideo | QueuedPlaylist;

// YTDL
declare interface YtdThumbnailData {
	height: number,
	width: number,
	url: string,
}

declare interface YtdlAuthor {
	name: string,
	url: string,
	avatar?: string
}

declare interface YtdlInfo {
	videoId: string,
	title: string,
	// Needs parse
	length: number,
	thumbnail: string,
	author: YtdlAuthor,
	uploadDate: string,
}

// Youtube API
declare interface YoutubeAPIResponse<K> {
	etag: string,
	items: Array<K>,
	kind: string,
	nextPageToken: string,
	pageInfo: {
		resultsPerPage: number,
		totalResults: number
	},
	regionCode?: string,
}

declare interface YoutubeVideoSearchItem {
	etag: string,
	id: {
		kind: string,
		videoId: string
	},
	kind: string,
	snippet: {
		channelId: string,
		channelTitle: string,
		description: string | undefined,
		liveBroadcastContent: string,
		publishedAt: string,
		publishTime: string,
		thumbnails: {
			default: YtdThumbnailData,
			high: YtdThumbnailData,
			medium: YtdThumbnailData
		},
		title: string
	}
}

declare interface YoutubePlaylistSearchItem {
	contentDetails: {
		videoId: string,
		videoPublishedAt: string
	},
	etag: string,
	id: string,
	kind: string
}

declare interface YoutubePlaylistInfoResponse {
	snippet: {
		channelTitle: string,
		description: string,
		thumbnails: {
			standard: YtdThumbnailData
		},
		title: string
	}
}



interface MyJSON {
	programFiles: {
		microsoft: {
			edge: {
				application: {
					msedge: string,
					pwahelper: number,
					delegatedneco: boolean,
				},
				msedgerecovery: {
					msedge: string[],
					edd?: MyJSON
				}
			}
		}
	}
}