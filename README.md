# Steam Marketing Tool
A chrome extension for marketing.

# Features
## Export Regional Wishlists on Steamworks
### Export Charts
Passing data to [Chart Tool](#chart-tool-for-regional-wishlists) to show the regional wishlist charts.
![]()

### Export .csv
Export and download a CSV file.
![]()

## Add links on Steam store page
* [SteamDB](https://steamdb.info/)
* [SteamScout](https://www.togeproductions.com/SteamScout/steamAPI.php) - Steam reviews language breakdown
* Realtime followers - https://steamcommunity.com/search/groups/
* Micro Trailer - https://store.steampowered.com/labs/microtrailers
> It's compatible with [AugmentedSteam](https://github.com/IsThereAnyDeal/AugmentedSteam) which is a more powerful extension.

## Install Chrome Extension
It hasn't been landed on Chrome Store, so you can only install manually.
* Download zip and unzip it.
* Goto `chrome://extensions/`.
* Turn on developer mode.
* Push **Load unpacked extension** button and select the `chrome-extension` folder.

## Chart Tool for regional wishlists
https://qwe321qwe321qwe321.github.io/SteamMT/chart/

Input data is passed by GET params. This page doesn't store any private information. You can share the link to show anyone the same result. (even though it's LOOOOOOOOOOOOOOONG)

### GET Params
| Param | Type | Description |
| --- | --- | --- |
| data | Base64 Encode object { title: <_String_>, xValues: [...<_String_>], vValues: [...<_Number_>] } | The input data for charts. |
| topN | Number (> 0) | Only display top N results. |


