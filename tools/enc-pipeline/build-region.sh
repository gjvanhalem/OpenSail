#!/usr/bin/env bash
# Build one chart region: Rijkswaterstaat inland ENC (S-57) -> GeoJSON -> PMTiles,
# plus a manifest with the cells' edition dates.
#
#   build-region <region-id> <source> [name]
#
# <source> is one of:
#   - a vaarweginformatie.nl download file id (digits), fetched from the RWS portal
#   - a .zip with an ENC_ROOT folder of S-57 cells
#   - a folder with S-57 cells (*.000 plus update files *.001, ...)
#
# Output in /work/out (mount a host folder there):
#   <region-id>.pmtiles   vector tiles, one layer per S-57 object class (lower case)
#   <region-id>.json      manifest: bounds, zooms, edition dates per cell, size, sha256
#   index.json            catalog of every region built into this folder
set -euo pipefail

REGION_ID="${1:?usage: build-region <region-id> <source> [name]}"
SOURCE="${2:?usage: build-region <region-id> <source> [name]}"
REGION_NAME="${3:-$REGION_ID}"

OUT=/work/out
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT" "$WORK/cells" "$WORK/layers"

RWS_DOWNLOAD="https://www.vaarweginformatie.nl/fdd/main/wicket/resource/org.apache.wicket.Application/downloadfileResource?fileId="
RWS_LIST="https://www.vaarweginformatie.nl/frp/api/webcontent/downloads?pageId=infra/enc"

MIN_ZOOM="${MIN_ZOOM:-8}"
MAX_ZOOM="${MAX_ZOOM:-15}"

# S-57 object classes we tile. Upper case are standard S-57, lower case are
# Inland ENC (IENC) extensions. Seamarks (buoys, beacons, lights) are left out
# on purpose: the chart shows them from OpenSeaMap.
LAYERS=(
  M_COVR                                     # coverage of each cell
  DEPARE DRGARE DEPCNT SOUNDG                # depths
  OBSTRN WRECKS UWTROC HULKES PILPNT         # hazards
  bridge BRIDGE cblohd PIPSOL                # vertical clearance
  FAIRWY wtwaxs NAVLNE RECTRC                # where to sail
  lokbsn SLCONS DAMCON FLODOC PONTON         # locks, walls, dams, floating structures
  resare RESARE CTNARE hrbare berths         # areas
)

# Attributes kept in the tiles; everything else is dropped to keep them small
ATTRIBUTES=(OBJNAM NOBJNM DRVAL1 DRVAL2 VALDCO VALSOU DEPTH VERCLR VERCCL VERCOP HORCLR
  CATOBS CATWRK WATLEV EXPSOU QUASOU CATBRG CATDAM CATSLC RESTRN CATREA SCAMIN INFORM)

log() { echo "[build-region] $*" >&2; }

# --- 1. Get the cells -------------------------------------------------------
# The RWS file id, for the update check; give it as RWS_FILE_ID with a .zip or folder
SOURCE_FILE_ID="${RWS_FILE_ID:-}"
if [[ "$SOURCE" =~ ^[0-9]+$ ]]; then
  SOURCE_FILE_ID="$SOURCE"
  log "downloading RWS file $SOURCE"
  curl -fsSL -o "$WORK/source.zip" "${RWS_DOWNLOAD}${SOURCE}"
  unzip -q "$WORK/source.zip" -d "$WORK/cells"
elif [[ -f "$SOURCE" && "$SOURCE" == *.zip ]]; then
  unzip -q "$SOURCE" -d "$WORK/cells"
elif [[ -d "$SOURCE" ]]; then
  cp -r "$SOURCE"/. "$WORK/cells/"
else
  log "source is not a file id, .zip or folder: $SOURCE"
  exit 2
fi

