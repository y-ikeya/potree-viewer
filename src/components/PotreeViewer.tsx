import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import proj4 from "proj4";
import $ from "jquery";
import Stats from "stats.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface PotreeViewerProps {
  geojsonUrl?: string;
  width?: number;
  height?: number;
  className?: string;
}

const PotreeViewer: React.FC<PotreeViewerProps> = ({
  geojsonUrl = "contour.geojson",
  width = 1000,
  height = 1000,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Wait for container to be properly mounted
    const timer = setTimeout(async () => {
      const initPotree = async () => {
        try {
          // Ensure container is still available
          if (!containerRef.current) return;
          // Make THREE.js, proj4, jQuery, and Stats available globally for Potree
          (window as any).THREE = THREE;
          (window as any).proj4 = proj4;
          (window as any).$ = $;
          (window as any).jQuery = $;
          (window as any).Stats = Stats;

          // Add compatibility aliases for older THREE.js geometry classes
          if (!(window as any).THREE.PlaneBufferGeometry) {
            (window as any).THREE.PlaneBufferGeometry = THREE.PlaneGeometry;
          }
          if (!(window as any).THREE.BoxBufferGeometry) {
            (window as any).THREE.BoxBufferGeometry = THREE.BoxGeometry;
          }
          if (!(window as any).THREE.SphereBufferGeometry) {
            (window as any).THREE.SphereBufferGeometry = THREE.SphereGeometry;
          }
          if (!(window as any).THREE.CylinderBufferGeometry) {
            (window as any).THREE.CylinderBufferGeometry =
              THREE.CylinderGeometry;
          }
          // Add aliases for even older geometry names
          if (!(window as any).THREE.CubeGeometry) {
            (window as any).THREE.CubeGeometry = THREE.BoxGeometry;
          }
          if (!(window as any).THREE.SphereGeometry) {
            (window as any).THREE.SphereGeometry = THREE.SphereGeometry;
          }

          // Check WebGL support
          const canvas = document.createElement("canvas");
          const gl =
            canvas.getContext("webgl") ||
            canvas.getContext("experimental-webgl");
          if (!gl) {
            throw new Error("WebGL is not supported in this browser");
          }

          const Potree = await import("potree");

          // Ensure container has proper dimensions
          if (containerRef.current) {
            containerRef.current.style.position = "relative";
            containerRef.current.style.overflow = "hidden";
          }

          // Try Potree viewer first, fallback to THREE.js if it fails
          let viewer: any = null;
          let isThreeJsFallback = false;

          try {
            viewer = new Potree.Viewer(containerRef.current!);
            viewer.setEDLEnabled(true);
            viewer.setFOV(60);
            viewer.setPointBudget(1_000_000);
            viewer.setBackground("gradient");
          } catch (potreeError) {
            console.warn(
              "Potree viewer failed, using THREE.js fallback:",
              potreeError
            );
            isThreeJsFallback = true;

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(
              75,
              width / height,
              0.1,
              1000
            );
            const renderer = new THREE.WebGLRenderer({ antialias: true });

            renderer.setSize(width, height);
            renderer.setClearColor(0x87ceeb); // Sky blue background
            console.log("Renderer created, size:", width, height);

            // Clear container first
            if (containerRef.current) {
              containerRef.current.innerHTML = "";
              containerRef.current.appendChild(renderer.domElement);
            }

            camera.position.set(0, 0, 10);

            // Add OrbitControls for zoom and pan
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true; // スムーズなインタラクション
            controls.dampingFactor = 0.1;
            controls.enableRotate = true; // 回転を有効
            controls.enableZoom = true; // ズームを有効
            controls.enablePan = true; // パンを有効
            controls.maxDistance = 50000; // 最大ズーム距離
            controls.minDistance = 10; // 最小ズーム距離

            console.log("OrbitControls added");

            // Simple animation loop
            const animate = () => {
              requestAnimationFrame(animate);
              controls.update(); // OrbitControlsを更新
              renderer.render(scene, camera);
            };
            animate();
            console.log("Animation loop started");

            viewer = { scene, camera, renderer, isThreeJsFallback: true };
          }

          viewerRef.current = viewer;

          // Load point cloud data
          if (viewer) {
            // if (!isThreeJsFallback) {
            //   try {
            //     viewer.fitToScreen();
            //   } catch (error) {
            //     console.warn("Failed to load point cloud:", error);
            //   }
            // } else {
            //   // THREE.js fallback: Load point cloud manually
            //   console.log("Loading point cloud data for THREE.js fallback");
            //   // Load metadata
            //   fetch("/bins/metadata.json")
            //     .then((response) => response.json())
            //     .then(async (metadata) => {
            //       console.log("Point cloud metadata:", metadata);
            //       // Create point cloud from binary data
            //       const pointsCount = metadata.points || 0;
            //       const boundingBox = metadata.boundingBox;
            //       const offset = metadata.offset;
            //       const scale = metadata.scale;
            //       // Load octree binary file
            //       const octreeResponse = await fetch("/bins/octree.bin");
            //       const octreeBuffer = await octreeResponse.arrayBuffer();
            //       console.log(
            //         "Octree buffer loaded:",
            //         octreeBuffer.byteLength,
            //         "bytes"
            //       );
            //       // Parse octree data based on Potree format
            //       const dataView = new DataView(octreeBuffer);
            //       let byteOffset = 0;
            //       // Create point cloud geometry
            //       const geometry = new THREE.BufferGeometry();
            //       if (boundingBox && metadata.attributes) {
            //         const center = [
            //           (boundingBox.min[0] + boundingBox.max[0]) / 2,
            //           (boundingBox.min[1] + boundingBox.max[1]) / 2,
            //           (boundingBox.min[2] + boundingBox.max[2]) / 2,
            //         ];
            //         // Parse attributes to understand data layout
            //         let positionAttribute = null;
            //         let totalAttributeSize = 0;
            //         for (const attr of metadata.attributes) {
            //           if (attr.name === "position") {
            //             positionAttribute = attr;
            //           }
            //           totalAttributeSize += attr.size;
            //         }
            //         console.log("Position attribute:", positionAttribute);
            //         console.log(
            //           "Total attribute size per point:",
            //           totalAttributeSize
            //         );
            //         // Calculate actual number of points we can read
            //         const actualPointsCount = Math.min(
            //           pointsCount,
            //           Math.floor(octreeBuffer.byteLength / totalAttributeSize)
            //         );
            //         console.log(
            //           `Reading ${actualPointsCount} points out of ${pointsCount}`
            //         );
            //         // Define projection for plane rectangular coordinate system 15 (Okinawa)
            //         // EPSG:2456 - JGD2000 / Japan Plane Rectangular CS XV
            //         const jprcs15 =
            //           "+proj=tmerc +lat_0=26 +lon_0=124 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
            //         const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
            //         // Create arrays for positions and colors
            //         const positions = new Float32Array(actualPointsCount * 3);
            //         const colors = new Float32Array(actualPointsCount * 3);
            //         // First pass: Convert all points and find geographic bounds
            //         const lonLatPoints: Array<[number, number, number]> = [];
            //         let minLon = Infinity,
            //           maxLon = -Infinity;
            //         let minLat = Infinity,
            //           maxLat = -Infinity;
            //         let tempByteOffset = byteOffset;
            //         for (
            //           let i = 0;
            //           i < actualPointsCount &&
            //           tempByteOffset + totalAttributeSize <=
            //             octreeBuffer.byteLength;
            //           i++
            //         ) {
            //           if (
            //             positionAttribute &&
            //             positionAttribute.type === "int32"
            //           ) {
            //             const x_plane =
            //               dataView.getInt32(tempByteOffset, true) *
            //                 (scale?.[0] || 0.001) +
            //               (offset?.[0] || 0);
            //             const y_plane =
            //               dataView.getInt32(tempByteOffset + 4, true) *
            //                 (scale?.[1] || 0.001) +
            //               (offset?.[1] || 0);
            //             const z =
            //               dataView.getInt32(tempByteOffset + 8, true) *
            //                 (scale?.[2] || 0.001) +
            //               (offset?.[2] || 0);
            //             // Convert from plane rectangular coordinate system 15 to lat/lon
            //             const [lon, lat] = proj4(jprcs15, wgs84, [
            //               x_plane,
            //               y_plane,
            //             ]);
            //             lonLatPoints.push([lon, lat, z]);
            //             // Update geographic bounds
            //             minLon = Math.min(minLon, lon);
            //             maxLon = Math.max(maxLon, lon);
            //             minLat = Math.min(minLat, lat);
            //             maxLat = Math.max(maxLat, lat);
            //           }
            //           tempByteOffset += totalAttributeSize;
            //         }
            //         // Calculate center from actual bounds
            //         const pointCloudCenterLon = (minLon + maxLon) / 2;
            //         const pointCloudCenterLat = (minLat + maxLat) / 2;
            //         // Second pass: Create positions relative to center
            //         for (let i = 0; i < lonLatPoints.length; i++) {
            //           const i3 = i * 3;
            //           const [lon, lat, z] = lonLatPoints[i];
            //           // Convert to the same coordinate system as the map
            //           positions[i3] = (lon - pointCloudCenterLon) * 100000;
            //           positions[i3 + 1] = (lat - pointCloudCenterLat) * 100000;
            //           positions[i3 + 2] = z;
            //           // Set colors based on height with better gradient
            //           const normalizedHeight =
            //             (z - boundingBox.min[2]) /
            //             (boundingBox.max[2] - boundingBox.min[2]);
            //           // Create a smooth gradient from blue (low) -> green -> yellow -> red (high)
            //           let r, g, b;
            //           if (normalizedHeight < 0.25) {
            //             // Blue to cyan
            //             const t = normalizedHeight / 0.25;
            //             r = 0;
            //             g = t;
            //             b = 1;
            //           } else if (normalizedHeight < 0.5) {
            //             // Cyan to green
            //             const t = (normalizedHeight - 0.25) / 0.25;
            //             r = 0;
            //             g = 1;
            //             b = 1 - t;
            //           } else if (normalizedHeight < 0.75) {
            //             // Green to yellow
            //             const t = (normalizedHeight - 0.5) / 0.25;
            //             r = t;
            //             g = 1;
            //             b = 0;
            //           } else {
            //             // Yellow to red
            //             const t = (normalizedHeight - 0.75) / 0.25;
            //             r = 1;
            //             g = 1 - t;
            //             b = 0;
            //           }
            //           colors[i3] = r;
            //           colors[i3 + 1] = g;
            //           colors[i3 + 2] = b;
            //         }
            //         geometry.setAttribute(
            //           "position",
            //           new THREE.BufferAttribute(positions, 3)
            //         );
            //         geometry.setAttribute(
            //           "color",
            //           new THREE.BufferAttribute(colors, 3)
            //         );
            //         // Create point cloud material
            //         const material = new THREE.PointsMaterial({
            //           size: 0.5,
            //           vertexColors: true,
            //           sizeAttenuation: true,
            //           transparent: true,
            //           opacity: 0.8,
            //         });
            //         // Create points object
            //         const points = new THREE.Points(geometry, material);
            //         viewer.scene.add(points);
            //         // Also add a bounding box wireframe
            //         const boxGeometry = new THREE.BoxGeometry(
            //           boundingBox.max[0] - boundingBox.min[0],
            //           boundingBox.max[1] - boundingBox.min[1],
            //           boundingBox.max[2] - boundingBox.min[2]
            //         );
            //         const boxMaterial = new THREE.MeshBasicMaterial({
            //           color: 0x00ff00,
            //           wireframe: true,
            //         });
            //         const box = new THREE.Mesh(boxGeometry, boxMaterial);
            //         box.position.set(center[0], center[1], center[2]);
            //         viewer.scene.add(box);
            //         // Update viewer's center reference for GeoJSON processing
            //         viewer.pointCloudCenter = {
            //           lon: pointCloudCenterLon,
            //           lat: pointCloudCenterLat,
            //         };
            //         // Adjust camera to view the point cloud (at origin since it's centered)
            //         const geoDistance =
            //           Math.max(maxLon - minLon, maxLat - minLat) * 100000;
            //         const heightRange = boundingBox.max[2] - boundingBox.min[2];
            //         const optimalDistance = Math.max(
            //           geoDistance / 5,
            //           heightRange / 5,
            //           20
            //         );
            //         viewer.camera.position.set(
            //           optimalDistance,
            //           optimalDistance,
            //           optimalDistance
            //         );
            //         viewer.camera.lookAt(0, 0, 0);
            //         console.log(
            //           `Point cloud created with ${actualPointsCount} points`
            //         );
            //         console.log(
            //           "Point cloud will be centered at origin with geographic center:",
            //           {
            //             lon: pointCloudCenterLon,
            //             lat: pointCloudCenterLat,
            //           }
            //         );
            //       }
            //     })
            //     .catch((error) => {
            //       console.error("Failed to load point cloud metadata:", error);
            //     });
            // }
          }

          // Load and display GeoJSON
          if (geojsonUrl) {
            const loader = new THREE.FileLoader();
            loader.load(
              geojsonUrl,
              (data) => {
                try {
                  const geojsonData = JSON.parse(data as string);

                  // 最初に緯度経度の境界を計算
                  let minLon = Infinity,
                    maxLon = -Infinity;
                  let minLat = Infinity,
                    maxLat = -Infinity;

                  // 全座標をスキャンして緯度経度の境界を取得
                  const jprcs =
                    "+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
                  // const jprcs3 = "+proj=tmerc +lat_0=33 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
                  const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
                  geojsonData.features.forEach((feature: any) => {
                    if (
                      feature &&
                      feature.geometry &&
                      feature.geometry.type === "LineString"
                    ) {
                      feature.geometry.coordinates.forEach(
                        (coord: number[]) => {
                          if (
                            Math.abs(coord[0]) > 1000 ||
                            Math.abs(coord[1]) > 1000
                          ) {
                            // Assume plane rectangular coordinate system - convert to lat/lon first
                            const [lon, lat] = proj4(jprcs, wgs84, [
                              coord[0],
                              coord[1],
                            ]);
                            minLon = Math.min(minLon, lon);
                            maxLon = Math.max(maxLon, lon);
                            minLat = Math.min(minLat, lat);
                            maxLat = Math.max(maxLat, lat);
                          } else {
                            // Geographic coordinates - use directly
                            minLon = Math.min(minLon, coord[0]);
                            maxLon = Math.max(maxLon, coord[0]);
                            minLat = Math.min(minLat, coord[1]);
                            maxLat = Math.max(maxLat, coord[1]);
                          }
                        }
                      );
                    }
                  });

                  // Use GeoJSON's own center for coordinate conversion
                  const geojsonCenterLon: number = (minLon + maxLon) / 2;
                  const geojsonCenterLat: number = (minLat + maxLat) / 2;
                  // Force GeoJSON to display at the same location as point cloud (at origin)
                  let offsetX = 0,
                    offsetY = 0;
                  if (viewer.pointCloudCenter) {
                    // Don't offset - display GeoJSON at the same location as point cloud
                    offsetX = 0;
                    offsetY = 0;
                  }

                  // XY座標の境界を初期化
                  let minX = Infinity,
                    maxX = -Infinity;
                  let minY = Infinity,
                    maxY = -Infinity;

                  // GeoJSONの各フィーチャーを線として描画
                  geojsonData.features.forEach((feature: any) => {
                    if (
                      feature &&
                      feature.geometry &&
                      feature.geometry.type === "LineString"
                    ) {
                      const coordinates = feature.geometry.coordinates;
                      const points: THREE.Vector3[] = [];

                      coordinates.forEach((coord: number[]) => {
                        let x: number, y: number;

                        // Check if coordinates are in plane rectangular coordinate system (large values > 1000)
                        // or geographic coordinates (small values like degrees)
                        if (
                          Math.abs(coord[0]) > 1000 ||
                          Math.abs(coord[1]) > 1000
                        ) {
                          // Assume plane rectangular coordinate system - convert to lat/lon first
                          const jprcs3 =
                            "+proj=tmerc +lat_0=33 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
                          const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
                          const [lon, lat] = proj4(jprcs3, wgs84, [
                            coord[0],
                            coord[1],
                          ]);

                          // Then convert to scene coordinates and apply offset
                          x = (lon - geojsonCenterLon) * 100000 + offsetX;
                          y = (lat - geojsonCenterLat) * 100000 + offsetY;
                        } else {
                          // Geographic coordinates - use directly
                          const lon = coord[0];
                          const lat = coord[1];

                          // Convert relative to GeoJSON center, then apply offset to align with point cloud
                          x = (lon - geojsonCenterLon) * 100000 + offsetX;
                          y = (lat - geojsonCenterLat) * 100000 + offsetY;
                        }

                        points.push(new THREE.Vector3(x, y, 1));

                        // 新しい座標系での境界を更新
                        minX = Math.min(minX, x);
                        maxX = Math.max(maxX, x);
                        minY = Math.min(minY, y);
                        maxY = Math.max(maxY, y);
                      });

                      const geometry = new THREE.BufferGeometry().setFromPoints(
                        points
                      );
                      const material = new THREE.LineBasicMaterial({
                        color: 0x00ff00, // 自動生成された等高線は緑
                        linewidth: 5,
                        transparent: false,
                        opacity: 1.0,
                      });
                      const line = new THREE.Line(geometry, material);

                      // シーンに追加（Potreeまたは基本THREE.js）
                      if (isThreeJsFallback && viewer) {
                        viewer.scene.add(line);
                      } else if (viewer && viewer.scene && viewer.scene.scene) {
                        viewer.scene.scene.add(line);
                        console.log("GeoJSON line added to Potree scene");
                      }
                    }
                  });

                  // GeoJSONの中心を計算してカメラを調整
                  if (isThreeJsFallback && viewer) {
                    const centerX = (minX + maxX) / 2;
                    const centerY = (minY + maxY) / 2;
                    const width = maxX - minX;
                    const height = maxY - minY;
                    const maxDimension = Math.max(width, height);

                    // Don't override camera position if point cloud was already loaded
                    let shouldUpdateCamera = !viewer.pointCloudCenter;

                    // Use actual point cloud geographic bounds for accurate map tiles
                    const actualCenterLat = (minLat + maxLat) / 2;
                    const actualCenterLon = (minLon + maxLon) / 2;
                    const actualLatRange = maxLat - minLat;
                    const actualLonRange = maxLon - minLon;

                    const zoom =
                      Math.floor(
                        Math.log2(
                          360 / Math.max(actualLatRange, actualLonRange)
                        )
                      ) + 2;
                    const clampedZoom = Math.max(10, Math.min(18, zoom));

                    // タイル座標を実際の点群座標から計算
                    const tileX = Math.floor(
                      ((actualCenterLon + 180) / 360) * Math.pow(2, clampedZoom)
                    );
                    const tileY = Math.floor(
                      ((1 -
                        Math.log(
                          Math.tan((actualCenterLat * Math.PI) / 180) +
                            1 / Math.cos((actualCenterLat * Math.PI) / 180)
                        ) /
                          Math.PI) /
                        2) *
                        Math.pow(2, clampedZoom)
                    );

                    // タイルの実際の緯度経度境界を計算
                    const n = Math.pow(2, clampedZoom);
                    const tileLonMin = (tileX / n) * 360 - 180;
                    const tileLonMax = ((tileX + 1) / n) * 360 - 180;
                    const tileLatMax =
                      (Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / n))) *
                        180) /
                      Math.PI;
                    const tileLatMin =
                      (Math.atan(
                        Math.sinh(Math.PI * (1 - (2 * (tileY + 1)) / n))
                      ) *
                        180) /
                      Math.PI;

                    // 背景地図を追加（タイルの実際の緯度経度範囲に基づく）
                    const actualTileLatRange = tileLatMax - tileLatMin;
                    const actualTileLonRange = tileLonMax - tileLonMin;

                    // タイルの実際の緯度経度範囲をGeoJSONと同じスケールで変換
                    const mapWidth = actualTileLonRange * 100000;
                    const mapHeight = actualTileLatRange * 100000;

                    const mapGeometry = new THREE.PlaneGeometry(
                      mapWidth,
                      mapHeight
                    );

                    // Use actual point cloud center for map tiles
                    const mapCenterLon = actualCenterLon;
                    const mapCenterLat = actualCenterLat;

                    // 5x5のタイルグリッドを作成
                    const textureLoader = new THREE.TextureLoader();
                    for (let dy = -2; dy <= 2; dy++) {
                      for (let dx = -2; dx <= 2; dx++) {
                        const currentTileX = tileX + dx;
                        const currentTileY = tileY + dy;

                        // 現在のタイルの境界を計算
                        const currentTileLonMin =
                          (currentTileX / n) * 360 - 180;
                        const currentTileLonMax =
                          ((currentTileX + 1) / n) * 360 - 180;
                        const currentTileLatMax =
                          (Math.atan(
                            Math.sinh(Math.PI * (1 - (2 * currentTileY) / n))
                          ) *
                            180) /
                          Math.PI;
                        const currentTileLatMin =
                          (Math.atan(
                            Math.sinh(
                              Math.PI * (1 - (2 * (currentTileY + 1)) / n)
                            )
                          ) *
                            180) /
                          Math.PI;

                        // タイルの中心をGeoJSONの座標系に変換
                        const currentTileCenterLon =
                          (currentTileLonMin + currentTileLonMax) / 2;
                        const currentTileCenterLat =
                          (currentTileLatMin + currentTileLatMax) / 2;

                        const currentMapCenterX =
                          (currentTileCenterLon - mapCenterLon) * 100000;
                        const currentMapCenterY =
                          (currentTileCenterLat - mapCenterLat) * 100000;

                        // タイルをロード
                        const tileUrl = `https://cyberjapandata.gsi.go.jp/xyz/std/${clampedZoom}/${currentTileX}/${currentTileY}.png`;

                        const mapTexture = textureLoader.load(
                          tileUrl,
                          () => {},
                          undefined,
                          (error) => {
                            console.warn(
                              `Failed to load tile [${dx},${dy}]:`,
                              error
                            );
                          }
                        );

                        const mapMaterial = new THREE.MeshBasicMaterial({
                          map: mapTexture,
                          transparent: true,
                          opacity: 1,
                        });
                        const mapPlane = new THREE.Mesh(
                          mapGeometry,
                          mapMaterial
                        );
                        mapPlane.position.set(
                          currentMapCenterX,
                          currentMapCenterY,
                          -0.01
                        );
                        viewer.scene.add(mapPlane);
                      }
                    }

                    // カメラを中心に向けて適切な距離に配置（近づけて10倍大きく表示）
                    if (shouldUpdateCamera) {
                      viewer.camera.position.set(
                        centerX,
                        centerY,
                        maxDimension * 0.1
                      );
                      viewer.camera.lookAt(centerX, centerY, 0);
                    } else {
                      // If point cloud center exists, position camera to see both point cloud and map
                      const combinedDistance = Math.max(
                        maxDimension * 0.1,
                        1000
                      );
                      viewer.camera.position.set(0, 0, combinedDistance);
                      viewer.camera.lookAt(0, 0, 0);
                    }
                  }
                } catch (error) {
                  console.error("Failed to parse GeoJSON:", error);
                }
              },
              undefined,
              (error) => {
                console.error("Failed to load GeoJSON:", error);
              }
            );
            // loader.load(
            //   "cont.geojson",
            //   (data) => {
            //     try {
            //       const geojsonData = JSON.parse(data as string);

            //       // 最初に緯度経度の境界を計算
            //       let minLon = Infinity,
            //         maxLon = -Infinity;
            //       let minLat = Infinity,
            //         maxLat = -Infinity;

            //       // 全座標をスキャンして緯度経度の境界を取得
            //       geojsonData.features.forEach((feature: any) => {
            //         if (feature.geometry.type === "LineString") {
            //           feature.geometry.coordinates.forEach(
            //             (coord: number[]) => {
            //               minLon = Math.min(minLon, coord[0]);
            //               maxLon = Math.max(maxLon, coord[0]);
            //               minLat = Math.min(minLat, coord[1]);
            //               maxLat = Math.max(maxLat, coord[1]);
            //             }
            //           );
            //         }
            //       });

            //       // Use GeoJSON's own center for coordinate conversion
            //       const geojsonCenterLon: number = (minLon + maxLon) / 2;
            //       const geojsonCenterLat: number = (minLat + maxLat) / 2;
            //       // Force GeoJSON to display at the same location as point cloud (at origin)
            //       let offsetX = 0,
            //         offsetY = 0;
            //       if (viewer.pointCloudCenter) {
            //         // Don't offset - display GeoJSON at the same location as point cloud
            //         offsetX = 0;
            //         offsetY = 0;
            //       }

            //       // XY座標の境界を初期化
            //       let minX = Infinity,
            //         maxX = -Infinity;
            //       let minY = Infinity,
            //         maxY = -Infinity;

            //       // GeoJSONの各フィーチャーを線として描画
            //       geojsonData.features.forEach((feature: any) => {
            //         if (feature.geometry.type === "LineString") {
            //           const coordinates = feature.geometry.coordinates;
            //           const points: THREE.Vector3[] = [];

            //           coordinates.forEach((coord: number[]) => {
            //             let x: number, y: number;

            //             // Check if coordinates are in plane rectangular coordinate system (large values > 1000)
            //             // or geographic coordinates (small values like degrees)
            //             if (
            //               Math.abs(coord[0]) > 1000 ||
            //               Math.abs(coord[1]) > 1000
            //             ) {
            //               // Assume plane rectangular coordinate system - convert to lat/lon first
            //               const jprcs15 =
            //                 "+proj=tmerc +lat_0=26 +lon_0=124 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
            //               const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
            //               const [lon, lat] = proj4(jprcs15, wgs84, [
            //                 coord[0],
            //                 coord[1],
            //               ]);

            //               // Then convert to scene coordinates and apply offset
            //               x = (lon - geojsonCenterLon) * 100000 + offsetX;
            //               y = (lat - geojsonCenterLat) * 100000 + offsetY;
            //             } else {
            //               // Geographic coordinates - use directly
            //               const lon = coord[0];
            //               const lat = coord[1];

            //               // Convert relative to GeoJSON center, then apply offset to align with point cloud
            //               x = (lon - geojsonCenterLon) * 100000 + offsetX;
            //               y = (lat - geojsonCenterLat) * 100000 + offsetY;
            //             }

            //             points.push(new THREE.Vector3(x, y, 1));

            //             // 新しい座標系での境界を更新
            //             minX = Math.min(minX, x);
            //             maxX = Math.max(maxX, x);
            //             minY = Math.min(minY, y);
            //             maxY = Math.max(maxY, y);
            //           });

            //           const geometry = new THREE.BufferGeometry().setFromPoints(
            //             points
            //           );
            //           const material = new THREE.LineBasicMaterial({
            //             color: 0xff0000,
            //             linewidth: 5,
            //             transparent: false,
            //             opacity: 1.0,
            //           });
            //           const line = new THREE.Line(geometry, material);

            //           // シーンに追加（Potreeまたは基本THREE.js）
            //           if (isThreeJsFallback && viewer) {
            //             viewer.scene.add(line);
            //           } else if (viewer && viewer.scene && viewer.scene.scene) {
            //             viewer.scene.scene.add(line);
            //             console.log("GeoJSON line added to Potree scene");
            //           }
            //         }
            //       });

            //       // GeoJSONの中心を計算してカメラを調整
            //       if (isThreeJsFallback && viewer) {
            //         const centerX = (minX + maxX) / 2;
            //         const centerY = (minY + maxY) / 2;
            //         const width = maxX - minX;
            //         const height = maxY - minY;
            //         const maxDimension = Math.max(width, height);

            //         // Don't override camera position if point cloud was already loaded
            //         let shouldUpdateCamera = !viewer.pointCloudCenter;

            //         // Use actual point cloud geographic bounds for accurate map tiles
            //         const actualCenterLat = (minLat + maxLat) / 2;
            //         const actualCenterLon = (minLon + maxLon) / 2;
            //         const actualLatRange = maxLat - minLat;
            //         const actualLonRange = maxLon - minLon;

            //         const zoom =
            //           Math.floor(
            //             Math.log2(
            //               360 / Math.max(actualLatRange, actualLonRange)
            //             )
            //           ) + 2;
            //         const clampedZoom = Math.max(10, Math.min(18, zoom));

            //         // タイル座標を実際の点群座標から計算
            //         const tileX = Math.floor(
            //           ((actualCenterLon + 180) / 360) * Math.pow(2, clampedZoom)
            //         );
            //         const tileY = Math.floor(
            //           ((1 -
            //             Math.log(
            //               Math.tan((actualCenterLat * Math.PI) / 180) +
            //                 1 / Math.cos((actualCenterLat * Math.PI) / 180)
            //             ) /
            //               Math.PI) /
            //             2) *
            //             Math.pow(2, clampedZoom)
            //         );

            //         // タイルの実際の緯度経度境界を計算
            //         const n = Math.pow(2, clampedZoom);
            //         const tileLonMin = (tileX / n) * 360 - 180;
            //         const tileLonMax = ((tileX + 1) / n) * 360 - 180;
            //         const tileLatMax =
            //           (Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / n))) *
            //             180) /
            //           Math.PI;
            //         const tileLatMin =
            //           (Math.atan(
            //             Math.sinh(Math.PI * (1 - (2 * (tileY + 1)) / n))
            //           ) *
            //             180) /
            //           Math.PI;

            //         // 背景地図を追加（タイルの実際の緯度経度範囲に基づく）
            //         const actualTileLatRange = tileLatMax - tileLatMin;
            //         const actualTileLonRange = tileLonMax - tileLonMin;

            //         // タイルの実際の緯度経度範囲をGeoJSONと同じスケールで変換
            //         const mapWidth = actualTileLonRange * 100000;
            //         const mapHeight = actualTileLatRange * 100000;

            //         const mapGeometry = new THREE.PlaneGeometry(
            //           mapWidth,
            //           mapHeight
            //         );

            //         // Use actual point cloud center for map tiles
            //         const mapCenterLon = actualCenterLon;
            //         const mapCenterLat = actualCenterLat;

            //         // 5x5のタイルグリッドを作成
            //         const textureLoader = new THREE.TextureLoader();
            //         for (let dy = -2; dy <= 2; dy++) {
            //           for (let dx = -2; dx <= 2; dx++) {
            //             const currentTileX = tileX + dx;
            //             const currentTileY = tileY + dy;

            //             // 現在のタイルの境界を計算
            //             const currentTileLonMin =
            //               (currentTileX / n) * 360 - 180;
            //             const currentTileLonMax =
            //               ((currentTileX + 1) / n) * 360 - 180;
            //             const currentTileLatMax =
            //               (Math.atan(
            //                 Math.sinh(Math.PI * (1 - (2 * currentTileY) / n))
            //               ) *
            //                 180) /
            //               Math.PI;
            //             const currentTileLatMin =
            //               (Math.atan(
            //                 Math.sinh(
            //                   Math.PI * (1 - (2 * (currentTileY + 1)) / n)
            //                 )
            //               ) *
            //                 180) /
            //               Math.PI;

            //             // タイルの中心をGeoJSONの座標系に変換
            //             const currentTileCenterLon =
            //               (currentTileLonMin + currentTileLonMax) / 2;
            //             const currentTileCenterLat =
            //               (currentTileLatMin + currentTileLatMax) / 2;

            //             const currentMapCenterX =
            //               (currentTileCenterLon - mapCenterLon) * 100000;
            //             const currentMapCenterY =
            //               (currentTileCenterLat - mapCenterLat) * 100000;

            //             // タイルをロード
            //             const tileUrl = `https://cyberjapandata.gsi.go.jp/xyz/std/${clampedZoom}/${currentTileX}/${currentTileY}.png`;

            //             const mapTexture = textureLoader.load(
            //               tileUrl,
            //               () => {},
            //               undefined,
            //               (error) => {
            //                 console.warn(
            //                   `Failed to load tile [${dx},${dy}]:`,
            //                   error
            //                 );
            //               }
            //             );

            //             const mapMaterial = new THREE.MeshBasicMaterial({
            //               map: mapTexture,
            //               transparent: true,
            //               opacity: 1,
            //             });
            //             const mapPlane = new THREE.Mesh(
            //               mapGeometry,
            //               mapMaterial
            //             );
            //             mapPlane.position.set(
            //               currentMapCenterX,
            //               currentMapCenterY,
            //               -0.01
            //             );
            //             viewer.scene.add(mapPlane);
            //           }
            //         }

            //         // カメラを中心に向けて適切な距離に配置（近づけて10倍大きく表示）
            //         if (shouldUpdateCamera) {
            //           viewer.camera.position.set(
            //             centerX,
            //             centerY,
            //             maxDimension * 0.1
            //           );
            //           viewer.camera.lookAt(centerX, centerY, 0);
            //         } else {
            //           // If point cloud center exists, position camera to see both point cloud and map
            //           const combinedDistance = Math.max(
            //             maxDimension * 0.1,
            //             1000
            //           );
            //           viewer.camera.position.set(0, 0, combinedDistance);
            //           viewer.camera.lookAt(0, 0, 0);
            //         }
            //       }
            //     } catch (error) {
            //       console.error("Failed to parse GeoJSON:", error);
            //     }
            //   },
            //   undefined,
            //   (error) => {
            //     console.error("Failed to load GeoJSON:", error);
            //   }
            // );
          }
        } catch (error) {
          console.error("Failed to initialize Potree:", error);
        }
      };

      await initPotree();
    }, 100); // Wait 100ms for container to be ready

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      if (viewerRef.current) {
        viewerRef.current.dispose();
      }
    };
  }, [geojsonUrl, width, height]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: "absolute",
        top: 0,
        left: 0,
        overflow: "hidden",
      }}
    />
  );
};

export default PotreeViewer;
