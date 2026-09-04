/**
 * History Nuker — background logic
 *
 * On every browser startup:
 *  1. Read the timestamp saved at the previous startup.
 *  2. If enough days have passed since then, wipe history (and optionally
 *     downloads), then notify the user.
 *  3. Save "now" as the new timestamp, regardless of what happened above.
 *
 * The clock only moves forward at startup time, so opening the browser
 * every day never triggers a nuke — only a genuine gap between launches does.
 */

const DEFAULT_SETTINGS = {
  daysBeforeNuke: 14,
  deleteBrowsingHistory: true,
  deleteDownloadHistory: false,
  notificationsEnabled: true,
  customMessage:
    "You haven't opened Zen in 14 days. We assumed you were dead \uD83D\uDC80. Your history has been nuked."
};

const TIMESTAMP_KEY = "lastStartupTimestamp";

async function getSettings() {
  const stored = await browser.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

function daysBetween(then, now) {
  return (now - then) / (1000 * 60 * 60 * 24);
}

/** Wipes history per current settings and (optionally) notifies. Safe to call directly (test button) or from the startup check. */
async function nukeHistory(settings) {
  const results = { historyCleared: false, downloadsCleared: false };

  if (settings.deleteBrowsingHistory) {
    try {
      await browser.history.deleteAll();
      results.historyCleared = true;
    } catch (err) {
      console.error("History Nuker: failed to clear browsing history", err);
    }
  }

  if (settings.deleteDownloadHistory) {
    try {
      const hasPermission = await browser.permissions.contains({
        permissions: ["downloads"]
      });
      if (hasPermission) {
        const downloads = await browser.downloads.search({});
        for (const item of downloads) {
          await browser.downloads.erase({ id: item.id });
        }
        results.downloadsCleared = true;
      } else {
        console.warn(
          "History Nuker: download history deletion is enabled but the 'downloads' permission was never granted; skipping."
        );
      }
    } catch (err) {
      console.error("History Nuker: failed to clear download history", err);
    }
  }

  if (settings.notificationsEnabled) {
    try {
      await browser.notifications.create({
        type: "basic",
        iconUrl: browser.runtime.getURL("icons/icon-96.png"),
        title: "History Nuker \uD83D\uDC80",
        message: settings.customMessage || DEFAULT_SETTINGS.customMessage
      });
    } catch (err) {
      console.error("History Nuker: failed to show notification", err);
    }
  }

  return results;
}

/** Runs the startup check: nuke if the gap is big enough, then always re-stamp "now". */
async function checkAndMaybeNuke() {
  const now = Date.now();

  let stored;
  try {
    stored = await browser.storage.local.get(TIMESTAMP_KEY);
  } catch (err) {
    console.error("History Nuker: failed to read stored timestamp", err);
    stored = {};
  }

  const lastTimestamp = stored[TIMESTAMP_KEY];
  const hasValidTimestamp =
    typeof lastTimestamp === "number" &&
    Number.isFinite(lastTimestamp) &&
    lastTimestamp > 0 &&
    lastTimestamp <= now;

  if (hasValidTimestamp) {
    const settings = await getSettings();
    const threshold =
      Number.isFinite(Number(settings.daysBeforeNuke)) &&
      Number(settings.daysBeforeNuke) > 0
        ? Number(settings.daysBeforeNuke)
        : DEFAULT_SETTINGS.daysBeforeNuke;

    if (daysBetween(lastTimestamp, now) >= threshold) {
      await nukeHistory(settings);
    }
  }
  // No valid timestamp = first-ever startup, or a corrupted value.
  // Either way we do nothing destructive; we just start the clock below.

  try {
    await browser.storage.local.set({ [TIMESTAMP_KEY]: now });
  } catch (err) {
    console.error("History Nuker: failed to save startup timestamp", err);
  }
}

browser.runtime.onStartup.addListener(() => {
  checkAndMaybeNuke();
});

// First-ever install: start the clock immediately so day counting begins
// from install rather than from whenever the browser next restarts.
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    const stored = await browser.storage.local.get(TIMESTAMP_KEY);
    if (!stored[TIMESTAMP_KEY]) {
      await browser.storage.local.set({ [TIMESTAMP_KEY]: Date.now() });
    }
  }
});

// Lets the options page trigger a real (confirmed) test nuke and read back
// what actually happened, without duplicating the deletion logic there.
browser.runtime.onMessage.addListener((message) => {
  if (message && message.type === "TEST_NUKE") {
    return getSettings().then((settings) => nukeHistory(settings));
  }
  return undefined;
});
