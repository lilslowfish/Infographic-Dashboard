/**
 * Doodle Weather - Core JavaScript Logic
 * Powered by Open-Meteo & MET Norway APIs
 */

// DOM Elements
const citySearchInput = document.getElementById('city-search');
const searchSpinner = document.getElementById('search-spinner');
const clearSearchBtn = document.getElementById('clear-search');
const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
const autocompleteList = document.getElementById('autocomplete-list');
const errorBox = document.getElementById('error-box');
const errorMessage = document.getElementById('error-message');
const skeletonDashboard = document.getElementById('skeleton-dashboard');
const weatherDashboard = document.getElementById('weather-dashboard');
const cityNameEl = document.getElementById('city-name');
const countryNameEl = document.getElementById('country-name');
const coordinatesEl = document.getElementById('coordinates');
const forecastContainer = document.getElementById('forecast-container');

// Slider & Dialog Elements
const slidePrevBtn = document.getElementById('slide-prev-btn');
const slideNextBtn = document.getElementById('slide-next-btn');
const hourlyDialog = document.getElementById('hourly-dialog');
const closeHourlyBtn = document.getElementById('close-hourly-btn');
const hourlyTitle = document.getElementById('hourly-title');
const hourlyDetailsGrid = document.getElementById('hourly-details-grid');
const hourlyChartSvg = document.getElementById('hourly-chart-svg');
const chartYLabel = document.getElementById('chart-y-label');
const chartTabBtns = document.querySelectorAll('.chart-tab-btn');

// Settings Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsDialog = document.getElementById('settings-dialog');
const settingsForm = document.getElementById('settings-form');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
const settingsLangSelect = document.getElementById('settings-lang');

// Static UI translation targets
const appTitleEl = document.getElementById('app-title');
const appSubtitleEl = document.getElementById('app-subtitle');
const settingsTitleEl = document.getElementById('settings-title');
const labelLangEl = document.getElementById('label-lang');
const labelUnitsEl = document.getElementById('label-units');
const labelMetricValEl = document.getElementById('label-metric-val');
const labelImperialValEl = document.getElementById('label-imperial-val');
const saveSettingsBtn = document.getElementById('save-settings-btn');

// Source status elements
const sourceStatusContainer = document.getElementById('source-status');
const openmeteoStatusEl = document.getElementById('openmeteo-status');
const metnorwayStatusEl = document.getElementById('metnorway-status');
const crossrefSummaryEl = document.getElementById('crossref-summary');

// State Variables
let selectedCity = null;
let mergedForecast = null; // Consolidated 7-day forecast
let hourlyForecastData = null; // Hourly weather details
let activeHourlyDayIndex = 0; // Currently selected day index for modal
let activeHourlyMetric = 'temp'; // Active tab metric: 'temp', 'precip', 'wind', 'uv'
let currentSlideIndex = 0; // Active slide step in carousel
let autocompleteItems = [];
let activeItemIndex = -1;

// Default Settings
let settings = {
  lang: 'en',
  units: 'metric'  // 'metric' or 'imperial'
};

// Translations Dictionary
const TRANSLATIONS = {
  en: {
    title: "Doodle Weather",
    subtitle: "A hand-drawn 7-day weather & air quality forecast",
    searchPlaceholder: "Type a city name here...",
    connecting: "Connecting to weather server...",
    aggregated: "Success: Weather updated",
    omOnly: "Success: Weather updated",
    allDown: "Failed to fetch weather. Please check connection.",
    today: "Today",
    tomorrow: "Tomorrow",
    windSpeed: "Wind Speed",
    precipitation: "Precipitation",
    low: "Low",
    save: "Save",
    cancel: "Cancel",
    langLabel: "Language:",
    unitsSettingLabel: "Unit System:",
    metricLabel: "Metric (°C, km/h)",
    imperialLabel: "Imperial (°F, mph)",
    preferences: "Preferences",
    fetchingOM: "Fetching weather...",
    okOM: "Weather loaded",
    errorOM: "Fetch failed",
    noResults: "No matching cities found",
    uvIndex: "UV Index",
    airQuality: "Air Quality",
    humidity: "Humidity",
    aqiGood: "Good",
    aqiMod: "Moderate",
    aqiUnhealthy: "Poor",
    uvLow: "Low",
    uvMod: "Moderate",
    uvHigh: "High",
    uvVeryHigh: "Very High",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    hourlyForecast: "Hourly Forecast",
    detailedTimeline: "Detailed Timeline",
    tempLabel: "Temperature"
  },
  es: {
    title: "Clima Doodle",
    subtitle: "Reporte del clima y calidad del aire de 7 días dibujado a mano",
    searchPlaceholder: "Escribe el nombre de una ciudad...",
    connecting: "Conectando al servidor del clima...",
    aggregated: "Éxito: Clima actualizado",
    omOnly: "Éxito: Clima actualizado",
    allDown: "Error al obtener el clima. Revisa la conexión.",
    today: "Hoy",
    tomorrow: "Mañana",
    windSpeed: "Viento",
    precipitation: "Precipitación",
    low: "Mín",
    save: "Guardar",
    cancel: "Cancelar",
    langLabel: "Idioma:",
    unitsSettingLabel: "Sistema de unidades:",
    metricLabel: "Métrico (°C, km/h)",
    imperialLabel: "Imperial (°F, mph)",
    preferences: "Preferencias",
    fetchingOM: "Obteniendo clima...",
    okOM: "Clima cargado",
    errorOM: "Error al obtener clima",
    noResults: "No se encontraron ciudades",
    uvIndex: "Índice UV",
    airQuality: "Calidad del aire",
    humidity: "Humedad",
    aqiGood: "Buena",
    aqiMod: "Moderada",
    aqiUnhealthy: "Mala",
    uvLow: "Bajo",
    uvMod: "Moderado",
    uvHigh: "Alto",
    uvVeryHigh: "Muy Alto",
    days: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
    hourlyForecast: "Pronóstico Horario",
    detailedTimeline: "Cronología Detallada",
    tempLabel: "Temperatura"
  },
  hi: {
    title: "चित्रित मौसम",
    subtitle: "हाथ से बना 7-दिवसीय मौसम और वायु गुणवत्ता पूर्वानुमान",
    searchPlaceholder: "यहाँ शहर का नाम लिखें...",
    connecting: "मौसम सर्वर से जुड़ रहा है...",
    aggregated: "सफलता: मौसम अपडेट हुआ",
    omOnly: "सफलता: मौसम अपडेट हुआ",
    allDown: "मौसम की जानकारी प्राप्त करने में विफल। कृपया कनेक्शन जांचें।",
    today: "आज",
    tomorrow: "कल",
    windSpeed: "हवा की गति",
    precipitation: "वर्षा की संभावना",
    low: "न्यूनतम",
    save: "सहेजें",
    cancel: "रद्द करें",
    langLabel: "भाषा:",
    unitsSettingLabel: "इकाई प्रणाली:",
    metricLabel: "मैट्रिक (°C, किमी/घंटा)",
    imperialLabel: "इंपीरियल (°F, मील/घंटा)",
    preferences: "प्राथमिकताएं",
    fetchingOM: "मौसम लोड हो रहा है...",
    okOM: "मौसम लोड हो गया",
    errorOM: "लोड करने में विफल",
    noResults: "कोई मेल खाता शहर नहीं मिला",
    uvIndex: "यूवी इंडेक्स",
    airQuality: "वायु गुणवत्ता",
    humidity: "आर्द्रता",
    aqiGood: "अच्छा",
    aqiMod: "मध्यम",
    aqiUnhealthy: "खराब",
    uvLow: "कम",
    uvMod: "मध्यम",
    uvHigh: "उच्च",
    uvVeryHigh: "अत्यधिक",
    days: ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
    hourlyForecast: "घंटेवार पूर्वानुमान",
    detailedTimeline: "विस्तृत समयरेखा",
    tempLabel: "तापमान"
  },
  fr: {
    title: "Météo Doodle",
    subtitle: "Prévisions météo et qualité de l'air de 7 jours dessinées à la main",
    searchPlaceholder: "Tapez le nom d'une ville...",
    connecting: "Connexion au serveur météo...",
    aggregated: "Succès: Météo mise à jour",
    omOnly: "Succès: Météo mise à jour",
    allDown: "Échec de la récupération. Vérifiez votre connexion.",
    today: "Aujourd'hui",
    tomorrow: "Demain",
    windSpeed: "Vitesse du vent",
    precipitation: "Précipitations",
    low: "Min",
    save: "Enregistrer",
    cancel: "Annuler",
    langLabel: "Langue:",
    unitsSettingLabel: "Système d'unités:",
    metricLabel: "Métrique (°C, km/h)",
    imperialLabel: "Impérial (°F, mph)",
    preferences: "Préférences",
    fetchingOM: "Récupération de la météo...",
    okOM: "Météo chargée",
    errorOM: "Échec de la récupération",
    noResults: "Aucune ville trouvée",
    uvIndex: "Indice UV",
    airQuality: "Qualité de l'air",
    humidity: "Humidité",
    aqiGood: "Bonne",
    aqiMod: "Modérée",
    aqiUnhealthy: "Mauvaise",
    uvLow: "Faible",
    uvMod: "Modéré",
    uvHigh: "Élevé",
    uvVeryHigh: "Très Élevé",
    days: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    hourlyForecast: "Prévisions Horaires",
    detailedTimeline: "Détails Horaires",
    tempLabel: "Température"
  },
  de: {
    title: "Doodle Wetter",
    subtitle: "Handgezeichneter 7-Tage-Wetter- und Luftqualitätsbericht",
    searchPlaceholder: "Geben Sie eine Stadt ein...",
    connecting: "Verbindung zum Wetterserver...",
    aggregated: "Erfolg: Wetter aktualisiert",
    omOnly: "Erfolg: Wetter aktualisiert",
    allDown: "Wetterdaten konnten nicht geladen werden. Verbindung prüfen.",
    today: "Heute",
    tomorrow: "Morgen",
    windSpeed: "Windgeschwindigkeit",
    precipitation: "Niederschlag",
    low: "Tief",
    save: "Speichern",
    cancel: "Abbrechen",
    langLabel: "Sprache:",
    unitsSettingLabel: "Einheitensystem:",
    metricLabel: "Metrisch (°C, km/h)",
    imperialLabel: "Imperial (°F, mph)",
    preferences: "Einstellungen",
    fetchingOM: "Wetterdaten werden geladen...",
    okOM: "Wetter geladen",
    errorOM: "Ladefehler",
    noResults: "Keine Städte gefunden",
    uvIndex: "UV-Index",
    airQuality: "Luftqualität",
    humidity: "Luftfeuchtigkeit",
    aqiGood: "Gut",
    aqiMod: "Mäßig",
    aqiUnhealthy: "Schlecht",
    uvLow: "Niedrig",
    uvMod: "Mäßig",
    uvHigh: "Hoch",
    uvVeryHigh: "Sehr Hoch",
    days: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
    hourlyForecast: "Stündliche Vorhersage",
    detailedTimeline: "Stündliche Details",
    tempLabel: "Temperatur"
  },
  ko: {
    title: "두들 날씨",
    subtitle: "손으로 그린 7일 날씨 및 대기질 리포트",
    searchPlaceholder: "여기에 도시 이름을 입력하세요...",
    connecting: "날씨 서버에 연결 중...",
    aggregated: "성공: 날씨 업데이트 완료",
    omOnly: "성공: 날씨 업데이트 완료",
    allDown: "날씨 정보를 가져오지 못했습니다. 연결을 확인하세요.",
    today: "오늘",
    tomorrow: "내일",
    windSpeed: "풍속",
    precipitation: "강수 확률",
    low: "최저",
    save: "저장",
    cancel: "취소",
    langLabel: "언어 설정:",
    unitsSettingLabel: "단위 시스템:",
    metricLabel: "미터법 (°C, km/h)",
    imperialLabel: "야드파운드법 (°F, mph)",
    preferences: "환경 설정",
    fetchingOM: "날씨 정보를 불러오는 중...",
    okOM: "날씨 정보 로드됨",
    errorOM: "로드 실패",
    noResults: "검색 결과가 없습니다",
    uvIndex: "자외선 지수",
    airQuality: "대기 질",
    humidity: "습도",
    aqiGood: "좋음",
    aqiMod: "보통",
    aqiUnhealthy: "나쁨",
    uvLow: "낮음",
    uvMod: "보통",
    uvHigh: "높음",
    uvVeryHigh: "매우 높음",
    days: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"],
    hourlyForecast: "시간별 예보",
    detailedTimeline: "시간별 상세 정보",
    tempLabel: "기온"
  }
};

