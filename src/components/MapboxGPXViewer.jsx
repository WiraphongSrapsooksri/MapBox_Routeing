// src/components/MapboxGPXViewer.jsx
import React, { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import PathPlanningPanel from './PathPlanningPanel';
import MultiPathDisplay from './MultiPathDisplay';
import { planPath } from '../services/pathPlanningApi';
import {
  calculatePathDistance,
  extractCoordinatesFromGeoJSON,
  extractElevations,
  getElevationStats,
  convertToDMS,
  calculateBearing
} from '../utils/geoUtils';

let mapboxgl;

const SAMPLE_GPX_FILES = [
  { name: 'Route 1', path: '/gpx/route1.gpx' },
  { name: 'Route 2', path: '/gpx/route2.gpx' },
  { name: 'Route 3', path: '/gpx/route3.gpx' },
  { name: 'Route 4', path: '/gpx/route4.gpx' },
  { name: 'Route 5', path: '/gpx/route5.gpx' },
  { name: 'Route 6', path: '/gpx/route6.gpx' },
  { name: 'Route 7', path: '/gpx/route7.gpx' },
  { name: 'Route 8', path: '/gpx/route8.gpx' },
];

const PATH_COLORS = [
  '#2196f3', // Best path - น้ำเงิน
  '#ff9800', // Alt 1 - ส้ม
  '#4caf50', // Alt 2 - เขียว
  '#f44336', // Alt 3 - แดง
  '#9c27b0', // Alt 4 - ม่วง
  '#00bcd4', // Alt 5 - ฟ้า
  '#ff5722', // Alt 6 - ส้มเข้ม
  '#607d8b', // Alt 7 - เทา
];

const MapboxGPXViewer = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const animationRef = useRef(null);
  const currentMarkerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const goalMarkerRef = useRef(null);

  // Original states
  const [gpxData, setGpxData] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [loading, setLoading] = useState(false);

  // Simulation states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [cameraMode, setCameraMode] = useState('follow');
  const [showTrail, setShowTrail] = useState(true);

  // Path planning states
  const [isPathPlanningMode, setIsPathPlanningMode] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [goalPoint, setGoalPoint] = useState(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [pathStats, setPathStats] = useState(null);
  const [plannedRoute, setPlannedRoute] = useState(null);
  const [mode, setMode] = useState('gpx');
  const [selectedPathIndex, setSelectedPathIndex] = useState('best'); // ✅ เปลี่ยนเป็น string

  // ✅ New state for multi-path management
  const [displayedPaths, setDisplayedPaths] = useState(new Set(['best']));

  // Add marker for start/goal point
  const addPointMarker = (lngLat, type) => {
    if (!map.current || !mapboxgl) return;

    const el = document.createElement('div');
    el.className = type === 'start' ? 'custom-marker-start' : 'custom-marker-goal';

    el.style.position = 'relative';
    el.style.width = '50px';
    el.style.height = '60px';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.alignItems = 'center';
    el.style.cursor = 'pointer';

    const pin = document.createElement('div');
    pin.style.width = '40px';
    pin.style.height = '40px';
    pin.style.borderRadius = '50% 50% 50% 0';
    pin.style.transform = 'rotate(-45deg)';
    pin.style.display = 'flex';
    pin.style.alignItems = 'center';
    pin.style.justifyContent = 'center';
    pin.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    pin.style.border = '4px solid white';
    pin.style.transition = 'transform 0.2s';

    const label = document.createElement('div');
    label.style.transform = 'rotate(45deg)';
    label.style.fontSize = '20px';
    label.style.fontWeight = 'bold';
    label.style.color = 'white';
    label.style.textShadow = '0 1px 3px rgba(0,0,0,0.3)';

    if (type === 'start') {
      pin.style.backgroundColor = '#4caf50';
      label.textContent = 'A';
      pin.style.animation = 'markerBounce 0.5s ease-out';

      if (startMarkerRef.current) {
        startMarkerRef.current.remove();
      }

      pin.appendChild(label);
      el.appendChild(pin);

      startMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(lngLat)
        .setPopup(
          new mapboxgl.Popup({ offset: 30, className: 'custom-popup' })
            .setHTML(`
              <div style="padding: 8px; font-family: Arial, sans-serif;">
                <div style="font-size: 14px; font-weight: bold; color: #4caf50; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 18px;">🚩</span> จุดเริ่มต้น (A)
                </div>
                <div style="font-size: 12px; color: #666; font-family: monospace;">
                  📍 ${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}
                </div>
              </div>
            `)
        )
        .addTo(map.current);
    } else {
      pin.style.backgroundColor = '#f44336';
      label.textContent = 'B';
      pin.style.animation = 'markerBounce 0.5s ease-out';

      if (goalMarkerRef.current) {
        goalMarkerRef.current.remove();
      }

      pin.appendChild(label);
      el.appendChild(pin);

      goalMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(lngLat)
        .setPopup(
          new mapboxgl.Popup({ offset: 30, className: 'custom-popup' })
            .setHTML(`
              <div style="padding: 8px; font-family: Arial, sans-serif;">
                <div style="font-size: 14px; font-weight: bold; color: #f44336; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 18px;">🏁</span> จุดปลายทาง (B)
                </div>
                <div style="font-size: 12px; color: #666; font-family: monospace;">
                  📍 ${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}
                </div>
              </div>
            `)
        )
        .addTo(map.current);
    }

    el.addEventListener('mouseenter', () => {
      pin.style.transform = 'rotate(-45deg) scale(1.1)';
    });
    el.addEventListener('mouseleave', () => {
      pin.style.transform = 'rotate(-45deg) scale(1)';
    });
  };

  // Show point selection menu (A or B)
  const showPointSelectionMenu = (lngLat) => {
    if (!map.current || !mapboxgl) return;

    const menuContent = `
      <div style="font-family: sans-serif; min-width: 200px;">
        <div style="padding: 10px; border-bottom: 1px solid #eee; font-weight: 600; font-size: 14px;">
          📍 เลือกประเภทจุด
        </div>
        <div style="padding: 5px;">
          <button 
            id="set-start-point" 
            style="
              width: 100%;
              padding: 12px;
              margin-bottom: 5px;
              background: ${startPoint ? '#e8f5e9' : '#4caf50'};
              color: ${startPoint ? '#2e7d32' : 'white'};
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              text-align: left;
              transition: all 0.2s;
            "
            onmouseover="this.style.opacity='0.8'"
            onmouseout="this.style.opacity='1'"
          >
            ${startPoint ? '✓ จุดเริ่มต้น (A) - เปลี่ยน' : '🟢 ตั้งเป็นจุดเริ่มต้น (A)'}
          </button>
          <button 
            id="set-goal-point" 
            style="
              width: 100%;
              padding: 12px;
              background: ${goalPoint ? '#ffebee' : '#f44336'};
              color: ${goalPoint ? '#c62828' : 'white'};
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              text-align: left;
              transition: all 0.2s;
            "
            onmouseover="this.style.opacity='0.8'"
            onmouseout="this.style.opacity='1'"
          >
            ${goalPoint ? '✓ จุดปลายทาง (B) - เปลี่ยน' : '🔴 ตั้งเป็นจุดปลายทาง (B)'}
          </button>
        </div>
        <div style="padding: 8px; background: #f5f5f5; border-top: 1px solid #eee; font-size: 11px; color: #666; text-align: center;">
          ${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}
        </div>
      </div>
    `;

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: true,
      maxWidth: '250px',
      className: 'point-selection-popup'
    })
      .setLngLat([lngLat.lng, lngLat.lat])
      .setHTML(menuContent)
      .addTo(map.current);

    setTimeout(() => {
      const startBtn = document.getElementById('set-start-point');
      const goalBtn = document.getElementById('set-goal-point');

      if (startBtn) {
        startBtn.addEventListener('click', () => {
          setStartPoint({ lat: lngLat.lat, lng: lngLat.lng });
          addPointMarker({ lng: lngLat.lng, lat: lngLat.lat }, 'start');
          popup.remove();
        });
      }

      if (goalBtn) {
        goalBtn.addEventListener('click', () => {
          setGoalPoint({ lat: lngLat.lat, lng: lngLat.lng });
          addPointMarker({ lng: lngLat.lng, lat: lngLat.lat }, 'goal');
          popup.remove();
        });
      }
    }, 100);
  };

  // Show terrain info popup
  const showTerrainInfo = async (lngLat, point) => {
    if (!map.current) return;

    const elevation = map.current.queryTerrainElevation(lngLat, { exaggerated: false });
    const features = map.current.queryRenderedFeatures(point);

    let popupContent = `
      <div style="font-family: monospace; font-size: 12px; min-width: 300px;">
        <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 5px;">
          📍 ข้อมูลตำแหน่ง
        </h3>
        
        <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
          <strong>🌐 พิกัด:</strong><br/>
          <span style="color: #0066cc;">Latitude:</span> ${lngLat.lat.toFixed(6)}°<br/>
          <span style="color: #0066cc;">Longitude:</span> ${lngLat.lng.toFixed(6)}°
        </div>

        <div style="background: #e8f5e9; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
          <strong>⛰️ ความสูง (Terrain):</strong><br/>
          ${elevation ? `<span style="color: #2e7d32; font-size: 16px; font-weight: bold;">${elevation.toFixed(2)} เมตร</span>` : '<span style="color: #999;">ไม่มีข้อมูล</span>'}
        </div>

        <div style="background: #fff3e0; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
          <strong>🗺️ DEM Source Info:</strong><br/>
          <span style="color: #e65100;">Source:</span> Mapbox Terrain DEM v1<br/>
          <span style="color: #e65100;">Tile Size:</span> 512px<br/>
          <span style="color: #e65100;">Max Zoom:</span> 14<br/>
          <span style="color: #e65100;">Resolution:</span> ~30m
        </div>

        <div style="background: #f3e5f5; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
          <strong>🎯 Zoom Level:</strong> ${map.current.getZoom().toFixed(2)}<br/>
          <strong>📐 Pitch:</strong> ${map.current.getPitch().toFixed(1)}°<br/>
          <strong>🧭 Bearing:</strong> ${map.current.getBearing().toFixed(1)}°
        </div>
    `;

    if (features && features.length > 0) {
      popupContent += `
        <div style="background: #e3f2fd; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
          <strong>🏞️ Features ที่ตำแหน่งนี้:</strong><br/>
          <div style="max-height: 150px; overflow-y: auto; margin-top: 5px;">
      `;

      const uniqueFeatures = [...new Set(features.map(f => {
        if (f.layer) {
          return `${f.layer.type} - ${f.layer.id}`;
        }
        return null;
      }).filter(Boolean))];

      uniqueFeatures.slice(0, 10).forEach(feature => {
        popupContent += `<div style="padding: 3px 0; font-size: 11px;">• ${feature}</div>`;
      });

      if (uniqueFeatures.length > 10) {
        popupContent += `<div style="color: #999; font-size: 11px;">... และอีก ${uniqueFeatures.length - 10} รายการ</div>`;
      }

      popupContent += `</div></div>`;
    }

    popupContent += `
      <div style="background: #fce4ec; padding: 10px; border-radius: 5px; font-size: 11px;">
        <strong>📋 รูปแบบพิกัดอื่นๆ:</strong><br/>
        <div style="margin-top: 5px;">
          <strong>Decimal:</strong><br/>
          ${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}<br/><br/>
          
          <strong>DMS:</strong><br/>
          ${convertToDMS(lngLat.lat, 'lat')}<br/>
          ${convertToDMS(lngLat.lng, 'lng')}
        </div>
      </div>
    </div>`;

    new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '400px'
    })
      .setLngLat([lngLat.lng, lngLat.lat])
      .setHTML(popupContent)
      .addTo(map.current);
  };

  // Context menu handler
  const handleContextMenu = async (e) => {
    const mouseMoved = e.originalEvent._mouseMoved;
    
    if (mouseMoved) {
      return;
    }

    if (!e.originalEvent.ctrlKey && !e.originalEvent.shiftKey) {
      return;
    }

    e.preventDefault();

    const lngLat = e.lngLat;

    if (e.originalEvent.ctrlKey) {
      showTerrainInfo(lngLat, e.point);
      return;
    }

    if (e.originalEvent.shiftKey) {
      showPointSelectionMenu(lngLat);
      return;
    }
  };

  // ✅ Clear ALL routes from map
  const clearAllRoutes = () => {
    if (!map.current) return;

    // Clear all path layers and sources
    const pathIds = ['best', ...Array(10).fill(0).map((_, i) => `alt_${i}`)];
    
    pathIds.forEach(pathId => {
      ['', '-outline', '-shadow', '-animation'].forEach(suffix => {
        const layerId = `route${suffix}-${pathId}`;
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
      });
      
      const sourceId = `route-${pathId}`;
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });

    // Clear old style routes (backward compatibility)
    ['route-animation', 'route', 'route-outline', 'route-shadow', 'passed-route'].forEach(layerId => {
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
    });
    
    ['route', 'passed-route'].forEach(sourceId => {
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });
  };

  // Clear start/goal points
  const handleClearPoints = () => {
    setStartPoint(null);
    setGoalPoint(null);
    setPathStats(null);
    setPlannedRoute(null);
    setDisplayedPaths(new Set());
    setSelectedPathIndex('best');

    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    if (goalMarkerRef.current) {
      goalMarkerRef.current.remove();
      goalMarkerRef.current = null;
    }

    clearAllRoutes();
    resetSimulation();
  };

  // ✅ Display single route with specific ID and color
  const displayRouteWithId = (pathData, pathId, colorIndex) => {
    if (!map.current || !mapboxgl) {
      console.error('Map not ready');
      return;
    }

    const color = PATH_COLORS[colorIndex % PATH_COLORS.length];
    
    // Extract coordinates
    let coordinates;
    if (pathData.path_geojson) {
      const feature = pathData.path_geojson.features[0];
      coordinates = extractCoordinatesFromGeoJSON(feature);
    } else if (pathData.gps_path) {
      coordinates = pathData.gps_path.map(point => [point.lon, point.lat]);
    } else if (pathData.coordinates) {
      coordinates = pathData.coordinates;
    } else {
      console.error('No coordinates found in pathData');
      return;
    }

    console.log(`Adding route ${pathId} with ${coordinates.length} points, color: ${color}`);

    // Remove existing layers for this path
    ['', '-outline', '-shadow'].forEach(suffix => {
      const layerId = `route${suffix}-${pathId}`;
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
    });
    
    const sourceId = `route-${pathId}`;
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    // Add source
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      }
    });

    // Shadow layer
    map.current.addLayer({
      id: `route-shadow-${pathId}`,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#000000',
        'line-width': 10,
        'line-opacity': 0.15,
        'line-blur': 4
      }
    });

    // Outline layer
    map.current.addLayer({
      id: `route-outline-${pathId}`,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#ffffff',
        'line-width': pathId === selectedPathIndex ? 8 : 6,
        'line-opacity': 0.9
      }
    });

    // Main route layer
    map.current.addLayer({
      id: `route-${pathId}`,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': color,
        'line-width': pathId === selectedPathIndex ? 6 : 4,
        'line-opacity': 1
      }
    });

    console.log(`✅ Route ${pathId} displayed successfully`);
  };

  // ✅ Toggle path visibility
  const togglePathVisibility = (pathId, isVisible) => {
    if (!map.current) return;

    const opacity = isVisible ? 1 : 0;
    
    ['', '-outline', '-shadow'].forEach(suffix => {
      const layerId = `route${suffix}-${pathId}`;
      if (map.current.getLayer(layerId)) {
        const baseOpacity = suffix === '-shadow' ? 0.15 : (suffix === '-outline' ? 0.9 : 1);
        map.current.setPaintProperty(layerId, 'line-opacity', opacity * baseOpacity);
      }
    });

    // Update displayed paths set
    setDisplayedPaths(prev => {
      const newSet = new Set(prev);
      if (isVisible) {
        newSet.add(pathId);
      } else {
        newSet.delete(pathId);
      }
      return newSet;
    });
  };

  // ✅ Highlight selected path
  const highlightPath = (pathId) => {
    if (!map.current) return;

    // Reset all paths
    const allPathIds = ['best', ...Array(10).fill(0).map((_, i) => `alt_${i}`)];
    
    allPathIds.forEach(id => {
      if (map.current.getLayer(`route-${id}`)) {
        map.current.setPaintProperty(`route-${id}`, 'line-width', 4);
        map.current.setPaintProperty(`route-outline-${id}`, 'line-width', 6);
      }
    });
    
    // Highlight selected
    if (map.current.getLayer(`route-${pathId}`)) {
      map.current.setPaintProperty(`route-${pathId}`, 'line-width', 6);
      map.current.setPaintProperty(`route-outline-${pathId}`, 'line-width', 8);
    }
  };

  // ✅ Handle alternative path selection
  const handleSelectAlternativePath = (altPath, pathId) => {
    console.log('Selected path:', pathId, altPath);

    setSelectedPathIndex(pathId);
    highlightPath(pathId);

    // Update stats
    const stats = altPath.statistics || altPath;
    setPathStats({
      distance: stats.total_distance_km,
      waypoints: stats.waypoints || altPath.gps_path?.length || 0,
      elevation_gain: stats.total_ascent,
      elevation_loss: stats.total_descent,
      computation_time: plannedRoute?.computation_time_seconds || 0,
      statistics: stats,
      terrain_info: plannedRoute?.terrain_info
    });

    // Update GPX data for simulation (if needed)
    if (altPath.path_geojson) {
      const feature = altPath.path_geojson.features[0];
      const coordinates = extractCoordinatesFromGeoJSON(feature);
      const elevations = extractElevations(coordinates);

      setGpxData({
        coordinates: coordinates.map(c => [c[0], c[1]]),
        elevations: elevations
      });
    }

    // Reset simulation
    resetSimulation();
  };

  // ✅ Plan path using API with multi-path support
  const handlePlanPath = async (params) => {
    setIsPlanning(true);
    setError(null);
    setSelectedPathIndex('best');
    
    resetSimulation();
    setGpxData(null);
    setPlannedRoute(null);
    setPathStats(null);
    setDisplayedPaths(new Set());
    
    clearAllRoutes();

    try {
      console.log('Planning path with params:', params);
      const response = await planPath(params);

      console.log('Path planning response:', response);

      if (response.success && response.path_geojson) {
        // Store full response
        setPlannedRoute(response);
        setMode('planning');

        // Extract best path data
        const feature = response.path_geojson.features[0];
        const coordinates = extractCoordinatesFromGeoJSON(feature);
        const elevations = extractElevations(coordinates);

        const gpxDataFromPlanning = {
          coordinates: coordinates.map(c => [c[0], c[1]]),
          elevations: elevations
        };

        setGpxData(gpxDataFromPlanning);

        // Calculate stats
        const distance = calculatePathDistance(gpxDataFromPlanning.coordinates);
        const elevStats = getElevationStats(elevations);

        setPathStats({
          distance: distance,
          waypoints: coordinates.length,
          elevation_gain: elevStats?.gain || 0,
          elevation_loss: elevStats?.loss || 0,
          computation_time: response.computation_time_seconds || 0,
          statistics: response.statistics || null,
          terrain_info: response.terrain_info || null
        });

        // ✅ Display ALL paths (best + alternatives)
        console.log(`\n🔀 Displaying paths: Best + ${response.alternative_paths?.length || 0} alternatives`);
        
        // Display best path
        displayRouteWithId(response, 'best', 0);
        setDisplayedPaths(new Set(['best']));

        // Display alternative paths
        if (response.alternative_paths && response.alternative_paths.length > 0) {
          response.alternative_paths.forEach((altPath, idx) => {
            const pathId = `alt_${idx}`;
            displayRouteWithId(altPath, pathId, idx + 1);
            setDisplayedPaths(prev => new Set([...prev, pathId]));
          });
        }

        // Fit bounds to all paths
        const allCoords = [
          ...coordinates,
          ...(response.alternative_paths || []).flatMap(alt => {
            if (alt.path_geojson) {
              return extractCoordinatesFromGeoJSON(alt.path_geojson.features[0]);
            }
            return [];
          })
        ];

        if (allCoords.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          allCoords.forEach(coord => bounds.extend(coord));

          map.current.fitBounds(bounds, {
            padding: { top: 80, bottom: 80, left: 400, right: 80 },
            pitch: 60,
            duration: 2000
          });
        }

        setIsPathPlanningMode(false);

      } else {
        throw new Error(response.message || 'ไม่สามารถวางแผนเส้นทางได้');
      }
    } catch (err) {
      console.error('Error planning path:', err);
      setError(`ข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsPlanning(false);
    }
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setCurrentIndex(0);

    if (currentMarkerRef.current) {
      currentMarkerRef.current.remove();
      currentMarkerRef.current = null;
    }

    if (map.current && map.current.getSource('passed-route')) {
      map.current.removeLayer('passed-route');
      map.current.removeSource('passed-route');
    }
  };

  const updateCurrentMarker = (coord, elevation, index) => {
    if (!map.current || !mapboxgl) return;

    if (currentMarkerRef.current) {
      currentMarkerRef.current.remove();
    }

    const el = document.createElement('div');
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#00ff00';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 20px rgba(0,255,0,0.8)';
    el.style.animation = 'pulse 1s infinite';

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat(coord)
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div style="font-size: 12px;">
              <strong>📍 จุดที่ ${index + 1}/${gpxData.coordinates.length}</strong><br/>
              <strong>⛰️ ความสูง:</strong> ${elevation.toFixed(1)} ม.<br/>
              <strong>🌐 พิกัด:</strong> ${coord[1].toFixed(5)}, ${coord[0].toFixed(5)}
            </div>
          `)
      )
      .addTo(map.current);

    currentMarkerRef.current = marker;
  };

  const updateCamera = (coord, index) => {
    if (!map.current || cameraMode === 'free') return;

    const coordinates = gpxData.coordinates;

    if (cameraMode === 'follow') {
      if (index < coordinates.length - 1) {
        const nextCoord = coordinates[index + 1];
        const bearing = calculateBearing(coord, nextCoord);

        map.current.easeTo({
          center: coord,
          bearing: bearing,
          pitch: 70,
          zoom: 16,
          duration: 50 / speed
        });
      }
    } else if (cameraMode === 'bird') {
      map.current.easeTo({
        center: coord,
        pitch: 45,
        zoom: 15,
        duration: 50 / speed
      });
    }
  };

  const updateTrail = (currentIdx) => {
    if (!map.current) return;

    const passedCoords = gpxData.coordinates.slice(0, currentIdx + 1);

    if (map.current.getSource('passed-route')) {
      map.current.getSource('passed-route').setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: passedCoords
        }
      });
    } else {
      map.current.addSource('passed-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: passedCoords
          }
        }
      });

      map.current.addLayer({
        id: 'passed-route',
        type: 'line',
        source: 'passed-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#00ff00',
          'line-width': 5,
          'line-opacity': 0.8
        }
      }, 'route-best'); // Insert before best route
    }
  };

  const parseGPX = (xmlString) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    const coordinates = [];
    const elevations = [];
    const trkpts = xmlDoc.getElementsByTagName('trkpt');

    for (let i = 0; i < trkpts.length; i++) {
      const lat = parseFloat(trkpts[i].getAttribute('lat'));
      const lon = parseFloat(trkpts[i].getAttribute('lon'));
      const eleNode = trkpts[i].getElementsByTagName('ele')[0];
      const ele = eleNode ? parseFloat(eleNode.textContent) : 0;

      coordinates.push([lon, lat]);
      elevations.push(ele);
    }

    console.log(`Parsed ${coordinates.length} points`);
    return { coordinates, elevations };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('Loading file:', file.name);
    setLoading(true);
    resetSimulation();
    setMode('gpx');
    setPathStats(null);
    clearAllRoutes();

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const gpxContent = event.target.result;
        const parsed = parseGPX(gpxContent);
        setGpxData(parsed);
        displayRoute(parsed);
        setLoading(false);
      } catch (err) {
        console.error('Error parsing GPX:', err);
        setError('ไม่สามารถอ่านไฟล์ GPX ได้');
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const loadRouteFromPath = async (path) => {
    try {
      setLoading(true);
      resetSimulation();
      setMode('gpx');
      setPathStats(null);
      clearAllRoutes();
      console.log('Loading route from:', path);

      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`ไม่สามารถโหลดไฟล์ ${path}`);
      }

      const gpxContent = await response.text();
      const parsed = parseGPX(gpxContent);
      setGpxData(parsed);
      displayRoute(parsed);
      setLoading(false);
    } catch (err) {
      console.error('Error loading route:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleRouteSelect = (e) => {
    const path = e.target.value;
    setSelectedRoute(path);
    if (path) {
      loadRouteFromPath(path);
    }
  };

  const togglePlay = () => {
    if (currentIndex >= gpxData.coordinates.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const displayRoute = (data) => {
    if (!map.current || !mapboxgl) {
      console.error('Map not ready, waiting...');
      setTimeout(() => displayRoute(data), 500);
      return;
    }

    const { coordinates } = data;

    if (coordinates.length === 0) {
      console.error('No coordinates');
      return;
    }

    console.log('Adding route to map...', coordinates.length, 'points');

    clearAllRoutes();

    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      }
    });

    map.current.addLayer({
      id: 'route-shadow',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#000000',
        'line-width': 12,
        'line-opacity': 0.2,
        'line-blur': 4
      }
    });

    map.current.addLayer({
      id: 'route-outline',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#ffffff',
        'line-width': 8,
        'line-opacity': 0.9
      }
    });

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': mode === 'planning' ? '#2196f3' : '#ff0000',
        'line-width': 5,
        'line-opacity': 1
      }
    });

    if (mode === 'gpx') {
      const markers = document.getElementsByClassName('mapboxgl-marker');
      while (markers[0]) {
        markers[0].remove();
      }

      const startEl = document.createElement('div');
      startEl.style.width = '30px';
      startEl.style.height = '30px';
      startEl.style.borderRadius = '50%';
      startEl.style.backgroundColor = '#00ff00';
      startEl.style.border = '3px solid white';
      startEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      new mapboxgl.Marker({ element: startEl })
        .setLngLat(coordinates[0])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>🚩 จุดเริ่มต้น</strong>'))
        .addTo(map.current);

      const endEl = document.createElement('div');
      endEl.style.width = '30px';
      endEl.style.height = '30px';
      endEl.style.borderRadius = '50%';
      endEl.style.backgroundColor = '#ff0000';
      endEl.style.border = '3px solid white';
      endEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      new mapboxgl.Marker({ element: endEl })
        .setLngLat(coordinates[coordinates.length - 1])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>🏁 จุดสิ้นสุด</strong>'))
        .addTo(map.current);
    }

    const bounds = new mapboxgl.LngLatBounds();
    coordinates.forEach(coord => bounds.extend(coord));

    map.current.fitBounds(bounds, {
      padding: { top: 80, bottom: 80, left: 400, right: 80 },
      pitch: 70,
      bearing: -17.6,
      duration: 2000
    });

    console.log('Route displayed!');
  };

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      try {
        const mapboxModule = await import('mapbox-gl');
        mapboxgl = mapboxModule.default;

        if (map.current) return;

        mapboxgl.accessToken = 'pk.eyJ1Ijoid2lyYXBob25nIiwiYSI6ImNtZ3EzbDZwZzB4Nm0yaXM5cTg0NHQ1ZzAifQ.jNVfwJPXzIshUwbGD4fheg';

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: [102.619483, 12.080551], 
          zoom: 10,
          pitch: 40,
          bearing: -17.6,
          antialias: true
        });

        map.current.on('load', () => {
          console.log('Map loaded successfully!');

          map.current.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 14
          });

          map.current.setTerrain({
            'source': 'mapbox-dem',
            'exaggeration': 2.0
          });

          map.current.addLayer({
            'id': 'sky',
            'type': 'sky',
            'paint': {
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0.0, 0.0],
              'sky-atmosphere-sun-intensity': 15
            }
          });

          map.current.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': ['case', ['has', 'height'], ['get', 'height'], 10],
              'fill-extrusion-base': ['case', ['has', 'min_height'], ['get', 'min_height'], 0],
              'fill-extrusion-opacity': 0.6
            }
          });

          setMapLoaded(true);
          setError(null);
        });

        map.current.on('error', (e) => {
          console.error('Map error:', e);
          setError(e.error.message);
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-right');
        map.current.on('contextmenu', handleContextMenu);

        let mouseDownPos = null;

        map.current.on('mousedown', (e) => {
          if (e.originalEvent.button === 2) {
            mouseDownPos = { x: e.originalEvent.clientX, y: e.originalEvent.clientY };
            e.originalEvent._mouseDownPos = mouseDownPos;
            e.originalEvent._mouseMoved = false;
          }
        });

        map.current.on('mousemove', (e) => {
          if (mouseDownPos) {
            const dx = Math.abs(e.originalEvent.clientX - mouseDownPos.x);
            const dy = Math.abs(e.originalEvent.clientY - mouseDownPos.y);
            if (dx > 5 || dy > 5) {
              if (e.originalEvent._mouseDownPos) {
                e.originalEvent._mouseMoved = true;
              }
            }
          }
        });

        map.current.on('mouseup', (e) => {
          if (e.originalEvent.button === 2) {
            mouseDownPos = null;
          }
        });

      } catch (err) {
        console.error('Error initializing map:', err);
        setError(err.message);
      }
    };

    initMap();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !gpxData || !map.current) return;

    const animate = () => {
      if (!isPlaying) return;

      setCurrentIndex(prevIndex => {
        const nextIndex = prevIndex + 1;

        if (nextIndex >= gpxData.coordinates.length) {
          setIsPlaying(false);
          return 0;
        }

        const coord = gpxData.coordinates[nextIndex];
        const elevation = gpxData.elevations[nextIndex] || 0;

        updateCurrentMarker(coord, elevation, nextIndex);
        updateCamera(coord, nextIndex);

        if (showTrail) {
          updateTrail(nextIndex);
        }

        return nextIndex;
      });

      const delay = 50 / speed;
      animationRef.current = setTimeout(() => {
        requestAnimationFrame(animate);
      }, delay);
    };

    animate();

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPlaying, speed, cameraMode, showTrail, gpxData]);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
          }

          @keyframes markerBounce {
            0% { transform: rotate(-45deg) translateY(-100px) scale(0); opacity: 0; }
            50% { transform: rotate(-45deg) translateY(0px) scale(1.1); }
            100% { transform: rotate(-45deg) translateY(0px) scale(1); opacity: 1; }
          }

          .point-selection-popup .mapboxgl-popup-content {
            padding: 0;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }

          .point-selection-popup .mapboxgl-popup-tip {
            border-top-color: #fff;
          }

          .custom-popup .mapboxgl-popup-content {
            padding: 0;
            border-radius: 10px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.25);
            border: 2px solid rgba(255,255,255,0.3);
          }

          .custom-popup .mapboxgl-popup-tip {
            border-top-color: white;
          }

          .custom-marker-start,
          .custom-marker-goal {
            filter: drop-shadow(0 6px 12px rgba(0,0,0,0.4));
          }

          .custom-marker-start:hover,
          .custom-marker-goal:hover {
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.5));
          }
        `}
      </style>

      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {error && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          backgroundColor: '#fee',
          color: '#c33',
          padding: '15px 20px',
          borderRadius: '8px',
          maxWidth: '400px',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <strong>Error:</strong> {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: '10px',
              padding: '4px 8px',
              backgroundColor: '#c33',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {!mapLoaded && !error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          กำลังโหลดแผนที่...
        </div>
      )}

      {loading && mapLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255,255,255,0.95)',
          padding: '20px 40px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}>
          กำลังโหลดเส้นทาง...
        </div>
      )}

      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '360px',
        zIndex: 10,
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          padding: '15px',
          marginBottom: '15px'
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                setMode('gpx');
                setIsPathPlanningMode(false);
                resetSimulation();
                setGpxData(null);
                setSelectedRoute('');
                setPathStats(null);
                setPlannedRoute(null);
                setError(null);
                setDisplayedPaths(new Set());
                
                if (startMarkerRef.current) {
                  startMarkerRef.current.remove();
                  startMarkerRef.current = null;
                }
                if (goalMarkerRef.current) {
                  goalMarkerRef.current.remove();
                  goalMarkerRef.current = null;
                }
                if (currentMarkerRef.current) {
                  currentMarkerRef.current.remove();
                  currentMarkerRef.current = null;
                }
                
                setStartPoint(null);
                setGoalPoint(null);
                
                clearAllRoutes();
              }}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: mode === 'gpx' ? '#2196f3' : '#f5f5f5',
                color: mode === 'gpx' ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              📁 อ่าน GPX
            </button>
            <button
              onClick={() => {
                setMode('planning');
                resetSimulation();
                setGpxData(null);
                setSelectedRoute('');
                setPathStats(null);
                setPlannedRoute(null);
                setError(null);
                setDisplayedPaths(new Set());
                
                if (currentMarkerRef.current) {
                  currentMarkerRef.current.remove();
                  currentMarkerRef.current = null;
                }
                
                clearAllRoutes();
              }}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: mode === 'planning' ? '#2196f3' : '#f5f5f5',
                color: mode === 'planning' ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🗺️ วางแผนเส้นทาง
            </button>
          </div>
        </div>

        {mode === 'planning' && (
          <PathPlanningPanel
            mode={mode}
            isPathPlanningMode={isPathPlanningMode}
            onTogglePathPlanningMode={() => setIsPathPlanningMode(!isPathPlanningMode)}
            startPoint={startPoint}
            goalPoint={goalPoint}
            onClearPoints={handleClearPoints}
            onPlanPath={handlePlanPath}
            isPlanning={isPlanning}
            pathStats={pathStats}
            plannedRoute={plannedRoute}
            onSelectAlternativePath={handleSelectAlternativePath}
            onShowRoute={gpxData ? () => setIsPlaying(true) : null}
          />
        )}

        {/* ✅ Multi-Path Display Component */}
        {mode === 'planning' && plannedRoute && plannedRoute.alternative_paths && (
          <MultiPathDisplay
            bestPath={{
              statistics: pathStats?.statistics || plannedRoute.statistics,
              path_geojson: plannedRoute.path_geojson,
              ...plannedRoute
            }}
            alternativePaths={plannedRoute.alternative_paths}
            selectedPathId={selectedPathIndex}
            onPathSelect={(path, pathId) => {
              handleSelectAlternativePath(path, pathId);
            }}
            onPathToggle={(pathId, isVisible) => {
              togglePathVisibility(pathId, isVisible);
            }}
          />
        )}

        {mode === 'gpx' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600' }}>
              📁 GPX Route Viewer
            </h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px',
                color: '#333'
              }}>
                เลือกเส้นทางจากโปรเจค:
              </label>
              <select
                value={selectedRoute}
                onChange={handleRouteSelect}
                disabled={!mapLoaded || isPlaying}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  cursor: 'pointer',
                  backgroundColor: 'white'
                }}
              >
                <option value="">-- เลือกเส้นทาง --</option>
                {SAMPLE_GPX_FILES.map((file, idx) => (
                  <option key={idx} value={file.path}>
                    {file.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '15px 0',
              color: '#999',
              fontSize: '13px'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
              <span>หรือ</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
            </div>

            <label style={{
              display: 'block',
              cursor: 'pointer',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '2px dashed #ccc',
              textAlign: 'center',
              fontWeight: '500',
              transition: 'all 0.2s',
              marginBottom: '20px',
              opacity: isPlaying ? 0.5 : 1,
              pointerEvents: isPlaying ? 'none' : 'auto'
            }}
              onMouseEnter={(e) => {
                if (!isPlaying) {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                  e.currentTarget.style.borderColor = '#666';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#ccc';
              }}>
              📂 อัพโหลดไฟล์ GPX
              <input
                type="file"
                accept=".gpx"
                onChange={handleFileUpload}
                disabled={!mapLoaded || isPlaying}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapboxGPXViewer;