const assert = require("node:assert/strict");
const test = require("node:test");

const chartCodec = require("../docs/chart/utf8_base64.js");
const extensionCodec = require("../chrome-extension/utf8_base64.js");

test("chart data round-trips Unicode labels", () => {
    const data = JSON.stringify({
        title: "各國願望清單",
        xValues: ["台灣", "日本", "대한민국"],
        yValues: [120, 98, 76],
    });

    assert.equal(chartCodec.decode(extensionCodec.encode(data)), data);
});

test("decoder remains compatible with legacy Base64 links", () => {
    const asciiData = JSON.stringify({ title: "Wishlists", xValues: ["US"], yValues: [1] });
    const latin1Data = JSON.stringify({ title: "Québec", xValues: ["España"], yValues: [1] });

    assert.equal(chartCodec.decode(btoa(asciiData)), asciiData);
    assert.equal(chartCodec.decode(btoa(latin1Data)), latin1Data);
});
