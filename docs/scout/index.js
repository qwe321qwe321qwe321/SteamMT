// Steam's Web API sends no CORS headers, but it still answers JSONP (format=jsonp),
// so everything here is loaded through <script> tags straight from api.steampowered.com.
const REVIEWS_API = "https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/";
const STORE_ITEMS_API = "https://api.steampowered.com/IStoreBrowseService/GetItems/v1/";
const ASSET_BASE = "https://shared.akamai.steamstatic.com/store_item_assets/";

const SVG_NS = "http://www.w3.org/2000/svg";
const PIE_CENTER = 100;
const PIE_RADIUS = 98;
// Top languages get their own slice; the rest share one so the pie stays readable.
const PIE_SLICES = 5;

const MAX_PARALLEL = 4;
const RETRY_DELAYS = [1500, 4000];
const REQUEST_TIMEOUT = 15000;

// elang is Steam's ELanguage value, which GetItems uses for supported_languages.
const LANGUAGES = [
    { code: "english", name: "English", elang: 0 },
    { code: "german", name: "German", elang: 1 },
    { code: "french", name: "French", elang: 2 },
    { code: "italian", name: "Italian", elang: 3 },
    { code: "koreana", name: "Korean", elang: 4 },
    { code: "spanish", name: "Spanish - Spain", elang: 5 },
    { code: "schinese", name: "Simplified Chinese", elang: 6 },
    { code: "tchinese", name: "Traditional Chinese", elang: 7 },
    { code: "russian", name: "Russian", elang: 8 },
    { code: "thai", name: "Thai", elang: 9 },
    { code: "japanese", name: "Japanese", elang: 10 },
    { code: "portuguese", name: "Portuguese - Portugal", elang: 11 },
    { code: "polish", name: "Polish", elang: 12 },
    { code: "danish", name: "Danish", elang: 13 },
    { code: "dutch", name: "Dutch", elang: 14 },
    { code: "finnish", name: "Finnish", elang: 15 },
    { code: "norwegian", name: "Norwegian", elang: 16 },
    { code: "swedish", name: "Swedish", elang: 17 },
    { code: "hungarian", name: "Hungarian", elang: 18 },
    { code: "czech", name: "Czech", elang: 19 },
    { code: "romanian", name: "Romanian", elang: 20 },
    { code: "turkish", name: "Turkish", elang: 21 },
    { code: "brazilian", name: "Portuguese - Brazil", elang: 22 },
    { code: "bulgarian", name: "Bulgarian", elang: 23 },
    { code: "greek", name: "Greek", elang: 24 },
    { code: "arabic", name: "Arabic", elang: 25 },
    { code: "ukrainian", name: "Ukrainian", elang: 26 },
    { code: "latam", name: "Spanish - Latin America", elang: 27 },
    { code: "vietnamese", name: "Vietnamese", elang: 28 },
    { code: "indonesian", name: "Indonesian", elang: 30 },
];

// Values of EUserReviewsPurchaseType.
const PURCHASE_TYPES = { steam: 0, all: 1, key: 2 };

let jsonpCounter = 0;
let lookupToken = 0;
let currentQuery = null;
let currentResult = null;
let currentApp = null;
let resultCache = {};
let appCache = {};
let sortKey = "total";
let sortDir = "desc";

const $ = (id) => document.getElementById(id);

// ---------- requests ----------

function jsonp(url) {
    return new Promise((resolve, reject) => {
        const name = "scoutJsonp" + (++jsonpCounter);
        const script = document.createElement("script");
        const timer = setTimeout(() => fail(new Error("timeout")), REQUEST_TIMEOUT);

        function cleanup() {
            clearTimeout(timer);
            script.remove();
        }
        function fail(error) {
            cleanup();
            // A late answer would otherwise call a missing function.
            window[name] = function () { delete window[name]; };
            reject(error);
        }

        window[name] = function (data) {
            cleanup();
            delete window[name];
            resolve(data);
        };
        script.onerror = () => fail(new Error("request failed"));
        script.src = url + (url.includes("?") ? "&" : "?") + "format=jsonp&jsonp=" + name;
        document.head.appendChild(script);
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function jsonpWithRetry(url) {
    for (let attempt = 0; ; attempt++) {
        try {
            return await jsonp(url);
        } catch (error) {
            if (attempt >= RETRY_DELAYS.length) {
                throw error;
            }
            await sleep(RETRY_DELAYS[attempt]);
        }
    }
}

async function runPool(tasks, limit, onProgress) {
    const outcomes = new Array(tasks.length);
    let next = 0;
    async function worker() {
        while (next < tasks.length) {
            const i = next++;
            try {
                outcomes[i] = { ok: true, value: await tasks[i]() };
            } catch (error) {
                outcomes[i] = { ok: false, error: error };
            }
            onProgress();
        }
    }
    const workers = [];
    for (let i = 0; i < Math.min(limit, tasks.length); i++) {
        workers.push(worker());
    }
    await Promise.all(workers);
    return outcomes;
}

function reviewSummaryUrl(query, languageCode) {
    const params = new URLSearchParams({
        "appid": query.appId,
        "languages[0]": languageCode,
        "purchase_type": PURCHASE_TYPES[query.purchase],
        "review_type": 0,
        "filter": 1,
        "num_per_page": 1,
    });
    if (query.offtopic) {
        params.set("filter_offtopic_activity", "false");
    }
    return REVIEWS_API + "?" + params.toString();
}

function appInfoUrl(appId) {
    const input = {
        ids: [{ appid: appId }],
        context: { language: "english", country_code: "US" },
        data_request: {
            include_basic_info: true,
            include_assets: true,
            include_release: true,
            include_supported_languages: true,
        },
    };
    return STORE_ITEMS_API + "?input_json=" + encodeURIComponent(JSON.stringify(input));
}

function getAppInfo(appId) {
    if (!appCache[appId]) {
        appCache[appId] = jsonpWithRetry(appInfoUrl(appId))
            .then(parseAppInfo)
            .catch(() => {
                delete appCache[appId];
                return null;
            });
    }
    return appCache[appId];
}

function parseAppInfo(data) {
    const item = data && data.response && data.response.store_items && data.response.store_items[0];
    if (!item || item.success !== 1 || !item.name) {
        return null;
    }
    const info = {
        name: item.name,
        image: null,
        developers: [],
        releaseDate: null,
        supported: null,
    };
    if (item.assets && item.assets.asset_url_format && item.assets.header) {
        info.image = ASSET_BASE + item.assets.asset_url_format.replace("${FILENAME}", item.assets.header);
    }
    if (item.basic_info && item.basic_info.developers) {
        info.developers = item.basic_info.developers.map((d) => d.name);
    }
    if (item.release && item.release.steam_release_date) {
        info.releaseDate = new Date(item.release.steam_release_date * 1000);
    }
    if (item.supported_languages) {
        info.supported = new Set(item.supported_languages
            .filter((l) => l.supported !== false && l.elanguage >= 0)
            .map((l) => l.elanguage));
    }
    return info;
}

// ---------- lookup ----------

function cacheKey(query) {
    return [query.appId, query.purchase, query.offtopic ? 1 : 0].join("|");
}

async function lookup(query) {
    const token = ++lookupToken;
    currentQuery = query;
    writeQueryToUrl(query);
    hideNotice();

    const key = cacheKey(query);
    if (!resultCache[key]) {
        resultCache[key] = {
            appId: query.appId,
            summaries: {},
            failed: ["all"].concat(LANGUAGES.map((l) => l.code)),
        };
    }
    const result = resultCache[key];
    const appPromise = getAppInfo(query.appId);

    if (result.failed.length > 0) {
        setLoading(true);
        const total = result.failed.length;
        let done = 0;
        const onProgress = () => {
            done++;
            if (token === lookupToken) {
                setProgress(done, total);
            }
        };
        setProgress(0, total);

        if (result.failed.includes("all")) {
            await fetchSummaries(result, query, ["all"], onProgress);
        }
        const all = result.summaries.all;
        if (all && all.total === 0) {
            // Nothing to split up. Also saves 30 requests when the AppID is wrong.
            LANGUAGES.forEach((lang) => { result.summaries[lang.code] = all; });
            result.failed = [];
        } else if (all) {
            await fetchSummaries(result, query, result.failed.slice(), onProgress);
        }
    }

    const app = await appPromise;
    if (token !== lookupToken) {
        return;
    }
    setLoading(false);
    currentResult = result;
    currentApp = app;
    showResult();
}

async function fetchSummaries(result, query, codes, onProgress) {
    const tasks = codes.map((code) => () => jsonpWithRetry(reviewSummaryUrl(query, code)).then(readSummary));
    const outcomes = await runPool(tasks, MAX_PARALLEL, onProgress);
    outcomes.forEach((outcome, i) => {
        if (outcome.ok) {
            result.summaries[codes[i]] = outcome.value;
        }
    });
    result.failed = result.failed.filter((code) => !result.summaries[code]);
}

function readSummary(data) {
    if (!data || !data.response) {
        throw new Error("unexpected response");
    }
    // Unknown apps and apps without reviews come back as an empty response.
    const summary = data.response.query_summary || {};
    return {
        total: summary.total_reviews || 0,
        positive: summary.total_positive || 0,
        negative: summary.total_negative || 0,
        score: summary.review_score || 0,
        scoreDesc: summary.review_score_desc || "",
    };
}

function showResult() {
    if (!currentResult.summaries.all) {
        $("results").hidden = true;
        showNotice("Couldn't get review counts from Steam. Steam may be rate-limiting your IP for a minute, or the AppID doesn't exist.", true);
        return;
    }
    if (currentResult.summaries.all.total === 0 && !currentApp) {
        $("results").hidden = true;
        showNotice("Steam has no reviews for AppID " + currentResult.appId + ". Double-check the number?", false);
        return;
    }
    render();
    const missing = currentResult.failed.length;
    if (missing > 0) {
        showNotice(missing + " of " + LANGUAGES.length + " languages didn't load, so the table is incomplete. Steam may be rate-limiting your IP.", true);
    }
}

// ---------- rows ----------

function buildRows() {
    const supported = currentApp ? currentApp.supported : null;
    const rows = LANGUAGES.map((lang) => {
        const s = currentResult.summaries[lang.code];
        return {
            name: lang.name,
            code: lang.code,
            failed: !s,
            total: s ? s.total : 0,
            positive: s ? s.positive : 0,
            negative: s ? s.negative : 0,
            score: s ? s.score : -1,
            scoreDesc: s && s.total > 0 ? s.scoreDesc : "",
            supported: supported ? supported.has(lang.elang) : null,
        };
    });

    // Whatever the per-language queries don't add up to. Skipped when a language is missing,
    // since the gap would then just be that language.
    const all = currentResult.summaries.all;
    if (currentResult.failed.length === 0) {
        const sum = (field) => rows.reduce((acc, r) => acc + r[field], 0);
        const rest = all.total - sum("total");
        if (rest > 0) {
            rows.push({
                name: "Untagged",
                code: "",
                isOther: true,
                total: rest,
                positive: Math.max(0, all.positive - sum("positive")),
                negative: Math.max(0, all.negative - sum("negative")),
                score: -1,
                scoreDesc: "",
                supported: null,
            });
        }
    }
    return rows;
}

function positiveRatio(row) {
    return row.total > 0 ? row.positive / row.total : -1;
}

function compareRows(a, b) {
    let d;
    switch (sortKey) {
        case "name":
            d = a.name.localeCompare(b.name);
            break;
        case "share":
            d = a.total - b.total;
            break;
        case "ratio":
            d = positiveRatio(a) - positiveRatio(b) || a.total - b.total;
            break;
        case "score":
            d = a.score - b.score || a.total - b.total;
            break;
        case "supported":
            d = (a.supported ? 1 : 0) - (b.supported ? 1 : 0) || a.total - b.total;
            break;
        default:
            d = a[sortKey] - b[sortKey];
    }
    return sortDir === "asc" ? d : -d;
}

function visibleRows() {
    const rows = buildRows();
    const other = rows.find((r) => r.isOther);
    let languageRows = rows.filter((r) => !r.isOther).sort(compareRows);
    const hiddenCount = $("hide-empty-check").checked
        ? languageRows.filter((r) => r.total === 0 && !r.failed).length
        : 0;
    if (hiddenCount > 0) {
        languageRows = languageRows.filter((r) => r.total > 0 || r.failed);
    }
    // "Untagged" stays at the bottom whatever the sort.
    return { rows: other ? languageRows.concat(other) : languageRows, hiddenCount: hiddenCount };
}

// ---------- rendering ----------

function render() {
    $("results").hidden = false;
    renderGame();
    renderStats();
    renderTable();
    renderChart();
}

function renderGame() {
    const appId = currentResult.appId;
    const app = currentApp;
    $("game-name").textContent = app ? app.name : "App " + appId;
    document.title = (app ? app.name : "App " + appId) + " - Steam Scout Alt";

    const image = $("game-image");
    if (app && app.image) {
        image.hidden = false;
        image.onerror = () => { image.hidden = true; };
        image.src = app.image;
    } else {
        image.hidden = true;
        image.removeAttribute("src");
    }

    const sub = [];
    if (app && app.developers.length > 0) {
        sub.push(app.developers.join(", "));
    }
    if (app && app.releaseDate) {
        sub.push("Released " + app.releaseDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }));
    }
    sub.push("AppID " + appId);
    $("game-sub").textContent = sub.join(" · ");

    const links = [
        ["Steam store", "https://store.steampowered.com/app/" + appId + "/"],
        ["SteamDB", "https://steamdb.info/app/" + appId + "/"],
        ["Gamalytic", "https://gamalytic.com/game/" + appId],
        ["Review Explorer", "https://project.joshhills.dev/steam-review-explorer/game/" + appId],
    ];
    $("game-links").replaceChildren(...links.map(([label, href]) => {
        const a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = label;
        return a;
    }));
}

function renderStats() {
    const all = currentResult.summaries.all;
    const rows = buildRows().filter((r) => !r.isOther);

    $("stat-total").textContent = formatCount(all.total);

    if (all.total > 0) {
        $("stat-positive").textContent = Math.round(all.positive / all.total * 100) + "%";
        $("stat-positive-desc").textContent = all.scoreDesc;
    } else {
        $("stat-positive").textContent = "-";
        $("stat-positive-desc").textContent = "";
    }

    const withReviews = rows.filter((r) => r.total > 0).length;
    $("stat-languages").textContent = withReviews;
    $("stat-languages-note").textContent = currentResult.failed.length > 0
        ? currentResult.failed.length + " didn't load"
        : "of " + LANGUAGES.length + " store languages";

    if (currentApp && currentApp.supported && all.total > 0) {
        const supportedRows = rows.filter((r) => r.supported);
        const inSupported = supportedRows.reduce((acc, r) => acc + r.total, 0);
        $("stat-supported").textContent = formatShare(inSupported / all.total);
        $("stat-supported-note").textContent = "the game supports " + supportedRows.length + (supportedRows.length === 1 ? " language" : " languages");
    } else {
        $("stat-supported").textContent = "-";
        $("stat-supported-note").textContent = currentApp ? "" : "couldn't read the game's languages";
    }
}

function renderTable() {
    const total = currentResult.summaries.all.total;
    const view = visibleRows();
    const tbody = $("review-rows");

    if (view.rows.length === 0) {
        const tr = document.createElement("tr");
        const td = cell(tr, "No reviews match these filters.");
        td.colSpan = 8;
        tbody.replaceChildren(tr);
    } else {
        tbody.replaceChildren(...view.rows.map((row) => rowElement(row, total)));
    }

    $("hidden-note").textContent = view.hiddenCount > 0
        ? view.hiddenCount + (view.hiddenCount === 1 ? " language" : " languages") + " with no reviews hidden."
        : "";

    document.querySelectorAll("th button[data-sort]").forEach((button) => {
        if (button.dataset.sort === sortKey) {
            button.dataset.dir = sortDir;
            button.parentElement.setAttribute("aria-sort", sortDir === "asc" ? "ascending" : "descending");
        } else {
            delete button.dataset.dir;
            button.parentElement.removeAttribute("aria-sort");
        }
    });
}

function cell(tr, text, className) {
    const td = document.createElement("td");
    if (className) {
        td.className = className;
    }
    td.textContent = text;
    tr.appendChild(td);
    return td;
}

function rowElement(row, total) {
    const tr = document.createElement("tr");
    if (row.isOther) {
        tr.className = "is-other";
    } else if (row.total === 0) {
        tr.className = "is-empty";
    }

    const nameCell = cell(tr, row.name);
    if (row.isOther) {
        nameCell.title = "Counted in the total but not tagged with one of Steam's store languages";
    }

    cell(tr, row.failed ? "-" : formatShare(total > 0 ? row.total / total : 0), "num");

    if (row.failed) {
        cell(tr, "-", "num");
        cell(tr, "-", "num");
        cell(tr, "-", "num");
        cell(tr, "-", "num");
        cell(tr, "didn't load");
    } else {
        cell(tr, formatCount(row.total), "num");
        cell(tr, formatCount(row.positive), "num");
        cell(tr, formatCount(row.negative), "num");
        cell(tr, row.total > 0 ? Math.round(positiveRatio(row) * 100) + "%" : "-", "num");
        cell(tr, row.scoreDesc || "-");
    }

    const supportedCell = cell(tr, row.supported ? "✓" : "", "supported");
    if (row.supported) {
        supportedCell.setAttribute("aria-label", "Supported");
    }
    return tr;
}

// ---------- pie chart ----------

function pieSlices() {
    const total = currentResult.summaries.all.total;
    const languageRows = buildRows()
        .filter((r) => !r.isOther && r.total > 0)
        .sort((a, b) => b.total - a.total);
    const top = languageRows.slice(0, PIE_SLICES);
    const slices = top.map((row, i) => ({
        label: row.name,
        value: row.total,
        color: "var(--pie-" + (i + 1) + ")",
    }));
    const rest = total - top.reduce((acc, r) => acc + r.total, 0);
    if (rest > 0) {
        const restCount = languageRows.length - top.length;
        slices.push({
            label: restCount > 0 ? restCount + (restCount === 1 ? " other language" : " other languages") : "Untagged",
            value: rest,
            color: "var(--pie-rest)",
        });
    }
    slices.forEach((slice) => { slice.share = slice.value / total; });
    return slices;
}

function piePoint(angle) {
    return (PIE_CENTER + PIE_RADIUS * Math.cos(angle)).toFixed(2) + " " + (PIE_CENTER + PIE_RADIUS * Math.sin(angle)).toFixed(2);
}

function sliceElement(start, end) {
    if (end - start > Math.PI * 2 - 0.0001) {
        const circle = document.createElementNS(SVG_NS, "circle");
        circle.setAttribute("cx", PIE_CENTER);
        circle.setAttribute("cy", PIE_CENTER);
        circle.setAttribute("r", PIE_RADIUS);
        return circle;
    }
    const largeArc = end - start > Math.PI ? 1 : 0;
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", [
        "M", PIE_CENTER, PIE_CENTER,
        "L", piePoint(start),
        "A", PIE_RADIUS, PIE_RADIUS, 0, largeArc, 1, piePoint(end),
        "Z",
    ].join(" "));
    return path;
}

function renderChart() {
    const total = currentResult.summaries.all.total;
    $("chart-section").hidden = total === 0;
    if (total === 0) {
        return;
    }

    const slices = pieSlices();
    const sliceEls = [];
    const legendEls = [];
    let angle = -Math.PI / 2;

    slices.forEach((slice, i) => {
        const end = angle + slice.share * Math.PI * 2;
        const el = sliceElement(angle, end);
        el.classList.add("pie-slice");
        el.style.fill = slice.color;
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-label", slice.label + ", " + formatShare(slice.share));
        el.addEventListener("pointerenter", () => highlightSlice(i));
        el.addEventListener("pointermove", (event) => showPieTooltip(slice, event.clientX, event.clientY));
        el.addEventListener("pointerleave", resetPie);
        el.addEventListener("focus", () => {
            highlightSlice(i);
            const box = el.getBoundingClientRect();
            showPieTooltip(slice, box.left + box.width / 2, box.top + box.height / 2);
        });
        el.addEventListener("blur", resetPie);
        sliceEls.push(el);
        angle = end;

        const li = document.createElement("li");
        li.tabIndex = 0;
        const swatch = document.createElement("span");
        swatch.className = "pie-swatch";
        swatch.style.background = slice.color;
        const label = document.createElement("span");
        label.className = "pie-legend-label";
        label.textContent = slice.label;
        const share = document.createElement("span");
        share.className = "pie-legend-share";
        share.textContent = formatShare(slice.share);
        const count = document.createElement("span");
        count.className = "pie-legend-count";
        count.textContent = formatCount(slice.value);
        li.append(swatch, label, share, count);
        li.addEventListener("pointerenter", () => highlightSlice(i));
        li.addEventListener("pointerleave", resetPie);
        li.addEventListener("focus", () => highlightSlice(i));
        li.addEventListener("blur", resetPie);
        legendEls.push(li);
    });

    $("pie").replaceChildren(...sliceEls);
    $("pie-legend").replaceChildren(...legendEls);
    resetPie();
}

function highlightSlice(index) {
    const dim = (el, i) => el.classList.toggle("is-dim", index !== null && i !== index);
    $("pie").querySelectorAll(".pie-slice").forEach(dim);
    $("pie-legend").querySelectorAll("li").forEach(dim);
}

function resetPie() {
    highlightSlice(null);
    $("pie-tooltip").hidden = true;
}

function showPieTooltip(slice, x, y) {
    const tip = $("pie-tooltip");
    const key = document.createElement("span");
    key.className = "pie-tooltip-key";
    key.style.background = slice.color;
    const value = document.createElement("strong");
    value.textContent = formatShare(slice.share);
    const label = document.createElement("div");
    label.className = "pie-tooltip-label";
    label.textContent = slice.label + " · " + formatCount(slice.value) + " reviews";
    tip.replaceChildren(key, value, label);
    tip.hidden = false;
    const left = Math.min(x + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = (y + 14) + "px";
}

function formatCount(n) {
    return n.toLocaleString("en-US");
}

function formatShare(fraction) {
    if (fraction <= 0) {
        return "0%";
    }
    if (fraction < 0.001) {
        return "<0.1%";
    }
    return (fraction * 100).toFixed(1) + "%";
}

// ---------- status ----------

function setLoading(loading) {
    $("lookup-button").disabled = loading;
    $("progress").hidden = !loading;
    $("results").classList.toggle("is-loading", loading);
}

function setProgress(done, total) {
    $("progress-fill").style.width = (total > 0 ? done / total * 100 : 0) + "%";
    $("progress-text").textContent = "Asking Steam for review counts… " + done + " / " + total;
}

function showNotice(text, canRetry) {
    $("notice-text").textContent = text;
    $("retry-button").hidden = !canRetry;
    $("notice").hidden = false;
}

function hideNotice() {
    $("notice").hidden = true;
}

// ---------- export ----------

function exportTable() {
    const total = currentResult.summaries.all.total;
    const lines = [["Language", "Code", "Share %", "Reviews", "Positive", "Negative", "% Positive", "Steam rating", "Game supports"]];
    visibleRows().rows.forEach((row) => {
        lines.push([
            row.name,
            row.code,
            row.failed || total === 0 ? "" : (row.total / total * 100).toFixed(2),
            row.failed ? "" : row.total,
            row.failed ? "" : row.positive,
            row.failed ? "" : row.negative,
            row.total > 0 ? (positiveRatio(row) * 100).toFixed(1) : "",
            row.scoreDesc,
            row.supported === null ? "" : (row.supported ? "yes" : "no"),
        ]);
    });
    return lines;
}

function copyTable() {
    const text = exportTable().map((line) => line.join("\t")).join("\n");
    const button = $("copy-button");
    navigator.clipboard.writeText(text).then(() => {
        button.textContent = "Copied";
    }, () => {
        button.textContent = "Couldn't copy";
    }).finally(() => {
        setTimeout(() => { button.textContent = "Copy table"; }, 1500);
    });
}

function downloadCsv() {
    const escape = (value) => {
        const text = String(value);
        return /[",\n]/.test(text) ? "\"" + text.replace(/"/g, "\"\"") + "\"" : text;
    };
    const csv = exportTable().map((line) => line.map(escape).join(",")).join("\r\n");
    // BOM so Excel opens it as UTF-8.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "steam-reviews-by-language-" + currentResult.appId + ".csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- url & form ----------

function parseAppId(text) {
    const value = text.trim();
    const fromUrl = value.match(/\/app\/(\d+)/);
    const digits = fromUrl ? fromUrl[1] : (/^\d+$/.test(value) ? value : null);
    if (!digits) {
        return null;
    }
    const appId = Number(digits);
    return appId > 0 && appId < 4294967296 ? appId : null;
}

function readQueryFromUrl() {
    const params = new URLSearchParams(window.location.search);
    // appID matches Steam Scout's own links, so old URLs keep working with the host swapped.
    const appId = parseAppId(params.get("appID") || params.get("appid") || "");
    const purchase = params.get("purchase");
    return {
        appId: appId,
        purchase: PURCHASE_TYPES.hasOwnProperty(purchase) ? purchase : "all",
        offtopic: params.get("offtopic") === "1",
    };
}

function writeQueryToUrl(query) {
    const params = new URLSearchParams();
    params.set("appID", query.appId);
    if (query.purchase !== "all") {
        params.set("purchase", query.purchase);
    }
    if (query.offtopic) {
        params.set("offtopic", "1");
    }
    history.replaceState(null, "", "?" + params.toString());
}

function queryFromForm() {
    return {
        appId: parseAppId($("app-input").value),
        purchase: $("purchase-select").value,
        offtopic: $("offtopic-check").checked,
    };
}

function onSubmit(event) {
    event.preventDefault();
    const query = queryFromForm();
    if (!query.appId) {
        $("form-error").textContent = "Enter a Steam AppID (the number in the store URL), or paste the store page link.";
        $("form-error").hidden = false;
        return;
    }
    $("form-error").hidden = true;
    $("app-input").value = query.appId;
    lookup(query);
}

function onFilterChange() {
    if (currentQuery) {
        lookup(Object.assign({}, currentQuery, {
            purchase: $("purchase-select").value,
            offtopic: $("offtopic-check").checked,
        }));
    }
}

function onSortClick(event) {
    const key = event.currentTarget.dataset.sort;
    if (key === sortKey) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
        sortKey = key;
        sortDir = key === "name" ? "asc" : "desc";
    }
    if (currentResult && currentResult.summaries.all) {
        renderTable();
    }
}

function init() {
    $("lookup-form").addEventListener("submit", onSubmit);
    $("purchase-select").addEventListener("change", onFilterChange);
    $("offtopic-check").addEventListener("change", onFilterChange);
    $("hide-empty-check").addEventListener("change", renderTable);
    $("retry-button").addEventListener("click", () => {
        if (currentQuery) {
            lookup(currentQuery);
        }
    });
    $("copy-button").addEventListener("click", copyTable);
    $("csv-button").addEventListener("click", downloadCsv);
    document.querySelectorAll("th button[data-sort]").forEach((button) => {
        button.addEventListener("click", onSortClick);
    });

    const query = readQueryFromUrl();
    $("purchase-select").value = query.purchase;
    $("offtopic-check").checked = query.offtopic;
    if (query.appId) {
        $("app-input").value = query.appId;
        lookup(query);
    } else {
        $("app-input").focus();
    }
}

init();
