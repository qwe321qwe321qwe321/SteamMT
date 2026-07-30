(function(root) {
    function encode(value) {
        const bytes = new TextEncoder().encode(value);
        const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join("");
        return btoa(binary);
    }

    function decode(value) {
        const binary = atob(value);
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));

        try {
            return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        } catch {
            return binary;
        }
    }

    const codec = { encode, decode };
    root.SteamMTBase64 = codec;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = codec;
    }
})(globalThis);
