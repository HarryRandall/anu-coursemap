# ANU tree locations

Source: OpenStreetMap contributors, via https://overpass-api.de/api/interpreter.
Licence: ODbL, https://www.openstreetmap.org/copyright.
Snapshot: 2026-09-06T14:20:36Z. Contains 377 individual `natural=tree` nodes.

Query: `[out:json][timeout:25];node["natural"="tree"](-35.2901,149.1098,-35.2725,149.1266);out body;`

The node positions are mapped observations, not a complete campus tree inventory.
The records contain no height or canopy measurements. The trunk and canopy
geometry uses illustrative dimensions and does not claim to reproduce each tree.

Run `node scripts/build-campus-tree-models.mjs` after updating `anu-trees.json`
to regenerate `anu-trees-3d.geojson`. The map retains OpenStreetMap attribution.
