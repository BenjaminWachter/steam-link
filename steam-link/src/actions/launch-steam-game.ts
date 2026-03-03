import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { AppList, AppListItem } from "./steam-list";

const LaunchLogger = streamDeck.logger.createScope("LaunchSteamGame");

let index = 0; // This should be set based on the button's position on the Stream Deck

@action({ UUID: "com.benwach.steam-link.launch-steam-game" })
export class LaunchSteamGame extends SingletonAction<LaunchSteamGameSettings> {
    override onWillAppear(ev: WillAppearEvent<LaunchSteamGameSettings>): void | Promise<void> {
        index = (ev.action.coordinates?.row ?? 0) * 5 + (ev.action.coordinates?.column ?? 0) - 1;
        
        
        ev.action.setTitle(AppList?.[index]?.name ?? "AppList\nNot Set");
        ev.action.setImage(`https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${AppList?.[index]?.appID ?? -1}.jpg`);
        
        LaunchLogger.info(`Set location ${(index)+1} with appID ${AppList?.[index]?.appID ?? -1} and name ${AppList?.[index]?.name ?? "Unknown Game"}`);
        return;
    }
    
    override async onKeyDown(ev: KeyDownEvent<LaunchSteamGameSettings>): Promise<void> {
        return streamDeck.system.openUrl(`steam://run/${AppList?.[index]?.appID ?? -1}`);
    }
}

type LaunchSteamGameSettings = {
    index?: number;
};
