// Steam Collection Property Inspector - WebSocket connection
var websocket = null;
var pluginUUID = null;
var actionInfo = {};
var actionContext = null;

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo, inActionInfo) {
    console.log('=== connectElgatoStreamDeckSocket called ===');
    console.log('Port:', inPort);
    console.log('Plugin UUID:', inPluginUUID);
    console.log('Register Event:', inRegisterEvent);
    
    pluginUUID = inPluginUUID;
    
    try {
        actionInfo = JSON.parse(inInfo);
        console.log('Parsed info:', actionInfo);
    } catch (e) {
        console.error('Failed to parse inInfo:', e);
    }

    if (inActionInfo) {
        try {
            var parsedActionInfo = JSON.parse(inActionInfo);
            actionContext = parsedActionInfo?.context ?? null;
            console.log('Parsed action context:', actionContext);
        } catch (e) {
            console.error('Failed to parse inActionInfo:', e);
        }
    }
    
    // Create the WebSocket connection
    console.log('Creating WebSocket connection to ws://127.0.0.1:' + inPort);
    websocket = new WebSocket('ws://127.0.0.1:' + inPort);

    websocket.onopen = function() {
        console.log('=== WebSocket OPENED ===');
        
        // Register the Property Inspector with Stream Deck
        var json = {
            "event": inRegisterEvent,
            "uuid": inPluginUUID
        };
        console.log('Sending registration:', json);
        websocket.send(JSON.stringify(json));

        // Ask Stream Deck for current settings for this action context.
        const settingsRequest = {
            event: 'getSettings',
            context: actionContext ?? pluginUUID
        };
        console.log('Requesting settings:', settingsRequest);
        websocket.send(JSON.stringify(settingsRequest));

        // Request collections immediately after registration.
        sendToPlugin({ action: 'requestCollections' });
    };

    websocket.onmessage = function(evt) {
        // Handle incoming events from the plugin
        console.log('=== WebSocket MESSAGE RECEIVED ===');
        console.log('Raw data:', evt.data);
        
        try {
            const jsonObj = JSON.parse(evt.data);
            console.log('Event type:', jsonObj.event);
            console.log('Parsed message:', jsonObj);
            
            // Handle different event types
            switch(jsonObj.event) {
                case 'sendToPropertyInspector':
                    console.log('>>> sendToPropertyInspector payload:', jsonObj.payload);
                    if (jsonObj.payload && jsonObj.payload.collections) {
                        console.log('Collections received:', jsonObj.payload.collections);
                        updateCollectionsSelect(jsonObj.payload.collections);
                    }
                    break;
                    
                // case 'didReceiveSettings':
                //     console.log('>>> didReceiveSettings:', jsonObj.payload);
                //     if (jsonObj.payload && jsonObj.payload.settings && jsonObj.payload.settings.collections) {
                //         console.log('Collections in settings:', jsonObj.payload.settings.collections);
                //         updateCollectionsSelect(jsonObj.payload.settings.collections);
                //     } else {
                //         console.warn('didReceiveSettings received but no collections found in settings');
                //     }
                //     break;
                    
                default:
                    console.log('>>> Unhandled event type:', jsonObj.event);
            }
        } catch (e) {
            console.error('Failed to parse message:', e);
        }
    };

    websocket.onerror = function(error) {
        console.error('=== WebSocket ERROR ===', error);
    };

    websocket.onclose = function() {
        console.log('=== WebSocket CLOSED ===');
    };
}

function updateCollectionsSelect(collections) {
    const select = document.getElementById('collectionSelect');
    if (!select) {
        console.error('Select element not found!');
        return;
    }

    console.log('Found select element, clearing options');
    select.innerHTML = '';
    
    if (!Array.isArray(collections) || collections.length === 0) {
        console.warn('No collections to display');
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- No collections found --';
        select.appendChild(defaultOption);
        return;
    }

    console.log(`Creating ${collections.length} options`);
    collections.forEach((item, index) => {
        const name = readCollectionName(item, index);
        console.log(`Creating option ${index}: ${name}`);
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
    console.log('Options created successfully');
}

function readCollectionName(item, index) {
    if (typeof item === 'string') {
        return item;
    }

    if (item && typeof item === 'object') {
        if (typeof item.name === 'string' && item.name.trim() !== '') {
            return item.name;
        }

        if (typeof item.collection_name === 'string' && item.collection_name.trim() !== '') {
            return item.collection_name;
        }
    }
}

function sendToPlugin(payload) {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket not connected; cannot send to plugin yet.');
        return;
    }

    const message = {
        action: 'com.benwach.steam-link.steam-collection',
        event: 'sendToPlugin',
        context: pluginUUID,
        payload
    };

    console.log('Sending to plugin:', message);
    websocket.send(JSON.stringify(message));
}

document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshCollections');
    if (!refreshBtn) {
        return;
    }

    refreshBtn.addEventListener('click', () => {
        sendToPlugin({ action: 'requestCollections' });
    });
});

console.log('steam-collection.js loaded successfully');
