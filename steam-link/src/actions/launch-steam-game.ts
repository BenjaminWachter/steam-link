import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { AppList, AppListItem } from "./steam-list";
import { waitForDebugger } from "inspector";

const LaunchLogger = streamDeck.logger.createScope("LaunchSteamGame");

const actionIndexMap = new Map<string, number>();

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
        
        const page = ev.payload.settings.page ?? 0;
        let index = row * 4 + (column - 1) + (12 * page);
        actionIndexMap.set(ev.action.id, index);
        
        ev.action.setTitle(AppList?.[index]?.name ?? "AppList\nNot Set");
        ev.action.setImage(`https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${AppList?.[index]?.appID ?? -1}.jpg`);
        
        LaunchLogger.debug(`Action ${ev.action.id} set to row=${row}, col=${column}, index=${index} with appID ${AppList?.[index]?.appID ?? -1} and name ${AppList?.[index]?.name ?? "Unknown Game"}`);
        return;
    }
    
    override async onKeyDown(ev: KeyDownEvent<LaunchSteamGameSettings>): Promise<void> {
        const index = actionIndexMap.get(ev.action.id) ?? 0;
        LaunchLogger.info(`Key down event received for action ${ev.action.id}. Launching game at index ${index} with appID ${AppList?.[index]?.appID ?? -1}`);
        return streamDeck.system.openUrl(`steam://run/${AppList?.[index]?.appID ?? -1}`);
    }
}

type LaunchSteamGameSettings = {
    index?: number;
    page?: number;
};