mapfile -t CELLS < <(find "$WORK/cells" -type f -name '*.000' | sort)
[[ ${#CELLS[@]} -gt 0 ]] || { log "no S-57 cells (*.000) found"; exit 3; }
log "${#CELLS[@]} cells"

# Apply update files, split multipoint soundings into points with a DEPTH
# attribute, and keep the object classes as layers (not primitives)
export OGR_S57_OPTIONS="UPDATES=APPLY,SPLIT_MULTIPOINT=ON,ADD_SOUNDG_DEPTH=ON,RETURN_PRIMITIVES=OFF,RETURN_LINKAGES=OFF,LNAM_REFS=OFF,RECODE_BY_DSSI=ON"

# --- 2. Edition dates and layers per cell -----------------------------------
echo '[]' > "$WORK/cells.json"
for cell in "${CELLS[@]}"; do
  name="$(basename "$cell" .000)"

  # DSID: edition number, update number, issue date and update application date
  dsid="$(ogrinfo -ro -q -geom=NO -al "$cell" DSID 2>/dev/null || true)"
  field() { sed -nE "s/^ *$1 \([A-Za-z]+\) = (.*)$/\1/p" <<<"$dsid" | head -1; }
  jq --arg name "$name" --arg edition "$(field DSID_EDTN)" --arg update "$(field DSID_UPDN)" \
     --arg issued "$(field DSID_ISDT)" --arg updated "$(field DSID_UADT)" --arg scale "$(field DSPM_CSCL)" \
     '. + [{name: $name, edition: $edition, update: $update, issueDate: $issued, updateDate: $updated,
            compilationScale: ($scale | tonumber? // null)}]' \
     "$WORK/cells.json" > "$WORK/cells.tmp" && mv "$WORK/cells.tmp" "$WORK/cells.json"

  available="$(ogrinfo -ro -so -q "$cell" 2>/dev/null | sed -nE 's/^[0-9]+: ([A-Za-z_]+).*/\1/p')"
  for layer in "${LAYERS[@]}"; do
    grep -qx "$layer" <<<"$available" || continue
    # -explodecollections: GeoJSONSeq can't hold one geometry type per feature otherwise
    ogr2ogr -f GeoJSONSeq -t_srs EPSG:4326 -dim XY -explodecollections -skipfailures \
      "$WORK/layers/$name.$layer.geojsons" "$cell" "$layer" 2>/dev/null || true
  done
done

# One file per layer for tippecanoe; layer names in lower case
LAYER_ARGS=()
for layer in "${LAYERS[@]}"; do
  lower="${layer,,}"
  shopt -s nullglob
  files=("$WORK"/layers/*."$layer".geojsons)
  shopt -u nullglob
  [[ ${#files[@]} -gt 0 ]] || continue
  cat "${files[@]}" >> "$WORK/layers/all.$lower.geojsons"
done
for file in "$WORK"/layers/all.*.geojsons; do
  [[ -s "$file" ]] || continue
  lower="$(basename "$file" .geojsons)"; lower="${lower#all.}"
  LAYER_ARGS+=(-L "$lower:$file")
done
[[ ${#LAYER_ARGS[@]} -gt 0 ]] || { log "no features in any tiled layer"; exit 4; }

ATTR_ARGS=()
for attribute in "${ATTRIBUTES[@]}"; do ATTR_ARGS+=(-y "$attribute"); done

# Newest issue or update date of any cell: the region's edition date
EDITION_DATE="$(jq -r '[.[] | .updateDate, .issueDate | select(. != null and . != "")] | max // empty' "$WORK/cells.json")"
EDITION_ISO=""
[[ -n "$EDITION_DATE" ]] && EDITION_ISO="${EDITION_DATE:0:4}-${EDITION_DATE:4:2}-${EDITION_DATE:6:2}"

# --- 3. Vector tiles ----------------------------------------------------------
log "tiling z$MIN_ZOOM-$MAX_ZOOM"
tippecanoe -q -f -o "$OUT/$REGION_ID.pmtiles" \
  -Z "$MIN_ZOOM" -z "$MAX_ZOOM" \
  -n "OpenSail inland ENC: $REGION_NAME" \
  -N "Rijkswaterstaat inland ENC, edition $EDITION_ISO" \
  -A "<a href=\"https://www.vaarweginformatie.nl\">Rijkswaterstaat</a> inland ENC (CC-0)" \
  --detect-shared-borders --coalesce-densest-as-needed --extend-zooms-if-still-dropping \
  --no-tile-size-limit -r1 \
  "${ATTR_ARGS[@]}" "${LAYER_ARGS[@]}"

# --- 4. Manifest and catalog ---------------------------------------------------
# Bounds of the coverage layer, from every cell
read -r WEST SOUTH EAST NORTH < <(
  for cell in "${CELLS[@]}"; do
    ogrinfo -ro -so -json "$cell" M_COVR 2>/dev/null | jq -r '.layers[0].geometryFields[0].extent // empty | @tsv'
  done | awk 'NR==1{w=$1;s=$2;e=$3;n=$4} {if($1<w)w=$1; if($2<s)s=$2; if($3>e)e=$3; if($4>n)n=$4} END{print w, s, e, n}'
)

BYTES="$(stat -c %s "$OUT/$REGION_ID.pmtiles")"
SHA256="$(sha256sum "$OUT/$REGION_ID.pmtiles" | cut -d' ' -f1)"

jq -n --arg id "$REGION_ID" --arg name "$REGION_NAME" --arg edition "$EDITION_ISO" \
  --arg fileId "$SOURCE_FILE_ID" --arg list "$RWS_LIST" \
  --argjson west "$WEST" --argjson south "$SOUTH" --argjson east "$EAST" --argjson north "$NORTH" \
  --argjson minzoom "$MIN_ZOOM" --argjson maxzoom "$MAX_ZOOM" \
  --argjson bytes "$BYTES" --arg sha256 "$SHA256" --arg built "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --slurpfile cells "$WORK/cells.json" \
  '{
     id: $id, name: $name, kind: "inland-enc", official: true,
     source: { publisher: "Rijkswaterstaat", licence: "CC0-1.0", list: $list,
               fileId: (if $fileId == "" then null else $fileId end) },
     editionDate: (if $edition == "" then null else $edition end),
     bounds: ([$west, $south, $east, $north] | map(. * 1000000 | round / 1000000)), minzoom: $minzoom, maxzoom: $maxzoom,
     file: ($id + ".pmtiles"), bytes: $bytes, sha256: $sha256, builtAt: $built,
     cells: $cells[0]
   }' > "$OUT/$REGION_ID.json"

# index.json: every region manifest in this folder, without the per-cell list
jq -s '{ version: 1, regions: [ .[] | del(.cells) ] | sort_by(.id) }' \
  $(find "$OUT" -maxdepth 1 -name '*.json' ! -name index.json | sort) > "$OUT/index.json"

log "done: $OUT/$REGION_ID.pmtiles ($((BYTES / 1024)) KiB, edition $EDITION_ISO)"
