import { Platform } from 'react-native';

// ============================================================================
// JEM PREMIUM INDUSTRIAL DESIGN TOKENS
// Deep navy surfaces + JEM orange energy, soft depth, rounded geometry.
// ============================================================================

export const PALETTE = {
  ink: '#0B1220',
  navy900: '#0E1628',
  navy800: '#14213A',
  navy700: '#1C2B4A',
  navy600: '#283A5E',

  orange50: '#FFF7ED',
  orange100: '#FFEDD5',
  orange200: '#FED7AA',
  orange400: '#FB923C',
  orange500: '#F97316',
  orange600: '#EA580C',
  orange700: '#C2410C',

  canvas: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  line: '#E6EAF0',
  lineSoft: '#EEF1F5',

  text: '#0F172A',
  textBody: '#334155',
  textMuted: '#64748B',
  textFaint: '#94A3B8',

  success: '#10B981',
  successDeep: '#047857',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningDeep: '#B45309',
  warningBg: '#FFFBEB',
  danger: '#EF4444',
  dangerDeep: '#B91C1C',
  dangerBg: '#FEF2F2',
  info: '#0EA5E9',
  infoDeep: '#0369A1',
  infoBg: '#F0F9FF',
  violet: '#6366F1',
  violetDeep: '#4338CA',
  violetBg: '#EEF2FF',
};

export const GRADIENTS = {
  navy: ['#0B1220', '#14213A', '#1E2F52'],
  orange: ['#FF9A4D', '#F97316', '#EA580C'],
  orangeSoft: ['#FFF7ED', '#FFEDD5'],
  ember: ['#FB923C', '#EA580C', '#B91C1C'],
  midnight: ['#1E293B', '#0F172A'],
  ocean: ['#38BDF8', '#0369A1'],
  forest: ['#34D399', '#047857'],
  thumb: ['#F8FAFC', '#EEF2F7'],
};

export const RADIUS = { sm: 10, md: 14, lg: 18, xl: 24, xxl: 30, pill: 999 };

// Cross-platform shadow helper (native shadow props + web boxShadow)
export const shadow = ({ y = 6, blur = 16, opacity = 0.08, rgb = '15, 23, 42', elevation = 4 } = {}) =>
  Platform.select({
    web: { boxShadow: `0px ${y}px ${blur}px rgba(${rgb}, ${opacity})` },
    default: {
      shadowColor: `rgb(${rgb})`,
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur / 2,
      elevation,
    },
  });

export const SHADOWS = {
  card: shadow({ y: 4, blur: 14, opacity: 0.06, elevation: 2 }),
  raised: shadow({ y: 10, blur: 24, opacity: 0.1, elevation: 6 }),
  orange: shadow({ y: 8, blur: 18, opacity: 0.35, rgb: '234, 88, 12', elevation: 6 }),
  nav: shadow({ y: 12, blur: 32, opacity: 0.16, elevation: 14 }),
};

export const peso = (value) => `₱${Number(value || 0).toLocaleString()}`;

// ----------------------------------------------------------------------------
// Category visuals: maps any backend/local category to an icon + gradient.
// ----------------------------------------------------------------------------
const CATEGORY_VISUALS = [
  { match: ['lumber', 'board', 'plywood', 'wood'], icon: 'pine-tree', colors: ['#FBBF24', '#D97706'] },
  { match: ['screen', 'netting', 'mesh'], icon: 'grid', colors: ['#A78BFA', '#6D28D9'] },
  { match: ['pipe'], icon: 'pipe', colors: ['#38BDF8', '#0369A1'] },
  { match: ['plumb', 'fitting', 'faucet'], icon: 'pipe-wrench', colors: ['#22D3EE', '#0E7490'] },
  { match: ['hardware', 'fastener', 'nail', 'screw', 'bolt'], icon: 'nut', colors: ['#94A3B8', '#334155'] },
  { match: ['rope', 'accessor', 'chain'], icon: 'link-variant', colors: ['#FB923C', '#C2410C'] },
  { match: ['tile', 'trim', 'finish', 'paint'], icon: 'format-paint', colors: ['#F472B6', '#BE185D'] },
  { match: ['tarp', 'cover'], icon: 'tent', colors: ['#4ADE80', '#15803D'] },
  { match: ['cement', 'concrete', 'masonry'], icon: 'wall', colors: ['#A8A29E', '#57534E'] },
  { match: ['steel', 'rebar', 'metal'], icon: 'hammer-wrench', colors: ['#64748B', '#1E293B'] },
  { match: ['electric', 'wire', 'light'], icon: 'flash', colors: ['#FACC15', '#CA8A04'] },
  { match: ['tool'], icon: 'toolbox', colors: ['#F87171', '#B91C1C'] },
];

