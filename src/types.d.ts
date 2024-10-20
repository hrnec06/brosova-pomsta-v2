declare type DiscordInteraction = import('discord.js').Interaction<CacheType>;
declare type DiscordChatInteraction = import('discord.js').ChatInputCommandInteraction<discord.CacheType>;

declare interface QueuedVideo {
    id: string,
    videoDetails: YtdlInfo,
    user: {
        id: string,
        name: string,
        avatarURL?: string
    }
}

declare interface YoutubeSearchResponse {
    etag: string,
    items: Array<YoutubeSearchItem>,
    kind: string,
    nextPageToken: string,
    pageInfo: {
        resultsPerPage: number,
        totalResults: number
    },
    regionCode: string,
}

declare interface YoutubeSearchItem {
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

declare interface MusicBotConfig extends Partial<Record<string, boolean | string>> {
    banLion5: boolean
}