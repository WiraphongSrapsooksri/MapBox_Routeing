import React, { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';

// Dynamic import to handle mapbox-gl
let mapboxgl;

// ใส่ path ของไฟล์ GPX ที่อยู่ใน public folder
const SAMPLE_GPX_FILES = [
  { name: 'Route 1', path: '/gpx/route1.gpx' },
  { name: 'Route 2', path: '/gpx/route2.gpx' },
  { name: 'Route 3', path: '/gpx/route3.gpx' },
  { name: 'Route 4', path: '/gpx/route4.gpx' },
  { name: 'Route 5', path: '/gpx/route5.gpx' },
];

const MapboxGPXViewer = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const animationRef = useRef(null);
  const currentMarkerRef = useRef(null);
  
  const [gpxData, setGpxData] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Simulation states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [cameraMode, setCameraMode] = useState('follow'); // 'follow', 'free', 'bird'
  const [showTrail, setShowTrail] = useState(true);

  useEffect(() => {
    const initMap = async () => {
      try {
        const mapboxModule = await import('mapbox-gl');
        mapboxgl = mapboxModule.default;

        console.log('Mapbox GL loaded:', mapboxgl);

        if (map.current) return;

        mapboxgl.accessToken = 'pk.eyJ1Ijoid2lyYXBob25nIiwiYSI6ImNtZ3EzbDZwZzB4Nm0yaXM5cTg0NHQ1ZzAifQ.jNVfwJPXzIshUwbGD4fheg';

        console.log('Creating map...');

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: [100.5, 13.7],
          zoom: 13,
          pitch: 70,
          bearing: -17.6,
          antialias: true
        });

        map.current.on('load', () => {
          console.log('Map loaded successfully!');

          // เพิ่ม 3D Terrain
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

          // เพิ่ม Sky Layer
          map.current.addLayer({
            'id': 'sky',
            'type': 'sky',
            'paint': {
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0.0, 0.0],
              'sky-atmosphere-sun-intensity': 15
            }
          });

          // เพิ่ม 3D Buildings
          map.current.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'case',
                ['has', 'height'],
                ['get', 'height'],
                10
              ],
              'fill-extrusion-base': [
                'case',
                ['has', 'min_height'],
                ['get', 'min_height'],
                0
              ],
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

        // Add context menu on right click
        map.current.on('contextmenu', async (e) => {
          e.preventDefault();
          
          const lngLat = e.lngLat;
          const coordinates = [lngLat.lng, lngLat.lat];
          
          const elevation = map.current.queryTerrainElevation(lngLat, { exaggerated: false });
          const features = map.current.queryRenderedFeatures(e.point);
          
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
          `;

          popupContent += `</div>`;

          new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: '400px'
          })
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(map.current);
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

        // Update current position marker
        updateCurrentMarker(coord, elevation, nextIndex);

        // Update camera based on mode
        updateCamera(coord, nextIndex);

        // Update trail
        if (showTrail) {
          updateTrail(nextIndex);
        }

        return nextIndex;
      });

      // Adjust speed (lower = faster)
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

  const updateCurrentMarker = (coord, elevation, index) => {
    if (!map.current || !mapboxgl) return;

    // Remove old marker
    if (currentMarkerRef.current) {
      currentMarkerRef.current.remove();
    }

    // Create pulsing marker
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
      // Calculate bearing based on next point
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
      // Bird's eye view - higher altitude, less pitch
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

    // Update passed route (green)
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
      }, 'route');
    }
  };

  const calculateBearing = (from, to) => {
    const [lon1, lat1] = from;
    const [lon2, lat2] = to;
    
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    
    return bearing;
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

    const { coordinates, elevations } = data;

    if (coordinates.length === 0) {
      console.error('No coordinates');
      return;
    }

    console.log('Adding route to map...', coordinates.length, 'points');

    // Remove old layers
    if (map.current.getLayer('route')) {
      map.current.removeLayer('route');
    }
    if (map.current.getLayer('route-outline')) {
      map.current.removeLayer('route-outline');
    }
    if (map.current.getSource('route')) {
      map.current.removeSource('route');
    }

    // Add source
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
      id: 'route-outline',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#000000',
        'line-width': 6,
        'line-opacity': 0.4
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
        'line-color': '#ff0000',
        'line-width': 4,
        'line-opacity': 0.9
      }
    });

    // Remove old markers
    const markers = document.getElementsByClassName('mapboxgl-marker');
    while(markers[0]) {
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

  const calculateDistance = (coords) => {
    let total = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const [lon1, lat1] = coords[i];
      const [lon2, lat2] = coords[i + 1];
      
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      total += R * c;
    }
    return total;
  };

  const getElevationStats = (elevations) => {
    if (!elevations || elevations.length === 0) return null;
    
    const max = Math.max(...elevations);
    const min = Math.min(...elevations);
    const gain = elevations.reduce((acc, ele, i) => {
      if (i === 0) return 0;
      const diff = ele - elevations[i - 1];
      return diff > 0 ? acc + diff : acc;
    }, 0);
    
    return { max, min, gain };
  };

  const convertToDMS = (decimal, type) => {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60).toFixed(2);
    
    let direction = '';
    if (type === 'lat') {
      direction = decimal >= 0 ? 'N' : 'S';
    } else {
      direction = decimal >= 0 ? 'E' : 'W';
    }
    
    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
          }
        `}
      </style>
      
      <div 
        ref={mapContainer} 
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Error Display */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#fee',
          color: '#c33',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '80%',
          zIndex: 1000
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading */}
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
      
      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        padding: '20px',
        width: '360px',
        zIndex: 10,
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600' }}>
          🗺️ GPX Route Viewer
        </h3>

        {/* Select from Project */}
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

        {/* Upload File */}
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
          📁 อัพโหลดไฟล์ GPX
          <input
            type="file"
            accept=".gpx"
            onChange={handleFileUpload}
            disabled={!mapLoaded || isPlaying}
            style={{ display: 'none' }}
          />
        </label>

        {/* Simulation Controls */}
        {gpxData && (
          <>
            <div style={{
              borderTop: '2px solid #eee',
              paddingTop: '15px',
              marginBottom: '15px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600' }}>
                🎬 การจำลองการเดินทาง
              </h4>

              {/* Play/Pause & Reset */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                  onClick={togglePlay}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    backgroundColor: isPlaying ? '#ff5722' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {isPlaying ? '⏸️ หยุด' : '▶️ เริ่ม'}
                </button>
                <button
                  onClick={resetSimulation}
                  disabled={isPlaying}
                  style={{
                    padding: '12px 20px',
                    fontSize: '16px',
                    backgroundColor: '#757575',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: isPlaying ? 0.5 : 1
                  }}
                >
                  🔄
                </button>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#666',
                  marginBottom: '5px'
                }}>
                  <span>ความคืบหน้า</span>
                  <span>{currentIndex + 1} / {gpxData.coordinates.length}</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${((currentIndex + 1) / gpxData.coordinates.length) * 100}%`,
                    height: '100%',
                    backgroundColor: '#4caf50',
                    transition: 'width 0.1s'
                  }}></div>
                </div>
              </div>

              {/* Speed Control */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  ⚡ ความเร็ว: {speed}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#999',
                  marginTop: '2px'
                }}>
                  <span>0.5x</span>
                  <span>5x</span>
                </div>
              </div>

              {/* Camera Mode */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  📹 มุมมองกล้อง:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCameraMode('follow')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '13px',
                      backgroundColor: cameraMode === 'follow' ? '#2196f3' : '#f5f5f5',
                      color: cameraMode === 'follow' ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: cameraMode === 'follow' ? '600' : '400'
                    }}
                  >
                    🎥 ติดตาม
                  </button>
                  <button
                    onClick={() => setCameraMode('bird')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '13px',
                      backgroundColor: cameraMode === 'bird' ? '#2196f3' : '#f5f5f5',
                      color: cameraMode === 'bird' ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: cameraMode === 'bird' ? '600' : '400'
                    }}
                  >
                    🦅 มุมสูง
                  </button>
                  <button
                    onClick={() => setCameraMode('free')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '13px',
                      backgroundColor: cameraMode === 'free' ? '#2196f3' : '#f5f5f5',
                      color: cameraMode === 'free' ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: cameraMode === 'free' ? '600' : '400'
                    }}
                  >
                    🔓 อิสระ
                  </button>
                </div>
              </div>

              {/* Trail Toggle */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  <input
                    type="checkbox"
                    checked={showTrail}
                    onChange={(e) => setShowTrail(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>🟢 แสดงเส้นทางที่ผ่านมา</span>
                </label>
              </div>
            </div>
          </>
        )}
        
        {/* Route Info */}
        {gpxData && (
          <div style={{
            borderTop: '1px solid #eee',
            paddingTop: '15px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600' }}>
              📊 ข้อมูลเส้นทาง
            </h4>
            <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#666' }}>จำนวนจุด:</span>
                <strong>{gpxData.coordinates.length.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#666' }}>ระยะทาง:</span>
                <strong>{calculateDistance(gpxData.coordinates).toFixed(2)} กม.</strong>
              </div>
              
              {gpxData.elevations && gpxData.elevations.length > 0 && (() => {
                const stats = getElevationStats(gpxData.elevations);
                return stats && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#666' }}>ระดับสูงสุด:</span>
                      <strong>{stats.max.toFixed(0)} ม.</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#666' }}>ระดับต่ำสุด:</span>
                      <strong>{stats.min.toFixed(0)} ม.</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}>ความสูงสะสม:</span>
                      <strong>{stats.gain.toFixed(0)} ม.</strong>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapboxGPXViewer;