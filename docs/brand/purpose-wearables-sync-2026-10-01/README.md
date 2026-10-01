# Purpose, wearables and sync status

User requested a complementary-purpose comparison with Oura mobile, Oura + WHOOP soon + Polar soon + more wearables soon, real transparent product photographs, and a top-right sync indicator. Animation explicitly selected and handled by the adjacent Orbit thread; this branch starts from merged PR10 and preserves it.

Implemented English copy follows BRAND_VOICE: Oura daily check-in alongside Daytlas historical exploration. No invented AI, diagnoses, exclusive features or claims that Oura lacks trends. Original approved hero and five-view showcase retained. Photo provenance is in PRODUCT_PHOTO_SOURCES.md. Unspecified future wearables use a plus, not an invented product.

App indicator says “Ring data synced” and reports the last successful Oura API data load, not a Bluetooth device timestamp. Green only after success; pending and incomplete states; demo/import labelled honestly. Refresh re-runs mounted queries and bypasses older cached entries without erasing saved history. Failed requests never advance their timestamp; success cannot mask a partial failure until explicit retry. Last update is connection-scoped, stored locally, removed by existing disconnect erasure.

Verification and screenshots will be recorded after checks. Previous proposals and source images remain intact.
