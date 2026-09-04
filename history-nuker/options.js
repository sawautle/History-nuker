const DEFAULT_SETTINGS = {
  daysBeforeNuke: 14,
  deleteBrowsingHistory: true,
  deleteDownloadHistory: false,
  notificationsEnabled: true,
  customMessage:
    "You haven't opened Zen in 14 days. We assumed you were dead \uD83D\uDC80. Your history has been nuked."
};

const els = {
  daysBeforeNuke: document.getElementById("daysBeforeNuke"),
  deleteBrowsingHistory: document.getElementById("deleteBrowsingHistory"),
  deleteDownloadHistory: document.getElementById("deleteDownloadHistory"),
  notificationsEnabled: document.getElementById("notificationsEnabled"),
  customMessage: document.getElementById("customMessage"),
  testNukeBtn: document.getElementById("testNukeBtn"),
  statusMessage: document.getElementById("statusMessage"),
  lastStartupInfo: document.getElementById("lastStartupInfo")
};

let saveTimer = null;

function setSwitch(button, checked) {
  button.setAttribute("aria-checked", checked ? "true" : "false");
}

function isChecked(button) {
  return button.getAttribute("aria-checked") === "true";
}

async function loadSettings() {
  const stored = await browser.storage.local.get(DEFAULT_SETTINGS);
  const settings = { ...DEFAULT_SETTINGS, ...stored };

  els.daysBeforeNuke.value = settings.daysBeforeNuke;
  setSwitch(els.deleteBrowsingHistory, settings.deleteBrowsingHistory);
  setSwitch(els.deleteDownloadHistory, settings.deleteDownloadHistory);
  setSwitch(els.notificationsEnabled, settings.notificationsEnabled);
  els.customMessage.value = settings.customMessage;
}

async function loadLastStartup() {
  const stored = await browser.storage.local.get("lastStartupTimestamp");
  const ts = stored.lastStartupTimestamp;
  if (typeof ts === "number" && Number.isFinite(ts) && ts > 0) {
    const date = new Date(ts);
    els.lastStartupInfo.textContent = "Last recorded startup: " + date.toLocaleString();
  } else {
    els.lastStartupInfo.textContent = "No startup recorded yet.";
  }
}

function currentSettings() {
  const days = parseInt(els.daysBeforeNuke.value, 10);
  return {
    daysBeforeNuke: Number.isFinite(days) && days > 0 ? days : DEFAULT_SETTINGS.daysBeforeNuke,
    deleteBrowsingHistory: isChecked(els.deleteBrowsingHistory),
    deleteDownloadHistory: isChecked(els.deleteDownloadHistory),
    notificationsEnabled: isChecked(els.notificationsEnabled),
    customMessage: els.customMessage.value.trim() || DEFAULT_SETTINGS.customMessage
  };
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSettings, 300);
}

async function saveSettings() {
  await browser.storage.local.set(currentSettings());
  showStatus("Settings saved.", "success", 1800);
}

function showStatus(message, kind, autoHideMs) {
  els.statusMessage.textContent = message;
  els.statusMessage.className = "status" + (kind ? " " + kind : "");
  if (autoHideMs) {
    setTimeout(() => {
      if (els.statusMessage.textContent === message) {
        els.statusMessage.textContent = "";
        els.statusMessage.className = "status";
      }
    }, autoHideMs);
  }
}

/* ---------- Toggle wiring ---------- */

els.deleteBrowsingHistory.addEventListener("click", () => {
  setSwitch(els.deleteBrowsingHistory, !isChecked(els.deleteBrowsingHistory));
  queueSave();
});

els.notificationsEnabled.addEventListener("click", () => {
  setSwitch(els.notificationsEnabled, !isChecked(els.notificationsEnabled));
  queueSave();
});

// This one needs a permission request before it can turn on.
els.deleteDownloadHistory.addEventListener("click", async () => {
  const turningOn = !isChecked(els.deleteDownloadHistory);

  if (!turningOn) {
    setSwitch(els.deleteDownloadHistory, false);
    queueSave();
    return;
  }

  try {
    const granted = await browser.permissions.request({ permissions: ["downloads"] });
    if (granted) {
      setSwitch(els.deleteDownloadHistory, true);
      queueSave();
    } else {
      showStatus("Permission denied — download history deletion stays off.", "error", 3000);
    }
  } catch (err) {
    console.error("History Nuker: permission request failed", err);
    showStatus("Couldn't request permission. Download history deletion stays off.", "error", 3000);
  }
});

els.daysBeforeNuke.addEventListener("input", queueSave);
els.customMessage.addEventListener("input", queueSave);

/* ---------- Test nuke ---------- */

els.testNukeBtn.addEventListener("click", async () => {
  const settings = currentSettings();
  const parts = [];
  if (settings.deleteBrowsingHistory) parts.push("browsing history");
  if (settings.deleteDownloadHistory) parts.push("download history");

  if (parts.length === 0) {
    showStatus("Nothing is set to be deleted — enable an option above first.", "error", 3500);
    return;
  }

  const confirmed = window.confirm(
    "This will permanently delete your " +
      parts.join(" and ") +
      " right now, using your current settings. This cannot be undone.\n\nRun the test nuke?"
  );
  if (!confirmed) return;

  els.testNukeBtn.disabled = true;
  showStatus("Nuking\u2026", null);

  try {
    const result = await browser.runtime.sendMessage({ type: "TEST_NUKE" });
    const done = [];
    if (result && result.historyCleared) done.push("browsing history");
    if (result && result.downloadsCleared) done.push("download history");
    showStatus(
      done.length ? "Done — cleared " + done.join(" and ") + "." : "Ran, but nothing was cleared.",
      "success"
    );
  } catch (err) {
    console.error("History Nuker: test nuke failed", err);
    showStatus("Something went wrong running the test nuke.", "error");
  } finally {
    els.testNukeBtn.disabled = false;
  }
});

/* ---------- Init ---------- */

loadSettings();
loadLastStartup();
