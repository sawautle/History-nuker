History Nuker 💀

    "If I haven't opened the browser for X days, assume I'm dead and nuke my history."

A lightweight, local-first WebExtension built specifically for Zen Browser and Firefox. It tracks the time elapsed between browser startups. If you don't open your browser for a configurable number of days (default: 14), it automatically wipes your browsing history and alerts you on startup.
⚡ Features

    Startup Gap Detection: Triggers purely on the time passed between browser launches—not idle time or the age of individual history entries.

    Minimal Overhead: Executes in milliseconds during browser startup (browser.runtime.onStartup) and remains dormant otherwise.

    Selective Wiping: Clears browsing history by default. Download history wiping is optional and gated behind a just-in-time permission request.

    Sleek Interface: Features a dark charcoal options page with cyan-to-yellow gradient accent highlights.

    Manual Test Mode: Built-in options panel with a Test Nuke button and confirmation prompt.

    100% Local & Private: Zero analytics, telemetry, external network requests, or third-party dependencies.

🛠️ Project Structure
Plaintext

history-nuker/
├── manifest.json       # Manifest V3 configuration & Gecko extension ID
├── background.js       # Background event listener & startup calculation
├── options.html        # Settings UI markup
├── options.css         # Dark theme styling with gradient accents
├── options.js          # Options page event handling & manual trigger logic
└── icons/              # Extension icons (16px, 32px, 48px, 96px, 128px)

🚀 Installation & Testing
Temporary Loading (Development)

    Clone or download this repository.

    Open Zen Browser or Firefox.

    Navigate to about:debugging#/runtime/this-firefox.

    Click Load Temporary Add-on….

    Select the manifest.json file inside the project directory.

Packaging as .xpi

To bundle the extension into an .xpi installer file:
Bash

cd history-nuker
zip -r -X history-nuker.xpi . -x ".*"

    Note: For permanent installation in standard Firefox releases, the .xpi file must be signed via Mozilla's Add-on Developer Hub (AMO). On Firefox Developer Edition, Nightly, or Zen Browser, unsigned extensions can be enabled by setting xpinstall.signatures.required to false in about:config.

🔒 Permissions

    storage: Saved settings and startup timestamps.

    history: Wiping browsing history upon meeting trigger conditions.

    notifications: Displaying the notification banner when history is nuked.

    downloads (Optional): Dynamically requested only if "Delete download history" is explicitly enabled.

📄 License

Distributed under the MIT License.
