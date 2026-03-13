import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

const steamAPILogger = streamDeck.logger.createScope("SteamAPI");


export async function fetchSteamApps(appIDs: number[] | undefined, favorites: boolean | undefined, userID?: string, apiKey?: string): Promise<void> {
    apiKey = apiKey ?? "";
    let url = "";
    steamAPILogger.info(`Fetching Steam Apps for user ${userID} with API key ${apiKey.substring(0, 7)}...`);
    const payload = {
        "steamid": userID,
        "format": "json",
        "include_appinfo": true,
        "appids_filter": appIDs?.map((id) => id.toString())
    };
    try {
        if (favorites) {
            url = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${userID}&format=json`;
        } else {
            url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&input_json=${JSON.stringify(payload)}`;
        }
        steamAPILogger.trace(`Requesting URL: ${url}`);
        const response = await fetch(url);
        const data = await response.text();
        const gamesList = JSON.parse(data).response?.games;

        steamAPILogger.info(`Response: ${gamesList ? "Received data" : "No data received"}`);

        if (!Array.isArray(gamesList)) {
            steamAPILogger.warn(`Unexpected response format: ${typeof gamesList}`);
            AppList = [];
            return;
        }

        if (appIDs && gamesList.length !== appIDs.length) {
            steamAPILogger.warn(`Expected ${appIDs.length} apps, but received ${gamesList.length}`);
            const returnedIds = new Set<number>(gamesList.map((game: any) => game.appid));
            const missingIds = appIDs.filter((id) => !returnedIds.has(id));

            steamAPILogger.warn(`Missing ${missingIds.length} app(s) from response: [${missingIds.join(", ")}]`);
        }

        AppList = await Promise.all(gamesList.map(async game => ({
            name: game.name,
            appID: game.appid,
            playtimeForever: game.playtime_forever,
            playtime2Weeks: game.playtime_2weeks,
            imgIconUrl: await imageUrlToBase64Node(`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`),
            imgLogoUrl: await imageUrlToBase64Node(`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_logo_url}.jpg`),
        })));
        steamAPILogger.info(`Fetched ${AppList.length} apps for user ${userID}; asked for ${appIDs?.length ?? "all"} apps`);
    } catch (err) {
        steamAPILogger.error(`Error fetching recent games for user ${userID}: ${err}`);
        AppList = [];
        return;
    }
}

async function imageUrlToBase64Node(imageUrl: string): Promise<string> {
    try {
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64String = buffer.toString('base64');
        const contentType = response.headers.get('content-type') || 'image/png';
        return `data:${contentType};base64,${base64String}`;
    } catch (err) {
        throw new Error(`Failed to fetch image: ${err}`);
    }
}

export type AppListItem = {
    name: string;
    appID: number;
    playtimeForever: number;
    playtime2Weeks: number;
    imgIconUrl: string;
    imgLogoUrl: string;
};

export let AppList: AppListItem[] = [];