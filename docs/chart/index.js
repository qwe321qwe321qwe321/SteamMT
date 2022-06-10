let dataset = null;
let datasetTitle = "TITLE";
let displayTopN = 20;
let showPercentage = false;
let charts = [];

function onBodyLoad() {
    try {
        const searchParams = getSearchParameters();
        const dataString = searchParams.get('data');
        document.getElementById("data-input").value = dataString;
        if (searchParams.has('topN')) {
            displayTopN = searchParams.get('topN');
        }
        document.getElementById('filter-input').value = displayTopN;

        const parsedDataset = JSON.parse(atob(dataString));
        console.log(parsedDataset);

        datasetTitle = parsedDataset.title;

        const length = Math.min(parsedDataset.xValues.length, parsedDataset.yValues.length);
        dataset = new Array(length);
        for (let i = 0; i < length; i++) {
            dataset[i] = {
                x: parsedDataset.xValues[i], 
                y: parsedDataset.yValues[i]
            };
        }
    } catch {
        document.getElementById("msg").innerText = "Invalid parameters.";
        console.log("Invalid parameters.");
        dataset = null;
        return;
    }

    document.getElementById('percentage-checkbox').addEventListener('change', function(){
        showPercentage = this.checked;
        updateAllCharts();
        console.log(showPercentage);
    });

    createAllCharts();
}

function onClickApplyButton() {
    const dataString = document.getElementById("data-input").value;
    displayTopN = parseInt(document.getElementById('filter-input').value);
    let url = new URL(document.location.href);
    url.searchParams.set("data", dataString);
    if (!isNaN(displayTopN) && displayTopN > 0) {
        url.searchParams.set("topN", displayTopN);
    } else{
        url.searchParams.delete("topN");
    }
    document.location.href = url.href;
}

function createAllCharts() {
    if (!dataset){ return; }

    let displayData = [...dataset]; // copy array
    displayData.sort(function(a, b) {
        return b.y - a.y
    });
    displayData = displayData.slice(0, displayTopN);
    const xValues = displayData.map(item => item.x);
    const yValues = displayData.map(item => item.y);
    const length = Math.min(xValues.length, yValues.length);
    console.log(length);
    if (length <= 0) {
        document.body.innerText = "There is no dataset.";
        return;
    }
    const barColors = getBarColors(length, 0.7);
    charts.push(drawChart("myChart-Pie", "pie", datasetTitle, xValues, yValues, barColors));
    charts.push(drawChart("myChart-Bar", "bar", datasetTitle, xValues, yValues, barColors));
}

function updateAllCharts() {
    for (c of charts) {
        c.options.plugins.datalabels.display = showPercentage;
        c.update();
    }
}

function getBarColors(length, alpha) {
    let barColors = [];
    const dynamicColors = function(a) {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgba(${r}, ${g}, ${b}, ${a})`
    };

    const orderedColros = function(index, length, a) {
        const hueIndex = index % 2 == 0 ? index : ((index + length / 2) % length); // to increase contract.
        const h = Math.floor((hueIndex * 300 / length));
        const s = Math.floor(70);
        const l = Math.floor(100 * a);
        return `hsl(${h}, ${s}%, ${l}%)`
    }

    for (let i = 0; i < length; i++) {
        //barColors.push(dynamicColors(alpha));
        barColors.push(orderedColros(i, length, alpha));
    }
    console.log(barColors);
    return barColors;
}

function drawChart(elementId, chartType, title, xValues, yValues, barColors) {
    const ctx = document.getElementById(elementId).getContext('2d');

    const myChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: xValues,
            datasets: [{
                label: title,
                data: yValues,
                backgroundColor: barColors,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title + ' (' + chartType + ')'
                },
                datalabels: {
                    display: showPercentage,
                    formatter: (value, ctx) => {
                        let sum = 0;
                        let dataArr = ctx.chart.data.datasets[0].data;
                        dataArr.map(data => {
                            sum += data;
                        });
                        let percentage = (value*100 / sum).toFixed(2)+"%";
                        return percentage;
                    },
                    color: '#333',
                }
            }
        },
        plugins: [ChartDataLabels],
    });
    return myChart;
}

function getSearchParameters() {
    let url = new URL(window.location.href);
    return url.searchParams;
}
