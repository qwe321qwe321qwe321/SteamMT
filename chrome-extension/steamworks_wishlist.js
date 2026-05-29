(
    function() {
        const TOOL_URL = "https://howtomarketagame.com/wishlists/";
        const BUTTON_ROW_CLASS = "steammt-wishlist-tool-row";
        const BUTTON_STYLE_ID = "steammt-wishlist-tool-style";
        const EXPECTED_HEADER = "DateLocal,Game,Adds,Deletes,PurchasesAndActivations,Gifts";
        const AUTO_OPEN_PARAM = "steammtOpenWishlistTool";

        injectStyle();
        pollForWishlistPageActions();

        function pollForWishlistPageActions() {
            tryInsertButton();
            tryAutoOpenWishlistTool();
            window.setInterval(() => {
                tryInsertButton();
                tryAutoOpenWishlistTool();
            }, 1500);
        }

        function tryInsertButton() {
            if (document.querySelector(".steammt-wishlist-tool-button")) {
                return;
            }

            const summaryCsvLink = findWishlistSummaryCsvLink();
            if (!summaryCsvLink || !summaryCsvLink.parentElement) {
                return;
            }

            const summaryHeading = findPreviousHeading(summaryCsvLink);
            if (!summaryHeading) {
                return;
            }

            const buttonRow = document.createElement("div");
            buttonRow.className = BUTTON_ROW_CLASS;

            const button = createExButton("Open in Wishist Tool by HTMAG");
            button.classList.add("steammt-wishlist-tool-button");
            button.addEventListener("click", () => {
                handleOpenWishlistTool(button);
            });
            buttonRow.appendChild(button);
            summaryHeading.insertAdjacentElement("afterend", buttonRow);
        }

        function tryAutoOpenWishlistTool() {
            const url = new URL(window.location.href);
            if (url.searchParams.get(AUTO_OPEN_PARAM) !== "1") {
                return;
            }

            if (!isAllHistoryPage()) {
                const allHistoryLink = findAllHistoryLink();
                if (allHistoryLink) {
                    window.location.href = buildAutoOpenUrl(allHistoryLink.href);
                }
                return;
            }

            const button = document.querySelector(".steammt-wishlist-tool-button");
            if (button && !button.dataset.steammtAutoclicked) {
                button.dataset.steammtAutoclicked = "1";
                button.click();
            }
        }

        function handleOpenWishlistTool(button) {
            if (!isAllHistoryPage()) {
                const allHistoryLink = findAllHistoryLink();
                if (!allHistoryLink) {
                    window.alert("SteamMT could not find the 'all history' link on this wishlist page.");
                    return;
                }

                button.disabled = true;
                button.textContent = "Opening...";
                window.location.href = buildAutoOpenUrl(allHistoryLink.href);
                return;
            }

            const summaryCsvLink = findWishlistSummaryCsvLink();
            if (!summaryCsvLink) {
                window.alert("SteamMT could not find the wishlist summary CSV on this page.");
                return;
            }

            openWishlistTool(button, summaryCsvLink.href);
        }

        function findAllHistoryLink() {
            const periodLinks = Array.from(document.querySelectorAll(".PeriodLinks a[href]"));
            for (const link of periodLinks) {
                if (normalizeText(link.textContent) === "all history") {
                    return link;
                }
            }

            return null;
        }

        function findWishlistSummaryCsvLink() {
            const links = Array.from(document.querySelectorAll("a[href*='QueryWishlistActionsForCSV']"));
            for (const link of links) {
                const heading = findPreviousHeading(link);
                if (!heading) {
                    continue;
                }

                const headingText = normalizeText(heading.textContent);
                if (headingText.startsWith("wishlist action summary")) {
                    return link;
                }
            }

            return null;
        }

        function findPreviousHeading(element) {
            let current = element.parentElement;
            while (current) {
                let sibling = current.previousElementSibling;
                while (sibling) {
                    if (sibling.tagName === "H2") {
                        return sibling;
                    }
                    const nestedHeading = sibling.querySelector && sibling.querySelector("h2");
                    if (nestedHeading) {
                        return nestedHeading;
                    }
                    sibling = sibling.previousElementSibling;
                }
                current = current.parentElement;
            }

            return null;
        }

        function isAllHistoryPage() {
            const summaryHeading = getWishlistSummaryHeading();
            if (summaryHeading && normalizeText(summaryHeading.textContent).includes("all history")) {
                return true;
            }

            const allHistoryLink = findAllHistoryLink();
            if (!allHistoryLink) {
                return false;
            }

            const allHistoryUrl = new URL(allHistoryLink.href, window.location.href);
            const currentUrl = new URL(window.location.href);
            return allHistoryUrl.pathname === currentUrl.pathname
                && allHistoryUrl.searchParams.get("dateStart") === currentUrl.searchParams.get("dateStart")
                && allHistoryUrl.searchParams.get("dateEnd") === currentUrl.searchParams.get("dateEnd");
        }

        function getWishlistSummaryHeading() {
            const summaryCsvLink = findWishlistSummaryCsvLink();
            return summaryCsvLink ? findPreviousHeading(summaryCsvLink) : null;
        }

        function buildAutoOpenUrl(targetUrl) {
            const url = new URL(targetUrl, window.location.href);
            url.searchParams.set(AUTO_OPEN_PARAM, "1");
            return url.href;
        }

        function cleanupAutoOpenParam() {
            const url = new URL(window.location.href);
            if (url.searchParams.get(AUTO_OPEN_PARAM) !== "1") {
                return;
            }

            url.searchParams.delete(AUTO_OPEN_PARAM);
            window.history.replaceState({}, document.title, url.href);
        }

        function normalizeText(text) {
            return text.replace(/\s+/g, " ").trim().toLowerCase();
        }

        function createExButton(value) {
            const button = document.createElement("input");
            button.classList.add("ex-button");
            button.type = "submit";
            button.value = value;
            button.style.marginRight = "8px";
            return button;
        }

        async function openWishlistTool(button, csvUrl) {
            const originalText = button.value;
            const newTab = window.open("about:blank", "_blank");

            button.disabled = true;
            button.value = "Opening...";
            cleanupAutoOpenParam();

            try {
                const response = await fetch(new URL(csvUrl, window.location.href).href, {
                    credentials: "include"
                });
                if (!response.ok) {
                    throw new Error(`Failed to download CSV (${response.status})`);
                }

                const csvText = await response.text();
                if (!csvText.includes(EXPECTED_HEADER)) {
                    throw new Error("Downloaded CSV does not look like the per-game wishlist history file.");
                }

                await SteamMT.savePendingWishlistImport({
                    filename: getFilenameFromUrl(csvUrl),
                    csvText: csvText,
                    createdAt: Date.now(),
                    sourceUrl: window.location.href
                });

                if (newTab) {
                    newTab.location.href = TOOL_URL;
                } else {
                    window.open(TOOL_URL, "_blank");
                }
            } catch (error) {
                console.error("[SteamMT] Failed to open wishlist tool.", error);
                if (newTab) {
                    newTab.close();
                }
                window.alert("SteamMT could not download the wishlist CSV from this page. Please make sure you are on the per-game Wishlist Action Summary page.");
            } finally {
                button.disabled = false;
                button.value = originalText;
            }
        }

        function getFilenameFromUrl(csvUrl) {
            try {
                const url = new URL(csvUrl, window.location.href);
                const pathname = url.pathname.split("/").filter(Boolean);
                const lastSegment = pathname.length > 0 ? pathname[pathname.length - 1] : "steam-wishlist-history";
                return `${lastSegment}.csv`;
            } catch {
                return "steam-wishlist-history.csv";
            }
        }

        function injectStyle() {
            if (document.getElementById(BUTTON_STYLE_ID)) {
                return;
            }

            const style = document.createElement("style");
            style.id = BUTTON_STYLE_ID;
            style.textContent = `
                .${BUTTON_ROW_CLASS} {
                    margin: 8px 0 10px;
                }

                .steammt-wishlist-tool-button:disabled {
                    opacity: 0.7;
                    cursor: wait;
                }
            `;
            document.head.appendChild(style);
        }
    }
)()
