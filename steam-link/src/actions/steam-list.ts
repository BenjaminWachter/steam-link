import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

const steamAPILogger = streamDeck.logger.createScope("SteamAPI");

@action({ UUID: "com.benwach.steam-link.steam-list" })
export class SteamList extends SingletonAction<SteamListSettings> {
    override onWillAppear(ev: WillAppearEvent<SteamListSettings>): void | Promise<void> {
        AppList.length = 0; // Clear the app list to ensure fresh data on each appearance
        enteryPoint(ev);
    }

    override async onKeyDown(ev: KeyDownEvent<SteamListSettings>): Promise<void> {

        if (AppList.length === 0 && streamDeck.devices.getDeviceById(ev.action.device.id)?.id === ev.action.device.id) {
            steamAPILogger.warn(`App List is empty. Cannot display games.`);
            enteryPoint(ev);
            return;
        }

        steamAPILogger.debug(` Key down event received. Device ID: ${ev.action.device.id}`);
        steamAPILogger.info(`Key down event received for action ${ev.action.manifestId}. Current device id: ${ev.action.device.id}`);
        try {
            steamAPILogger.debug(` Attempting to switch to profile: Steam Apps (auto)`);
            const result = await streamDeck.profiles.switchToProfile(ev.action.device.id, "Steam Apps (auto)");
            steamAPILogger.debug(` Profile switch result:`, result);
            if (result !== undefined) {
                steamAPILogger.info(`Successfully switched to profile: Steam Apps (auto)`);
                await ev.action.setTitle(`Switched!`);
            }
        } catch (error) {
            steamAPILogger.debug(`Profile switch error:`, error);
            steamAPILogger.error(`Failed to switch profile: ${error}`);
        }
    }
}

async function enteryPoint(ev: WillAppearEvent<SteamListSettings> | KeyDownEvent<SteamListSettings>): Promise<void> {
    if (!ev.payload.settings.userID || !ev.payload.settings.apiKey) {
        steamAPILogger.warn(`User ID or API key not set for action ${ev.action}`);
        ev.action.showAlert();
        ev.action.setImage("imgs/actions/steam-list/steam-db-warn");
        return ev.action.setTitle(`Set User ID\n and API Key`);
    }

    if (AppList.length === 0) {
        steamAPILogger.info(`App List has ${AppList.length} entries.`);
        fetchSteamApps(ev.payload.settings.userID!, ev.payload.settings.apiKey!).then(apps => {
            steamAPILogger.info(`Fetched ${apps.length} apps from Steam API.`);
            AppList.push(...apps.slice(0, 24)); // Limit to 24 apps for display
        });
        steamAPILogger.info(`After fetching, App List has ${AppList.length} entries.`);
        ev.action.setImage("imgs/actions/steam-list/steam-db-white");
    }

    steamAPILogger.info(`Steam List action appeared`);
}

async function fetchSteamApps(userID: string, apiKey: string): Promise<AppListItem[]> {
    steamAPILogger.info(`Fetching Steam Apps for user ${userID} with API key ${apiKey.substring(0, 7)}...`);
    try {
        const url = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${userID}&count=10&format=json`;

        const response = await fetch(url);
        const data = await response.text();
        const gamesList = JSON.parse(data).response?.games;

        steamAPILogger.info(`Response: ${gamesList ? "Received data" : "No data received"}`);

        if (!Array.isArray(gamesList)) {
            steamAPILogger.warn(`Unexpected response format: ${typeof gamesList}`);
            return [];
        }

        return Promise.all(gamesList.map(async game => ({
            name: game.name,
            appID: game.appid,
            playtimeForever: game.playtime_forever,
            playtime2Weeks: game.playtime_2weeks,
            imgIconUrl: await imageUrlToBase64Node(`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`),
            imgLogoUrl: await imageUrlToBase64Node(`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_logo_url}.jpg`),
        })));
    } catch (err) {
        steamAPILogger.error(`Error fetching recent games for user ${userID}: ${err}`);
        return [];
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

type SteamListSettings = {
    userID?: string;
    apiKey?: string;
};


export type AppListItem = {
    name: string;
    appID: number;
    playtimeForever: number;
    playtime2Weeks: number;
    imgIconUrl: string;
    imgLogoUrl: string;
};

export let AppList: AppListItem[] = [];