// src/components/PathPlanningPanel.jsx
import React, { useState, useEffect } from 'react';
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

  // สไตล์หลัก
  const styles = {
    container: {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      padding: '24px',
      marginBottom: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans Thai", sans-serif'
    },
    heading: {
      margin: '0 0 24px 0',
      fontSize: '20px',
      fontWeight: '600',
      color: '#1a1a1a',
      borderBottom: '2px solid #e5e7eb',
      paddingBottom: '12px',
      letterSpacing: '-0.02em'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#374151'
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: '6px',
      border: '1px solid #d1d5db',
      fontSize: '14px',
      backgroundColor: '#ffffff',
      color: '#1f2937',
      transition: 'border-color 0.2s, box-shadow 0.2s'
    },
    button: {
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    infoBox: {
      padding: '14px',
      borderRadius: '6px',
      fontSize: '13px',
      lineHeight: '1.6',
      marginBottom: '16px'
    },
    section: {
      marginBottom: '20px'
    },
    divider: {
      borderTop: '1px solid #e5e7eb',
      margin: '20px 0'
    }
  };

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
    <div style={styles.container}>
      <h3 style={styles.heading}>
        วางแผนเส้นทาง
      </h3>

      {/* Toggle Planning Mode Button */}
      <button
        onClick={onTogglePathPlanningMode}
        style={{
          ...styles.button,
          width: '100%',
          backgroundColor: isPathPlanningMode ? '#ef4444' : '#3b82f6',
          color: 'white',
          marginBottom: '20px'
        }}
      >
        {isPathPlanningMode ? 'ยกเลิกโหมดวางแผน' : 'เลือกจุดบนแผนที่'}
      </button>

      {/* Instructions - Active Mode */}
      {isPathPlanningMode && (
        <div style={{
          ...styles.infoBox,
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1e40af' }}>วิธีใช้</div>
          <ol style={{ margin: '0', paddingLeft: '20px', color: '#1e3a8a' }}>
            <li style={{ marginBottom: '4px' }}><strong>Shift + คลิกขวา</strong> บนแผนที่</li>
            <li style={{ marginBottom: '4px' }}>เลือก <strong>ตั้งเป็นจุดเริ่มต้น (A)</strong> หรือ <strong>ตั้งเป็นจุดปลายทาง (B)</strong></li>
            <li style={{ marginBottom: '4px' }}>ปรับพารามิเตอร์ตามต้องการ</li>
            <li>กดปุ่ม "คำนวนเส้นทาง"</li>
          </ol>
        </div>
      )}

      {/* Instructions - Tips */}
      {!isPathPlanningMode && mode === 'planning' && (
        <div style={{
          ...styles.infoBox,
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '6px', color: '#92400e' }}>เคล็ดลับ</div>
          <div style={{ color: '#78350f' }}>
            • <strong>Shift + คลิกขวา</strong> → เลือกจุด A, B<br />
            • <strong>Ctrl + คลิกขวา</strong> → ดูข้อมูลพื้นที่
          </div>
        </div>
      )}

      {/* Points Display */}
      <div style={styles.section}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <span style={{ ...styles.label, marginBottom: '0' }}>จุดที่เลือก</span>
          {(startPoint || goalPoint) && (
            <button
              onClick={onClearPoints}
              style={{
                ...styles.button,
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: '#ef4444',
                color: 'white'
              }}
            >
              ล้าง
            </button>
          )}
        </div>

        <div style={{
          backgroundColor: '#f9fafb',
          padding: '14px',
          borderRadius: '6px',
          fontSize: '13px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontWeight: '600', color: '#059669', marginBottom: '4px' }}>
              จุดเริ่มต้น (A)
            </div>
            <div style={{ marginLeft: '12px', color: '#6b7280', fontSize: '12px' }}>
              {startPoint ?
                `${startPoint.lat.toFixed(6)}, ${startPoint.lng.toFixed(6)}` :
                'ยังไม่ได้เลือก'
              }
            </div>
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
              จุดปลายทาง (B)
            </div>
            <div style={{ marginLeft: '12px', color: '#6b7280', fontSize: '12px' }}>
              {goalPoint ?
                `${goalPoint.lat.toFixed(6)}, ${goalPoint.lng.toFixed(6)}` :
                'ยังไม่ได้เลือก'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Preset Selection */}
      <div style={styles.section}>
        <label style={styles.label}>
          เลือก Preset
        </label>
        <select
          value={selectedPreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          disabled={isPlanning}
          style={{
            ...styles.input,
            cursor: 'pointer'
          }}
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
        <div style={{
          ...styles.infoBox,
          backgroundColor: '#dbeafe',
          border: '1px solid #93c5fd',
          marginTop: '-8px'
        }}>
          <strong style={{ color: '#1e40af' }}>{PLANNING_PRESETS[selectedPreset].name}</strong>
          <div style={{ color: '#1e3a8a', fontSize: '12px', marginTop: '4px' }}>
            {PLANNING_PRESETS[selectedPreset].description}
          </div>
        </div>
      )}

      {/* Planner Type */}
      <div style={styles.section}>
        <label style={styles.label}>
          อัลกอริทึม
        </label>
        <select
          value={plannerType}
          onChange={(e) => setPlannerType(e.target.value)}
          disabled={isPlanning}
          style={{
            ...styles.input,
            cursor: 'pointer'
          }}
        >
          <option value="astar">A* (เร็ว, เหมาะกับการเดินทางทั่วไป)</option>
          <option value="hybrid_astar">Hybrid A* (ช้ากว่า, เหมาะกับยานพาหนะ)</option>
        </select>
      </div>

      {/* Basic Parameters */}
      <div style={styles.section}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '20px',
          color: '#374151'
        }}>
          <input
            type="checkbox"
            checked={useOsmRoads}
            onChange={(e) => setUseOsmRoads(e.target.checked)}
            disabled={isPlanning}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
          />
          <span>ใช้ถนนจาก OpenStreetMap</span>
        </label>

        <div style={{ marginBottom: '20px' }}>
          <label style={styles.label}>
            น้ำหนักความชัน: {slopeWeight}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={slopeWeight}
            onChange={(e) => setSlopeWeight(parseFloat(e.target.value))}
            disabled={isPlanning}
            style={{ width: '100%', accentColor: '#3b82f6' }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#9ca3af',
            marginTop: '4px'
          }}>
            <span>0 (ไม่สนใจ)</span>
            <span>10 (หลีกเลี่ยงมาก)</span>
          </div>
        </div>

        <div>
          <label style={styles.label}>
            ความชันสูงสุด: {maxSlopeDegrees}°
          </label>
          <input
            type="range"
            min="10"
            max="90"
            step="5"
            value={maxSlopeDegrees}
            onChange={(e) => setMaxSlopeDegrees(parseInt(e.target.value))}
            disabled={isPlanning}
            style={{ width: '100%', accentColor: '#3b82f6' }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#9ca3af',
            marginTop: '4px'
          }}>
            <span>10°</span>
            <span>90°</span>
          </div>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          ...styles.button,
          width: '100%',
          backgroundColor: '#f3f4f6',
          color: '#374151',
          border: '1px solid #d1d5db',
          marginBottom: '20px'
        }}
      >
        {showAdvanced ? '▲ ซ่อนการตั้งค่าขั้นสูง' : '▼ แสดงการตั้งค่าขั้นสูง'}
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '20px',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{
            margin: '0 0 20px 0',
            fontSize: '15px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            การตั้งค่าขั้นสูง
          </h4>

          {/* NDVI Source */}
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>
              แหล่งข้อมูล NDVI (พืชพรรณ)
            </label>
            <select
              value={ndviSource}
              onChange={(e) => setNdviSource(e.target.value)}
              disabled={isPlanning}
              style={{
                ...styles.input,
                cursor: 'pointer'
              }}
            >
              {Object.entries(NDVI_SOURCES).map(([key, source]) => (
                <option key={key} value={key}>
                  {source.name} - {source.description}
                </option>
              ))}
            </select>
          </div>

          {ndviSource === 'sentinel2' && (
            <div style={{
              backgroundColor: '#d1fae5',
              padding: '14px',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #a7f3d0'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '14px',
                color: '#065f46'
              }}>
                Sentinel-2 Settings
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#065f46'
                }}>
                  Date Range
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#065f46', marginBottom: '4px', fontWeight: '500' }}>
                      เริ่มต้น
                    </div>
                    <input
                      type="date"
                      value={ndviDateStart}
                      onChange={(e) => setNdviDateStart(e.target.value)}
                      disabled={isPlanning}
                      style={{
                        width: '90%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#065f46', marginBottom: '4px', fontWeight: '500' }}>
                      สิ้นสุด
                    </div>
                    <input
                      type="date"
                      value={ndviDateEnd}
                      onChange={(e) => setNdviDateEnd(e.target.value)}
                      disabled={isPlanning}
                      style={{
                        width: '90%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#065f46'
                }}>
                  Cloud Cover สูงสุด: {ndviCloudCoverMax}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={ndviCloudCoverMax}
                  onChange={(e) => setNdviCloudCoverMax(parseInt(e.target.value))}
                  disabled={isPlanning}
                  style={{ width: '100%', accentColor: '#059669' }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#065f46'
                }}>
                  GEE Project ID
                </label>
                <input
                  type="text"
                  value={geeProjectId}
                  onChange={(e) => setGeeProjectId(e.target.value)}
                  disabled={isPlanning}
                  placeholder="pro-gee-475208"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
          )}

          {/* Soil Source */}
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>
              แหล่งข้อมูลดิน
            </label>
            <select
              value={soilSource}
              onChange={(e) => setSoilSource(e.target.value)}
              disabled={isPlanning}
              style={{
                ...styles.input,
                cursor: 'pointer'
              }}
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
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '20px',
              color: '#374151'
            }}>
              <input
                type="checkbox"
                checked={soilConsiderMoisture}
                onChange={(e) => setSoilConsiderMoisture(e.target.checked)}
                disabled={isPlanning}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
              />
              <span>พิจารณาความชื้นในดิน</span>
            </label>
          )}

          <div style={styles.divider}></div>

          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>
              น้ำหนักความสูง: {elevationWeight}
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={elevationWeight}
              onChange={(e) => setElevationWeight(parseFloat(e.target.value))}
              disabled={isPlanning}
              style={{ width: '100%', accentColor: '#3b82f6' }}
            />
          </div>

          <div style={{ marginBottom: '20px',width:"90%" }}>
            <label style={styles.label}>
              จำนวนจุดสูงสุด: {maxWaypoints}
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={maxWaypoints}
              onChange={(e) => setMaxWaypoints(parseInt(e.target.value))}
              disabled={isPlanning}
              style={styles.input}
            />
          </div>

          <div style={styles.divider}></div>

          {/* Multi-Path Planning */}
          <div style={{
            backgroundColor: '#fef3c7',
            padding: '14px',
            borderRadius: '6px',
            border: '1px solid #fde68a'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              color: '#92400e'
            }}>
              Multi-Path Planning
            </div>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '14px',
              color: '#78350f'
            }}>
              <input
                type="checkbox"
                checked={enableMultiPath}
                onChange={(e) => setEnableMultiPath(e.target.checked)}
                disabled={isPlanning}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#f59e0b' }}
              />
              <span>เปิดใช้งานการสร้างหลายเส้นทาง</span>
            </label>

            {enableMultiPath && (
              <div style={{
                backgroundColor: '#ffffff',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '13px',
                border: '1px solid #fde68a'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: '#78350f'
                  }}>
                    จำนวนเส้นทางสูงสุด: {maxAlternativePaths}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="1"
                    value={maxAlternativePaths}
                    onChange={(e) => setMaxAlternativePaths(parseInt(e.target.value))}
                    disabled={isPlanning}
                    style={{ width: '100%', accentColor: '#f59e0b' }}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: '#9ca3af',
                    marginTop: '4px'
                  }}>
                    <span>2 เส้นทาง</span>
                    <span>10 เส้นทาง</span>
                  </div>
                </div>

                <div style={{
                  fontSize: '12px',
                  color: '#78350f',
                  lineHeight: '1.5',
                  backgroundColor: '#fffbeb',
                  padding: '10px',
                  borderRadius: '4px'
                }}>
                  ระบบจะสร้างเส้นทางด้วยกลยุทธ์ต่างๆ เช่น Balanced, Prefer Roads, Shortest, Easy Terrain และ Avoid Steep
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
        style={{
          ...styles.button,
          width: '100%',
          padding: '12px 16px',
          fontSize: '15px',
          fontWeight: '600',
          backgroundColor: (!startPoint || !goalPoint || isPlanning) ? '#d1d5db' : '#10b981',
          color: 'white',
          cursor: (!startPoint || !goalPoint || isPlanning) ? 'not-allowed' : 'pointer'
        }}
      >
        {isPlanning ? 'กำลังคำนวน...' : 'คำนวนเส้นทาง'}
      </button>

      {/* Path Statistics */}
      {pathStats && (
        <div style={{
          marginTop: '20px',
          backgroundColor: '#d1fae5',
          padding: '16px',
          borderRadius: '6px',
          border: '1px solid #a7f3d0'
        }}>
          <h4 style={{
            margin: '0 0 14px 0',
            fontSize: '15px',
            fontWeight: '600',
            color: '#065f46'
          }}>
            สถิติเส้นทาง
          </h4>
          <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#047857' }}>
            {pathStats.distance && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>ระยะทาง</span>
                <strong>{pathStats.distance.toFixed(2)} กม.</strong>
              </div>
            )}
            {pathStats.waypoints && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>จำนวนจุด</span>
                <strong>{pathStats.waypoints}</strong>
              </div>
            )}
            {pathStats.elevation_gain !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>ความสูงสูงสุด</span>
                <strong>{pathStats.elevation_gain.toFixed(0)} ม.</strong>
              </div>
            )}
            {pathStats.computation_time && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>เวลาคำนวน</span>
                <strong>{pathStats.computation_time.toFixed(2)} วินาที</strong>
              </div>
            )}
          </div>

          {/* Terrain Info Section */}
          {pathStats.terrain_info && (
            <div style={{
              marginTop: '14px',
              paddingTop: '14px',
              borderTop: '1px solid #a7f3d0'
            }}>
              <h4 style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: '#065f46'
              }}>
                ข้อมูลภูมิประเทศ
              </h4>
              <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                {pathStats.terrain_info.has_ndvi ? (
                  <div style={{
                    backgroundColor: '#ecfdf5',
                    padding: '10px',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    border: '1px solid #a7f3d0'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#065f46' }}>
                      NDVI (พืชพรรณ)
                    </div>
                    <div style={{ fontSize: '11px', color: '#047857' }}>
                      แหล่งข้อมูล: {pathStats.terrain_info.ndvi_source}
                      {pathStats.terrain_info.ndvi_stats && (
                        <>
                          <br />ค่าเฉลี่ย: {pathStats.terrain_info.ndvi_stats.mean.toFixed(3)}
                          <br />ช่วง: [{pathStats.terrain_info.ndvi_stats.min.toFixed(3)}, {pathStats.terrain_info.ndvi_stats.max.toFixed(3)}]
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#f9fafb',
                    padding: '10px',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    fontSize: '11px',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb'
                  }}>
                    NDVI: ไม่ได้ใช้งาน
                  </div>
                )}

                {pathStats.terrain_info.has_soil ? (
                  <div style={{
                    backgroundColor: '#fef3c7',
                    padding: '10px',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    border: '1px solid #fde68a'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#92400e' }}>
                      Soil (ข้อมูลดิน)
                    </div>
                    <div style={{ fontSize: '11px', color: '#78350f' }}>
                      แหล่งข้อมูล: {pathStats.terrain_info.soil_source}
                      <br />คุณสมบัติ: {pathStats.terrain_info.soil_properties?.join(', ')}
                      {pathStats.terrain_info.soil_types_count && (
                        <>
                          <br />ชนิดดิน: {pathStats.terrain_info.soil_types_count} ชนิด
                          {pathStats.terrain_info.dominant_soil_percentage && (
                            <> (ชนิดหลัก {pathStats.terrain_info.dominant_soil_percentage.toFixed(1)}%)
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#f9fafb',
                    padding: '10px',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    fontSize: '11px',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb'
                  }}>
                    Soil: ไม่ได้ใช้งาน
                  </div>
                )}

                {pathStats.terrain_info.has_osm_roads !== undefined && (
                  <div style={{
                    backgroundColor: pathStats.terrain_info.has_osm_roads ? '#dbeafe' : '#f9fafb',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: pathStats.terrain_info.has_osm_roads ? '#1e40af' : '#6b7280',
                    border: pathStats.terrain_info.has_osm_roads ? '1px solid #93c5fd' : '1px solid #e5e7eb'
                  }}>
                    OpenStreetMap: {pathStats.terrain_info.has_osm_roads ? 'มีข้อมูลถนน' : 'ไม่มีข้อมูลถนน'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PathPlanningPanel;
