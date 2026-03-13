import streamDeck from "@elgato/streamdeck";
import { LaunchSteamGame } from "./actions/launch-steam-game";
import { SteamCollection } from "./actions/steam-collection";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("debug");

// Register the increment action.
streamDeck.actions.registerAction(new LaunchSteamGame());
streamDeck.actions.registerAction(new SteamCollection());

// Finally, connect to the Stream Deck.
streamDeck.connect();