// Fetch Translation string helper
function t(key) {
  const lang = settings.lang;
  if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key] !== undefined) {
    return TRANSLATIONS[lang][key];
  }
  return TRANSLATIONS['en'][key] || key; // English fallback
}

// Apply translated texts to static DOM
function applyTranslations() {
  appTitleEl.textContent = t('title');
  appSubtitleEl.textContent = t('subtitle');
  settingsTitleEl.textContent = t('preferences');
  labelLangEl.textContent = t('langLabel');
  labelUnitsEl.textContent = t('unitsSettingLabel');
  labelMetricValEl.textContent = t('metricLabel');
  labelImperialValEl.textContent = t('imperialLabel');
  saveSettingsBtn.textContent = t('save');
  cancelSettingsBtn.textContent = t('cancel');
  
  citySearchInput.placeholder = t('searchPlaceholder');

  // Translate Hourly dialog static texts
  const tabTempEl = document.getElementById('tab-temp');
  if (tabTempEl) tabTempEl.textContent = t('tempLabel');
  const tabPrecipEl = document.getElementById('tab-precip');
  if (tabPrecipEl) tabPrecipEl.textContent = t('precipitation') + ' %';
  const tabWindEl = document.getElementById('tab-wind');
  if (tabWindEl) tabWindEl.textContent = t('windSpeed');
  const tabUvEl = document.getElementById('tab-uv');
  if (tabUvEl) tabUvEl.textContent = t('uvIndex');
  const hourlyListTitleEl = document.getElementById('hourly-list-title');
  if (hourlyListTitleEl) hourlyListTitleEl.textContent = t('detailedTimeline');
}

// Local Storage configurations
function loadSettings() {
  const saved = localStorage.getItem('doodle-weather-settings');
  if (saved) {
    try {
      settings = { ...settings, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }
  applyTranslations();
}

function saveSettings(newSettings) {
  settings = { ...settings, ...newSettings };
  localStorage.setItem('doodle-weather-settings', JSON.stringify(settings));
  applyTranslations();
  
  // Re-render forecast instantly if data exists
  if (mergedForecast && selectedCity) {
    renderWeather();
  }
}

// Weather categories mapped to theme classes and display tags
const WEATHER_CATEGORIES = {
  SUNNY: 'sunny',
  RAINY: 'rainy',
  CLOUDY: 'cloudy',
  SNOWY: 'snowy',
  STORMY: 'stormy',
  CLEAR_NIGHT: 'clear-night'
};

// Playful hand-drawn doodle SVGs (with charcoal outlines and sketchy lines)
const WEATHER_SVGS = {
  [WEATHER_CATEGORIES.SUNNY]: `
    <svg class="weather-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="11" fill="none" stroke="#202430" stroke-width="3.5" stroke-linecap="round" />
      <circle cx="31" cy="31" r="9" fill="#fef08a" opacity="0.9" />
      <g stroke="#202430" stroke-width="3" stroke-linecap="round">
        <path d="M32 10 L32 4" /> <path d="M32 54 L32 60" />
        <path d="M10 32 L4 32" /> <path d="M54 32 L60 32" />
        <path d="M16 16 L11 11" /> <path d="M48 48 L53 53" />
        <path d="M48 16 L53 11" /> <path d="M16 48 L11 53" />
      </g>
    </svg>
  `,
  [WEATHER_CATEGORIES.CLEAR_NIGHT]: `
    <svg class="weather-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M44 38 C32 38 24 30 24 18 C24 15 25 12 26 10 C15 12 10 22 10 32 C10 44 20 54 32 54 C42 54 50 48 52 39 C50 39 46 39 44 38 Z" 
            fill="#e9d5ff" stroke="#202430" stroke-width="3.5" stroke-linejoin="round" />
      <g fill="none" stroke="#202430" stroke-width="2.5" stroke-linecap="round">
        <path d="M18 12 L20 16 L24 16 L21 19 L22 23 L18 21 L14 23 L15 19 L12 16 L16 16 Z" fill="#fef08a" transform="scale(0.7) translate(15, 5)"/>
        <path d="M18 12 L20 16 L24 16 L21 19 L22 23 L18 21 L14 23 L15 19 L12 16 L16 16 Z" fill="#fef08a" transform="scale(0.5) translate(80, 50)"/>
      </g>
    </svg>
  `,
  [WEATHER_CATEGORIES.CLOUDY]: `
    <svg class="weather-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M38 38 C42 38 48 35 48 29 C48 24 43 21 38 21 C37 21 36 21 35 22 C32 17 26 15 22 18 C17 21 17 28 21 32 C18 32 14 34 14 38 C14 43 19 46 24 46 L38 46 Z" 
            fill="#e2e8f0" stroke="#202430" stroke-width="3" stroke-linejoin="round" opacity="0.8" />
      <path d="M44 42 C49 42 52 38 52 33 C52 28 47 25 42 25 C41 25 40 25 39 26 C36 20 30 18 25 21 C20 24 20 31 25 35 C22 35 18 38 18 42 C18 47 23 50 29 50 L44 50 Z" 
            fill="#ffffff" stroke="#202430" stroke-width="3.5" stroke-linejoin="round" />
    </svg>
  `,
  [WEATHER_CATEGORIES.RAINY]: `
    <svg class="weather-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M44 36 C49 36 52 32 52 27 C52 22 47 19 42 19 C41 19 40 19 39 20 C36 14 30 12 25 15 C20 18 20 25 25 29 C22 29 18 32 18 36 C18 41 23 44 29 44 L44 44 Z" 
            fill="#cbd5e1" stroke="#202430" stroke-width="3.5" stroke-linejoin="round" />
      <g stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round">
        <line x1="24" y1="48" x2="21" y2="54" />
        <line x1="34" y1="48" x2="31" y2="54" />
        <line x1="44" y1="48" x2="41" y2="54" />
      </g>
    </svg>
  `,
  [WEATHER_CATEGORIES.SNOWY]: `
    <svg class="weather-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M44 36 C49 36 52 32 52 27 C52 22 47 19 42 19 C41 19 40 19 39 20 C36 14 30 12 25 15 C20 18 20 25 25 29 C22 29 18 32 18 36 C18 41 23 44 29 44 L44 44 Z" 
            fill="#f1f5f9" stroke="#202430" stroke-width="3.5" stroke-linejoin="round" />
      <g stroke="#202430" stroke-width="2.5" stroke-linecap="round">
        <g transform="translate(22, 48) scale(0.8)">
          <line x1="0" y1="-4" x2="0" y2="4" /><line x1="-4" y1="0" x2="4" y2="0" />
        </g>
        <g transform="translate(32, 51) scale(0.8)">
          <line x1="0" y1="-4" x2="0" y2="4" /><line x1="-4" y1="0" x2="4" y2="0" />
        </g>
        <g transform="translate(42, 48) scale(0.8)">
          <line x1="0" y1="-4" x2="0" y2="4" /><line x1="-4" y1="0" x2="4" y2="0" />
        </g>
      </g>
    </svg>
  `,
  [WEATHER_CATEGORIES.STORMY]: `
    <svg class="weather-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M44 34 C49 34 52 30 52 25 C52 20 47 17 42 17 C41 17 40 17 39 18 C36 12 30 10 25 13 C20 16 20 23 25 27 C22 27 18 30 18 34 C18 39 23 42 29 42 L44 42 Z" 
            fill="#475569" stroke="#202430" stroke-width="3.5" stroke-linejoin="round" />
      <polygon points="33,38 27,47 32,47 28,56 38,45 33,45" fill="#fef08a" stroke="#202430" stroke-width="2.5" stroke-linejoin="round" />
    </svg>
  `
};

// Ink-outlined stats icons
const STAT_ICONS = {
  WIND: `
    <svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M19 9.5c.3 0 .5-.2.5-.5s-.2-.5-.5-.5H3v1h16zm2.5-3c.8 0 1.5-.7 1.5-1.5S22.3 3.5 21.5 3.5c-.7 0-1.3.5-1.5 1.2L17.5 7h4zm-5 6c.6 0 1.1-.3 1.4-.7l2.1-3.1h-2L14 11.5H3v1h11zm2.5 3c-.7 0-1.3.5-1.5 1.2L11.5 20H3v1h8.5c.6 0 1.1-.3 1.4-.7l2.1-3.1h2z" fill="none" stroke="#202430" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `,
  PRECIP: `
    <svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12 2.5 L6.5 8.5 C4.5 10.5 4.5 14 6.5 16 C8.5 18 11.5 18 13.5 18 C15.5 18 18.5 18 20.5 16 C22.5 14 22.5 10.5 20.5 8.5 Z" fill="#e0f2fe" stroke="#202430" stroke-width="2" stroke-linejoin="round" />
    </svg>
  `,
  UV: `
    <svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5" stroke="#202430" fill="#fde047" />
      <line x1="12" y1="1" x2="12" y2="3" stroke="#202430" />
      <line x1="12" y1="21" x2="12" y2="23" stroke="#202430" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="#202430" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="#202430" />
      <line x1="1" y1="12" x2="3" y2="12" stroke="#202430" />
      <line x1="21" y1="12" x2="23" y2="12" stroke="#202430" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="#202430" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="#202430" />
    </svg>
  `,
  AQI: `
    <svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.5 19a3.5 3.5 0 0 0 2.5-5.96 5 5 0 0 0-8.07-4.18A4 4 0 0 0 5 11c0 2.76 2.24 5 5 5h7.5z" stroke="#202430" fill="#e2e8f0" />
      <line x1="3" y1="20" x2="8" y2="20" stroke="#202430" />
      <line x1="12" y1="20" x2="19" y2="20" stroke="#202430" />
    </svg>
  `,
  HUMIDITY: `
    <svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke="#202430" fill="#e0f2fe" />
    </svg>
  `
};

/* Format Weather Codes to Category */
function getWeatherCategory(code) {
  if (code === 0 || code === 1) {
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 19;
    return isNight ? WEATHER_CATEGORIES.CLEAR_NIGHT : WEATHER_CATEGORIES.SUNNY;
  }
  if ([2, 3, 45, 48].includes(code)) {
    return WEATHER_CATEGORIES.CLOUDY;
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return WEATHER_CATEGORIES.RAINY;
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return WEATHER_CATEGORIES.SNOWY;
  }
  if ([95, 96, 99].includes(code)) {
    return WEATHER_CATEGORIES.STORMY;
  }
  return WEATHER_CATEGORIES.CLOUDY;
}

/* Highlight matching letters in Autocomplete Item */
function highlightText(text, query) {
  if (!query) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;
  
  const originalMatch = text.substring(index, index + query.length);
  return text.substring(0, index) + `<mark>${originalMatch}</mark>` + text.substring(index + query.length);
}

/* Show search loader */
function toggleSearchLoading(isLoading) {
  if (isLoading) {
    searchSpinner.classList.add('active');
    clearSearchBtn.classList.add('hidden');
  } else {
    searchSpinner.classList.remove('active');
    if (citySearchInput.value) {
      clearSearchBtn.classList.remove('hidden');
    }
  }
}

/* Hide Dropdown Suggestions */
function hideSuggestions() {
  autocompleteDropdown.classList.remove('show');
  citySearchInput.setAttribute('aria-expanded', 'false');
  activeItemIndex = -1;
}

/* Display Suggestions inside Dropdown */
function renderSuggestions(cities, query) {
  autocompleteList.innerHTML = '';
  autocompleteItems = cities;
  activeItemIndex = -1;

  if (cities.length === 0) {
    const li = document.createElement('li');
    li.className = 'no-results';
    li.textContent = t('noResults');
    autocompleteList.appendChild(li);
  } else {
    cities.forEach((city, index) => {
      const li = document.createElement('li');
      li.className = 'autocomplete-item';
      li.setAttribute('role', 'option');
      li.setAttribute('id', `suggestion-${index}`);
      li.setAttribute('data-index', index);

      const cityNameText = city.name;
      const stateCountryText = [city.admin1, city.country].filter(Boolean).join(', ');

      const citySpan = document.createElement('span');
      citySpan.className = 'autocomplete-city';
      citySpan.innerHTML = highlightText(cityNameText, query);

      const regionSpan = document.createElement('span');
      regionSpan.className = 'autocomplete-region';
      regionSpan.textContent = stateCountryText;

      li.appendChild(citySpan);
      li.appendChild(regionSpan);

      // Mouse select listener
      li.addEventListener('click', () => {
        selectCity(city);
      });

      autocompleteList.appendChild(li);
    });
  }

  autocompleteDropdown.classList.add('show');
  citySearchInput.setAttribute('aria-expanded', 'true');
}

const POPULAR_CITIES = {
  a: [
    { name: "Amsterdam", country: "Netherlands", admin1: "North Holland", latitude: 52.374, longitude: 4.889, elevation: 2 },
    { name: "Athens", country: "Greece", admin1: "Attica", latitude: 37.979, longitude: 23.716, elevation: 170 },
    { name: "Atlanta", country: "United States", admin1: "Georgia", latitude: 33.749, longitude: -84.388, elevation: 320 }
  ],
  b: [
    { name: "Berlin", country: "Germany", admin1: "Berlin", latitude: 52.524, longitude: 13.410, elevation: 34 },
    { name: "Boston", country: "United States", admin1: "Massachusetts", latitude: 42.358, longitude: -71.060, elevation: 14 },
    { name: "Barcelona", country: "Spain", admin1: "Catalonia", latitude: 41.389, longitude: 2.159, elevation: 12 }
  ],
  c: [
    { name: "Cairo", country: "Egypt", admin1: "Cairo", latitude: 30.063, longitude: 31.250, elevation: 23 },
    { name: "Chicago", country: "United States", admin1: "Illinois", latitude: 41.850, longitude: -87.650, elevation: 180 },
    { name: "Cape Town", country: "South Africa", admin1: "Western Cape", latitude: -33.925, longitude: 18.424, elevation: 25 }
  ],
  d: [
    { name: "Dubai", country: "United Arab Emirates", admin1: "Dubai", latitude: 25.077, longitude: 55.309, elevation: 0 },
    { name: "Dublin", country: "Ireland", admin1: "Leinster", latitude: 53.333, longitude: -6.249, elevation: 17 },
    { name: "Delhi", country: "India", admin1: "Delhi", latitude: 28.635, longitude: 77.225, elevation: 211 }
  ],
  e: [
    { name: "Edinburgh", country: "United Kingdom", admin1: "Scotland", latitude: 55.952, longitude: -3.196, elevation: 76 },
    { name: "Eindhoven", country: "Netherlands", admin1: "North Brabant", latitude: 51.441, longitude: 5.478, elevation: 18 }
  ],
  f: [
    { name: "Frankfurt", country: "Germany", admin1: "Hesse", latitude: 50.116, longitude: 8.684, elevation: 112 },
    { name: "Florence", country: "Italy", admin1: "Tuscany", latitude: 43.769, longitude: 11.256, elevation: 50 }
  ],
  g: [
    { name: "Geneva", country: "Switzerland", admin1: "Geneva", latitude: 46.202, longitude: 6.146, elevation: 375 },
    { name: "Guangzhou", country: "China", admin1: "Guangdong", latitude: 23.117, longitude: 113.250, elevation: 21 }
  ],
  h: [
    { name: "Hong Kong", country: "Hong Kong", admin1: "", latitude: 22.278, longitude: 114.174, elevation: 0 },
    { name: "Houston", country: "United States", admin1: "Texas", latitude: 29.763, longitude: -95.363, elevation: 12 },
    { name: "Helsinki", country: "Finland", admin1: "Uusimaa", latitude: 60.169, longitude: 24.935, elevation: 26 }
  ],
  i: [
    { name: "Istanbul", country: "Turkey", admin1: "Istanbul", latitude: 41.014, longitude: 28.949, elevation: 39 },
    { name: "Indianapolis", country: "United States", admin1: "Indiana", latitude: 39.768, longitude: -86.158, elevation: 218 }
  ],
  j: [
    { name: "Jakarta", country: "Indonesia", admin1: "Jakarta", latitude: -6.215, longitude: 106.845, elevation: 8 },
    { name: "Johannesburg", country: "South Africa", admin1: "Gauteng", latitude: -26.202, longitude: 28.044, elevation: 1767 }
  ],
  k: [
    { name: "Kyiv", country: "Ukraine", admin1: "Kyiv City", latitude: 50.455, longitude: 30.524, elevation: 179 },
    { name: "Kuala Lumpur", country: "Malaysia", admin1: "Kuala Lumpur", latitude: 3.141, longitude: 101.687, elevation: 60 }
  ],
  l: [
    { name: "London", country: "United Kingdom", admin1: "England", latitude: 51.5085, longitude: -0.1257, elevation: 25 },
    { name: "Los Angeles", country: "United States", admin1: "California", latitude: 34.0522, longitude: -118.2437, elevation: 89 },
    { name: "Lisbon", country: "Portugal", admin1: "Lisbon", latitude: 38.7167, longitude: -9.1333, elevation: 15 },
    { name: "Lima", country: "Peru", admin1: "Lima", latitude: -12.0432, longitude: -77.0282, elevation: 154 }
  ],
  m: [
    { name: "Madrid", country: "Spain", admin1: "Madrid", latitude: 40.4165, longitude: -3.7026, elevation: 657 },
    { name: "Melbourne", country: "Australia", admin1: "Victoria", latitude: -37.814, longitude: 144.963, elevation: 25 },
    { name: "Mumbai", country: "India", admin1: "Maharashtra", latitude: 19.072, longitude: 72.882, elevation: 14 }
  ],
  n: [
    { name: "New York", country: "United States", admin1: "New York", latitude: 40.7142, longitude: -74.0060, elevation: 10 },
    { name: "New Delhi", country: "India", admin1: "Delhi", latitude: 28.6353, longitude: 77.2250, elevation: 211 }
  ],
  o: [
    { name: "Oslo", country: "Norway", admin1: "Oslo", latitude: 59.913, longitude: 10.740, elevation: 23 },
    { name: "Osaka", country: "Japan", admin1: "Osaka", latitude: 34.694, longitude: 135.502, elevation: 9 }
  ],
  p: [
    { name: "Paris", country: "France", admin1: "Île-de-France", latitude: 48.8534, longitude: 2.3488, elevation: 34 },
    { name: "Prague", country: "Czechia", admin1: "Prague", latitude: 50.088, longitude: 14.420, elevation: 244 }
  ],
  q: [
    { name: "Quito", country: "Ecuador", admin1: "Pichincha", latitude: -0.215, longitude: -78.500, elevation: 2850 },
    { name: "Quebec City", country: "Canada", admin1: "Quebec", latitude: 46.812, longitude: -71.215, elevation: 98 }
  ],
  r: [
    { name: "Rome", country: "Italy", admin1: "Lazio", latitude: 41.892, longitude: 12.511, elevation: 20 },
    { name: "Rio de Janeiro", country: "Brazil", admin1: "Rio de Janeiro", latitude: -22.906, longitude: -43.173, elevation: 6 }
  ],
  s: [
    { name: "Seoul", country: "South Korea", admin1: "Seoul", latitude: 37.566, longitude: 126.978, elevation: 86 },
    { name: "Sydney", country: "Australia", admin1: "New South Wales", latitude: -33.868, longitude: 151.207, elevation: 58 },
    { name: "Singapore", country: "Singapore", admin1: "Central Singapore", latitude: 1.290, longitude: 103.852, elevation: 15 },
    { name: "San Francisco", country: "United States", admin1: "California", latitude: 37.7749, longitude: -122.4194, elevation: 16 }
  ],
  t: [
    { name: "Tokyo", country: "Japan", admin1: "Tokyo", latitude: 35.6895, longitude: 139.6917, elevation: 44 },
    { name: "Toronto", country: "Canada", admin1: "Ontario", latitude: 43.700, longitude: -79.416, elevation: 175 }
  ],
  u: [
    { name: "Ulaanbaatar", country: "Mongolia", admin1: "Ulaanbaatar", latitude: 47.915, longitude: 106.918, elevation: 1350 },
    { name: "Utrecht", country: "Netherlands", admin1: "Utrecht", latitude: 52.090, longitude: 5.122, elevation: 5 }
  ],
  v: [
    { name: "Vienna", country: "Austria", admin1: "Vienna", latitude: 48.208, longitude: 16.372, elevation: 170 },
    { name: "Vancouver", country: "Canada", admin1: "British Columbia", latitude: 49.250, longitude: -123.119, elevation: 70 }
  ],
  w: [
    { name: "Warsaw", country: "Poland", admin1: "Mazovia", latitude: 52.230, longitude: 21.012, elevation: 110 },
    { name: "Washington D.C.", country: "United States", admin1: "District of Columbia", latitude: 38.895, longitude: -77.036, elevation: 2 }
  ],
  x: [
    { name: "Xi'an", country: "China", admin1: "Shaanxi", latitude: 34.258, longitude: 108.929, elevation: 405 },
    { name: "Xiamen", country: "China", admin1: "Fujian", latitude: 24.480, longitude: 118.082, elevation: 13 }
  ],
  y: [
    { name: "Yokohama", country: "Japan", admin1: "Kanagawa", latitude: 35.448, longitude: 139.643, elevation: 8 },
    { name: "Yangon", country: "Myanmar", admin1: "Yangon", latitude: 16.805, longitude: 96.156, elevation: 18 }
  ],
  z: [
    { name: "Zurich", country: "Switzerland", admin1: "Zurich", latitude: 47.371, longitude: 8.542, elevation: 408 },
    { name: "Zagreb", country: "Croatia", admin1: "City of Zagreb", latitude: 45.815, longitude: 15.978, elevation: 130 }
  ]
};

/* Perform Autocomplete Fetch call (passing lang preference) */
const fetchCities = debounce(async (query) => {
  if (!query || query.trim().length < 1) {
    hideSuggestions();
    toggleSearchLoading(false);
    return;
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 1) {
    const letter = trimmedQuery.toLowerCase();
    const results = POPULAR_CITIES[letter] || [];
    renderSuggestions(results, trimmedQuery);
    toggleSearchLoading(false);
    return;
  }

  toggleSearchLoading(true);
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedQuery)}&count=6&language=${settings.lang}&format=json`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding response was not OK');
    }

    const data = await response.json();
    const results = data.results || [];
    renderSuggestions(results, query.trim());
  } catch (err) {
    console.error('Failed to fetch cities:', err);
    renderSuggestions([], query.trim());
  } finally {
    toggleSearchLoading(false);
  }
}, 250);

/* Perform Selection and fetch weather */
function selectCity(city) {
  selectedCity = city;
  
  // Format input value
  const regionString = [city.admin1, city.country].filter(Boolean).join(', ');
  citySearchInput.value = `${city.name}${regionString ? `, ${regionString}` : ''}`;
  
  clearSearchBtn.classList.remove('hidden');
  hideSuggestions();
  citySearchInput.blur();

  // Load weather from multiple cross-referenced sources
  fetchWeatherCrossReferenced(city.latitude, city.longitude);
}

/* Set status badge appearance helper */
function updateStatusBadge(badgeEl, status, messageKey) {
  badgeEl.className = 'status-badge';
  badgeEl.textContent = t(messageKey);
  
  if (status === 'success') {
    badgeEl.classList.add('success');
  } else if (status === 'fail') {
    badgeEl.classList.add('fail');
  } else if (status === 'fetching') {
    badgeEl.classList.add('fetching');
  }
}

/* Classify weather category manually based only on temperature, wind speed, and precipitation probability */
function classifyWeatherCondition(tempMax, windMax, precipMax) {
  if (precipMax >= 40) {
    if (tempMax <= 2) {
      return 'snowy';
    }
    if (windMax >= 25) {
      return 'stormy';
    }
    return 'rainy';
  }
  
  if (precipMax >= 15 || windMax >= 20) {
    return 'cloudy';
  }
  
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour > 19;
  return isNight ? 'clear-night' : 'sunny';
}

/* Fetch weather from Open-Meteo requesting ONLY temperature, wind speed, and precipitation probability */
async function fetchWeatherCrossReferenced(lat, lon) {
  // Reset interface viewports
  weatherDashboard.classList.add('hidden');
  errorBox.classList.remove('show');
  skeletonDashboard.classList.remove('hidden');
  
  // Reveal status board
  sourceStatusContainer.classList.remove('hidden');
  updateStatusBadge(openmeteoStatusEl, 'fetching', 'fetchingOM');
  metnorwayStatusEl.style.display = 'none'; // Hide MET Norway badge
  crossrefSummaryEl.textContent = t('connecting');

  let weatherData = null;
  let aqiData = null;

  const weatherPromise = fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_probability_max,uv_index_max,relative_humidity_2m_max&hourly=temperature_2m,wind_speed_10m,uv_index,precipitation_probability,weather_code&forecast_days=7&timezone=auto`
  ).then(async (res) => {
    if (!res.ok) throw new Error('Weather forecast API failed');
    weatherData = await res.json();
  }).catch((err) => {
    console.error('Weather forecast API failed:', err);
  });

  const aqiPromise = fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&forecast_days=7&timezone=auto`
  ).then(async (res) => {
    if (!res.ok) throw new Error('Air quality API failed');
    aqiData = await res.json();
  }).catch((err) => {
    console.error('Air quality API failed:', err);
  });

  try {
    await Promise.all([weatherPromise, aqiPromise]);
    
    if (!weatherData || !weatherData.daily) {
      throw new Error('Invalid weather data structure');
    }

    updateStatusBadge(openmeteoStatusEl, 'success', 'okOM');
    crossrefSummaryEl.textContent = t('omOnly');

    // Save hourly weather forecast data
    hourlyForecastData = weatherData.hourly || null;

    // Parse daily max AQI from hourly us_aqi readings
    const dailyMaxAqi = [];
    if (aqiData && aqiData.hourly && aqiData.hourly.us_aqi) {
      const usAqi = aqiData.hourly.us_aqi;
      for (let day = 0; day < 7; day++) {
        const startIndex = day * 24;
        const endIndex = startIndex + 24;
        const dayAqiReadings = usAqi.slice(startIndex, endIndex).filter(val => val !== null && val !== undefined);
        const maxAqi = dayAqiReadings.length ? Math.max(...dayAqiReadings) : 0;
        dailyMaxAqi.push(maxAqi);
      }
    } else {
      // Fallback in case AQI is down
      for (let day = 0; day < 7; day++) {
        dailyMaxAqi.push(0);
      }
    }

    // Parse Open-Meteo daily forecast
    mergedForecast = [];
    const daily = weatherData.daily;
    for (let i = 0; i < 7; i++) {
      const dateStr = daily.time[i];
      const tempMax = daily.temperature_2m_max[i];
      const tempMin = daily.temperature_2m_min[i];
      const windMax = daily.wind_speed_10m_max[i];
      const precipMax = daily.precipitation_probability_max[i];
      const uvMax = daily.uv_index_max ? daily.uv_index_max[i] : null;
      const humidityMax = daily.relative_humidity_2m_max ? daily.relative_humidity_2m_max[i] : null;
      const aqiMax = dailyMaxAqi[i];

      // Classify weather condition using rule-based algorithm
      const weatherCategory = classifyWeatherCondition(tempMax, windMax, precipMax);

      mergedForecast.push({
        date: dateStr,
        tempMax,
        tempMin,
        windMax,
        precipMax,
        uvMax,
        humidityMax,
        aqiMax,
        weatherCategory
      });
    }

    renderWeather();
  } catch (err) {
    console.error('Weather/AQI fetch failed:', err);
    updateStatusBadge(openmeteoStatusEl, 'fail', 'errorOM');
    errorMessage.textContent = t('allDown');
    errorBox.classList.add('show');
    skeletonDashboard.classList.add('hidden');
    sourceStatusContainer.classList.add('hidden');
    document.body.className = '';
  }
}

/* Render Weather Layout panels */
function renderWeather() {
  if (!mergedForecast || !selectedCity) return;

  // Set header details
  cityNameEl.textContent = selectedCity.name;
  
  // Localized state/region and country text
  const regionString = [selectedCity.admin1, selectedCity.country].filter(Boolean).join(', ');
  countryNameEl.textContent = regionString;

  coordinatesEl.textContent = `LAT: ${selectedCity.latitude.toFixed(2)}° | LON: ${selectedCity.longitude.toFixed(2)}°`;

  // Set Theme Background based on current day (index 0) weather category
  const themeCategory = mergedForecast[0].weatherCategory;
  document.body.className = `theme-${themeCategory}`;

  // Update highlighter variable color dynamically
  let accentColor = 'var(--marker-yellow)';
  if (themeCategory === 'rainy') accentColor = 'var(--marker-blue)';
  else if (themeCategory === 'cloudy') accentColor = 'var(--marker-grey)';
  else if (themeCategory === 'snowy') accentColor = 'var(--marker-purple)';
  else if (themeCategory === 'stormy') accentColor = 'var(--marker-coral)';
  else if (themeCategory === 'clear-night') accentColor = 'var(--marker-purple)';
  
  document.documentElement.style.setProperty('--marker-active', accentColor);

  // Clear container
  forecastContainer.innerHTML = '';

  // Generate 7 Cards
  for (let i = 0; i < 7; i++) {
    const dayData = mergedForecast[i];
    const card = document.createElement('div');
    card.className = `forecast-card card-${i}`;

    // Calculate Day Header
    let dayHeader = '';
    let dateHeader = '';
    
    const rawDate = dayData.date;
    const dateObj = new Date(rawDate + 'T00:00:00');
    
    if (i === 0) {
      dayHeader = t('today');
    } else if (i === 1) {
      dayHeader = t('tomorrow');
    } else {
      const days = t('days');
      const dayIndex = dateObj.getDay();
      dayHeader = days[dayIndex] || dateObj.toLocaleDateString(settings.lang, { weekday: 'long' });
    }
    
    dateHeader = dateObj.toLocaleDateString(settings.lang, { month: 'short', day: 'numeric' });

    // Weather icon mapping
    const category = dayData.weatherCategory;
    const svgIcon = WEATHER_SVGS[category] || WEATHER_SVGS['cloudy'];

    // Temperature formatting (°C / °F)
    const maxC = dayData.tempMax;
    const minC = dayData.tempMin;
    
    let maxTempDisplay = 'N/A';
    let minTempDisplay = 'N/A';

    if (maxC !== null && minC !== null) {
      if (settings.units === 'metric') {
        maxTempDisplay = `${Math.round(maxC)}°C`;
        minTempDisplay = `${t('low')}: ${Math.round(minC)}°C`;
      } else {
        const maxF = (maxC * 9/5) + 32;
        const minF = (minC * 9/5) + 32;
        maxTempDisplay = `${Math.round(maxF)}°F`;
        minTempDisplay = `${t('low')}: ${Math.round(minF)}°F`;
      }
    }

    // Wind formatting (km/h / mph)
    const windKph = dayData.windMax;
    let windDisplay = 'N/A';
    
    if (windKph !== null) {
      if (settings.units === 'imperial') {
        const windMph = windKph * 0.621371;
        windDisplay = `${Math.round(windMph)} mph`;
      } else {
        windDisplay = `${Math.round(windKph)} km/h`;
      }
    }

    // Precipitation probability (%)
    const precipProb = dayData.precipMax !== null ? Math.round(dayData.precipMax) : 0;

    // AQI rating helper
    const aqiVal = dayData.aqiMax || 0;
    let aqiLabelKey = 'aqiGood';
    let aqiClass = 'aqi-good';
    if (aqiVal > 100) {
      aqiLabelKey = 'aqiUnhealthy';
      aqiClass = 'aqi-unhealthy';
    } else if (aqiVal > 50) {
      aqiLabelKey = 'aqiMod';
      aqiClass = 'aqi-moderate';
    }

    // UV rating helper
    const uvVal = dayData.uvMax !== null ? Math.round(dayData.uvMax) : 0;
    let uvLabelKey = 'uvLow';
    let uvClass = 'uv-low';
    if (uvVal > 7) {
      uvLabelKey = 'uvVeryHigh';
      uvClass = 'uv-veryhigh';
    } else if (uvVal > 5) {
      uvLabelKey = 'uvHigh';
      uvClass = 'uv-high';
    } else if (uvVal > 2) {
      uvLabelKey = 'uvMod';
      uvClass = 'uv-moderate';
    }

    // Humidity percentage
    const humidityVal = dayData.humidityMax !== null ? Math.round(dayData.humidityMax) : 0;

    // Inject content into Card layout
    card.innerHTML = `
      <h3 class="forecast-day">${dayHeader}</h3>
      <span class="forecast-date">${dateHeader}</span>
      
      <div class="weather-icon-wrapper">
        ${svgIcon}
      </div>

      <div class="forecast-temp">
        <span class="temp-max">${maxTempDisplay}</span>
        <span class="temp-min">${minTempDisplay}</span>
      </div>

      <div class="forecast-divider"></div>

      <div class="forecast-stats">
        <!-- Wind speed -->
        <div class="stat-item">
          ${STAT_ICONS.WIND}
          <span>${t('windSpeed')}</span>
          <span class="stat-value">${windDisplay}</span>
        </div>

        <!-- Precipitation Probability -->
        <div class="stat-item">
          ${STAT_ICONS.PRECIP}
          <span>${t('precipitation')}</span>
          <span class="stat-value">${precipProb}%</span>
        </div>

        <!-- Humidity -->
        <div class="stat-item">
          ${STAT_ICONS.HUMIDITY}
          <span>${t('humidity')}</span>
          <span class="stat-value">${humidityVal}%</span>
        </div>

        <!-- UV Index -->
        <div class="stat-item">
          ${STAT_ICONS.UV}
          <span>${t('uvIndex')}</span>
          <span class="stat-value">${uvVal}<span class="uv-badge ${uvClass}">${t(uvLabelKey)}</span></span>
        </div>

        <!-- AQI -->
        <div class="stat-item">
          ${STAT_ICONS.AQI}
          <span>${t('airQuality')}</span>
          <span class="stat-value">${aqiVal}<span class="aqi-badge ${aqiClass}">${t(aqiLabelKey)}</span></span>
        </div>
        
        <div class="precip-indicator-bar" aria-label="Precipitation probability progress bar">
          <div class="precip-indicator-fill" style="width: ${precipProb}%;"></div>
        </div>
      </div>
    `;

    // Click event to open hourly details modal
    card.addEventListener('click', () => {
      openHourlyDetails(i);
    });

    forecastContainer.appendChild(card);
  }

  // Swap skeleton for live dashboard
  skeletonDashboard.classList.add('hidden');
  weatherDashboard.classList.remove('hidden');
  currentSlideIndex = 0;
  
  setTimeout(() => {
    weatherDashboard.classList.add('show');
    updateSliderPosition();
  }, 50);
}

/* Update visual highlight class for Active Suggestion item */
function updateActiveSuggestion() {
  const items = autocompleteList.querySelectorAll('.autocomplete-item');
  items.forEach((item, idx) => {
    if (idx === activeItemIndex) {
      item.classList.add('active');
      item.setAttribute('aria-selected', 'true');
      citySearchInput.setAttribute('aria-activedescendant', item.id);
      
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('active');
      item.setAttribute('aria-selected', 'false');
    }
  });

  if (activeItemIndex === -1) {
    citySearchInput.removeAttribute('aria-activedescendant');
  }
}

// Event Listeners

/* Search Input handlers */
citySearchInput.addEventListener('input', (e) => {
  const query = e.target.value;
  if (!query) {
    clearSearchBtn.classList.add('hidden');
    hideSuggestions();
  } else {
    clearSearchBtn.classList.remove('hidden');
    fetchCities(query);
  }
});

/* Keyboard autocomplete controls & Accessibility support */
citySearchInput.addEventListener('keydown', (e) => {
  const dropdownOpen = autocompleteDropdown.classList.contains('show');
  if (!dropdownOpen) return;

  const items = autocompleteList.querySelectorAll('.autocomplete-item');
  if (items.length === 0) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      activeItemIndex = (activeItemIndex + 1) % items.length;
      updateActiveSuggestion();
      break;
      
    case 'ArrowUp':
      e.preventDefault();
      activeItemIndex = (activeItemIndex - 1 + items.length) % items.length;
      updateActiveSuggestion();
      break;

    case 'Enter':
      e.preventDefault();
      if (activeItemIndex >= 0 && activeItemIndex < items.length) {
        const itemNode = items[activeItemIndex];
        const index = parseInt(itemNode.getAttribute('data-index'), 10);
        const city = autocompleteItems[index];
        if (city) selectCity(city);
      }
      break;

    case 'Escape':
      e.preventDefault();
      hideSuggestions();
      citySearchInput.blur();
      break;

    case 'Tab':
      hideSuggestions();
      break;
  }
});

/* Reset Search Input button */
clearSearchBtn.addEventListener('click', () => {
  citySearchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  hideSuggestions();
  citySearchInput.focus();
});

/* Close suggestion dropdown on external clicks */
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')) {
    hideSuggestions();
  }
});

// Settings Modal Action Hooks

/* Open Settings Modal */
settingsBtn.addEventListener('click', () => {
  // Populate form controls with current values before displaying
  settingsLangSelect.value = settings.lang;
  
  // Set Checked radio values
  document.querySelector(`input[name="unit-system"][value="${settings.units}"]`).checked = true;
  
  settingsDialog.showModal();
});

/* Close Settings handlers */
closeSettingsBtn.addEventListener('click', () => {
  settingsDialog.close();
});

cancelSettingsBtn.addEventListener('click', () => {
  settingsDialog.close();
});

/* Save Settings Form submit */
settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const selectedLang = settingsLangSelect.value;
  const selectedUnits = document.querySelector('input[name="unit-system"]:checked').value;
  
  saveSettings({
    lang: selectedLang,
    units: selectedUnits
  });
  
  settingsDialog.close();
});

// Initialize on startup
loadSettings();

// Load city from shared dashboard localStorage if available
const savedCityStr = localStorage.getItem('weather_city_coords');
if (savedCityStr) {
  try {
    const savedCity = JSON.parse(savedCityStr);
    const mappedCity = {
      name: savedCity.name,
      admin1: savedCity.state || savedCity.admin1 || '',
      country: savedCity.country,
      latitude: savedCity.lat || savedCity.latitude,
      longitude: savedCity.lon || savedCity.longitude
    };
    selectCity(mappedCity);
  } catch (e) {
    console.error('Failed to load shared city:', e);
    citySearchInput.focus();
  }
} else {
  // Focus search input immediately so the user can start typing right away
  citySearchInput.focus();
}

// Debounce helper to rate-limit geocoding API requests during city typing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/* Hourly Details Dialog Functionality */

function openHourlyDetails(dayIdx) {
  if (!hourlyForecastData || !mergedForecast) return;
  activeHourlyDayIndex = dayIdx;
  
  const dayData = mergedForecast[dayIdx];
  const dateObj = new Date(dayData.date + 'T00:00:00');
  
  let dayName = '';
  if (dayIdx === 0) {
    dayName = t('today');
  } else if (dayIdx === 1) {
    dayName = t('tomorrow');
  } else {
    const days = t('days');
    dayName = days[dateObj.getDay()];
  }
  
  const formattedDate = dateObj.toLocaleDateString(settings.lang, { month: 'short', day: 'numeric' });
  hourlyTitle.textContent = `${t('hourlyForecast') || 'Hourly Forecast'} - ${dayName}, ${formattedDate}`;

  // Reset to temp tab
  activeHourlyMetric = 'temp';
  chartTabBtns.forEach(btn => {
    if (btn.getAttribute('data-metric') === 'temp') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  updateHourlyDetails();
  hourlyDialog.showModal();
}

function updateHourlyDetails() {
  if (!hourlyForecastData) return;
  const dayIdx = activeHourlyDayIndex;
  const metric = activeHourlyMetric;
  
  const startIndex = dayIdx * 24;
  const endIndex = startIndex + 24;
  
  const times = hourlyForecastData.time.slice(startIndex, endIndex);
  const temps = hourlyForecastData.temperature_2m.slice(startIndex, endIndex);
  const precips = hourlyForecastData.precipitation_probability.slice(startIndex, endIndex);
  const winds = hourlyForecastData.wind_speed_10m.slice(startIndex, endIndex);
  const uvs = hourlyForecastData.uv_index.slice(startIndex, endIndex);
  const codes = hourlyForecastData.weather_code.slice(startIndex, endIndex);

  let dataRaw = [];
  let yAxisUnit = '';
  let yLabelText = '';
  
  if (metric === 'temp') {
    if (settings.units === 'metric') {
      dataRaw = temps;
      yAxisUnit = '°C';
    } else {
      dataRaw = temps.map(t => (t * 9/5) + 32);
      yAxisUnit = '°F';
    }
    yLabelText = `${t('tempLabel') || 'Temperature'} (${yAxisUnit})`;
  } else if (metric === 'precip') {
    dataRaw = precips;
    yAxisUnit = '%';
    yLabelText = `${t('precipitation') || 'Precipitation'} (${yAxisUnit})`;
  } else if (metric === 'wind') {
    if (settings.units === 'imperial') {
      dataRaw = winds.map(w => w * 0.621371);
      yAxisUnit = 'mph';
    } else {
      dataRaw = winds;
      yAxisUnit = 'km/h';
    }
    yLabelText = `${t('windSpeed') || 'Wind Speed'} (${yAxisUnit})`;
  } else if (metric === 'uv') {
    dataRaw = uvs;
    yAxisUnit = '';
    yLabelText = t('uvIndex') || 'UV Index';
  }

  chartYLabel.textContent = yLabelText;
  drawSVGChart(dataRaw, yAxisUnit);
  renderTimelineGrid(times, temps, precips, winds, uvs, codes);
}

function drawSVGChart(data, unit) {
  const svg = hourlyChartSvg;
  svg.innerHTML = ''; 

  const width = 600;
  const height = 200;
  
  const padLeft = 45;
  const padRight = 15;
  const padTop = 20;
  const padBottom = 30;
  
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  
  let maxVal = Math.max(...data);
  let minVal = Math.min(...data);
  
  let yMin = minVal;
  let yMax = maxVal;
  
  if (activeHourlyMetric === 'precip') {
    yMin = 0;
    yMax = 100;
  } else if (activeHourlyMetric === 'uv') {
    yMin = 0;
    yMax = Math.max(10, maxVal);
  } else {
    const range = maxVal - minVal;
    if (range === 0) {
      yMin = minVal - 2;
      yMax = maxVal + 2;
    } else {
      yMin = minVal - range * 0.15;
      yMax = maxVal + range * 0.15;
    }
    if (activeHourlyMetric === 'wind' && yMin < 0) {
      yMin = 0;
    }
  }

  const rangeY = yMax - yMin || 1;

  const points = data.map((val, idx) => {
    const x = padLeft + idx * (chartW / 23);
    const y = padTop + chartH - ((val - yMin) / rangeY) * chartH;
    return { x, y, val, idx };
  });

  const ticksY = 3; 
  for (let i = 0; i <= ticksY; i++) {
    const val = yMin + (rangeY * i) / ticksY;
    const y = padTop + chartH - (i / ticksY) * chartH;
    
    const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    gridLine.setAttribute('class', 'chart-grid-line');
    gridLine.setAttribute('x1', padLeft);
    gridLine.setAttribute('y1', y);
    gridLine.setAttribute('x2', width - padRight);
    gridLine.setAttribute('y2', y);
    if (i === 0) {
      gridLine.setAttribute('style', 'stroke: var(--ink-dark); stroke-width: 2.2;'); 
    }
    svg.appendChild(gridLine);
    
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('class', 'chart-label-y-text');
    label.setAttribute('x', padLeft - 8);
    label.setAttribute('y', y + 4);
    label.textContent = `${Math.round(val)}${unit}`;
    svg.appendChild(label);
  }

  for (let h = 0; h <= 23; h += 3) {
    const x = padLeft + h * (chartW / 23);
    
    const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    gridLine.setAttribute('class', 'chart-grid-line');
    gridLine.setAttribute('x1', x);
    gridLine.setAttribute('y1', padTop);
    gridLine.setAttribute('x2', x);
    gridLine.setAttribute('y2', padTop + chartH);
    gridLine.setAttribute('style', 'stroke-dasharray: 4,4;');
    svg.appendChild(gridLine);
    
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('class', 'chart-label-text');
    label.setAttribute('x', x);
    label.setAttribute('y', height - 6);
    label.textContent = formatHourLabel(h);
    svg.appendChild(label);
  }

  const curveD = getBezierPath(points);
  
  if (curveD) {
    const areaD = `${curveD} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;
    
    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    areaPath.setAttribute('class', 'chart-area-path');
    areaPath.setAttribute('d', areaD);
    svg.appendChild(areaPath);
    
    const curvePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    curvePath.setAttribute('class', 'chart-line-path');
    curvePath.setAttribute('d', curveD);
    svg.appendChild(curvePath);
  }

  points.forEach((pt) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'chart-point-group');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'chart-dot');
    circle.setAttribute('cx', pt.x);
    circle.setAttribute('cy', pt.y);
    circle.setAttribute('r', 4.5);
    g.appendChild(circle);

    const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tooltip.setAttribute('class', 'chart-tooltip');
    tooltip.setAttribute('x', pt.x);
    tooltip.setAttribute('y', pt.y - 12);
    tooltip.setAttribute('text-anchor', 'middle');
    
    let displayVal = `${Math.round(pt.val)}${unit}`;
    if (activeHourlyMetric === 'uv') displayVal = pt.val.toFixed(1);
    
    tooltip.textContent = displayVal;
    g.appendChild(tooltip);

    svg.appendChild(g);
  });
}