export const getCategoryVisual = (cat = {}) => {
  const haystack = `${cat.id || ''} ${cat.name || ''} ${cat.title || ''}`.toLowerCase();
  const found = CATEGORY_VISUALS.find((v) => v.match.some((m) => haystack.includes(m)));
  return found || { icon: 'cube-outline', colors: ['#FB923C', '#EA580C'] };
};

// ----------------------------------------------------------------------------
// Order status visuals + progress step (0..4)
// ----------------------------------------------------------------------------
export const getOrderStatusVisual = (status = '') => {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'cancelled' || s === 'canceled')
    return { label: 'Cancelled', icon: 'close-circle', fg: PALETTE.dangerDeep, bg: PALETTE.dangerBg, step: -1 };
  if (s === 'completed' || s === 'delivered')
    return { label: 'Delivered', icon: 'checkmark-done-circle', fg: PALETTE.successDeep, bg: PALETTE.successBg, step: 4 };
  if (s === 'out_for_delivery' || s === 'out for delivery' || s === 'in_transit' || s === 'shipped' || s === 'dispatched')
    return { label: 'Out for Delivery', icon: 'car', fg: PALETTE.infoDeep, bg: PALETTE.infoBg, step: 3 };
  if (s === 'processing' || s === 'in_process' || s === 'in process' || s === 'ready' || s === 'packed')
    return { label: 'In Process', icon: 'cube', fg: PALETTE.violetDeep, bg: PALETTE.violetBg, step: 3 };
  if (s === 'backordered')
    return { label: 'Backordered', icon: 'hourglass', fg: PALETTE.orange700, bg: PALETTE.orange50, step: 3 };
  if (s === 'confirmed' || s === 'received')
    return { label: 'Confirmed', icon: 'shield-checkmark', fg: PALETTE.warningDeep, bg: PALETTE.warningBg, step: 2 };
  return { label: 'Pending Review', icon: 'time', fg: PALETTE.orange700, bg: PALETTE.orange50, step: 1 };
};

// ----------------------------------------------------------------------------
// Local product image assets & resolution
// ----------------------------------------------------------------------------
const LOCAL_PRODUCT_IMAGES = {
  aluminum_screen: require('../../../assets/products/aluminum-screen.png'),
  hardware_cloth: require('../../../assets/products/hardware-cloth-3ft.png'),
  blue_coupling: require('../../../assets/products/blue-coupling-1-2.png'),
  blue_coupling_reducer: require('../../../assets/products/blue-coupling-reducer.png'),
  blue_elbow_plain: require('../../../assets/products/blue-elbow-plain-1-2.png'),
  blue_elbow_threaded: require('../../../assets/products/blue-elbow-threaded-1-2.png'),
  blue_female_adaptor: require('../../../assets/products/blue-female-adaptor-1-2.png'),
  blue_female_plug: require('../../../assets/products/blue-female-plug-1-2.png'),
  blue_male_adaptor: require('../../../assets/products/blue-male-adaptor-1-2.png'),
  blue_male_plug: require('../../../assets/products/blue-male-plug-1-2.png'),
  blue_tee_plain: require('../../../assets/products/blue-tee-plain-1-2.png'),
  blue_tee_threaded: require('../../../assets/products/blue-tee-threaded-1-2.png'),
  cup_hook_3_4: require('../../../assets/products/cup-hook-3-4.png'),
  cup_hook_7_8: require('../../../assets/products/cup-hook-7-8.png'),
  cup_hook_1: require('../../../assets/products/cup-hook-1.png'),
  cup_hook_1_1_4: require('../../../assets/products/cup-hook-1-1-4.png'),
  cup_hook_2: require('../../../assets/products/cup-hook-2.png'),
  gi_nipple_10_s20: require('../../../assets/products/gi-nipple-1-2-x-10-s20.png'),
  gi_nipple_10_s40: require('../../../assets/products/gi-nipple-1-2-x-10-s40.png'),
  gi_nipple_12_s20: require('../../../assets/products/gi-nipple-1-2-x-12-s20.png'),
  gi_nipple_12_s40: require('../../../assets/products/gi-nipple-1-2-x-12-s40.png'),
};

