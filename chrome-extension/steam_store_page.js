(
    function() {
        const otherSiteInfoElement = document.querySelector("div.apphub_OtherSiteInfo");
        const communityElement = otherSiteInfoElement.querySelector("a");
        const queueActionCtnElement = document.getElementById("queueActionsCtn");
        // insert to top one child.
        const queueSmallButtonDivElement = document.createElement("div");
        queueActionCtnElement.insertBefore(queueSmallButtonDivElement, queueActionCtnElement.firstChild);
        
        const appId = getAppId();
        createNewSiteButton("SteamScout", `https://www.togeproductions.com/SteamScout/steamAPI.php?appID=${appId}`);
        createNewSiteButton("SteamDB", `https://steamdb.info/app/${appId}/graphs/`);
        createNewSmallQueueButton("Reviews Language", `https://www.togeproductions.com/SteamScout/steamAPI.php?appID=${appId}`);
        createNewSmallQueueButton("Followers Chart", `https://steamdb.info/app/${appId}/graphs/`);

        createNewSmallQueueButton("Followers (realtime)", `https://steamcommunity.com/search/groups/#text=${appId}`);
        const microTrailer = getMicroTrailerLink();
        if (microTrailer) {
            createNewSmallQueueButton("Micro Trailer", microTrailer);
        }

        function createNewSiteButton(text, url) {
            const newElement = communityElement.cloneNode(true);
            newElement.classList.add("ex-site-button");
            newElement.href = url;
            newElement.querySelector("span").innerText = text;
            otherSiteInfoElement.insertBefore(newElement, communityElement);
        }

        function createNewSmallQueueButton(text, url) {
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
    }
)()