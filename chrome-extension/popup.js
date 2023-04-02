const ulElLargeButtonList = document.getElementById("large-button-list")
const ulElTinyButtonList = document.getElementById("tiny-button-list")
const inputElLinkName = document.getElementById("input-link-name")
const inputElLinkUrl = document.getElementById("input-link-url")
const buttonElSaveAsLarge = document.getElementById("save-as-large")
const buttonElSaveAsTiny = document.getElementById("save-as-tiny")
const buttonElResetLinks = document.getElementById("reset-links-button")
const inputElStorePageExtToggle = document.getElementById("store-page-extension-toggle")
const containerElSteamStoreOptionContent = document.getElementById("steam-store-options-content")

console.log("[SteamMT]: Open popup!")

// Load init.js to initalize SteamMT object.
function loadScript(path, callback) {
    var scriptEl = document.createElement('script');
    scriptEl.src = chrome.runtime.getURL(path);
    scriptEl.addEventListener('load', callback, false);
    document.head.appendChild(scriptEl);
}
loadScript("init.js", () => {
    SteamMT.loadPreference(() => {
        console.log("[SteamMT]: Initialized.")
        // Register button events.
        buttonElSaveAsLarge.addEventListener("click", function() {
            addLinkToList(SteamMT.preference.largeButtons, inputElLinkName.value, inputElLinkUrl.value)
        })
        buttonElSaveAsTiny.addEventListener("click", function() {
            addLinkToList(SteamMT.preference.tinyButtons, inputElLinkName.value, inputElLinkUrl.value)
        })
        
        buttonElResetLinks.addEventListener("click", function() {
            const DoubleCheckMsg = "ARE YOU SURE?"
            if (buttonElResetLinks.textContent === DoubleCheckMsg) {
                SteamMT.resetToDefault()
                buttonElResetLinks.textContent = "RESET TO DEFAULT"
                render()
            } else {
                buttonElResetLinks.textContent = DoubleCheckMsg
            }
            
        })

        inputElStorePageExtToggle.checked = SteamMT.preference.storePageExtension
        inputElStorePageExtToggle.addEventListener("change", function() {
            setStorePageExtensionEnabled(inputElStorePageExtToggle.checked)
            render()
        })

        render()
    })
})

function render() {
    if (inputElStorePageExtToggle.checked) {
        containerElSteamStoreOptionContent.style.display = "block"
        renderLinkButtonList(ulElLargeButtonList, SteamMT.preference.largeButtons)
        renderLinkButtonList(ulElTinyButtonList, SteamMT.preference.tinyButtons)
    } else {
        containerElSteamStoreOptionContent.style.display = "none"
    }
}

// render links in the list
function renderLinkButtonList(listElement, buttonList) {
    listElement.innerHTML = '';
    for (let i = 0; i < buttonList.length; i++) {
        const linkButtonData = buttonList[i]
        
        let liElement = document.createElement('li')
        listElement.appendChild(liElement)
        
        let deleteButtonElement = document.createElement('button')
        deleteButtonElement.className = "delete-link-button"
        deleteButtonElement.textContent = "X"
        deleteButtonElement.addEventListener('click', function(){
            deleteLinkFromList(buttonList, i)
        });
        liElement.appendChild(deleteButtonElement)

        let spanElement = document.createElement('span')
        spanElement.className = "link-title"
        spanElement.textContent = linkButtonData["name"]
        liElement.appendChild(spanElement)
        
        let divElement = document.createElement('div')
        liElement.appendChild(divElement)

        let linkFormatSpanElement = document.createElement('span')
        linkFormatSpanElement.className = "link-format"
        linkFormatSpanElement.textContent = linkButtonData["url"]
        divElement.appendChild(linkFormatSpanElement)
    }
    // listElement.innerHTML = listItems
}

function addLinkToList(buttonList, name, url) {
    console.log(`[SteamMT]: Add {${name}, ${url}} to ${buttonList}}`)
    buttonList.push({
        name: name,
        url: url
    })
    SteamMT.savePreference()
    render()
}

function deleteLinkFromList(buttonList, index) {
    console.log(`[SteamMT]: Remove [${index}] from ${buttonList}}`)
    buttonList.splice(index, 1)
    SteamMT.savePreference()
    render()
}

function setStorePageExtensionEnabled(enabled) {
    console.log(`[SteamMT]: toggle store page extension (${enabled})`)
    SteamMT.preference.storePageExtension = enabled
    SteamMT.savePreference()
}