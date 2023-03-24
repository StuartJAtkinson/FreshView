// This file contains constants that may be shared across different scripts.
// -----------------------------------------------------------------------------

// Dark Mode
const DARK_MODE_CHECKBOX_STORAGE_KEY = "dark-mode-checkbox-state";
const DARK_MODE_CHECKBOX_DEFAULT_STATE = false;

// Filters (Types)
const HIDE_RECOMMENDATIONS_CHECKBOX_STORAGE_KEY = "hide-recommendations-checkbox-state";
const HIDE_RECOMMENDATIONS_CHECKBOX_DEFAULT_STATE = true;
const HIDE_PLAYLISTS_CHECKBOX_STORAGE_KEY = "hide-playlists-checkbox-state";
const HIDE_PLAYLISTS_CHECKBOX_DEFAULT_STATE = true;
const HIDE_SEARCHES_CHECKBOX_STORAGE_KEY = "hide-searches-checkbox-state";
const HIDE_SEARCHES_CHECKBOX_DEFAULT_STATE = true;

// Filters (Pages)
const HIDE_CHANNELS_CHECKBOX_STORAGE_KEY = "hide-channels-checkbox-state";
const HIDE_CHANNELS_CHECKBOX_DEFAULT_STATE = true;
const HIDE_HOME_CHECKBOX_STORAGE_KEY = "hide-home-checkbox-state"
const HIDE_HOME_CHECKBOX_DEFAULT_STATE = true;
const HIDE_EXPLORE_CHECKBOX_STORAGE_KEY = "hide-explore-checkbox-state"
const HIDE_EXPLORE_CHECKBOX_DEFAULT_STATE = true;
const HIDE_LIBRARY_CHECKBOX_STORAGE_KEY = "hide-library-checkbox-state"
const HIDE_LIBRARY_CHECKBOX_DEFAULT_STATE = true;
const HIDE_HISTORY_CHECKBOX_STORAGE_KEY = "hide-history-checkbox-state"
const HIDE_HISTORY_CHECKBOX_DEFAULT_STATE = false;
const HIDE_SUBSCRIPTIONS_CHECKBOX_STORAGE_KEY = "hide-subscriptions-checkbox-state"
const HIDE_SUBSCRIPTIONS_CHECKBOX_DEFAULT_STATE = true;


// View Threshold
const VIEW_THRESHOLD_CHECKBOX_STORAGE_KEY = "view-threshold-checkbox-state";
const VIEW_THRESHOLD_CHECKBOX_DEFAULT_STATE = true;
const VIEW_THRESHOLD_SLIDER_STORAGE_KEY = "view-threshold-slider-value";
const VIEW_THRESHOLD_SLIDER_DEFAULT_STATE = 90;

// Hide Videos
const HIDE_VIDEOS_CHECKBOX_STORAGE_KEY = "hide-videos-checkbox-state";
const HIDE_VIDEOS_CHECKBOX_DEFAULT_STATE = false;
const HIDE_VIDEOS_BOOKMARKS_STORAGE_KEY = "hide-videos-bookmarks";
const HIDE_VIDEOS_BOOKMARKS_DEFAULT_STATE = {};

// -----------------------------------------------------------------------------

// Number of milliseconds over which poll requests should be batched together
const BATCH_TIME_MILLISECONDS = 50;

// -----------------------------------------------------------------------------

// Message indicating a URL change.
const URL_CHANGE_MESSAGE = "url-change";
// Message requesting a page filter query.
const PAGE_FILTER_QUERY_MESSAGE = "page-filter-query";

// -----------------------------------------------------------------------------

