import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

const steamAPILogger = streamDeck.logger.createScope("SteamAPI");

@action({ UUID: "com.benwach.steam-link.steam-list" })
export class SteamList extends SingletonAction<SteamListSettings> {
    override onWillAppear(ev: WillAppearEvent<SteamListSettings>): void | Promise<void> {
        fetchSteamApps(ev.payload.settings.userID!, ev.payload.settings.apiKey!).then(apps => {
            AppList = apps;
        });
        return ev.action.setTitle(`Steam List`);
    }
    override onKeyDown(ev: KeyDownEvent<SteamListSettings>): void | Promise<void> {
        if (!AppList) {
            return ev.action.setTitle(`No App List`);
        }
        steamAPILogger.info(`App List has ${AppList.length} entries.`);
        return ev.action.setTitle(`Apps: ${AppList.length}`);
    }
}


type SteamListSettings = {
    userID?: number;
    apiKey?: string;
};

type SteamApp = {
    appid: number;
    name: string;
};

let AppList: Array<SteamApp>;

async function fetchSteamApps(userID: number, apiKey: string): Promise<Array<SteamApp>> {
    
    steamAPILogger.info(`Fetching Steam apps for userID: ${userID}`);

    const response = await fetch(`https://api.steampowered.com/IClientCommService/GetClientAppList/v1/?access_token=${apiKey}`);
    const data = await response.json() as { response: { apps: Array<SteamApp> } };

    steamAPILogger.info(`Fetched ${data.response.apps.length} apps from Steam API.`);

    return data.response.apps;
}