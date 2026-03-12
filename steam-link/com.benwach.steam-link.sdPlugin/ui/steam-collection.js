const streamDeckClient = window.SDPIComponents?.streamDeckClient;

let currentSettings = {};

function updateDOM(domID) {
    switch (domID) {
        case 'userID': {
            const userIdInput = document.getElementById(domID);
            if (userIdInput && typeof currentSettings.userID === 'string') {
                userIdInput.value = currentSettings.userID;
            }
            break;
        }
        default:
            console.warn('Unknown DOM ID:', domID);
    }
}

function saveSettings() {
    if (!streamDeckClient) {
        console.warn('streamDeckClient unavailable; cannot save settings.');
        return;
    }

    console.log('Saving settings:', currentSettings);
    streamDeckClient.setSettings(currentSettings);
    streamDeckClient.setGlobalSettings({
        userID: currentSettings.userID
    });
}

function syncUserIdFromInput(userIdInput, shouldSave) {
    if (!userIdInput) {
        return;
    }

    currentSettings.userID = typeof userIdInput.value === 'string' ? userIdInput.value.trim() : '';
    console.log('PI userID updated:', currentSettings.userID);

    if (shouldSave) {
        saveSettings();
    }
}

async function requestCollections(isRefresh = false) {
    if (!streamDeckClient) {
        console.warn('streamDeckClient unavailable; cannot request collections.');
        return;
    }

    await streamDeckClient.send('sendToPlugin', {
        event: 'requestCollections',
        isRefresh
    });
}

async function initializeSettings() {
    if (!streamDeckClient) {
        console.warn('streamDeckClient unavailable; cannot initialize settings.');
        return;
    }

    try {
        const [{ settings }, globalSettings] = await Promise.all([
            streamDeckClient.getSettings(),
            streamDeckClient.getGlobalSettings()
        ]);

        currentSettings = {
            ...globalSettings,
            ...settings
        };
        updateDOM('userID');
    } catch (error) {
        console.error('Failed to initialize PI settings:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const userIdInput = document.getElementById('userID');
    const collectionSelect = document.getElementById('collectionSelect');

    await initializeSettings();

    if (streamDeckClient) {
        streamDeckClient.didReceiveSettings.subscribe((event) => {
            currentSettings = event.payload?.settings ?? {};
            updateDOM('userID');
        });

        streamDeckClient.didReceiveGlobalSettings.subscribe((event) => {
            const globalSettings = event.payload?.settings ?? {};
            currentSettings = {
                ...globalSettings,
                ...currentSettings
            };
            updateDOM('userID');
        });

        streamDeckClient.sendToPropertyInspector.subscribe((event) => {
            console.log('sendToPropertyInspector:', event.payload);
        });
    }

    if (userIdInput) {
        userIdInput.addEventListener('input', () => {
            syncUserIdFromInput(userIdInput, true);
        });

        userIdInput.addEventListener('change', () => {
            syncUserIdFromInput(userIdInput, true);
        });

        userIdInput.addEventListener('blur', () => {
            syncUserIdFromInput(userIdInput, true);
        });
    }

    if (collectionSelect) {
        collectionSelect.addEventListener('valuechange', () => {
            currentSettings.collectionSelection = collectionSelect.value;
            currentSettings.collectionSelectionLabel = collectionSelect.selectedOptions?.[0]?.textContent ?? currentSettings.collectionSelection;
            saveSettings();
        });

        requestCollections();
    }
});