#!/usr/bin/env bash
# Fetch the source catalogs used by build_data.py into tools/raw/.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p raw

# HYG Stellar Database v4.1 (astronexus, CC BY-SA 4.0)
curl -sSL -o raw/hygdata_v41.csv \
  "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv"

# Open Exoplanet Catalogue tables (MIT)
curl -sSL -o raw/open_exoplanet_catalogue.txt \
  "https://raw.githubusercontent.com/OpenExoplanetCatalogue/oec_tables/master/comma_separated/open_exoplanet_catalogue.txt"

echo "done:"
ls -la raw/
