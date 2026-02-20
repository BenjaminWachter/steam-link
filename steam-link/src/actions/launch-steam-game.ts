import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

const LaunchLogger = streamDeck.logger.createScope("LaunchSteamGame");

@action({ UUID: "com.benwach.steam-link.launch-steam-game" })
export class LaunchSteamGame extends SingletonAction<LaunchSteamGameSettings> {
    override onWillAppear(ev: WillAppearEvent<LaunchSteamGameSettings>): void | Promise<void> {
        LaunchLogger.info(`Will appear event received for action ${ev.action}. Current settings: ${JSON.stringify(ev.payload.settings)}`);
        return;
    }
    
    override async onKeyDown(ev: KeyDownEvent<LaunchSteamGameSettings>): Promise<void> {
        ev.action.setTitle(`${ev.payload.settings.gameName ?? "No Game Selected"}`);
        ev.action.setImage(`https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${ev.payload.settings.gameID ?? "0"}.jpg`);
        LaunchLogger.info(`Launching game with ID ${ev.payload.settings.gameID} and name ${ev.payload.settings.gameName}`);
        return streamDeck.system.openUrl(`steam://run/${ev.payload.settings.gameID}`);
    }
}

type LaunchSteamGameSettings = {
    gameName?: string;
    gameID?: number;
    AppList?: Array<{
        name: string;
        appID: number;
        playtimeForever: number;
        playtime2Weeks: number;
        imgIconUrl: string;
        imgLogoUrl: string;
    }>;
};
