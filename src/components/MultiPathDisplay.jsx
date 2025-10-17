// src/components/MultiPathDisplay.jsx
import React, { useState, useEffect } from 'react';
import '../styles/AppleDesignSystem.css';

/**
 * Component สำหรับแสดงและจัดการหลายเส้นทางพร้อมกัน
 * 
 * Features:
 * - แสดง/ซ่อนเส้นทางแต่ละเส้น (toggle visibility)
 * - เปรียบเทียบคะแนนและสถิติ
 * - เปลี่ยนสีเส้นทางอัตโนมัติ
 * - Highlight เส้นทางที่เลือก
 * - รองรับ Best Path + Alternative Paths
 */
const MultiPathDisplay = ({ 
  bestPath,           // ข้อมูลเส้นทางที่ดีที่สุด (statistics, path_geojson, etc.)
  alternativePaths,   // Array ของเส้นทางทางเลือก
  onPathSelect,       // Callback เมื่อเลือกเส้นทาง (path, pathId) => void
  onPathToggle,       // Callback เมื่อ toggle แสดง/ซ่อนเส้นทาง (pathId, isVisible) => void
  selectedPathId      // ID ของเส้นทางที่เลือกอยู่ ('best', 'alt_0', 'alt_1', ...)
}) => {
  const [visiblePaths, setVisiblePaths] = useState({});

  // Initialize visibility state
  useEffect(() => {
    const initialState = {
      best: true,
      ...Object.fromEntries(
        (alternativePaths || []).map((_, idx) => [`alt_${idx}`, true])
      )
    };
    setVisiblePaths(initialState);
  }, [alternativePaths]);

  // สีสำหรับแต่ละเส้นทาง
  const pathColors = [
    '#2196f3', // สีน้ำเงิน - Best path
    '#ff9800', // สีส้ม - Alt 1
    '#4caf50', // สีเขียว - Alt 2
    '#f44336', // สีแดง - Alt 3
    '#9c27b0', // สีม่วง - Alt 4
    '#00bcd4', // สีฟ้า - Alt 5
    '#ff5722', // สีส้มเข้ม - Alt 6
    '#607d8b', // สีเทา - Alt 7
  ];

  const handleTogglePath = (pathId) => {
    setVisiblePaths(prev => ({
      ...prev,
      [pathId]: !prev[pathId]
    }));
    onPathToggle?.(pathId, !visiblePaths[pathId]);
  };

  const handleSelectPath = (path, pathId) => {
    onPathSelect?.(path, pathId);
  };

  // Handle case where no paths are provided
  if (!bestPath && (!alternativePaths || alternativePaths.length === 0)) {
    return null;
  }

  const totalPaths = 1 + (alternativePaths?.length || 0);

  return (
    <div className="apple-card glass-panel animate-fade-in apple-scrollbar" style={{
      maxHeight: '600px',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-5)',
        paddingBottom: 'var(--space-4)',
        borderBottom: '1px solid var(--gray-200)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--apple-purple) 0%, #bf5af2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            boxShadow: '0 2px 8px rgba(191, 90, 242, 0.3)'
          }}>
            🔀
          </div>
          <div>
            <h3 className="apple-heading-sm" style={{ margin: 0 }}>
              เส้นทางทั้งหมด
            </h3>
            <p className="apple-text-xs" style={{ margin: 0 }}>
              {totalPaths} เส้นทาง
            </p>
          </div>
        </div>

        {/* Toggle All Button */}
        <button
          onClick={() => {
            const allVisible = Object.values(visiblePaths).every(v => v);
            const newState = Object.keys(visiblePaths).reduce((acc, key) => {
              acc[key] = !allVisible;
              return acc;
            }, {});
            setVisiblePaths(newState);

            // Notify parent
            Object.keys(newState).forEach(pathId => {
              onPathToggle?.(pathId, newState[pathId]);
            });
          }}
          className="apple-button apple-button-sm apple-button-secondary"
        >
          {Object.values(visiblePaths).every(v => v) ? '👁️ ซ่อนทั้งหมด' : '👁️ แสดงทั้งหมด'}
        </button>
      </div>

      {/* Best Path */}
      {bestPath && (
        <PathCard
          path={bestPath}
          pathId="best"
          rank={1}
          label="เส้นทางที่ดีที่สุด ⭐"
          color={pathColors[0]}
          isVisible={visiblePaths.best}
          isSelected={selectedPathId === 'best'}
          onToggle={() => handleTogglePath('best')}
          onSelect={() => handleSelectPath(bestPath, 'best')}
        />
      )}

      {/* Alternative Paths */}
      {alternativePaths && alternativePaths.length > 0 && (
        <>
          <div style={{
            margin: 'var(--space-5) 0',
            padding: 'var(--space-2) 0',
            borderTop: '1px dashed var(--gray-300)'
          }}>
            <div className="apple-section-title" style={{ textAlign: 'center' }}>
              เส้นทางทางเลือก ({alternativePaths.length})
            </div>
          </div>

          {alternativePaths.map((altPath, idx) => (
            <PathCard
              key={idx}
              path={altPath}
              pathId={`alt_${idx}`}
              rank={altPath.rank}
              label={formatStrategyName(altPath.strategy)}
              color={pathColors[idx + 1]}
              isVisible={visiblePaths[`alt_${idx}`]}
              isSelected={selectedPathId === `alt_${idx}`}
              onToggle={() => handleTogglePath(`alt_${idx}`)}
              onSelect={() => handleSelectPath(altPath, `alt_${idx}`)}
            />
          ))}
        </>
      )}

      {/* Legend */}
      <div className="apple-info-box apple-info-box-info" style={{
        marginTop: 'var(--space-5)'
      }}>
        <div className="apple-label" style={{ marginBottom: 'var(--space-2)' }}>
          💡 วิธีใช้งาน
        </div>
        <ul className="apple-text-xs" style={{
          margin: 0,
          paddingLeft: '20px',
          lineHeight: 'var(--line-height-relaxed)'
        }}>
          <li>คลิกบนการ์ดเพื่อ<strong>เลือกเส้นทาง</strong></li>
          <li>ใช้สวิตช์เพื่อ<strong>แสดง/ซ่อน</strong>บนแผนที่</li>
          <li>เส้นที่เลือกจะ<strong>ไฮไลท์</strong>ด้วยขอบสี</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Card component สำหรับแสดงข้อมูลเส้นทาง
 */
const PathCard = ({ 
  path, 
  pathId, 
  rank, 
  label, 
  color, 
  isVisible, 
  isSelected,
  onToggle, 
  onSelect 
}) => {
  const stats = path.statistics || path;

  return (
    <div
      onClick={onSelect}
      style={{
        backgroundColor: isSelected ? `${color}15` : 'white',
        border: `2px solid ${isSelected ? color : '#e0e0e0'}`,
        borderRadius: '10px',
        padding: '14px',
        marginBottom: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        boxShadow: isSelected ? `0 4px 12px ${color}30` : '0 1px 3px rgba(0,0,0,0.1)'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.backgroundColor = `${color}08`;
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 4px 8px ${color}20`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#e0e0e0';
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: color,
            marginBottom: '3px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {label}
            {isSelected && (
              <span style={{
                fontSize: '10px',
                backgroundColor: color,
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                ✓ เลือกอยู่
              </span>
            )}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#999',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{
              backgroundColor: getRankColor(rank),
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600'
            }}>
              #{rank}
            </span>
            <span>อันดับ</span>
          </div>
        </div>

        {/* Visibility Toggle Switch */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            backgroundColor: isVisible ? color : '#ccc',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginLeft: '10px',
            flexShrink: 0
          }}
          title={isVisible ? 'คลิกเพื่อซ่อน' : 'คลิกเพื่อแสดง'}
        >
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: 'white',
            position: 'absolute',
            top: '2px',
            left: isVisible ? '22px' : '2px',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px'
          }}>
            {isVisible ? '👁️' : '🙈'}
          </div>
        </div>
      </div>

      {/* Color Indicator Bar */}
      <div style={{
        width: '100%',
        height: '5px',
        backgroundColor: color,
        borderRadius: '3px',
        marginBottom: '12px',
        opacity: isVisible ? 1 : 0.3,
        transition: 'opacity 0.3s',
        boxShadow: `0 2px 4px ${color}40`
      }} />

      {/* Main Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        fontSize: '11px',
        marginBottom: '12px'
      }}>
        <StatBox
          icon="📏"
          label="ระยะทาง"
          value={stats.total_distance_km?.toFixed(2) || 'N/A'}
          unit="กม."
          color={color}
        />
        <StatBox
          icon="⛰️"
          label="ขึ้นเขา"
          value={stats.total_ascent?.toFixed(0) || 'N/A'}
          unit="ม."
          color={color}
        />
        <StatBox
          icon="💯"
          label="คะแนนรวม"
          value={stats.overall_score?.toFixed(1) || 'N/A'}
          unit="/100"
          color={color}
          highlight
        />
        <StatBox
          icon="📐"
          label="ความชันสูงสุด"
          value={stats.max_slope?.toFixed(1) || 'N/A'}
          unit="°"
          color={color}
        />
      </div>

      {/* Detailed Score Bars */}
      {stats.distance_score !== undefined && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '10px',
          borderRadius: '6px',
          marginTop: '10px'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: '#666',
            marginBottom: '8px'
          }}>
            📊 คะแนนรายละเอียด
          </div>
          <ScoreBar 
            label="ระยะทาง" 
            score={stats.distance_score} 
            color={color}
            icon="📏"
          />
          <ScoreBar 
            label="ความสูง" 
            score={stats.elevation_score} 
            color={color}
            icon="⛰️"
          />
          <ScoreBar 
            label="ความปลอดภัย" 
            score={stats.safety_score} 
            color={color}
            icon="🛡️"
          />
          <ScoreBar 
            label="ภูมิประเทศ" 
            score={stats.terrain_score} 
            color={color}
            icon="🌲"
          />
        </div>
      )}

      {/* Terrain Composition (if available) */}
      {stats.terrain_composition && Object.keys(stats.terrain_composition).length > 0 && (
        <div style={{
          marginTop: '10px',
          fontSize: '10px',
          color: '#666',
          backgroundColor: '#f0f0f0',
          padding: '8px',
          borderRadius: '6px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            🗺️ องค์ประกอบภูมิประเทศ:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {Object.entries(stats.terrain_composition)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([type, pct], idx) => (
                <span 
                  key={idx}
                  style={{
                    backgroundColor: 'white',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: '500'
                  }}
                >
                  {formatTerrainType(type)}: {pct.toFixed(1)}%
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Stat Box Component
 */
const StatBox = ({ icon, label, value, unit, color, highlight }) => (
  <div style={{
    backgroundColor: highlight ? `${color}10` : '#f8f9fa',
    padding: '10px',
    borderRadius: '6px',
    border: highlight ? `1px solid ${color}30` : '1px solid #e0e0e0',
    transition: 'all 0.2s'
  }}>
    <div style={{
      fontSize: '10px',
      color: '#666',
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
    <div style={{
      fontSize: highlight ? '15px' : '14px',
      fontWeight: '700',
      color: highlight ? color : '#333',
      display: 'flex',
      alignItems: 'baseline',
      gap: '2px'
    }}>
      <span>{value}</span>
      <span style={{ fontSize: '10px', fontWeight: '500' }}>{unit}</span>
    </div>
  </div>
);

/**
 * Score Bar Component with Animation
 */
const ScoreBar = ({ label, score, color, icon }) => {
  return (
    <div style={{ marginBottom: '6px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10px',
        color: '#666',
        marginBottom: '3px',
        alignItems: 'center'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {icon && <span>{icon}</span>}
          {label}
        </span>
        <span style={{ 
          fontWeight: '600', 
          color: color,
          fontSize: '11px'
        }}>
          {score?.toFixed(0) || 0}/100
        </span>
      </div>
      <div style={{
        width: '100%',
        height: '6px',
        backgroundColor: '#e0e0e0',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${score || 0}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 0.5s ease',
          borderRadius: '3px',
          boxShadow: `0 0 8px ${color}60`
        }} />
      </div>
    </div>
  );
};

/**
 * Helper Functions
 */

// Format strategy name
const formatStrategyName = (strategy) => {
  if (!strategy) return 'Unknown';
  const formatted = strategy.replace(/_/g, ' ').toUpperCase();
  const icons = {
    'SHORTEST': '🎯',
    'PREFER ROADS': '🛣️',
    'AVOID FOREST': '🌲',
    'EASY TERRAIN': '🏞️',
    'AVOID STEEP': '⛰️',
    'PREFER LOW ELEVATION': '📉',
    'BALANCED': '⚖️'
  };
  return `${icons[formatted] || '🔹'} ${formatted}`;
};

// Format terrain type
const formatTerrainType = (type) => {
  const names = {
    'ROAD': '🛣️ ถนน',
    'GRASSLAND': '🌾 ทุ่งหญ้า',
    'FOREST_LIGHT': '🌳 ป่าเบา',
    'FOREST_DENSE': '🌲 ป่าหนา',
    'MOUNTAIN': '⛰️ ภูเขา',
    'SEA': '🌊 ทะเล',
    'RIVER': '💧 แม่น้ำ',
    'MARSH': '🌿 ที่ลุ่ม'
  };
  return names[type] || type;
};

// Get rank color
const getRankColor = (rank) => {
  if (rank === 1) return '#ffd700'; // Gold
  if (rank === 2) return '#c0c0c0'; // Silver
  if (rank === 3) return '#cd7f32'; // Bronze
  return '#888';
};

export default MultiPathDisplay;