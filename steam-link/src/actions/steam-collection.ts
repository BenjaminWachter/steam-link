import streamDeck,  { action, KeyDownEvent, SingletonAction, WillAppearEvent, SendToPluginEvent } from "@elgato/streamdeck";
import { AppList, AppListItem, fetchSteamApps } from "./steam-list";
import { exec, ExecException } from "node:child_process";
import fs from "fs";

const steamCollectionLogger = streamDeck.logger.createScope("SteamCollection");
const readJsonLogger = streamDeck.logger.createScope("ReadCollectionJSON");
const websocketLogger = streamDeck.logger.createScope("WebSocket");

let collections: any[] = [];
@action({ UUID: "com.benwach.steam-link.steam-collection" })
export class SteamCollection extends SingletonAction<SteamCollectionSettings> {
    override async onWillAppear(ev: WillAppearEvent<SteamCollectionSettings>): Promise<void> {
        steamCollectionLogger.info("Steam Collection action appeared");
        collections = await readCollection(ev.payload.settings?.userID ?? -1);
        steamCollectionLogger.info(`Read ${collections.length} collections from file`);
        await this.SendCollections(ev);
    }
    
    override async onKeyDown(ev: KeyDownEvent<SteamCollectionSettings>): Promise<void> {
    }
    
    override async onSendToPlugin(ev: SendToPluginEvent<any, SteamCollectionSettings>): Promise<void> {
        switch (ev.payload.action) {
            case "requestCollections":
            case "refreshCollections":
                collections = await readCollection(ev.payload.settings?.userID ?? -1);
                steamCollectionLogger.info(`Fetched ${collections.length} collections in response to Property Inspector request`);
                await this.SendCollections(ev);
                break;
            default:
                steamCollectionLogger.warn(`Unknown action received from Property Inspector: ${ev.payload.action}`);
        }
    }
    
    private async SendCollections(ev: WillAppearEvent<SteamCollectionSettings> | KeyDownEvent<SteamCollectionSettings> | SendToPluginEvent<any, SteamCollectionSettings>): Promise<void> {        
        
        let collectionNames = collections.map((collection, index) => {
            const name = collection.name ?? collection.collection_name ?? `Collection ${index + 1}`;
            steamCollectionLogger.debug(`Collection ${index + 1} name: ${name}`);
            return name;
        });
        steamCollectionLogger.info(`Mapped collection names: ${JSON.stringify(collectionNames)}`);
        
        // Update settings - this sends "didReceiveSettings" event to Property Inspector
        const existingSettings = (ev.payload as { settings?: SteamCollectionSettings } | undefined)?.settings ?? {};
        await ev.action.setSettings({
            ...existingSettings,
            collections: collectionNames
        });
        steamCollectionLogger.info(`Settings updated with ${collectionNames.length} collection names`);
        
        // Send directly to Property Inspector - this sends "sendToPropertyInspector" event
        const payload = { collections: collectionNames };
        await streamDeck.ui.sendToPropertyInspector(payload);
        steamCollectionLogger.info(`Sent collections directly to property inspector via WebSocket`);
        steamCollectionLogger.debug(`Payload: ${JSON.stringify(payload)}`);
    }
}

async function readCollection(userID: number): Promise<Array<any>> {
    return new Promise((resolve, reject) => {
        let flag = false; // Placeholder for any condition you might want to check before executing the command
        let steamPath;
        if (flag) {
            exec(String("powershell (gp \"HKLM:\\SOFTWARE\\WOW6432Node\\Valve\\Steam\").InstallPath"), (error: ExecException | null, stdout: string) => {
                if (error) {
                    readJsonLogger.error(`Error executing Steam path command: ${error.message}`);
                    reject(error);
                    return;
                }

                steamPath = stdout.trim();
            });
        } else {
            steamPath = "C:\\Program Files (x86)\\Steam"; // Default path if command execution is not desired
        }

        const file = String(steamPath + "\\userdata\\" + userID + "\\config\\cloudstorage\\cloud-storage-namespace-1.json");
        readJsonLogger.debug("file path: ", file);

        // Check if file exists before attempting to read
        if (!fs.existsSync(file)) {
            readJsonLogger.error(`Collection file does not exist: ${file}`);
            resolve([]);
            return;
        }

        try {
            readJsonLogger.debug("Reading collection file...");
            fs.readFile(file, "utf-8", (err, data) => {
                if (err) {
                    readJsonLogger.error(`Error reading collection file: ${err.message}`);
                    resolve([]);
                    return;
                }

                try {
                    const jsonData = JSON.parse(data);
                    let collectionKeys = [];
                    if (!Array.isArray(jsonData)) {
                        readJsonLogger.warn("Collection JSON root is not an array.");
                        resolve([]);
                        return;
                    }

                    for (let i = jsonData.length - 1; i >= 0; i--) {
                        const validated = validateJson(jsonData[i], i);
                        if (!validated) {
                            continue;
                        }

                        const { key, parsedValue } = validated;

                        if (!parsedValue?.is_deleted) {
                            readJsonLogger.trace(`Processing entry ${i} with key ${key}`);
                            collectionKeys.push(parsedValue);
                        }
                    }

                    readJsonLogger.info(`Found ${collectionKeys.length} collections in data`);
                    resolve(collectionKeys);
                } catch (parseErr) {
                    readJsonLogger.error(`Error parsing collection JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
                    resolve([]);
                }
            });
        } catch (err) {
            readJsonLogger.error(`Error accessing collection file: ${err instanceof Error ? err.message : String(err)}`);
            resolve([]);
        }
    });
}

function validateJson(row: unknown, index: number): { key: string; parsedValue: { name?: string; collection_name?: string; is_deleted?: boolean } } | null {
    if (!Array.isArray(row) || row.length < 2) {
        return null;
    }

    const entry = row[1] as { key?: string; value?: string };
    if (typeof entry?.key !== "string" || !entry.key.startsWith("user-collections.uc-")) {
        return null;
    }

    if (typeof entry.value !== "string" || entry.value.trim() === "") {
        readJsonLogger.debug(`Skipping entry ${index}: missing collection value.`);
        return null;
    }

    try {
        const parsedValue = JSON.parse(entry.value) as { name?: string; collection_name?: string; is_deleted?: boolean };
        return { key: entry.key, parsedValue };
    } catch {
        readJsonLogger.debug(`Skipping entry ${index}: invalid JSON value.`);
        return null;
    }
}

type SteamCollectionSettings = {
    userID?: number;
    collectionName?: string;
    collections?: string[];
};
