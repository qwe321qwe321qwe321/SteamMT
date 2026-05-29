(
    function() {
        const MAX_PENDING_IMPORT_AGE = 5 * 60 * 1000;

        SteamMT.getPendingWishlistImport().then(pendingImport => {
            if (!pendingImport) {
                return;
            }

            if (Date.now() - pendingImport.createdAt > MAX_PENDING_IMPORT_AGE) {
                SteamMT.clearPendingWishlistImport();
                return;
            }

            waitForFileInput(pendingImport, 0);
        });

        function waitForFileInput(pendingImport, attemptCount) {
            const fileInput = document.getElementById("fileInput");
            if (!fileInput) {
                if (attemptCount >= 20) {
                    return;
                }
                window.setTimeout(() => waitForFileInput(pendingImport, attemptCount + 1), 500);
                return;
            }

            const file = new File([pendingImport.csvText], pendingImport.filename || "steam-wishlist-history.csv", {
                type: "text/csv"
            });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
            SteamMT.clearPendingWishlistImport();
        }
    }
)()