// Default Settings state
const SETTINGS_DEFAULT_STATE = {
    // Filters (Types)
    [HIDE_RECOMMENDATIONS_CHECKBOX_STORAGE_KEY]: HIDE_RECOMMENDATIONS_CHECKBOX_DEFAULT_STATE,
    [HIDE_PLAYLISTS_CHECKBOX_STORAGE_KEY]: HIDE_PLAYLISTS_CHECKBOX_DEFAULT_STATE,
    [HIDE_SEARCHES_CHECKBOX_STORAGE_KEY]: HIDE_SEARCHES_CHECKBOX_DEFAULT_STATE,
    [HIDE_CHANNELS_CHECKBOX_STORAGE_KEY]: HIDE_CHANNELS_CHECKBOX_DEFAULT_STATE,

    // Filters (Pages)
    [HIDE_HOME_CHECKBOX_STORAGE_KEY]: HIDE_HOME_CHECKBOX_DEFAULT_STATE,
    [HIDE_EXPLORE_CHECKBOX_STORAGE_KEY]: HIDE_EXPLORE_CHECKBOX_DEFAULT_STATE,
    [HIDE_LIBRARY_CHECKBOX_STORAGE_KEY]: HIDE_LIBRARY_CHECKBOX_DEFAULT_STATE,
    [HIDE_HISTORY_CHECKBOX_STORAGE_KEY]: HIDE_HISTORY_CHECKBOX_DEFAULT_STATE,
    [HIDE_SUBSCRIPTIONS_CHECKBOX_STORAGE_KEY]: HIDE_SUBSCRIPTIONS_CHECKBOX_DEFAULT_STATE,

    // Hide Videos
    [HIDE_VIDEOS_CHECKBOX_STORAGE_KEY]: HIDE_VIDEOS_CHECKBOX_DEFAULT_STATE,
    [HIDE_VIDEOS_BOOKMARKS_STORAGE_KEY]: HIDE_VIDEOS_BOOKMARKS_DEFAULT_STATE,

    // View Threshold
    [VIEW_THRESHOLD_CHECKBOX_STORAGE_KEY]: VIEW_THRESHOLD_CHECKBOX_DEFAULT_STATE,
    [VIEW_THRESHOLD_SLIDER_STORAGE_KEY]: VIEW_THRESHOLD_SLIDER_DEFAULT_STATE
}
// This script implements the Storage class.
// -----------------------------------------------------------------------------

// Storage wraps the browser local storage API.  The synced storage API is not
// used because it has restrictive quotas and is not permitted in the context
// of a temporary Firefox extension.
class Storage {
    // Gets the specified items from local storage and invokes the given callback.
    // The items must be an object which maps keys to their default values.
    // Likewise, the callback must accept an object with the same shape as input.
    static get(items, callback) {
        const decorator = (contents) => {
            if (chrome.runtime.lastError) {
                Logger.error(`Storage.get(): failed to get items ${items}: ${chrome.runtime.lastError.message}.`);
            } else {
                const values = {};
                for (const [key, value] of Object.entries(items)) {
                    values[key] = contents.hasOwnProperty(key) ? contents[key] : value;
                }
                callback(values);
            }
        }
        chrome.storage.local.get(Object.keys(items), decorator);
    }

    // Sets the specified items from local storage and invokes the given callback
    // if one is provided.  The items must be given in the form of an object.
    static set(items, callback) {
        const decorator = () => {
            if (chrome.runtime.lastError) {
                Logger.error(`Storage.set(): failed to set items ${items}: ${chrome.runtime.lastError.message}.`);
            } else if (callback !== undefined) {
                callback();
            }
        }
        chrome.storage.local.set(items, decorator);
    }
}
// This file contains listeners for background events which correspond to the
// following actions:
//
// 1. Activating the extension icon in the browser toolbar.
// 2. Processing keyboard shortcuts (and updating browser storage).
// 3. Notifying content scripts of changes to their tab URL.
// -----------------------------------------------------------------------------

/**
 * Processes keyboard shortcuts by modifying browser storage.
 *
 * @see https://developer.chrome.com/docs/extensions/reference/commands/#event-onCommand
 */
 function onCommandListener(command) {
    const toggleStateInBrowserStorage = (key, fallback) => {
        Storage.get({[key]: fallback}, values => Storage.set({[key]: !values[key]}));
    }

    if (command === "toggle-hide-videos-checkbox") {
        toggleStateInBrowserStorage(
            HIDE_VIDEOS_CHECKBOX_STORAGE_KEY,
            HIDE_VIDEOS_CHECKBOX_DEFAULT_STATE
        );

    } else if (command === "toggle-view-threshold-checkbox") {
        toggleStateInBrowserStorage(
            VIEW_THRESHOLD_CHECKBOX_STORAGE_KEY,
            VIEW_THRESHOLD_CHECKBOX_DEFAULT_STATE
        );
    }
}

/**
 * Activates the extension icon in the browser toolbar.
 *
 * @see https://developer.chrome.com/docs/extensions/reference/runtime/#event-onMessage
 */
function onMessageListener(message, sender, _sendResponse) {
    if (message.type === "showPageAction") {
        chrome.pageAction.show(sender.tab.id);
    }
}

/**
 * Sends a message to a content script when the URL of its YouTube page changes.
 *
 * @see https://developer.chrome.com/docs/extensions/reference/tabs/#event-onUpdated
 */
function onTabUpdatedListener(tabID, changes, _){
    if (changes.url) {
        chrome.tabs.sendMessage(tabID, {"message": URL_CHANGE_MESSAGE});
    }
}

// -----------------------------------------------------------------------------

chrome.commands.onCommand.addListener(onCommandListener);
chrome.runtime.onMessage.addListener(onMessageListener);
chrome.tabs.onUpdated.addListener(onTabUpdatedListener);
