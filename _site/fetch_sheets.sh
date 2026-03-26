#!/usr/bin/env bash
set -e

OUTDIR="${1:-assets/data}"
mkdir -p "$OUTDIR"
cd "$OUTDIR"

# Discover sheet tab gids from the published HTML, then order by descending numeric gid.
# Google Sheets assigns gids such that left-to-right tab order matches descending gid for
# these workbooks (ascending sort -u put the wrong tab first — e.g. S5 tab1 was a small
# schema sheet instead of the main metadata table).
# Optional third argument: max number of tabs to fetch (default: all). Used for S5 to skip
# Tallies / Brainstorm Labels tabs that are not shown on the site.
fetch_sheet() {
  local name=$1
  local url=$2
  local max_tabs=${3:-0}
  echo "Fetching $name..."
  local gids
  gids=$(curl -sL "${url}pubhtml" | grep -oE 'gid=[0-9]+' | cut -d= -f2 | sort -nr | uniq)
  local i=1
  for gid in $gids; do
    if [[ "$max_tabs" -gt 0 && "$i" -gt "$max_tabs" ]]; then
      break
    fi
    local out="${name}_tab${i}.csv"
    curl -sL "${url}pub?gid=${gid}&single=true&output=csv" -o "$out"
    if [[ ! -s "$out" ]]; then
      echo "  WARNING: empty download -> $out (gid=$gid)" >&2
    elif [[ $(wc -l < "$out" | tr -d ' ') -lt 2 ]]; then
      echo "  WARNING: only header or empty -> $out (gid=$gid, lines=$(wc -l < "$out"))" >&2
    else
      echo "  -> $out (gid=$gid, $(wc -l < "$out" | tr -d ' ') lines)"
    fi
    ((i++))
  done
}

BASE_S5="https://docs.google.com/spreadsheets/d/e/2PACX-1vTYWHhi0RrbjRJoq7d_VUju8wv_5IsEbWSfvi-QDLwGxzjSIxiNo13e6xfPWZhQMg/"
BASE_S2="https://docs.google.com/spreadsheets/d/e/2PACX-1vQHcEtsaWwofKjO3WSPm-lU2_187h15l-TryPGf7qBQlb1gGw8GEb8zOIr4ndtetg/"
BASE_S4="https://docs.google.com/spreadsheets/d/e/2PACX-1vT9wqn2ZhgxVWeRtklRriFS-XAuOYGleVyP-ysy0sqMk_RKv0fNvl9ezSW49Hm5Rg/"
BASE_S6="https://docs.google.com/spreadsheets/d/e/2PACX-1vRDg5ps2lyOaf26U5mOJr9d9IAb_9AN5YGEmoC2rsJDTY22-3nwRSl5Rydptwk6NA/"

fetch_sheet "s5_bil_datasets" "$BASE_S5" 1
fetch_sheet "s2_tracer_injections" "$BASE_S2"
fetch_sheet "s4_single_neuron" "$BASE_S4"
fetch_sheet "s6_cell_distributions" "$BASE_S6"

echo "Done. Files saved in $OUTDIR"