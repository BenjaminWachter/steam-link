import streamDeck from "@elgato/streamdeck";

import { IncrementCounter } from "./actions/increment-counter";
import { SteamList } from "./actions/steam-list";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("info");

// Register the increment action.
streamDeck.actions.registerAction(new IncrementCounter());
streamDeck.actions.registerAction(new SteamList());

// Finally, connect to the Stream Deck.
streamDeck.connect();
