declare interface UserDetails {
	id: string,
	name: string,
	avatarURL?: string
}

declare type DiscordInteraction = import('discord.js').Interaction<CacheType>;
declare type DiscordChatInteraction = import('discord.js').ChatInputCommandInteraction<discord.CacheType>;

declare interface QueuedVideo {
	videoDetails: YtdlInfo,
	id: string,
	user: UserDetails
}

declare interface QueuedPlaylist {
	videoList: string[],
	position: number,
	user: UserDetails,
	id: string,
}

type QueuedItem = QueuedVideo | QueuedPlaylist;

declare interface YoutubeSearchResponse<K> {
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