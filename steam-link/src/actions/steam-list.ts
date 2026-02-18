import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { SteamUser } from "steamapi-node";

const steamAPILogger = streamDeck.logger.createScope("SteamAPI");

@action({ UUID: "com.benwach.steam-link.steam-list" })
export class SteamList extends SingletonAction<SteamListSettings> {
    override onWillAppear(ev: WillAppearEvent<SteamListSettings>): void | Promise<void> {
        if (!ev.payload.settings.userID || !ev.payload.settings.apiKey) {
            steamAPILogger.warn(`User ID or API key not set for action ${ev.action}`);
            return ev.action.setTitle(`Set User ID and API Key`);
        }
        if (AppList == null) {
            fetchSteamApps(ev.payload.settings.userID!, ev.payload.settings.apiKey!).then(apps => {
                AppList = apps;
            });
            return ev.action.setTitle(`Steam List`);
        }
    }
    override onKeyDown(ev: KeyDownEvent<SteamListSettings>): void | Promise<void> {
        steamAPILogger.info(`Key down event received for action ${ev.action}. Current AppList: ${AppList ? AppList.length : "not loaded"}`);

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
    steamAPILogger.info(`Fetching Steam Apps for user ${userID} with API key ${apiKey}`);
    const steam = new SteamUser(apiKey, {}, ['games', 'users']);
    return steam.others.resolve(`/profiles/${userID}/`).then((result: any) => {
        return result.getOwnedGames().then((games: any[]) => {
            const apps = games.map((game: any) => ({
                appid: game.appid,
                name: game.name
            }));
            steamAPILogger.info(`Fetched ${apps.length} apps for user ${userID}`);
            return apps;
        }).catch((err: any) => {
            steamAPILogger.error(`Error fetching owned games for user ${userID}: ${err}`);
            return [];
        });
    }).catch((err: any) => {
        steamAPILogger.error(`Error resolving user ${userID}: ${err}`);
        return [];
    });
}