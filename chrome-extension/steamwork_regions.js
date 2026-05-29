(
    function() {
        const CHART_URL = "https://qwe321qwe321qwe321.github.io/SteamMT/chart/";
        const categories = [];

        parseLegacyRegionPage();
        parseWishlistReportPage();

        function parseNumber(strNumber) {
            strNumber = strNumber.replace(/\$|,/g, ''); // Remove '$' char.
            strNumber = strNumber.replace(/\((.+)\)/g, '-$1'); // Replace ($num) by -$num.
            //console.log(strNumber);
            return parseFloat(strNumber);
        }

        console.log(categories);

        function parseLegacyRegionPage() {
            const tbody = document.querySelector("table.grouping_table > tbody");
            if (!tbody) {
                return;
            }

            let newCategory = null;
            let newData = null;
            const tableRows = tbody.querySelectorAll("tr");

            for (let row of tableRows) {
                const isCategoryRow = row.classList.length == 0;
                if (isCategoryRow) {
                    const categoryTextElement = row.querySelector("th");
                    if (!categoryTextElement) {
                        continue;
                    }

                    const categroyName = categoryTextElement.innerText.trim();
                    newCategory = {
                        name: categroyName,
                        dataList: []
                    };
                    categories.push(newCategory);
                    ensureButtons(categoryTextElement, categories.length - 1);
                    continue;
                }

                const validRow = row.classList.contains("publisher_row");
                if (!validRow || !newCategory) {
                    continue;
                }

                const isTitleRow = row.classList.contains("spaceAbove");
                if (isTitleRow) {
                    const titleLink = row.querySelector("td > a");
                    if (!titleLink) {
                        continue;
                    }

                    newData = {
                        title: titleLink.innerText.trim()
                    };
                    newCategory.dataList.push(newData);
                    continue;
                }

                if (!newData) {
                    continue;
                }

                const labelCell = row.querySelector("td:nth-of-type(4)");
                const valueCell = row.querySelector("td:nth-of-type(5)");
                if (!labelCell || !valueCell || !labelCell.firstChild) {
                    continue;
                }

                const label = labelCell.firstChild.nodeValue.trim();
                const value = parseNumber(valueCell.innerText.trim());
                newData[label] = value;
            }
        }

        function parseWishlistReportPage() {
            parseWishlistSummaryTable("#leftRegion", "Wishlists By Region");
            parseWishlistSummaryTable("#rightCountry", "Wishlists By Country");
        }

        function parseWishlistSummaryTable(containerSelector, fallbackTitle) {
            const container = document.querySelector(containerSelector);
            if (!container) {
                return;
            }

            const heading = container.querySelector("h2");
            const table = container.querySelector("table");
            if (!heading || !table) {
                return;
            }

            const dataList = parseWishlistSummaryRows(table);
            if (dataList.length === 0) {
                return;
            }

            const category = {
                name: heading.innerText.trim() || fallbackTitle,
                dataList: dataList
            };
            categories.push(category);
            ensureButtons(heading, categories.length - 1);
        }

        function parseWishlistSummaryRows(table) {
            const rows = Array.from(table.querySelectorAll("tr"));
            if (rows.length < 2) {
                return [];
            }

            const headerCells = Array.from(rows[0].querySelectorAll("th"));
            if (headerCells.length === 0) {
                return [];
            }

            const headers = headerCells.map(cell => normalizeLabel(cell.innerText));
            const dataList = [];

            for (const row of rows.slice(1)) {
                const cells = Array.from(row.querySelectorAll("td"));
                if (cells.length !== headers.length) {
                    continue;
                }

                const title = cells[0].innerText.trim();
                if (!title || normalizeText(title) === "total") {
                    continue;
                }

                const rowData = {
                    title: title
                };

                for (let i = 1; i < headers.length; i++) {
                    rowData[headers[i]] = parseNumber(cells[i].innerText.trim());
                }

                dataList.push(rowData);
            }

            return dataList;
        }

        function ensureButtons(anchorElement, categoryIndex) {
            const buttonContainer = getOrCreateButtonContainer(anchorElement);
            if (buttonContainer.querySelector("input.ex-button")) {
                return;
            }

            const chartBtn = createExButton("Export Wishlist Chart");
            const csvBtn = createExButton("Export CSV");
            chartBtn.addEventListener("click", () => {exportWishlistChart(categoryIndex)});
            csvBtn.addEventListener("click", () => {exportCSV(categoryIndex)});
            buttonContainer.appendChild(chartBtn);
            buttonContainer.appendChild(csvBtn);
        }

        function getOrCreateButtonContainer(anchorElement) {
            let buttonContainer = anchorElement.parentElement.querySelector(":scope > .steammt-export-buttons");
            if (buttonContainer) {
                return buttonContainer;
            }

            buttonContainer = document.createElement("div");
            buttonContainer.className = "steammt-export-buttons";
            buttonContainer.style.margin = "8px 0 12px";
            anchorElement.insertAdjacentElement("afterend", buttonContainer);
            return buttonContainer;
        }

        function normalizeLabel(label) {
            return label.replace(/\s+/g, " ").trim();
        }

        function normalizeText(text) {
            return text.replace(/\s+/g, " ").trim().toLowerCase();
        }

        function createExButton(value) {
            const btn1 = document.createElement("input");
            btn1.classList.add("ex-button");
            btn1.type = "submit";
            btn1.value = value;
            btn1.style.marginRight = "8px";
            return btn1;
        }

        function exportWishlistChart(categoryIndex) {
            if(window.Prototype) { // This shit killed JSON.stringfy()
                delete Object.prototype.toJSON;
                delete Array.prototype.toJSON;
                delete Hash.prototype.toJSON;
                delete String.prototype.toJSON;
            }

            let category = categories[categoryIndex];
            console.log(categoryIndex);
            console.log(category);
            //console.log(category.name);
            const titleNames = category.dataList.map(x => x.title);
            const wishlists = category.dataList.map(x => getWishlistBalanceValue(x));
            const paramData = { 
                title: category.name,
                xValues: titleNames, 
                yValues: wishlists
            };
            const paramDataJson = JSON.stringify(paramData);
            console.log(paramData);
            console.log(paramDataJson);
            const paramDataBase64 = btoa(paramDataJson);
            console.log(paramDataBase64);
            //console.log(JSON.parse(paramDataJson));
            //console.log(`xValues=${xValues}&yValues=${yValues}`);
            // console.log(paramData);
            let url = new URL(CHART_URL);
            url.search = new URLSearchParams({data: paramDataBase64});
            window.open(url.href, '_blank').focus();
        }

        function getWishlistBalanceValue(dataRow) {
            if (dataRow.hasOwnProperty("Wishlist Period Balance")) {
                return dataRow["Wishlist Period Balance"];
            }

            return dataRow["Wishlist balance"];
        }

        function exportCSV(categoryIndex) {
            let category = categories[categoryIndex];
            const rows = [
                [
                    ...Object.keys(category.dataList[0])
                ],
                ...category.dataList.map(item => 
                    Object.values(item).map(val => 
                        isTypeString(val) ? `"${val}"` : val
                    )
                )
            ]
            rowToCSV(rows, category.name);
            
            function isTypeString(value) {
                return typeof value === 'string' || value instanceof String;
            }
            function rowToCSV(rows, filename) {
                let csvContent = "data:text/csv;charset=utf-8," 
                    + rows.map(e => e.join(",")).join("\n");
                var encodedUri = encodeURI(csvContent);
                var link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", filename + ".csv");
                document.body.appendChild(link); // Required for FF

                link.click(); // download.
                link.remove();
            }
        }

    }
)()
