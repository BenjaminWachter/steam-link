import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { AppList, AppListItem } from "./steam-list";
import { exec, ExecException } from "node:child_process";
import fs from "fs";
import { start } from "node:repl";

const steamCollectionLogger = streamDeck.logger.createScope("SteamCollection");

@action({ UUID: "com.benwach.steam-link.steam-collection" })
export class SteamCollection extends SingletonAction<SteamCollectionSettings> {
    override onWillAppear(ev: WillAppearEvent<SteamCollectionSettings>): void | Promise<void> {
        // No specific action needed on appearance for the collection
        steamCollectionLogger.info("Steam Collection action appeared");
    }

    override async onKeyDown(ev: KeyDownEvent<SteamCollectionSettings>): Promise<void> {
        steamCollectionLogger.info(`Key down event received for Steam Collection action.`);
        const items = await readCCollection(ev);
        steamCollectionLogger.info(`Retrieved ${items.length} items from steam collection.`);
    }
}

async function readCCollection(ev: WillAppearEvent<SteamCollectionSettings> | KeyDownEvent<SteamCollectionSettings>): Promise<AppListItem[]> {
    return new Promise((resolve, reject) => {
        let flag = false; // Placeholder for any condition you might want to check before executing the command
        let steamPath;
        if (flag) {
            exec(String("powershell (gp \"HKLM:\\SOFTWARE\\WOW6432Node\\Valve\\Steam\").InstallPath"), (error: ExecException | null, stdout: string) => {
                if (error) {
                    steamCollectionLogger.error(`Error executing Steam path command: ${error.message}`);
                    reject(error);
                    return;
                }

                steamPath = stdout.trim();
            });
        } else {
            steamPath = "C:\\Program Files (x86)\\Steam"; // Default path if command execution is not desired
        }

        const file = String(steamPath + "\\userdata\\" + ev.payload.settings.userID + "\\config\\cloudstorage\\cloud-storage-namespace-1.json");
        steamCollectionLogger.debug("file path: ", file);
        fs.readFile(file, "utf-8", (err, data) => {
            if (err) {
                steamCollectionLogger.error(`Error reading LevelDB file: ${err.message}`);
                resolve([]);
                return;
            }
            if (!fs.existsSync(file)) {
                let steamCollection = JSON.parse(data).key("user-collection.uc-*");
                steamCollectionLogger.info(`Steam collection data: ${JSON.stringify(steamCollection)}`);
                resolve(steamCollection);
            }
        });
    });
}


type SteamCollectionSettings = {
    userID?: string;
    collectionName?: string;
};