function getBezierPath(points) {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  const smoothing = 0.15; 
  const padTop = 20;
  const chartH = 150;

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    
    const prev = points[i - 2] || p0;
    const next = points[i + 1] || p1;
    
    const cp1x = p0.x + (p1.x - p0.x) * smoothing;
    const cp1y = Math.max(padTop, Math.min(padTop + chartH, p0.y + (p1.y - prev.y) * smoothing));
    
    const cp2x = p1.x - (p1.x - p0.x) * smoothing;
    const cp2y = Math.max(padTop, Math.min(padTop + chartH, p1.y - (next.y - p0.y) * smoothing));
    
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function renderTimelineGrid(times, temps, precips, winds, uvs, codes) {
  hourlyDetailsGrid.innerHTML = '';
  
  for (let h = 0; h <= 23; h += 3) {
    const cell = document.createElement('div');
    cell.className = 'hourly-cell';
    
    const timeLabel = formatHourLabel(h);
    const code = codes[h];
    const weatherCat = getWeatherCategory(code);
    const svgIcon = WEATHER_SVGS[weatherCat] || WEATHER_SVGS['cloudy'];
    
    let displayVal = '';
    const tempRaw = temps[h];
    const precipRaw = precips[h];
    const windRaw = winds[h];
    const uvRaw = uvs[h];
    
    if (activeHourlyMetric === 'temp') {
      if (settings.units === 'metric') {
        displayVal = `${Math.round(tempRaw)}°C`;
      } else {
        displayVal = `${Math.round((tempRaw * 9/5) + 32)}°F`;
      }
    } else if (activeHourlyMetric === 'precip') {
      displayVal = `${Math.round(precipRaw)}%`;
    } else if (activeHourlyMetric === 'wind') {
      if (settings.units === 'imperial') {
        displayVal = `${Math.round(windRaw * 0.621371)} mph`;
      } else {
        displayVal = `${Math.round(windRaw)} km/h`;
      }
    } else if (activeHourlyMetric === 'uv') {
      displayVal = uvRaw.toFixed(1);
    }
    
    cell.innerHTML = `
      <span class="hourly-cell-time">${timeLabel}</span>
      <div class="hourly-cell-icon">${svgIcon}</div>
      <span class="hourly-cell-value">${displayVal}</span>
    `;
    
    hourlyDetailsGrid.appendChild(cell);
  }
}

function formatHourLabel(hourNum) {
  if (hourNum === 0) return '12 AM';
  if (hourNum === 12) return '12 PM';
  return hourNum > 12 ? `${hourNum - 12} PM` : `${hourNum} AM`;
}

/* Slider (Carousel) Functionality */

function updateSliderPosition() {
  const cards = forecastContainer.children;
  if (cards.length < 2) return;
  
  const containerWidth = document.querySelector('.forecast-slider-container').getBoundingClientRect().width;
  const cardWidth = cards[0].getBoundingClientRect().width;
  const visibleCards = Math.round(containerWidth / cardWidth) || 1;
  const maxSlideIndex = Math.max(0, cards.length - visibleCards);
  
  if (currentSlideIndex > maxSlideIndex) {
    currentSlideIndex = maxSlideIndex;
  }
  if (currentSlideIndex < 0) {
    currentSlideIndex = 0;
  }
  
  const gap = parseFloat(getComputedStyle(forecastContainer).gap) || 0;
  const cardOffset = cardWidth + gap;
  const translateVal = -currentSlideIndex * cardOffset;
  forecastContainer.style.transform = `translateX(${translateVal}px)`;
  
  slidePrevBtn.disabled = (currentSlideIndex === 0);
  slideNextBtn.disabled = (currentSlideIndex === maxSlideIndex);
}

// Carousel listeners
slidePrevBtn.addEventListener('click', () => {
  if (currentSlideIndex > 0) {
    currentSlideIndex--;
    updateSliderPosition();
  }
});

slideNextBtn.addEventListener('click', () => {
  const cards = forecastContainer.children;
  if (cards.length === 0) return;
  
  const containerWidth = document.querySelector('.forecast-slider-container').getBoundingClientRect().width;
  const cardWidth = cards[0].getBoundingClientRect().width;
  const visibleCards = Math.round(containerWidth / cardWidth) || 1;
  const maxSlideIndex = Math.max(0, cards.length - visibleCards);
  
  if (currentSlideIndex < maxSlideIndex) {
    currentSlideIndex++;
    updateSliderPosition();
  }
});

window.addEventListener('resize', () => {
  updateSliderPosition();
});

// Modal Event Listeners
closeHourlyBtn.addEventListener('click', () => {
  hourlyDialog.close();
});

chartTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    chartTabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    activeHourlyMetric = btn.getAttribute('data-metric');
    updateHourlyDetails();
  });
});
