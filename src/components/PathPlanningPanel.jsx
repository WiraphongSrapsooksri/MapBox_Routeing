// src/components/PathPlanningPanel.jsx
import React, { useState, useEffect } from 'react';
import '../styles/AppleDesignSystem.css';
import {
  PLANNING_PRESETS,
  DEFAULT_PLANNING_PARAMS,
  NDVI_SOURCES,
  SOIL_SOURCES,
  SOIL_PROPERTIES
} from '../services/pathPlanningApi';

const PathPlanningPanel = ({
  mode,
  isPathPlanningMode,
  onTogglePathPlanningMode,
  startPoint,
  goalPoint,
  onClearPoints,
  onPlanPath,
  isPlanning,
  pathStats,
  onShowRoute,
  plannedRoute,
  onSelectAlternativePath
}) => {
  const [plannerType, setPlannerType] = useState('astar');
  const [maxSlopeDegrees, setMaxSlopeDegrees] = useState(70);
  const [slopeWeight, setSlopeWeight] = useState(2);
  const [elevationWeight, setElevationWeight] = useState(0);
  const [useOsmRoads, setUseOsmRoads] = useState(true);
  const [maxWaypoints, setMaxWaypoints] = useState(1000);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [ndviSource, setNdviSource] = useState(DEFAULT_PLANNING_PARAMS.ndvi_source || 'sentinel2');
  const [ndviDateStart, setNdviDateStart] = useState(DEFAULT_PLANNING_PARAMS.ndvi_date_start || '2024-01-01');
  const [ndviDateEnd, setNdviDateEnd] = useState(DEFAULT_PLANNING_PARAMS.ndvi_date_end || '2024-12-31');
  const [ndviCloudCoverMax, setNdviCloudCoverMax] = useState(DEFAULT_PLANNING_PARAMS.ndvi_cloud_cover_max || 30);
  const [geeProjectId, setGeeProjectId] = useState(DEFAULT_PLANNING_PARAMS.gee_project_id || 'pro-gee-475208');

  const [soilSource, setSoilSource] = useState('synthetic');
  const [soilConsiderMoisture, setSoilConsiderMoisture] = useState(true);

  const [enableMultiPath, setEnableMultiPath] = useState(false);
  const [maxAlternativePaths, setMaxAlternativePaths] = useState(5);

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey);
    if (presetKey && PLANNING_PRESETS[presetKey]) {
      const preset = PLANNING_PRESETS[presetKey];
      setUseOsmRoads(preset.params.use_osm_roads);
      setSlopeWeight(preset.params.slope_weight);
      setMaxSlopeDegrees(preset.params.max_slope_degrees);

      if (preset.params.ndvi_source) {
        setNdviSource(preset.params.ndvi_source);
      }
      if (preset.params.ndvi_date_start) {
        setNdviDateStart(preset.params.ndvi_date_start);
      }
      if (preset.params.ndvi_date_end) {
        setNdviDateEnd(preset.params.ndvi_date_end);
      }
      if (preset.params.ndvi_cloud_cover_max !== undefined) {
        setNdviCloudCoverMax(preset.params.ndvi_cloud_cover_max);
      }
      if (preset.params.gee_project_id) {
        setGeeProjectId(preset.params.gee_project_id);
      }

      if (preset.params.soil_source) {
        setSoilSource(preset.params.soil_source);
      }
    }
  };

  const handlePlanPath = () => {
    if (!startPoint || !goalPoint) {
      alert('กรุณาเลือกจุดเริ่มต้นและจุดปลายทาง');
      return;
    }

    let params = {
      start: { lat: startPoint.lat, lon: startPoint.lng },
      goal: { lat: goalPoint.lat, lon: goalPoint.lng },
      planner_type: plannerType,
      max_slope_degrees: maxSlopeDegrees,
      slope_weight: slopeWeight,
      elevation_weight: elevationWeight,
      use_osm_roads: useOsmRoads,
      max_waypoints: maxWaypoints,
      output_formats: ['geojson', 'gpx'],

      ndvi_source: ndviSource,
      ...(ndviSource === 'sentinel2' && {
        ndvi_date_start: ndviDateStart,
        ndvi_date_end: ndviDateEnd,
        ndvi_cloud_cover_max: ndviCloudCoverMax,
        gee_project_id: geeProjectId
      }),

      soil_source: soilSource,
      soil_properties: ['clay', 'sand', 'silt'],
      soil_consider_moisture: soilConsiderMoisture,

      enable_multi_path: enableMultiPath,
      max_alternative_paths: maxAlternativePaths
    };

    if (selectedPreset && PLANNING_PRESETS[selectedPreset]) {
      const presetParams = PLANNING_PRESETS[selectedPreset].params;

      params = {
        ...params,
        ...presetParams,
        enable_multi_path: enableMultiPath,
        max_alternative_paths: maxAlternativePaths
      };
    }

    console.log('Planning request:', params);
    onPlanPath(params);
  };

  return (
    <div className="apple-card glass-panel animate-fade-in" style={{ marginBottom: 'var(--space-4)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-6)',
        paddingBottom: 'var(--space-4)',
        borderBottom: '1px solid var(--gray-200)'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--apple-blue) 0%, #0077ed 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: '0 4px 12px rgba(0, 113, 227, 0.3)'
        }}>
          🗺️
        </div>
        <div style={{ flex: 1 }}>
          <h3 className="apple-heading-sm" style={{ margin: 0, marginBottom: '4px' }}>
            วางแผนเส้นทาง
          </h3>
          <p className="apple-text-xs" style={{ margin: 0 }}>
            เลือกจุดเริ่มต้นและปลายทางบนแผนที่
          </p>
        </div>
      </div>

      {/* Toggle Planning Mode Button */}
      <button
        onClick={onTogglePathPlanningMode}
        className={`apple-button apple-button-full ${isPathPlanningMode ? 'apple-button-danger' : 'apple-button-primary'}`}
        style={{ marginBottom: 'var(--space-5)' }}
      >
        {isPathPlanningMode ? '✕ ยกเลิกโหมดวางแผน' : '📍 เลือกจุดบนแผนที่'}
      </button>

      {/* Instructions - Active Mode */}
      {isPathPlanningMode && (
        <div className="apple-info-box apple-info-box-info" style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
            💡 วิธีใช้งาน
          </div>
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-relaxed)' }}>
            <li><kbd style={{
              padding: '2px 6px',
              background: 'var(--gray-100)',
              borderRadius: 'var(--radius-xs)',
              fontFamily: 'monospace',
              fontSize: '11px'
            }}>Shift</kbd> + <strong>คลิกขวา</strong> บนแผนที่</li>
            <li>เลือก <strong>ตั้งเป็นจุดเริ่มต้น (A)</strong> หรือ <strong>ตั้งเป็นจุดปลายทาง (B)</strong></li>
            <li>ปรับพารามิเตอร์ตามต้องการ</li>
            <li>กดปุ่ม "คำนวนเส้นทาง"</li>
          </ol>
        </div>
      )}

      {/* Instructions - Tips */}
      {!isPathPlanningMode && mode === 'planning' && (
        <div className="apple-info-box apple-info-box-warning" style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
            ⚡ เคล็ดลับ
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)' }}>
            • <kbd style={{
              padding: '2px 6px',
              background: 'rgba(255,149,0,0.1)',
              borderRadius: 'var(--radius-xs)',
              fontFamily: 'monospace'
            }}>Shift + คลิกขวา</kbd> → เลือกจุด A, B<br />
            • <kbd style={{
              padding: '2px 6px',
              background: 'rgba(255,149,0,0.1)',
              borderRadius: 'var(--radius-xs)',
              fontFamily: 'monospace'
            }}>Ctrl + คลิกขวา</kbd> → ดูข้อมูลพื้นที่
          </div>
        </div>
      )}

      {/* Points Display */}
      <div className="apple-section">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-3)'
        }}>
          <label className="apple-label" style={{ marginBottom: 0 }}>จุดที่เลือก</label>
          {(startPoint || goalPoint) && (
            <button
              onClick={onClearPoints}
              className="apple-button apple-button-sm"
              style={{
                background: 'var(--apple-red)',
                color: 'white'
              }}
            >
              🗑️ ล้าง
            </button>
          )}
        </div>

        <div style={{
          background: 'var(--gray-50)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--gray-200)'
        }}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-1)'
            }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--apple-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'var(--font-weight-bold)',
                boxShadow: '0 2px 4px rgba(48, 209, 88, 0.3)'
              }}>A</span>
              <span className="apple-label" style={{ marginBottom: 0 }}>จุดเริ่มต้น</span>
            </div>
            <div className="apple-text-sm" style={{
              marginLeft: '32px',
              fontFamily: 'monospace',
              color: startPoint ? 'var(--gray-700)' : 'var(--gray-400)'
            }}>
              {startPoint ?
                `${startPoint.lat.toFixed(6)}, ${startPoint.lng.toFixed(6)}` :
                'ยังไม่ได้เลือก'
              }
            </div>
          </div>

          <hr className="apple-divider" style={{ margin: 'var(--space-3) 0' }} />

          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-1)'
            }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--apple-red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'var(--font-weight-bold)',
                boxShadow: '0 2px 4px rgba(255, 59, 48, 0.3)'
              }}>B</span>
              <span className="apple-label" style={{ marginBottom: 0 }}>จุดปลายทาง</span>
            </div>
            <div className="apple-text-sm" style={{
              marginLeft: '32px',
              fontFamily: 'monospace',
              color: goalPoint ? 'var(--gray-700)' : 'var(--gray-400)'
            }}>
              {goalPoint ?
                `${goalPoint.lat.toFixed(6)}, ${goalPoint.lng.toFixed(6)}` :
                'ยังไม่ได้เลือก'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Preset Selection */}
      <div className="apple-section">
        <label className="apple-label">
          🎯 เลือก Preset
        </label>
        <select
          value={selectedPreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          disabled={isPlanning}
          className="apple-input apple-select"
        >
          <option value="">เลือก Preset (ไม่บังคับ)</option>
          {Object.entries(PLANNING_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.name} - {preset.description}
            </option>
          ))}
        </select>
      </div>

      {selectedPreset && PLANNING_PRESETS[selectedPreset] && (
        <div className="apple-info-box apple-info-box-info">
          <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>
            {PLANNING_PRESETS[selectedPreset].name}
          </div>
          <div className="apple-text-xs" style={{ marginTop: 'var(--space-1)' }}>
            {PLANNING_PRESETS[selectedPreset].description}
          </div>
        </div>
      )}

      {/* Planner Type */}
      <div className="apple-section">
        <label className="apple-label">
          ⚙️ อัลกอริทึม
        </label>
        <select
          value={plannerType}
          onChange={(e) => setPlannerType(e.target.value)}
          disabled={isPlanning}
          className="apple-input apple-select"
        >
          <option value="astar">A* (เร็ว, เหมาะกับการเดินทางทั่วไป)</option>
          <option value="hybrid_astar">Hybrid A* (ช้ากว่า, เหมาะกับยานพาหนะ)</option>
        </select>
      </div>

      {/* Basic Parameters */}
      <div className="apple-section">
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          cursor: 'pointer',
          fontSize: 'var(--font-size-base)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--gray-700)',
          marginBottom: 'var(--space-5)'
        }}>
          <input
            type="checkbox"
            checked={useOsmRoads}
            onChange={(e) => setUseOsmRoads(e.target.checked)}
            disabled={isPlanning}
            className="apple-checkbox"
          />
          <span>🛣️ ใช้ถนนจาก OpenStreetMap</span>
        </label>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <label className="apple-label">
            ⛰️ น้ำหนักความชัน: <span className="apple-badge apple-badge-blue">{slopeWeight}</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={slopeWeight}
            onChange={(e) => setSlopeWeight(parseFloat(e.target.value))}
            disabled={isPlanning}
            className="apple-slider"
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--gray-500)',
            marginTop: 'var(--space-1)'
          }}>
            <span>0 (ไม่สนใจ)</span>
            <span>10 (หลีกเลี่ยงมาก)</span>
          </div>
        </div>

        <div>
          <label className="apple-label">
            📐 ความชันสูงสุด: <span className="apple-badge apple-badge-orange">{maxSlopeDegrees}°</span>
          </label>
          <input
            type="range"
            min="10"
            max="90"
            step="5"
            value={maxSlopeDegrees}
            onChange={(e) => setMaxSlopeDegrees(parseInt(e.target.value))}
            disabled={isPlanning}
            className="apple-slider"
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--gray-500)',
            marginTop: 'var(--space-1)'
          }}>
            <span>10°</span>
            <span>90°</span>
          </div>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="apple-button apple-button-secondary apple-button-full"
        style={{ marginBottom: 'var(--space-5)' }}
      >
        {showAdvanced ? '▲ ซ่อนการตั้งค่าขั้นสูง' : '▼ แสดงการตั้งค่าขั้นสูง'}
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="animate-fade-in" style={{
          background: 'var(--gray-50)',
          padding: 'var(--space-5)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-5)',
          border: '1px solid var(--gray-200)'
        }}>
          <h4 className="apple-heading-sm" style={{ marginBottom: 'var(--space-5)' }}>
            ⚙️ การตั้งค่าขั้นสูง
          </h4>

          {/* NDVI Source */}
          <div className="apple-section">
            <label className="apple-label">
              🌱 แหล่งข้อมูล NDVI (พืชพรรณ)
            </label>
            <select
              value={ndviSource}
              onChange={(e) => setNdviSource(e.target.value)}
              disabled={isPlanning}
              className="apple-input apple-select"
            >
              {Object.entries(NDVI_SOURCES).map(([key, source]) => (
                <option key={key} value={key}>
                  {source.name} - {source.description}
                </option>
              ))}
            </select>
          </div>

          {ndviSource === 'sentinel2' && (
            <div className="apple-card-subtle" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
              <div className="apple-section-title">
                🛰️ Sentinel-2 Settings
              </div>

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="apple-label">📅 Date Range</label>
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  <div>
                    <div className="apple-text-xs" style={{ marginBottom: 'var(--space-1)' }}>
                      เริ่มต้น
                    </div>
                    <input
                      type="date"
                      value={ndviDateStart}
                      onChange={(e) => setNdviDateStart(e.target.value)}
                      disabled={isPlanning}
                      className="apple-input"
                    />
                  </div>
                  <div>
                    <div className="apple-text-xs" style={{ marginBottom: 'var(--space-1)' }}>
                      สิ้นสุด
                    </div>
                    <input
                      type="date"
                      value={ndviDateEnd}
                      onChange={(e) => setNdviDateEnd(e.target.value)}
                      disabled={isPlanning}
                      className="apple-input"
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="apple-label">
                  ☁️ Cloud Cover สูงสุด: <span className="apple-badge apple-badge-blue">{ndviCloudCoverMax}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={ndviCloudCoverMax}
                  onChange={(e) => setNdviCloudCoverMax(parseInt(e.target.value))}
                  disabled={isPlanning}
                  className="apple-slider"
                />
              </div>

              <div>
                <label className="apple-label">
                  🔑 GEE Project ID
                </label>
                <input
                  type="text"
                  value={geeProjectId}
                  onChange={(e) => setGeeProjectId(e.target.value)}
                  disabled={isPlanning}
                  placeholder="pro-gee-475208"
                  className="apple-input"
                />
              </div>
            </div>
          )}

          {/* Soil Source */}
          <div className="apple-section">
            <label className="apple-label">
              🪨 แหล่งข้อมูลดิน
            </label>
            <select
              value={soilSource}
              onChange={(e) => setSoilSource(e.target.value)}
              disabled={isPlanning}
              className="apple-input apple-select"
            >
              {Object.entries(SOIL_SOURCES).map(([key, source]) => (
                <option key={key} value={key}>
                  {source.name} - {source.description}
                </option>
              ))}
            </select>
          </div>

          {soilSource !== 'disabled' && (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-base)',
              marginBottom: 'var(--space-5)'
            }}>
              <input
                type="checkbox"
                checked={soilConsiderMoisture}
                onChange={(e) => setSoilConsiderMoisture(e.target.checked)}
                disabled={isPlanning}
                className="apple-checkbox"
              />
              <span>💧 พิจารณาความชื้นในดิน</span>
            </label>
          )}

          <hr className="apple-divider" />

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label className="apple-label">
              📏 น้ำหนักความสูง: <span className="apple-badge apple-badge-gray">{elevationWeight}</span>
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={elevationWeight}
              onChange={(e) => setElevationWeight(parseFloat(e.target.value))}
              disabled={isPlanning}
              className="apple-slider"
            />
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label className="apple-label">
              🎯 จำนวนจุดสูงสุด: <span className="apple-badge apple-badge-gray">{maxWaypoints}</span>
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={maxWaypoints}
              onChange={(e) => setMaxWaypoints(parseInt(e.target.value))}
              disabled={isPlanning}
              className="apple-input"
            />
          </div>

          <hr className="apple-divider" />

          {/* Multi-Path Planning */}
          <div className="apple-card-subtle" style={{ padding: 'var(--space-4)' }}>
            <div className="apple-section-title" style={{ marginBottom: 'var(--space-3)' }}>
              🔀 Multi-Path Planning
            </div>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-base)',
              marginBottom: 'var(--space-4)'
            }}>
              <input
                type="checkbox"
                checked={enableMultiPath}
                onChange={(e) => setEnableMultiPath(e.target.checked)}
                disabled={isPlanning}
                className="apple-checkbox"
              />
              <span>เปิดใช้งานการสร้างหลายเส้นทาง</span>
            </label>

            {enableMultiPath && (
              <div className="animate-fade-in">
                <label className="apple-label">
                  จำนวนเส้นทางสูงสุด: <span className="apple-badge apple-badge-blue">{maxAlternativePaths}</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={maxAlternativePaths}
                  onChange={(e) => setMaxAlternativePaths(parseInt(e.target.value))}
                  disabled={isPlanning}
                  className="apple-slider"
                />
                <div className="apple-info-box apple-info-box-info" style={{ marginTop: 'var(--space-3)' }}>
                  <div className="apple-text-xs">
                    ระบบจะสร้างเส้นทางด้วยกลยุทธ์ต่างๆ เช่น Balanced, Prefer Roads, Shortest, Easy Terrain และ Avoid Steep
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plan Button */}
      <button
        onClick={handlePlanPath}
        disabled={!startPoint || !goalPoint || isPlanning}
        className="apple-button apple-button-success apple-button-full apple-button-lg"
        style={{
          background: (!startPoint || !goalPoint || isPlanning)
            ? 'var(--gray-300)'
            : 'linear-gradient(135deg, var(--apple-green) 0%, #32d65a 100%)',
          boxShadow: (!startPoint || !goalPoint || isPlanning)
            ? 'none'
            : '0 4px 12px rgba(48, 209, 88, 0.3)'
        }}
      >
        {isPlanning ? (
          <>
            <span className="animate-pulse">⏳</span> กำลังคำนวน...
          </>
        ) : (
          <>🚀 คำนวนเส้นทาง</>
        )}
      </button>

      {/* Path Statistics */}
      {pathStats && (
        <div className="apple-card-subtle animate-fade-in" style={{
          marginTop: 'var(--space-5)',
          background: 'linear-gradient(135deg, rgba(48, 209, 88, 0.05) 0%, rgba(48, 209, 88, 0.1) 100%)',
          borderColor: 'var(--apple-green)'
        }}>
          <h4 className="apple-heading-sm" style={{
            marginBottom: 'var(--space-4)',
            color: 'var(--apple-green)'
          }}>
            📊 สถิติเส้นทาง
          </h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)'
          }}>
            {pathStats.distance && (
              <StatCard
                icon="📏"
                label="ระยะทาง"
                value={pathStats.distance.toFixed(2)}
                unit="กม."
              />
            )}
            {pathStats.waypoints && (
              <StatCard
                icon="📍"
                label="จำนวนจุด"
                value={pathStats.waypoints}
                unit="จุด"
              />
            )}
            {pathStats.elevation_gain !== undefined && (
              <StatCard
                icon="⛰️"
                label="ความสูงสูงสุด"
                value={pathStats.elevation_gain.toFixed(0)}
                unit="ม."
              />
            )}
            {pathStats.computation_time && (
              <StatCard
                icon="⏱️"
                label="เวลาคำนวน"
                value={pathStats.computation_time.toFixed(2)}
                unit="วินาที"
              />
            )}
          </div>

          {/* Terrain Info Section */}
          {pathStats.terrain_info && (
            <div>
              <hr className="apple-divider" />
              <h4 className="apple-section-title" style={{ marginBottom: 'var(--space-3)' }}>
                🗺️ ข้อมูลภูมิประเทศ
              </h4>

              {pathStats.terrain_info.has_ndvi && (
                <div className="apple-info-box apple-info-box-success" style={{ marginBottom: 'var(--space-2)' }}>
                  <div className="apple-label">🌱 NDVI (พืชพรรณ)</div>
                  <div className="apple-text-xs">
                    แหล่งข้อมูล: {pathStats.terrain_info.ndvi_source}
                    {pathStats.terrain_info.ndvi_stats && (
                      <>
                        <br />ค่าเฉลี่ย: {pathStats.terrain_info.ndvi_stats.mean.toFixed(3)}
                        <br />ช่วง: [{pathStats.terrain_info.ndvi_stats.min.toFixed(3)}, {pathStats.terrain_info.ndvi_stats.max.toFixed(3)}]
                      </>
                    )}
                  </div>
                </div>
              )}

              {pathStats.terrain_info.has_soil && (
                <div className="apple-info-box apple-info-box-warning" style={{ marginBottom: 'var(--space-2)' }}>
                  <div className="apple-label">🪨 Soil (ข้อมูลดิน)</div>
                  <div className="apple-text-xs">
                    แหล่งข้อมูล: {pathStats.terrain_info.soil_source}
                    <br />คุณสมบัติ: {pathStats.terrain_info.soil_properties?.join(', ')}
                    {pathStats.terrain_info.soil_types_count && (
                      <>
                        <br />ชนิดดิน: {pathStats.terrain_info.soil_types_count} ชนิด
                        {pathStats.terrain_info.dominant_soil_percentage && (
                          <> (ชนิดหลัก {pathStats.terrain_info.dominant_soil_percentage.toFixed(1)}%)</>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {pathStats.terrain_info.has_osm_roads !== undefined && (
                <div className={`apple-info-box ${pathStats.terrain_info.has_osm_roads ? 'apple-info-box-info' : 'apple-info-box-error'}`}>
                  <div className="apple-text-xs">
                    🛣️ OpenStreetMap: {pathStats.terrain_info.has_osm_roads ? 'มีข้อมูลถนน' : 'ไม่มีข้อมูลถนน'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper Component: Stat Card
const StatCard = ({ icon, label, value, unit }) => (
  <div style={{
    background: 'white',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--gray-200)'
  }}>
    <div className="apple-text-xs" style={{
      marginBottom: 'var(--space-1)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-1)'
    }}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
    <div style={{
      fontSize: 'var(--font-size-xl)',
      fontWeight: 'var(--font-weight-bold)',
      color: 'var(--gray-800)',
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-1)'
    }}>
      <span>{value}</span>
      <span className="apple-text-xs">{unit}</span>
    </div>
  </div>
);

export default PathPlanningPanel;
