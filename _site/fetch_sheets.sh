#!/usr/bin/env bash
set -e

OUTDIR="${1:-_data}"
mkdir -p "$OUTDIR"
cd "$OUTDIR"

fetch_sheet() {
  local name=$1
  local url=$2
  echo "Fetching $name..."
  local gids
  gids=$(curl -sL "${url}pubhtml" | grep -oE 'gid=[0-9]+' | sort -u | cut -d= -f2)
  local i=1
  for gid in $gids; do
    curl -sL "${url}pub?gid=${gid}&single=true&output=csv" -o "${name}_tab${i}.csv"
    echo "  -> ${name}_tab${i}.csv (gid=$gid)"
    ((i++))
  done
}

BASE_S5="https://docs.google.com/spreadsheets/d/e/2PACX-1vTYWHhi0RrbjRJoq7d_VUju8wv_5IsEbWSfvi-QDLwGxzjSIxiNo13e6xfPWZhQMg/"
BASE_S2="https://docs.google.com/spreadsheets/d/e/2PACX-1vQHcEtsaWwofKjO3WSPm-lU2_187h15l-TryPGf7qBQlb1gGw8GEb8zOIr4ndtetg/"
BASE_S4="https://docs.google.com/spreadsheets/d/e/2PACX-1vT9wqn2ZhgxVWeRtklRriFS-XAuOYGleVyP-ysy0sqMk_RKv0fNvl9ezSW49Hm5Rg/"
BASE_S6="https://docs.google.com/spreadsheets/d/e/2PACX-1vRDg5ps2lyOaf26U5mOJr9d9IAb_9AN5YGEmoC2rsJDTY22-3nwRSl5Rydptwk6NA/"

fetch_sheet "s5_bil_datasets" "$BASE_S5"
fetch_sheet "s2_tracer_injections" "$BASE_S2"
fetch_sheet "s4_single_neuron" "$BASE_S4"
fetch_sheet "s6_cell_distributions" "$BASE_S6"

echo "Done. Files saved in $OUTDIR"