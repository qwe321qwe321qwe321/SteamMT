const inputElSteamUrl = document.getElementById("input-el-steam-url")

const inputElUtmSource = document.getElementById("input-el-utm-source")
const inputRlUtmCampaign = document.getElementById("input-el-utm-campaign")
const inputElUtmMedium = document.getElementById("input-el-utm-medium")
const inputElUtmContent = document.getElementById("input-el-utm-content")
const inputElUtmTerm = document.getElementById("input-el-utm-term")
const utmParams = [
    {name: "utm_source", element: inputElUtmSource},
    {name: "utm_campaign", element: inputRlUtmCampaign},
    {name: "utm_medium", element: inputElUtmMedium},
    {name: "utm_content", element: inputElUtmContent},
    {name: "utm_term", element: inputElUtmTerm}
]

const exportLinkBtn = document.getElementById("export-link-btn")
const listElement = document.getElementById("ul-el")
const LOCAL_STORAGE_NAME = "mySteamLinks"
const DEFAULT_BASE_URL = "https://store.steampowered.com/app/1928690/Bionic_Bay/"
const linksFromLocalStorage = JSON.parse( localStorage.getItem(LOCAL_STORAGE_NAME) )
const grabLinkBtn = document.getElementById("grab-tab-btn")
const deleteBtn = document.getElementById("delete-btn")

// list
let myExportedLinks = []
if (linksFromLocalStorage) {
    myExportedLinks = linksFromLocalStorage
    render(myExportedLinks)
}

// Grab current tab.
grabLinkBtn.addEventListener("click", function(){    
    var targetURL = prompt('Enter a url.')
    grabUtmParams(targetURL)
})

function grabUtmParams(url) {
    const currentTabURL = new URL(url)
    console.log(url)
    const baseURL = currentTabURL.origin + currentTabURL.pathname
    inputElSteamUrl.value = baseURL

    const currentTabParams = currentTabURL.searchParams
    for (let utmParam of utmParams) {
        let value = ""
        if (currentTabParams.has(utmParam.name)) {
            value = currentTabParams.get(utmParam.name)
        }
        utmParam.element.value = value
        console.log(`key: ${utmParam.name}, value: ${value}`)
    }
}

// delete button
deleteBtn.addEventListener("dblclick", function() {
    localStorage.clear()
    myExportedLinks = []
    render(myExportedLinks)
})

// export button
exportLinkBtn.addEventListener("click", function() {
    let baseURL = inputElSteamUrl.value
    if (!isValidHttpUrl(baseURL)){
        baseURL = DEFAULT_BASE_URL
    }
    
    let searchParams = new URLSearchParams()
    for (const utmParam of utmParams) {
        if (utmParam.element.value === "") {
            continue
        }
        searchParams.set(utmParam.name, utmParam.element.value)
    }
    
    let exportURL = new URL(baseURL)
    exportURL.search = searchParams
    console.log(exportURL)
    
    myExportedLinks.push(exportURL.href)
    localStorage.setItem(LOCAL_STORAGE_NAME, JSON.stringify(myExportedLinks) )
    render(myExportedLinks)
})

// render all links
function render(links) {
    listElement.innerHTML = '';
    for (let i = 0; i < links.length; i++) {
        const link = links[i]
        
        let liElement = document.createElement('li')
        liElement.className = "link-li"
        listElement.appendChild(liElement)
        
        let aElement = document.createElement('a')
        aElement.target = "_blank"
        aElement.href = link
        aElement.textContent = link
        liElement.appendChild(aElement)
                
        let copyBtn = document.createElement('button')
        copyBtn.textContent = "copy"
        copyBtn.className = "blue-button"
        copyBtn.addEventListener('click', function(){
            copyToClipboard(link)
        });
        liElement.appendChild(copyBtn)
        
        
        
        // listItems += `
        //     <li class='link-li'>
        //         <a target='_blank' href='${links[i]}'>
        //             ${links[i]}
        //         </a>
        //         <button onclick="copyToClipboard(">copy</button>
        //     </li>
        // `
    }
    // listElement.innerHTML = listItems
}

function copyToClipboard(text) {
    console.log(text)
    navigator.clipboard.writeText(text).then(() => {
        console.log("copied " + text)
        //clipboard successfully set
    }, () => {
        //clipboard write failed, use fallback
        console.log("cannot copy")
    });
}

function isValidHttpUrl(string) {
    let url;
    
    try {
      url = new URL(string);
    } catch (_) {
      return false;  
    }
  
    return url.protocol === "http:" || url.protocol === "https:";
  }