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
  geojsonUrl = "cont.geojson",
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
            console.log("Potree viewer created successfully");

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

            // Create basic THREE.js scene
            console.log("Creating THREE.js fallback scene...");
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
              console.log("Canvas added to container");
            }

            camera.position.set(0, 0, 100);

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

          if (!isThreeJsFallback && viewer) {
            try {
              viewer.fitToScreen();
            } catch (error) {
              console.warn("Failed to load point cloud:", error);
            }
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
                  geojsonData.features.forEach((feature: any) => {
                    if (feature.geometry.type === "LineString") {
                      feature.geometry.coordinates.forEach(
                        (coord: number[]) => {
                          minLon = Math.min(minLon, coord[0]);
                          maxLon = Math.max(maxLon, coord[0]);
                          minLat = Math.min(minLat, coord[1]);
                          maxLat = Math.max(maxLat, coord[1]);
                        }
                      );
                    }
                  });

                  // GeoJSONの中心を計算
                  const geojsonCenterLon = (minLon + maxLon) / 2;
                  const geojsonCenterLat = (minLat + maxLat) / 2;

                  // XY座標の境界を初期化
                  let minX = Infinity,
                    maxX = -Infinity;
                  let minY = Infinity,
                    maxY = -Infinity;

                  // GeoJSONの各フィーチャーを線として描画
                  geojsonData.features.forEach((feature: any) => {
                    if (feature.geometry.type === "LineString") {
                      const coordinates = feature.geometry.coordinates;
                      const points: THREE.Vector3[] = [];

                      coordinates.forEach((coord: number[]) => {
                        const lon = coord[0];
                        const lat = coord[1];

                        // GeoJSONの実際の中心を基準点として使用
                        const x = (lon - geojsonCenterLon) * 100000;
                        const y = (lat - geojsonCenterLat) * 100000;
                        points.push(new THREE.Vector3(x, y, 0));

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
                        color: 0xff0000,
                        linewidth: 2,
                      });
                      const line = new THREE.Line(geometry, material);

                      // シーンに追加（Potreeまたは基本THREE.js）
                      if (isThreeJsFallback && viewer) {
                        viewer.scene.add(line);
                      } else if (viewer && viewer.scene && viewer.scene.scene) {
                        viewer.scene.scene.add(line);
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

                    // GeoJSONの緯度経度範囲を使用して適切なズームレベルを計算
                    const latRange = maxLat - minLat;
                    const lonRange = maxLon - minLon;
                    const zoom =
                      Math.floor(
                        Math.log2(360 / Math.max(latRange, lonRange))
                      ) + 2; // +2でより詳細に
                    const clampedZoom = Math.max(10, Math.min(18, zoom)); // 最低でもズーム10、最大18

                    // 中心の緯度経度
                    const centerLat = (minLat + maxLat) / 2;
                    const centerLon = (minLon + maxLon) / 2;

                    // タイル座標を計算
                    const tileX = Math.floor(
                      ((centerLon + 180) / 360) * Math.pow(2, clampedZoom)
                    );
                    const tileY = Math.floor(
                      ((1 -
                        Math.log(
                          Math.tan((centerLat * Math.PI) / 180) +
                            1 / Math.cos((centerLat * Math.PI) / 180)
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
                    console.log("Map geometry size:", mapWidth, "x", mapHeight);
                    console.log("Tile lat/lon ranges:", {
                      latRange: actualTileLatRange,
                      lonRange: actualTileLonRange,
                    });

                    console.log("Map bounds:", {
                      minLat,
                      maxLat,
                      minLon,
                      maxLon,
                    });
                    console.log("Calculated tile:", {
                      zoom: clampedZoom,
                      x: tileX,
                      y: tileY,
                    });
                    console.log("Tile actual bounds:", {
                      latMin: tileLatMin,
                      latMax: tileLatMax,
                      lonMin: tileLonMin,
                      lonMax: tileLonMax,
                    });

                    // GeoJSONの実際の中心を基準点として使用
                    const geojsonCenterLon = (minLon + maxLon) / 2;
                    const geojsonCenterLat = (minLat + maxLat) / 2;

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
                          (currentTileCenterLon - geojsonCenterLon) * 100000;
                        const currentMapCenterY =
                          (currentTileCenterLat - geojsonCenterLat) * 100000;

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

                    console.log("3x3 tile grid created around center:", {
                      geojsonCenterLon,
                      geojsonCenterLat,
                      centerTileX: tileX,
                      centerTileY: tileY,
                      zoom: clampedZoom,
                    });
                    console.log(
                      "Background map grid added with calculated coordinates"
                    );

                    // カメラを中心に向けて適切な距離に配置（近づけて10倍大きく表示）
                    viewer.camera.position.set(
                      centerX,
                      centerY,
                      maxDimension * 0.5
                    );
                    viewer.camera.lookAt(centerX, centerY, 0);
                  }

                  console.log("GeoJSON loaded and rendered successfully");
                } catch (error) {
                  console.error("Failed to parse GeoJSON:", error);
                }
              },
              undefined,
              (error) => {
                console.error("Failed to load GeoJSON:", error);
              }
            );
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
