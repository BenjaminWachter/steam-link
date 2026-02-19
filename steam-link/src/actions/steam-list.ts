import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

const steamAPILogger = streamDeck.logger.createScope("SteamAPI");

@action({ UUID: "com.benwach.steam-link.steam-list" })
export class SteamList extends SingletonAction<SteamListSettings> {
    override onWillAppear(ev: WillAppearEvent<SteamListSettings>): void | Promise<void> {
        // Check if the user ID and API key are set in the settings.
        if (!ev.payload.settings.userID || !ev.payload.settings.apiKey) {
            steamAPILogger.warn(`User ID or API key not set for action ${ev.action}`);
            return ev.action.setTitle(`Set User ID and API Key`);
        }

        if (AppList.length === 0) {
            // fetchSteamApps(ev.payload.settings.userID!, ev.payload.settings.apiKey!).then(apps => {
            //     AppList = apps;
            // });
            return ev.action.setTitle(`Steam List`);
        }
    }
    override onKeyDown(ev: KeyDownEvent<SteamListSettings>): void | Promise<void> {
        steamAPILogger.info(`Key down event received for action ${ev.action}. Current AppList: ${AppList ? AppList.length : "not loaded"}`);

        steamAPILogger.info(`App List has ${AppList.length} entries.`);
        fetchSteamApps(ev.payload.settings.userID!, ev.payload.settings.apiKey!).then(apps => {
            steamAPILogger.info(`Fetched ${apps.length} apps from Steam API.`);
            AppList = apps.slice(0, 10); // Limit to 10 apps for display
        });
        steamAPILogger.info(`After fetching, App List has ${AppList.length} entries.`);
        return ev.action.setTitle(`Apps: ${AppList.length}`);
    }
}

type SteamListSettings = {
    userID?: string;
    apiKey?: string;
};

let AppList: Array<{
    name: string;
    appID: number;
    playtimeForever: number;
    playtime2Weeks: number;
    imgIconUrl: string;
    imgLogoUrl: string;
}> = [];

async function fetchSteamApps(userID: string, apiKey: string): Promise<Array<{
    name: string;
    appID: number;
    playtimeForever: number;
    playtime2Weeks: number;
    imgIconUrl: string;
    imgLogoUrl: string;
}>> {
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
                
        return gamesList.map(game => ({
            name: game.name,
            appID: game.appid,
            playtimeForever: game.playtime_forever,
            playtime2Weeks: game.playtime_2weeks,
            imgIconUrl: `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`,
            imgLogoUrl: `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_logo_url}.jpg`,
        }));
    } catch (err) {
        steamAPILogger.error(`Error fetching recent games for user ${userID}: ${err}`);
        return [];
    }
}
