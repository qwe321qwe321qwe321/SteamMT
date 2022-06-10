(
    function() {
        const otherSiteInfoElement = document.querySelector("div.apphub_OtherSiteInfo");
        const communityElement = otherSiteInfoElement.querySelector("a");
        createNewSiteButton("SteamScout", `https://www.togeproductions.com/SteamScout/steamAPI.php?appID=${getAppId()}`);
        createNewSiteButton("SteamDB", `https://steamdb.info/app/${getAppId()}/graphs/`);

        function createNewSiteButton(text, url) {
            const newElement = communityElement.cloneNode(true);
            newElement.href = url;
            newElement.querySelector("span").innerText = text;
            otherSiteInfoElement.insertBefore(newElement, communityElement);
        }

        function getAppId() {
            return document.location.href.match(".*/app/([0-9]+).*")[1];
        }
    }
)()