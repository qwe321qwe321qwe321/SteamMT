(
    function() {
        SteamMT.loadPreference(() => {
            if (!SteamMT.preference.storePageExtension) {
                console.log(SteamMT.preference)
                return
            }

            const otherSiteInfoElement = document.querySelector("div.apphub_OtherSiteInfo");
            const communityElement = otherSiteInfoElement.querySelector("a");
            const queueActionCtnElement = document.getElementById("queueActionsCtn");
            // insert to top one child.
            const queueSmallButtonDivElement = document.createElement("div");
            queueActionCtnElement.insertBefore(queueSmallButtonDivElement, queueActionCtnElement.firstChild);
            function createNewLargeButton(text, url) {
                const newElement = communityElement.cloneNode(true);
                newElement.classList.add("ex-site-button");
                newElement.href = url;
                newElement.querySelector("span").innerText = text;
                otherSiteInfoElement.insertBefore(newElement, communityElement);
            }
    
            function createNewTinyButton(text, url) {
                const btn = document.createElement("a");
                btn.href = url;
                btn.classList.add("app_tag");
                btn.style = "display: inline-block";
                btn.innerText = text;
                queueSmallButtonDivElement.appendChild(btn);
            }
    
            function getAppId() {
                return document.location.href.match(".*/app/([0-9]+).*")[1];
            }
    
            function replaceArgumentedLink(url) {
                return url.replace('${appId}', getAppId())
            }
    
            function getMicroTrailerLink() {
                const firstVideoLink = getFirstVideoLink();
                if (firstVideoLink) {
                    return firstVideoLink.replace(/(.*\/steam\/apps)\/([0-9]+)\/(.*)/, "$1/$2/microtrailer.webm");
                }
            }
            
            function getFirstVideoLink() {
                const el = document.querySelector(".highlight_strip_item.highlight_strip_movie > img.movie_thumb");
                return el ? el.src : null;
            }


            try {
                SteamMT.preference.largeButtons.forEach(
                    linkButton => createNewLargeButton(linkButton.name, replaceArgumentedLink(linkButton.url)));
            } catch {

            }

            try {
                SteamMT.preference.tinyButtons.forEach(
                    linkButton => createNewTinyButton(linkButton.name, replaceArgumentedLink(linkButton.url)));
            } catch {
                
            }
            // Micro trailer is always the last button.
            const microTrailer = getMicroTrailerLink();
            if (microTrailer) {
                createNewTinyButton("Micro Trailer", microTrailer);
            }
        })
    }
)()