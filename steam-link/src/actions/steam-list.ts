import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { Games, SteamUser } from "steamapi-node";

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
                AppList = apps;
            });
        steamAPILogger.info(`After fetching, App List has ${AppList.length} entries.`);
        return ev.action.setTitle(`Apps: ${AppList.length}`);
    }
}

type SteamListSettings = {
    userID?: number;
    apiKey?: string;
};

let AppList: Array<Games> = [];

async function fetchSteamApps(userID: number, apiKey: string): Promise<Array<Games>> {
    steamAPILogger.info(`Fetching Steam Apps for user ${userID} with API key ${apiKey.substring(0, 7)}...`);
    try {
        const steam = new SteamUser(apiKey);
        return steam.others.resolve(`/profiles/${userID}`).then(id => {
            return steam.users.getUserRecentGames(id);
        });
    } catch (err) {
        steamAPILogger.error(`Error fetching recent games for user ${userID}: ${err}`);
        return [];
    }
}