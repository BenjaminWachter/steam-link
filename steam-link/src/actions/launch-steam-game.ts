import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { AppList } from "./steam-list";
import { exec, ExecException } from "node:child_process";
// 
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

        ev.action.setImage(AppList?.[index]?.imgIconUrl ?? "").catch(() => {
            LaunchLogger.info(`Failed to set image for action ${ev.action.id} at index ${index}. App may not have an icon URL.`);
        });
        LaunchLogger.debug(`Action ${ev.action.id} set to row=${row}, col=${column}, index=${index} with appID ${AppList?.[index]?.appID ?? -1} and name ${AppList?.[index]?.name ?? "Unknown Game"}`);
        return;
    }
    
    override async onKeyDown(ev: KeyDownEvent<LaunchSteamGameSettings>): Promise<void> {
        const index = actionIndexMap.get(ev.action.id) ?? 0;
        const appId = AppList?.[index]?.appID;
        
        LaunchLogger.info(`Key down event received for action ${ev.action.id}. Launching game at index ${index} with appID ${appId ?? -1}`);
        
        try {
            await launchSteamGame(appId);
        } catch (error) {
            LaunchLogger.error(`Failed to launch Steam game: ${error}`);
            await ev.action.setTitle("Launch\nFailed");
        }
    }
}

function launchSteamGame(appId?: number): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!appId || appId < 0) {
            reject(new Error("Invalid app ID"));
            return;
        }
        
        exec(`start "" "steam://run/${appId}"`, { shell: "cmd.exe" }, (error: ExecException | null) => {
            if (error) {
                reject(error);
                return;
            }
            
            resolve();
        });
    });
}

type LaunchSteamGameSettings = {
    index?: number;
    page?: number;
};
