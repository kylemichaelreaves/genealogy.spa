# genealogy.spa

An interactive map and family tree of the Reaves lineage, from William Rives
(b. 1748, Surry County VA) through the migration south and west into Mississippi.

Two linked panels — a map with a year timeline, and a tree of person cards.
Hovering a person highlights their location; stepping the timeline advances
through births, moves and deaths. County outlines are the _historical_ ones for
the year on screen, not modern boundaries.

Extracted from `budget-visualizer-app`, where it lived at
`/budget-visualizer/genealogy`.

## Stack

Solid + Vite + Tailwind v4, d3 for the map, TanStack Query for the county-data
cache. No backend of its own.

## Run

```bash
bun install
bun run dev          # http://localhost:5174
```

```bash
bun run build        # tsc -b && vite build -> dist/
bun run preview
bun run test         # vitest — unit
bun run test:e2e     # playwright
bun run test:all
bun run lint
bun run format
```

## Layout

```
src/
  index.tsx                     entry — QueryClientProvider + page shell
  styles/theme.css              design tokens (light/dark)
  components/genealogy/         the feature
    GenealogyPage.tsx             composition + state
    map/                          d3 map, timeline axis/rail, county layer
    tree/                         family tree, person cards, connectors
    lib/                          pure helpers (timeline, county matching)
    hooks/                        hover, tooltip, timeline controls
  components/shared/, ui/       button + tooltip primitives it depends on
  api/historicalCounties/       S3 TopoJSON fetch + merge
  data/genealogy.ts             the lineage data
  types/                        GenealogyNode, historical-county shapes
tests/unit/                     timeline building, county matching
tests/e2e/                      playwright, page-object driven
```

The `components/genealogy/` nesting is inherited from the source repo. Keeping
it means the ~22 `../../../types/genealogy` imports inside the subtree resolve
unchanged, so the tree still diffs cleanly against its origin.

## Historical county data

County boundaries come from a public S3 bucket as per-state TopoJSON:

```
https://historical-counties.s3.us-east-1.amazonaws.com/states/{ab}.topojson
```

Only the states a person actually appears in are fetched, in parallel, then
merged into one FeatureCollection. Objects are content-immutable, so the query
cache holds them for the page's lifetime.

Override the bucket with `VITE_HISTORICAL_COUNTIES_BASE_URL`.

The source repo fetched these through its axios client; here it's plain `fetch`.
The request is identical — the URL is absolute and the bucket is public, so the
client's Bearer token and 401 handling never applied.

## Adding people

Edit `src/data/genealogy.ts`. Each node needs an `id`, a name, a `parentId`
(`null` for the root), and enough of a birth/death year and location to place it
on the map and the timeline. `tests/e2e/pages/GenealogyPage.ts` keeps a list of
node ids used for count assertions — add new ids there too, or those tests will
fail on the count.
