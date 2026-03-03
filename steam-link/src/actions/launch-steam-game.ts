import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { AppList, AppListItem } from "./steam-list";

const LaunchLogger = streamDeck.logger.createScope("LaunchSteamGame");

let index = 0; // This should be set based on the button's position on the Stream Deck

@action({ UUID: "com.benwach.steam-link.launch-steam-game" })
export class LaunchSteamGame extends SingletonAction<LaunchSteamGameSettings> {
    override onWillAppear(ev: WillAppearEvent<LaunchSteamGameSettings>): void | Promise<void> {
        const row = ev.action.coordinates?.row ?? 0;
        const column = ev.action.coordinates?.column ?? 0;
        
        // Ignore column 0, so start counting from column 1
        if (column === 0) {
            ev.action.setTitle("Reserved");
            return;
        }
        
        // Calculate index: skip column 0, so actual index = row * 4 + (column - 1)
        const page = ev.payload.settings.page ?? 0;
        index = row * 4 + (column - 1) + (12 * page);
        
        ev.action.setTitle(AppList?.[index]?.name ?? "AppList\nNot Set");
        ev.action.setImage(`https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${AppList?.[index]?.appID ?? -1}.jpg`);
        
        LaunchLogger.info(`Set location row=${row}, col=${column}, index=${index} with appID ${AppList?.[index]?.appID ?? -1} and name ${AppList?.[index]?.name ?? "Unknown Game"}`);
        return;
    }
    
    override async onKeyDown(ev: KeyDownEvent<LaunchSteamGameSettings>): Promise<void> {
        return streamDeck.system.openUrl(`steam://run/${AppList?.[index]?.appID ?? -1}`);
    }
}

type LaunchSteamGameSettings = {
    index?: number;
    page?: number;
};
