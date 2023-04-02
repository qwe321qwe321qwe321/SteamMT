const CHROME_STORAGE_KEY = "SteamMTPreference"

class SteamMTClass {
    constructor() {
        this.preference = {
            initialized: false,
            storePageExtension: false,
            largeButtons: [],
            tinyButtons: []
        };
    }

    resetToDefault() {
        console.log("[SteamMT] Reset to default.");
        // default
        this.preference = {
            initialized: true,
            storePageExtension: true,
            largeButtons: [
                {
                    name: "Steam Scout",
                    url: "https://www.togeproductions.com/SteamScout/steamAPI.php?appID=${appId}"
                },
                {
                    name: "SteamDB", 
                    url: "https://steamdb.info/app/${appId}/graphs/"
                },
                {
                    name: "Gamalytic", 
                    url: "https://gamalytic.com/game/${appId}"
                }
            ],
            tinyButtons:[
                {
                    name: "Reviews Language", 
                    url: "https://www.togeproductions.com/SteamScout/steamAPI.php?appID=${appId}"
                },
                {
                    name: "SteamDB",
                    url: "https://steamdb.info/app/${appId}/graphs/"
                },
                {
                    name: "Gamalytic", 
                    url: "https://gamalytic.com/game/${appId}"
                },
                {
                    name: "VG Insights",
                    url: "https://vginsights.com/game/${appId}"
                },
                {
                    name: "Followers (realtime)",
                    url: "https://steamcommunity.com/search/groups/#text=${appId}"   
                }
            ]
        }
        this.savePreference()
    }
    
    loadPreference(callback) {
        const capturedThis = this
        capturedThis.initializedCallback = callback
        chrome.storage.sync.get([CHROME_STORAGE_KEY]).then(function(result) {
            if (!result[CHROME_STORAGE_KEY] || 
                !result[CHROME_STORAGE_KEY].hasOwnProperty('initialized') || 
                !result[CHROME_STORAGE_KEY].initialized) {
                console.log("[SteamMT]: First time initialize the saved list. set up default value.")
                capturedThis.resetToDefault()
            } else {
                capturedThis.preference = result[CHROME_STORAGE_KEY];
            }
            capturedThis.initializedCallback()
        })
    }
    
    savePreference() {
        chrome.storage.sync.set({[CHROME_STORAGE_KEY]: this.preference}).then(() => {
            console.log("[SteamMT] Saved to chrome storage.");
        })
    }
}

var SteamMT = new SteamMTClass()