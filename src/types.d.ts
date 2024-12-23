// discord.js

type DiscordCacheType = import('discord.js').CacheType;
declare type DiscordInteraction 					= import('discord.js').Interaction<DiscordCacheType>;
declare type DiscordChatInteraction 			= import('discord.js').ChatInputCommandInteraction<DiscordCacheType>;
declare type DiscordButtonInteraction 			= import('discord.js').ButtonInteraction<DiscordCacheType>;
declare type DiscordAutocompleteInteraction 	= import('discord.js').AutocompleteInteraction<DiscordCacheType>;
declare type DiscordModalInteraction			= import('discord.js').ModalSubmitInteraction<DiscordCacheType>;
declare type DiscordSelectInteraction			= import('discord.js').AnySelectMenuInteraction<DiscordCacheType>;

declare type Promisable<T> = T | Promise<T>;

// Queue
declare interface UserDetails {
	id: string,
	name: string,
	avatarURL?: string
}

declare interface UserSimple {
	id: string,
	name: string
}

interface QueuedItemBase {
	id: string,
	user: UserDetails,
	addedAt: number,
	deleted: boolean
}

declare interface QueuedVideo extends QueuedItemBase {
	videoDetails: YtdlInfo,
}

declare interface QueuedPlaylist extends QueuedItemBase {
	playlistID: string,
	videoList: string[],
	playlistDetails: YoutubePlaylistInfoResponse['snippet'],
	position: number,
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

interface ComponentPath {
	commandName: string,
	id: string,
	path: string,
	action?: string,
}