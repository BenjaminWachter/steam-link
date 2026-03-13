import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, SendToPluginEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import { AppList, fetchSteamApps } from "./steam-list";
import { exec, ExecException } from "node:child_process";
import fs from "fs";


const steamCollectionLogger = streamDeck.logger.createScope("SteamCollection");
const readJsonLogger = streamDeck.logger.createScope("ReadCollectionJSON");

let collections: Array<any> = [];
let cachedSettings: SteamCollectionSettings = {};
let appList = [];

@action({ UUID: "com.benwach.steam-link.steam-collection" })
export class SteamCollection extends SingletonAction<SteamCollectionSettings> {
    override async onWillAppear(ev: WillAppearEvent<SteamCollectionSettings>): Promise<void> {
        cachedSettings = {
            ...ev.payload.settings
        };

        if (!cachedSettings.userID) {
            const globalSettings = await streamDeck.settings.getGlobalSettings<SteamCollectionGlobalSettings>();
            if (globalSettings.userID) {
                cachedSettings.userID = globalSettings.userID;
            }
        }

        steamCollectionLogger.info("Steam Collection action appeared");
        steamCollectionLogger.info(`onWillAppear settings: ${JSON.stringify(cachedSettings)}`);
        collections = await readCollection(cachedSettings.userID ?? "-1");
        steamCollectionLogger.info(`Read ${collections.length} collections from file`);

    }

    override async onKeyDown(ev: KeyDownEvent<SteamCollectionSettings>): Promise<void> {
        fetchSteamApps(collections.flatMap((selection) => selection.appids ?? []), false).then((apps) => {
            steamCollectionLogger.info(`Fetched ${apps.length} apps for collection appIDs`);
            AppList.push(...apps);
        });
        await streamDeck.profiles.switchToProfile(ev.action.device.id, "Steam Apps (auto)");
    }

    override async onSendToPlugin(ev: SendToPluginEvent<any, SteamCollectionSettings>): Promise<void> {
        cachedSettings = {
            ...cachedSettings,
            ...ev.payload.settings
        };

        const requestEvent = typeof ev.payload.event === "string" ? ev.payload.event : ev.payload.action;
        steamCollectionLogger.info(`onSendToPlugin event=${requestEvent} settings=${JSON.stringify(cachedSettings)}`);

        switch (requestEvent) {
            case "requestCollections":
                collections = await readCollection(cachedSettings.userID ?? "-1");
                steamCollectionLogger.info(`Fetched ${collections.length} collections in response to Property Inspector request`);
                streamDeck.ui.sendToPropertyInspector({
                    event: "requestCollections",
                    items: collections.map((collection) => ({
                        label: collection.name ?? "Unnamed Collection",
                        value: collection.name ?? "Unnamed Collection"
                    }))
                });
                steamCollectionLogger.info(`Sent ${collections.length} collections to Property Inspector in response to request`);
                break;
            default:
                steamCollectionLogger.warn(`Unknown action received from Property Inspector: ${requestEvent}`);
        }
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<SteamCollectionSettings>): Promise<void> {
        steamCollectionLogger.info(`Settings updated for action ${ev.action.id}`);
        cachedSettings = ev.payload.settings;
        steamCollectionLogger.debug(`onDidReceiveSettings payload: ${JSON.stringify(cachedSettings)}`);

        if (cachedSettings.userID) {
            await streamDeck.settings.setGlobalSettings<SteamCollectionGlobalSettings>({
                userID: cachedSettings.userID
            });
        }
        ev.action.setTitle(cachedSettings.collectionSelection ?? "No Collection");
    }
}

async function readCollection(userID: string): Promise<Array<any>> {
    return new Promise((resolve, reject) => {
        let steamPath = "C:\\Program Files (x86)\\Steam";
        exec("powershell (gp \"HKLM:\\SOFTWARE\\WOW6432Node\\Valve\\Steam\").InstallPath", (error: ExecException | null, stdout: string) => {
            if (error) {
                readJsonLogger.error(`Error executing Steam path command: ${error.message}`);
                reject(error);
                return;
            }
            steamPath = stdout.trim();
        });

        const file = String(steamPath + "\\userdata\\" + (parseInt(userID.slice(5)) - parseInt("76561197960265728".slice(5))) + "\\config\\cloudstorage\\cloud-storage-namespace-1.json");
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

function validateJson(row: unknown, index: number): { key: string; parsedValue: { name?: string; is_deleted?: boolean } } | null {
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
        const parsedValue = JSON.parse(entry.value) as { name?: string; is_deleted?: boolean };
        return { key: entry.key, parsedValue };
    } catch {
        readJsonLogger.debug(`Skipping entry ${index}: invalid JSON value.`);
        return null;
    }
}

type SteamCollectionSettings = {
    userID?: string;
    collectionSelection?: string;
    collectionNames?: string[];
};

type SteamCollectionGlobalSettings = {
    userID?: string;
};
