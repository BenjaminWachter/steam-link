import streamDeck from "@elgato/streamdeck";

import { SteamList} from "./actions/steam-list";
import { LaunchSteamGame } from "./actions/launch-steam-game";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("debug");

// Register the increment action.
streamDeck.actions.registerAction(new SteamList());
streamDeck.actions.registerAction(new LaunchSteamGame());

// Finally, connect to the Stream Deck.
streamDeck.connect();
