#!/bin/sh

# 入力ファイル名と出力ファイル名を引数から受け取る
INPUT_LAS=$1
OUTPUT_GEOJSON=$2

# 中間ファイル名を定義
DEM_TIF="temp_dem.tif"
DEM_CRS84_TIF="temp_dem_crs84.tif"

# 1. LASからDEM (GeoTIFF) に変換
echo "Step 1: Converting LAS to DEM..."
pdal translate ${INPUT_LAS} ${DEM_TIF} --writers.gdal.resolution=0.5

# 2. DEMのCRSをEPSG:4326に変換
echo "Step 2: Reprojecting DEM to EPSG:4326..."
gdalwarp -t_srs EPSG:4326 ${DEM_TIF} ${DEM_CRS84_TIF}

# 3. CRS変換済みのDEMから等高線 (GeoJSON) を生成
echo "Step 3: Generating contours as GeoJSON..."
gdal_contour -a elev -i 5.0 -f GeoJSON ${DEM_CRS84_TIF} ${OUTPUT_GEOJSON}

# 中間ファイルを削除
rm ${DEM_TIF} ${DEM_CRS84_TIF}

echo "Processing complete. Output file: ${OUTPUT_GEOJSON}"