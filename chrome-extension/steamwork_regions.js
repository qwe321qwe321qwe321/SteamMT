(
    function() {
        const CHART_URL = "https://qwe321qwe321qwe321.github.io/SteamMT/chart/";
        let categories = [];
        let newCategory = null;
        let newData = null;

        let tbody = document.querySelector("table.grouping_table > tbody");
        let tableRows = tbody.querySelectorAll("tr");


        for (let row of tableRows) {
            const isCategoryRow = row.classList.length == 0;
            if (isCategoryRow) {
                const categoryTextElement = row.querySelector("th");

                if (!categoryTextElement.querySelector("input.ex-button")) {
                    const chartBtn = createExButton("Export Wishlist Chart");
                    const csvBtn = createExButton("Export CSV");

                    const categoryIndex = categories.length;
                    chartBtn.addEventListener("click", () => {exportWishlistChart(categoryIndex)});
                    csvBtn.addEventListener("click", () => {exportCSV(categoryIndex)});
                    categoryTextElement.appendChild(chartBtn);
                    categoryTextElement.appendChild(csvBtn);
                }
                
                const categroyName = row.querySelector("th").innerText.trim();
                newCategory = {
                    name: categroyName,
                    dataList: []
                };
                categories.push(newCategory);
                continue;
            }
            const validRow = row.classList.contains("publisher_row");
            if (!validRow) {
                continue;
            }
            const isTitleRow = row.classList.contains("spaceAbove");
            if (isTitleRow) {
                const title = row.querySelector("td > a").innerText.trim();
                newData = {
                    title: title
                };
                newCategory.dataList.push(newData);
                continue;
            } 

            const label = row.querySelector("td:nth-of-type(4)").firstChild.nodeValue.trim();
            const value = parseNumber(row.querySelector("td:nth-of-type(5)").innerText.trim());
            newData[label] = value;
        }

        function parseNumber(strNumber) {
            strNumber = strNumber.replace(/\$|,/g, ''); // Remove '$' char.
            strNumber = strNumber.replace(/\((.+)\)/g, '-$1'); // Replace ($num) by -$num.
            //console.log(strNumber);
            return parseFloat(strNumber);
        }

        console.log(categories);

        function createExButton(value) {
            const btn1 = document.createElement("input");
            btn1.classList.add("ex-button");
            btn1.type = "submit";
            btn1.value = value;
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
            const wishlists = category.dataList.map(x => x["Wishlist balance"]);
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