export const getProductImageSource = (product) => {
  if (!product) return null;

  // 1. Explicit require / imported asset (number in React Native packager)
  if (typeof product.image === 'number') {
    return product.image;
  }

  // 2. Already an ImageSource object with uri
  if (typeof product.image === 'object' && product.image !== null && product.image.uri) {
    return product.image;
  }

  // 3. String image URI
  if (typeof product.image === 'string' && product.image.trim()) {
    const img = product.image.trim();
    if (img.includes('aluminum-screen')) {
      return LOCAL_PRODUCT_IMAGES.aluminum_screen;
    }
    if (img.includes('hardware-cloth') || img.includes('ayagan')) {
      return LOCAL_PRODUCT_IMAGES.hardware_cloth;
    }
    if (img.includes('blue-coupling-reducer') || img.includes('reducer')) {
      return LOCAL_PRODUCT_IMAGES.blue_coupling_reducer;
    }
    if (img.includes('blue-coupling')) {
      return LOCAL_PRODUCT_IMAGES.blue_coupling;
    }
    if (img.includes('blue-elbow-threaded') || img.includes('elbow-threaded')) {
      return LOCAL_PRODUCT_IMAGES.blue_elbow_threaded;
    }
    if (img.includes('blue-elbow')) {
      return LOCAL_PRODUCT_IMAGES.blue_elbow_plain;
    }
    if (img.includes('female-adaptor') || img.includes('female_adaptor')) {
      return LOCAL_PRODUCT_IMAGES.blue_female_adaptor;
    }
    if (img.includes('female-plug') || img.includes('female_plug')) {
      return LOCAL_PRODUCT_IMAGES.blue_female_plug;
    }
    if (img.includes('male-adaptor') || img.includes('male_adaptor')) {
      return LOCAL_PRODUCT_IMAGES.blue_male_adaptor;
    }
    if (img.includes('male-plug') || img.includes('male_plug')) {
      return LOCAL_PRODUCT_IMAGES.blue_male_plug;
    }
    if (img.includes('tee-threaded') || img.includes('tee_threaded')) {
      return LOCAL_PRODUCT_IMAGES.blue_tee_threaded;
    }
    if (img.includes('tee-plain') || img.includes('tee_plain') || img.includes('blue-tee')) {
      return LOCAL_PRODUCT_IMAGES.blue_tee_plain;
    }
    if (img.includes('cup-hook-3-4')) {
      return LOCAL_PRODUCT_IMAGES.cup_hook_3_4;
    }
    if (img.includes('cup-hook-7-8') || img.includes('cup-hook-78')) {
      return LOCAL_PRODUCT_IMAGES.cup_hook_7_8;
    }
    if (img.includes('cup-hook-1-1-4') || img.includes('cup-hook-1-14')) {
      return LOCAL_PRODUCT_IMAGES.cup_hook_1_1_4;
    }
    if (img.includes('cup-hook-2')) {
      return LOCAL_PRODUCT_IMAGES.cup_hook_2;
    }
    if (img.includes('cup-hook-1')) {
      return LOCAL_PRODUCT_IMAGES.cup_hook_1;
    }
    if (img.includes('gi-nipple-1-2-x-10-s20') || img.includes('gi-nipple-10-s20')) {
      return LOCAL_PRODUCT_IMAGES.gi_nipple_10_s20;
    }
    if (img.includes('gi-nipple-1-2-x-10-s40') || img.includes('gi-nipple-10-s40')) {
      return LOCAL_PRODUCT_IMAGES.gi_nipple_10_s40;
    }
    if (img.includes('gi-nipple-1-2-x-12-s20') || img.includes('gi-nipple-12-s20')) {
      return LOCAL_PRODUCT_IMAGES.gi_nipple_12_s20;
    }
    if (img.includes('gi-nipple-1-2-x-12-s40') || img.includes('gi-nipple-12-s40')) {
      return LOCAL_PRODUCT_IMAGES.gi_nipple_12_s40;
    }
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
      return { uri: img };
    }
    // Relative path in Web preview
    if (Platform.OS === 'web') {
      return { uri: img };
    }
  }

  // 4. Name or ID match for Aluminum Screen, Hardware Cloth, Blue Fittings, Cup Hooks, and GI Nipples
  const name = String(product.name || '').toLowerCase();
  if (name.includes('aluminum screen') || product.id === 16 || product.id === 17) {
    return LOCAL_PRODUCT_IMAGES.aluminum_screen;
  }
  if (name.includes('hardware cloth') || name.includes('ayagan') || product.id === 19) {
    return LOCAL_PRODUCT_IMAGES.hardware_cloth;
  }
  if (name.includes('coupling reducer') || product.id === 52) {
    return LOCAL_PRODUCT_IMAGES.blue_coupling_reducer;
  }
  if (name.includes('blue coupling') || product.id === 49 || product.id === 33) {
    return LOCAL_PRODUCT_IMAGES.blue_coupling;
  }
  if (name.includes('elbow threaded') || product.id === 44 || product.id === 31) {
    return LOCAL_PRODUCT_IMAGES.blue_elbow_threaded;
  }
  if (name.includes('blue elbow') || product.id === 43 || product.id === 30 || product.id === 9) {
    return LOCAL_PRODUCT_IMAGES.blue_elbow_plain;
  }
  if (name.includes('female adaptor') || product.id === 47) {
    return LOCAL_PRODUCT_IMAGES.blue_female_adaptor;
  }
  if (name.includes('female plug') || product.id === 50) {
    return LOCAL_PRODUCT_IMAGES.blue_female_plug;
  }
  if (name.includes('male adaptor') || product.id === 48) {
    return LOCAL_PRODUCT_IMAGES.blue_male_adaptor;
  }
  if (name.includes('male plug') || product.id === 51) {
    return LOCAL_PRODUCT_IMAGES.blue_male_plug;
  }
  if (name.includes('tee threaded') || product.id === 46) {
    return LOCAL_PRODUCT_IMAGES.blue_tee_threaded;
  }
  if (name.includes('tee plain') || name.includes('blue tee') || product.id === 45 || product.id === 32) {
    return LOCAL_PRODUCT_IMAGES.blue_tee_plain;
  }
  if (name.includes('cup hook')) {
    if (name.includes('3/4') || product.id === 84) {
      return LOCAL_PRODUCT_IMAGES.cup_hook_3_4;
    }
    if (name.includes('7/8') || product.id === 85) {
      return LOCAL_PRODUCT_IMAGES.cup_hook_7_8;
    }
    if (name.includes('1-1/4') || product.id === 87) {
      return LOCAL_PRODUCT_IMAGES.cup_hook_1_1_4;
    }
    if (name.includes('2') || product.id === 88) {
      return LOCAL_PRODUCT_IMAGES.cup_hook_2;
    }
    if (name.includes('1') || product.id === 86) {
      return LOCAL_PRODUCT_IMAGES.cup_hook_1;
    }
  }
  if (name.includes('gi nipple') || name.includes('g.i. nipple') || name.includes('nipple')) {
    if ((name.includes('10') && (name.includes('s-20') || name.includes('s20'))) || product.id === 57) {
      return LOCAL_PRODUCT_IMAGES.gi_nipple_10_s20;
    }
    if ((name.includes('10') && (name.includes('s-40') || name.includes('s40'))) || product.id === 63) {
      return LOCAL_PRODUCT_IMAGES.gi_nipple_10_s40;
    }
    if ((name.includes('12') && (name.includes('s-20') || name.includes('s20'))) || product.id === 58) {
      return LOCAL_PRODUCT_IMAGES.gi_nipple_12_s20;
    }
    if ((name.includes('12') && (name.includes('s-40') || name.includes('s40'))) || product.id === 64) {
      return LOCAL_PRODUCT_IMAGES.gi_nipple_12_s40;
    }
  }

  return null;
};

