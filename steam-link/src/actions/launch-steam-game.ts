import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { AppList } from "./steam-list";

const LaunchLogger = streamDeck.logger.createScope("LaunchSteamGame");

let index = 0; // This should be set based on the button's position on the Stream Deck

@action({ UUID: "com.benwach.steam-link.launch-steam-game" })
export class LaunchSteamGame extends SingletonAction<LaunchSteamGameSettings> {
    override onWillAppear(ev: WillAppearEvent<LaunchSteamGameSettings>): void | Promise<void> {
        index = (ev.action.coordinates?.row ?? 0) * 5 + (ev.action.coordinates?.column ?? 0) - 1;
        
        LaunchLogger.info(`Application set for location ${(index)+1}, with index ${index}`);
        
        ev.action.setTitle(ev.payload.settings.AppList?.[index]?.name ?? "AppList\nNot Set");
        ev.action.setImage(`https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${ev.payload.settings.AppList?.[index]?.appID ?? -1}.jpg`);
        
        LaunchLogger.info(`Launching game with ID ${ev.payload.settings.AppList?.[index]?.appID ?? -1} and name ${ev.payload.settings.AppList?.[index]?.name ?? "Unknown Game"}`);
        return;
    }
    
    override async onKeyDown(ev: KeyDownEvent<LaunchSteamGameSettings>): Promise<void> {
        return streamDeck.system.openUrl(`steam://run/${ev.payload.settings.AppList?.[index]?.appID ?? -1}`);
    }
}

type LaunchSteamGameSettings = {
    AppList: typeof AppList;
    index?: number;
};
