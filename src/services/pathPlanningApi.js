// src/services/pathPlanningApi.js

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

/**
 * Plan a path from start to goal using terrain data
 * @param {Object} params - Planning parameters
 * @returns {Promise<Object>} - Response with path data
 */
export const planPath = async (params) => {
  try {
    const response = await fetch(`${API_BASE_URL}/plan`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Extract error message
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          // Pydantic validation errors
          errorMessage = errorData.detail
            .map(err => `${err.loc.join('.')}: ${err.msg}`)
            .join(', ');
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling path planning API:', error);
    throw error;
  }
};

/**
 * Default planning parameters
 * ✅ เปลี่ยนเป็นใช้ Sentinel-2 และเพิ่ม GEE project ID
 */
export const DEFAULT_PLANNING_PARAMS = {
  planner_type: 'astar',
  max_slope_degrees: 70,
  slope_weight: 2,
  elevation_weight: 1.1,
  use_osm_roads: true,

  // ✅ NDVI Settings - เปลี่ยนเป็น sentinel2 และใช้ปี 2024
  ndvi_source: 'sentinel2',  // เปลี่ยนจาก 'synthetic' เป็น 'sentinel2'
  ndvi_date_start: '2024-01-01',  // ✅ เปลี่ยนเป็น 2024 (มีข้อมูลจริง)
  ndvi_date_end: '2024-12-31',
  ndvi_cloud_cover_max: 30,
  gee_project_id: 'pro-gee-475208',  // ✅ เพิ่ม GEE Project ID

  // ✅ Soil Settings - ยังใช้ synthetic (เพราะ SoilGrids ต้อง API)
  soil_source: 'synthetic',  // เปลี่ยนเป็น 'soilgrids' เมื่อ implement API
  soil_properties: ['clay', 'sand', 'silt'],
  soil_consider_moisture: true,

  // ✅ Multi-path Settings
  enable_multi_path: false,
  max_alternative_paths: 5,

  max_waypoints: 1000,
  output_formats: ['geojson', 'gpx']
};

/**
 * NDVI Source Options
 */
export const NDVI_SOURCES = {
  disabled: { name: 'ปิดใช้งาน', description: 'ไม่ใช้ข้อมูล NDVI' },
  synthetic: { name: 'Synthetic', description: 'ข้อมูลจำลอง (สำหรับทดสอบ)' },
  sentinel2: { name: 'Sentinel-2 ⭐', description: 'ข้อมูลจริงจากดาวเทียม (ต้องมี GEE API)' },
  file: { name: 'File', description: 'โหลดจากไฟล์ GeoTIFF' }
};

/**
 * Soil Source Options
 */
export const SOIL_SOURCES = {
  disabled: { name: 'ปิดใช้งาน', description: 'ไม่ใช้ข้อมูลดิน' },
  synthetic: { name: 'Synthetic', description: 'ข้อมูลดินจำลอง (สำหรับทดสอบ)' },
  soilgrids: { name: 'SoilGrids ⭐', description: 'ข้อมูลจริงจาก ISRIC SoilGrids (250m)' },
  file: { name: 'File', description: 'โหลดจากไฟล์ local' }
};

/**
 * Soil Properties Options
 */
export const SOIL_PROPERTIES = {
  clay: { name: 'Clay (ดินเหนียว)', description: 'เปอร์เซ็นต์ของดินเหนียว' },
  sand: { name: 'Sand (ทราย)', description: 'เปอร์เซ็นต์ของทราย' },
  silt: { name: 'Silt (ดินตะกอน)', description: 'เปอร์เซ็นต์ของดินตะกอน' },
  moisture: { name: 'Moisture (ความชื้น)', description: 'ความชื้นในดิน' }
};

/**
 * Preset configurations
 * ✅ อัปเดต presets ให้ใช้ Sentinel-2 และปี 2024
 */
export const PLANNING_PRESETS = {
  // ✅ Backend-supported presets only
  prefer_roads: {
    name: 'ชอบใช้ถนน',
    description: 'เน้นการใช้เส้นทางถนนที่มีอยู่',
    params: {
      preset: 'prefer_roads',  // ✅ ส่ง preset name ไปให้ backend
      use_osm_roads: true,
      slope_weight: 2,
      max_slope_degrees: 70,
      ndvi_source: 'sentinel2',
      ndvi_date_start: '2024-01-01',  // ✅ เปลี่ยนเป็น 2024
      ndvi_date_end: '2024-12-31',
      ndvi_cloud_cover_max: 30,
      gee_project_id: 'pro-gee-475208',
      soil_source: 'synthetic',
      soil_consider_moisture: true
    }
  },
  avoid_forest: {
    name: 'หลีกเลี่ยงป่า',
    description: 'หลีกเลี่ยงพื้นที่ป่าไม้',
    params: {
      preset: 'avoid_forest',  // ✅ ส่ง preset name
      use_osm_roads: true,
      slope_weight: 2,
      max_slope_degrees: 70,
      ndvi_source: 'sentinel2',
      ndvi_date_start: '2024-01-01',  // ✅ เปลี่ยนเป็น 2024
      ndvi_date_end: '2024-12-31',
      ndvi_cloud_cover_max: 30,
      gee_project_id: 'pro-gee-475208',
      soil_source: 'synthetic',
      soil_consider_moisture: true
    }
  },
  shortest_path: {
    name: 'เส้นทางสั้นสุด',
    description: 'เส้นทางที่สั้นที่สุด',
    params: {
      preset: 'shortest_path',  // ✅ ส่ง preset name
      use_osm_roads: false,
      slope_weight: 1,
      max_slope_degrees: 90,
      ndvi_source: 'disabled',
      soil_source: 'disabled'
    }
  },
  easy_terrain: {
    name: 'ภูมิประเทศง่าย',
    description: 'หลีกเลี่ยงความชันและพื้นที่ยาก',
    params: {
      preset: 'easy_terrain',  // ✅ ส่ง preset name
      use_osm_roads: true,
      slope_weight: 3,
      max_slope_degrees: 30,
      ndvi_source: 'sentinel2',
      ndvi_date_start: '2024-01-01',  // ✅ เปลี่ยนเป็น 2024
      ndvi_date_end: '2024-12-31',
      ndvi_cloud_cover_max: 30,
      gee_project_id: 'pro-gee-475208',
      soil_source: 'synthetic',
      soil_consider_moisture: true
    }
  },

  // ✅ Custom preset (no preset name sent, use custom parameters)
  custom: {
    name: 'กำหนดเอง',
    description: 'ปรับแต่งพารามิเตอร์ด้วยตัวเอง',
    params: {
      preset: 'custom',
      use_osm_roads: true,
      slope_weight: 2,
      max_slope_degrees: 70,
      ndvi_source: 'sentinel2',
      ndvi_date_start: '2024-01-01',  // ✅ เปลี่ยนเป็น 2024
      ndvi_date_end: '2024-12-31',
      ndvi_cloud_cover_max: 30,
      gee_project_id: 'pro-gee-475208',
      soil_source: 'synthetic',
      soil_properties: ['clay', 'sand', 'silt'],
      soil_consider_moisture: true
    }
  },

  // ✅ Multi-Path Planning (ไม่ใช้ preset, ใช้ enable_multi_path แทน)
  multi_path: {
    name: '🔀 หลายเส้นทาง',
    description: 'สร้างหลายเส้นทางพร้อมเปรียบเทียบ',
    params: {
      // ไม่ส่ง preset, ใช้ custom parameters + enable_multi_path
      use_osm_roads: true,
      slope_weight: 2,
      elevation_weight: 1.1,
      max_slope_degrees: 70,
      ndvi_source: 'sentinel2',
      ndvi_date_start: '2024-01-01',  // ✅ เปลี่ยนเป็น 2024
      ndvi_date_end: '2024-12-31',
      ndvi_cloud_cover_max: 30,
      gee_project_id: 'pro-gee-475208',
      soil_source: 'synthetic',
      soil_properties: ['clay', 'sand', 'silt'],
      soil_consider_moisture: true,
      enable_multi_path: true,
      max_alternative_paths: 5
    }
  }
};

/**
 * ✅ Helper function: สร้าง request body พร้อม GEE project ID
 */
export const buildPlanningRequest = (start, goal, preset = 'prefer_roads', customParams = {}) => {
  const presetParams = PLANNING_PRESETS[preset]?.params || DEFAULT_PLANNING_PARAMS;
  
  return {
    start,
    goal,
    ...presetParams,
    ...customParams,
    // ✅ ตรวจสอบว่าถ้าใช้ sentinel2 ต้องมี gee_project_id
    ...(presetParams.ndvi_source === 'sentinel2' && !customParams.gee_project_id && {
      gee_project_id: 'pro-gee-475208'
    })
  };
};