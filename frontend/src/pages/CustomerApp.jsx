import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Home, ShoppingBag, ShoppingCart, ClipboardList, User,
  Search, Camera, Star, Plus, Minus, Check, ArrowRight, ArrowLeft,
  X, Truck, MapPin, CreditCard, Tag, Sparkles, AlertCircle,
  LogOut, Phone, Mail, Building, ChevronRight, RefreshCw, Send,
  Heart, Eye, Flame, ShieldCheck, Clock, Award, Filter,
  Layers, Package, CheckCircle2, ChevronDown, Share2, Smartphone,
  HelpCircle, Info, MessageSquare, SlidersHorizontal, Grid, List,
  Lock, ArrowUpRight, RotateCcw, ThumbsUp
} from 'lucide-react'
import { addSharedMobileOrder, getSharedOrders } from '../api'
import LogoutConfirmationModal from '../components/LogoutConfirmationModal'
import '../styles/customer.css'



// ============================================================================
// REALISTIC HARDWARE & CONSTRUCTION CATALOG DATA (PHILIPPINE STANDARDS)
// ============================================================================
const HARDWARE_CATALOG = [
  {
    id: 1,
    name: 'Coco Lumber 2×3×10 (Seasoned)',
    brand: 'JEM Timber',
    category: 'Lumber & Wood',
    category_id: 'lumber',
    base_price: 120,
    unit: 'piece',
    stock_quantity: 180,
    rating: 4.9,
    reviews_count: 342,
    badge: 'Best Seller',
    badgeClass: 'best-seller',
    emoji: '🪵',
    description: 'Selected well-seasoned Philippine coco lumber 2x3x10ft ideal for structural formworks, scaffolding, trusses, and general framing works.',
    specs: {
      Dimensions: '2" × 3" × 10 ft',
      Moisture: 'Air-dried seasoned',
      Treatment: 'Anti-termite treated',
      Application: 'Formworks & Framing',
      Origin: 'Quezon Province'
    },
    images: ['🪵', '📐', '🏗️']
  },
  {
    id: 2,
    name: 'Portland Cement Type 1 (40kg)',
    brand: 'Holcim Excel',
    category: 'Cement & Masonry',
    category_id: 'cement',
    base_price: 285,
    unit: 'bag',
    stock_quantity: 350,
    rating: 4.9,
    reviews_count: 528,
    badge: 'JEM Choice',
    badgeClass: 'jem-choice',
    emoji: '🧱',
    description: 'Premium general purpose hydraulic cement formulated with advanced mineral additives for high early strength and smooth concrete workability.',
    specs: {
      Weight: '40 kg bag',
      Standard: 'PNS 07 / ASTM C150 Type 1',
      SettingTime: 'Initial: 120 min | Final: 240 min',
      Compressive: '28-Day > 32.5 MPa',
      Application: 'Columns, Slabs, Beams, Hollow Blocks'
    },
    images: ['🧱', '🏗️', '📦']
  },
  {
    id: 3,
    name: 'GI Corrugated Roofing Sheet G24 (8ft)',
    brand: 'Union Galvasteel',
    category: 'Roofing & Steel',
    category_id: 'roofing',
    base_price: 380,
    unit: 'sheet',
    stock_quantity: 24,
    rating: 4.7,
    reviews_count: 198,
    badge: 'Low Stock',
    badgeClass: 'low-stock',
    emoji: '🏠',
    description: 'Commercial grade hot-dipped galvanized iron corrugated roofing sheet gauge 24 (0.50mm) providing superior corrosion resistance and monsoon defense.',
    specs: {
      Thickness: '0.50mm (Gauge 24)',
      Length: '8 feet (2.44 meters)',
      Coating: 'Zinc Galvanized Z120',
      Profile: 'Standard Wave Corrugation',
      Warranty: '10 Years Rust Defense'
    },
    images: ['🏠', '🛠️', '✨']
  },
  {
    id: 4,
    name: 'PVC Sanitary Pipe Series 1000 4" × 3m',
    brand: 'Emerald Pipes',
    category: 'Plumbing Supplies',
    category_id: 'plumbing',
    base_price: 195,
    unit: 'length',
    stock_quantity: 145,
    rating: 4.6,
    reviews_count: 132,
    badge: 'Sale 15% OFF',
    badgeClass: 'sale',
    emoji: '🔧',
    description: 'High-impact unplasticized polyvinyl chloride (uPVC) sanitary drainage and vent pipe built to ISO and PNS specifications for residential plumbing.',
    specs: {
      Diameter: '4 inches (110 mm)',
      Length: '3.0 meters',
      Series: 'Series 1000 Heavy Duty',
      JointType: 'Solvent Cement Socket',
      Compliance: 'PNS 1957 / ISO 4435'
    },
    images: ['🔧', '🚿', '📏']
  },
  {
    id: 5,
    name: 'THHN Copper Electrical Wire 2.0mm² (150m)',
    brand: 'Phelps Dodge',
    category: 'Electrical Supplies',
    category_id: 'electrical',
    base_price: 2450,
    unit: 'box',
    stock_quantity: 42,
    rating: 4.9,
    reviews_count: 87,
    badge: 'Best Seller',
    badgeClass: 'best-seller',
    emoji: '⚡',
    description: '100% pure electrolytic soft annealed copper building wire with thermoplastic insulation and tough nylon jacket for high heat and oil resistance.',
    specs: {
      Gauge: '2.0mm² (#14 AWG)',
      Length: '150 meters per box',
      VoltageRating: '600 Volts / 90°C',
      Certification: 'BPS Certified / UL Listed',
      Conductor: '99.99% Pure Copper'
    },
    images: ['⚡', '💡', '🔌']
  },
  {
    id: 6,
    name: 'Boysen Permacoat Latex Paint White 4L',
    brand: 'Boysen Paints',
    category: 'Paint & Accessories',
    category_id: 'paint',
    base_price: 740,
    unit: 'gallon',
    stock_quantity: 65,
    rating: 4.8,
    reviews_count: 215,
    badge: 'JEM Choice',
    badgeClass: 'jem-choice',
    emoji: '🎨',
    description: '100% acrylic latex paint with excellent hiding power, dirt pick-up resistance, and mold prevention for interior and exterior concrete and masonry walls.',
    specs: {
      Volume: '4 Liters (1 Gallon)',
      Finish: 'Semi-Gloss / Flat White',
      Coverage: '25-30 sq.m per coat',
      DryingTime: 'Touch: 30 min | Recoat: 2 hrs',
      Cleanup: 'Clean Water'
    },
    images: ['🎨', '🖌️', '✨']
  },
  {
    id: 7,
    name: 'Deformed Steel Rebar 12mm × 6m Grade 40',
    brand: 'SteelAsia',
    category: 'Roofing & Steel',
    category_id: 'roofing',
    base_price: 285,
    unit: 'length',
    stock_quantity: 210,
    rating: 4.9,
    reviews_count: 310,
    badge: 'Best Seller',
    badgeClass: 'best-seller',
    emoji: '🏗️',
    description: 'Micro-alloyed high-tensile hot rolled deformed steel reinforcing bars for concrete structures, seismic-resistant foundation footings, and columns.',
    specs: {
      Diameter: '12 mm',
      Length: '6.0 meters',
      Grade: 'Grade 40 (275 MPa)',
      Standard: 'PNS 49:2002',
      Weight: '5.33 kg / piece'
    },
    images: ['🏗️', '🔩', '📐']
  },
  {
    id: 8,
    name: 'Bosch Angle Grinder 4" 750W (GWS 750)',
    brand: 'Bosch Professional',
    category: 'Tools & Equipment',
    category_id: 'tools',
    base_price: 2890,
    unit: 'unit',
    stock_quantity: 18,
    rating: 4.9,
    reviews_count: 94,
    badge: 'JEM Choice',
    badgeClass: 'jem-choice',
    emoji: '⚙️',
    description: 'Professional high-torque 750W 4-inch angle grinder with compact ergonomic grip, burst-proof guard, and dust protection motor ventilation.',
    specs: {
      PowerInput: '750 Watts',
      DiscDiameter: '100 mm (4")',
      NoLoadSpeed: '11,000 RPM',
      SpindleThread: 'M10',
      Warranty: '1 Year Bosch Warranty'
    },
    images: ['⚙️', '🧰', '⚡']
  },
  {
    id: 9,
    name: 'HardieFlex Fiber Cement Board 4.5mm (4x8ft)',
    brand: 'James Hardie',
    category: 'Cement & Masonry',
    category_id: 'cement',
    base_price: 495,
    unit: 'sheet',
    stock_quantity: 90,
    rating: 4.8,
    reviews_count: 142,
    badge: 'Sale 10% OFF',
    badgeClass: 'sale',
    emoji: '📋',
    description: 'Durable, moisture-resistant, and fire-retardant fiber cement board engineered for interior ceilings, eaves, and dry wall partitions.',
    specs: {
      Thickness: '4.5 mm',
      Dimensions: '4 ft × 8 ft (1220 × 2440mm)',
      FireRating: 'Class 0 Fire Rated',
      PestResistance: '100% Termite Resistant',
      Weight: '20.5 kg / sheet'
    },
    images: ['📋', '🏠', '🔨']
  },
  {
    id: 10,
    name: 'Common Wire Nails 4" (CWN) 1kg Pack',
    brand: 'JEM Hardware',
    category: 'Hardware & Fasteners',
    category_id: 'hardware',
    base_price: 85,
    unit: 'kg',
    stock_quantity: 260,
    rating: 4.9,
    reviews_count: 412,
    badge: 'Best Seller',
    badgeClass: 'best-seller',
    emoji: '📌',
    description: 'Bright carbon steel common wire nails with diamond points and checkered heads designed for heavy timber framing and scaffold construction.',
    specs: {
      Length: '4 inches (100 mm)',
      HeadType: 'Checkered Flat Head',
      Point: 'Diamond Bevel Point',
      PackWeight: '1.0 kg approx. 65 pcs',
      Material: 'High-Tensile Wire'
    },
    images: ['📌', '🔨', '📦']
  },
  {
    id: 11,
    name: 'Industrial Safety Helmet & High-Vis Vest Set',
    brand: 'SafetyPro',
    category: 'Safety Equipment',
    category_id: 'safety',
    base_price: 360,
    unit: 'set',
    stock_quantity: 75,
    rating: 4.8,
    reviews_count: 88,
    badge: 'JEM Choice',
    badgeClass: 'jem-choice',
    emoji: '🦺',
    description: 'OSHA/DOLE compliant hard hat with 4-point ratchet suspension combined with heavy-duty breathable reflective safety vest.',
    specs: {
      HelmetMaterial: 'High-Density Polyethylene (HDPE)',
      VestClass: 'Class 2 High-Visibility',
      Color: 'Safety Yellow / Orange',
      Certification: 'ANSI Z89.1 / EN 397',
      Size: 'Adjustable universal fit'
    },
    images: ['🦺', '👷', '🛡️']
  },
  {
    id: 12,
    name: 'Makita Cordless Driver Drill 12V Max CXT',
    brand: 'Makita',
    category: 'Tools & Equipment',
    category_id: 'tools',
    base_price: 4350,
    unit: 'set',
    stock_quantity: 12,
    rating: 4.9,
    reviews_count: 67,
    badge: 'JEM Choice',
    badgeClass: 'jem-choice',
    emoji: '🛠️',
    description: 'Ultra-compact cordless driver drill with 2-speed gearbox, 20 clutch torque settings, built-in LED worklight, and 2x 1.5Ah batteries with charger.',
    specs: {
      Voltage: '12V Max Lithium-Ion',
      MaxTorque: '30 N·m (270 in.lbs)',
      ChuckCapacity: '0.8 - 10 mm (3/8")',
      Included: '2x Batteries, Rapid Charger, Hard Case',
      Warranty: '1 Year Makita Warranty'
    },
    images: ['🛠️', '🔋', '💼']
  }
]

const CATEGORIES_DATA = [
  { id: 'all', name: 'All Products', icon: '🏪', count: 12 },
  { id: 'cement', name: 'Cement & Masonry', icon: '🧱', count: 48 },
  { id: 'lumber', name: 'Lumber & Wood', icon: '🪵', count: 32 },
  { id: 'roofing', name: 'Roofing & Steel', icon: '🏠', count: 26 },
  { id: 'tools', name: 'Tools & Equipment', icon: '⚙️', count: 64 },
  { id: 'electrical', name: 'Electrical Supplies', icon: '⚡', count: 52 },
  { id: 'plumbing', name: 'Plumbing Supplies', icon: '🔧', count: 38 },
  { id: 'paint', name: 'Paint & Accessories', icon: '🎨', count: 40 },
  { id: 'hardware', name: 'Hardware & Fasteners', icon: '📌', count: 85 },
  { id: 'safety', name: 'Safety Equipment', icon: '🦺', count: 19 }
]

const PROMO_BANNERS = [
  {
    id: 1,
    badge: 'Mega Build Promo',
    title: 'Up to 35% OFF on Cement & Rebars',
    subtitle: 'Free delivery for orders over ₱5,000 within Laguna',
    code: 'BUILD35',
    icon: '🏗️',
    color: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
  },
  {
    id: 2,
    badge: 'Flash Power Tools',
    title: 'Bosch & Makita Power Deals',
    subtitle: 'Get ₱500 cash voucher on all power tool kits',
    code: 'TOOLPRO',
    icon: '⚙️',
    color: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)'
  },
  {
    id: 3,
    badge: 'Rainy Season Defense',
    title: 'Roofing & Waterproofing Sale',
    subtitle: 'Galvasteel sheets & Boysen elastomeric coatings',
    code: 'DRYROOF',
    icon: '🌧️',
    color: 'linear-gradient(135deg, #0369a1 0%, #0c4a6e 100%)'
  }
]

const SAMPLE_REVIEWS = [
  {
    id: 1,
    name: 'Engr. Michael Reyes',
    date: '2 days ago',
    rating: 5,
    comment: 'Super fast delivery to our job site in San Pablo! The Holcim cement bags were fresh and dry with zero moisture hardening. Will order 100 more bags for our second floor pouring.'
  },
  {
    id: 2,
    name: 'Mang Cardo (Contractor)',
    date: '1 week ago',
    rating: 5,
    comment: 'Original Phelps Dodge THHN wire. Authentic with pure copper inside, safe for our commercial electrical roughing.'
  },
  {
    id: 3,
    name: 'Rowena Bautista',
    date: '2 weeks ago',
    rating: 5,
    comment: 'Very accommodating customer support. GCash payment was instant and driver Kuya Dante called 15 minutes before arrival.'
  }
]

const SAMPLE_NOTIFICATIONS = []

export default function CustomerApp() {
  // Navigation & Screen Control
  const [currentScreen, setCurrentScreen] = useState('home')
  const [activeBottomNav, setActiveBottomNav] = useState('home')
  const [deviceFrameMode, setDeviceFrameMode] = useState(true)
  
  // User Authentication State
  const [user, setUser] = useState(() => {
    const stored = getStoredUser()
    if (stored) {
      return {
        name: stored.name || 'Customer',
        email: stored.email || '',
        phone: stored.phone || '',
        tier: 'Member',
        points: 0,
        address: stored.address || ''
      }
    }
    return {
      name: 'Customer',
      email: '',
      phone: '',
      tier: 'Member',
      points: 0,
      address: ''
    }
  })
  const [authMode, setAuthMode] = useState('login')
  const [authPhone, setAuthPhone] = useState('')
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState('')

  // Onboarding Carousel State
  const [onboardingIndex, setOnboardingIndex] = useState(0)

  // Catalog, Search & Filter State
  const [products] = useState(HARDWARE_CATALOG)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [homeSubTab, setHomeSubTab] = useState('featured')
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [selectedBrands, setSelectedBrands] = useState([])
  const [priceRangeMax, setPriceRangeMax] = useState(5000)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState('popular')

  // Product Details Screen State
  const [selectedProduct, setSelectedProduct] = useState(HARDWARE_CATALOG[0])
  const [detailQuantity, setDetailQuantity] = useState(1)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Wishlist State (starts empty)
  const [wishlist, setWishlist] = useState([])

  // Shopping Cart & Vouchers State (starts empty)
  const [cart, setCart] = useState([])
  const [voucherCode, setVoucherCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(0)
  const [appliedVoucherName, setAppliedVoucherName] = useState('')

  // Checkout & Fulfillment State
  const [checkoutFulfillment, setCheckoutFulfillment] = useState('delivery')
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('gcash')
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const [selectedAddress, setSelectedAddress] = useState('')

  // Payment Simulator State
  const [simPhone, setSimPhone] = useState('')
  const [simOtp, setSimOtp] = useState(['', '', '', '', '', ''])
  const [simStep, setSimStep] = useState('login')
  const [simLoading, setSimLoading] = useState(false)

  // Orders State & Tracking (Live synchronized with central JEM backend & staff dashboard)
  const [orders, setOrders] = useState(() => {
    const shared = getSharedOrders()
    return shared.map(o => ({
      id: o.order_number || `#${o.id}`,
      rawId: o.id,
      date: o.created_at ? new Date(o.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today',
      status: o.status === 'out_for_delivery' ? 'to_receive' : (o.status === 'completed' ? 'completed' : (o.status === 'cancelled' ? 'cancelled' : 'to_ship')),
      statusLabel: o.status === 'pending' ? 'Pending Store Confirmation' : (o.status === 'confirmed' ? 'Order Confirmed' : (o.status === 'processing' ? 'Warehouse Preparing' : (o.status === 'ready' ? 'Ready for Pickup' : (o.status === 'out_for_delivery' ? 'Out for Delivery 🚚' : (o.status === 'completed' ? 'Delivered & Received ✅' : 'Cancelled'))))),
      badgeClass: o.status === 'completed' ? 'completed' : (o.status === 'out_for_delivery' ? 'to-receive' : 'to-ship'),
      total: o.total || 0,
      payment_method: (o.payment_method || 'cod').toUpperCase() + (o.payment_method === 'cod' ? ' (Pay on delivery)' : ' (Paid)'),
      fulfillment: o.delivery_type === 'pickup' ? 'Store Counter Pickup' : 'Standard Truck Delivery',
      driver: o.status === 'out_for_delivery' ? { name: 'Kuya Dante', phone: '0918-777-8899', vehicle: 'Isuzu Elf (NBD-9124)' } : null,
      eta: o.status === 'out_for_delivery' ? 'Today, ~11:30 AM' : '1-2 Days standard dispatch',
      items: (o.items || []).map(it => ({
        name: it.product?.name || it.name || 'Hardware Supply',
        qty: it.quantity || it.qty || 1,
        price: it.unit_price || it.price || 0,
        emoji: it.emoji || '🧱'
      }))
    }))
  })
  const [activeOrderTab, setActiveOrderTab] = useState('all')
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState(orders[0])
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState(null)

  // Listen for real-time status updates from Staff Web Dashboard
  useEffect(() => {
    const syncWithCentralOrders = () => {
      const shared = getSharedOrders()
      const formatted = shared.map(o => ({
        id: o.order_number || `#${o.id}`,
        rawId: o.id,
        date: o.created_at ? new Date(o.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today',
        status: o.status === 'out_for_delivery' ? 'to_receive' : (o.status === 'completed' ? 'completed' : (o.status === 'cancelled' ? 'cancelled' : 'to_ship')),
        statusLabel: o.status === 'pending' ? 'Pending Store Confirmation' : (o.status === 'confirmed' ? 'Order Confirmed' : (o.status === 'processing' ? 'Warehouse Preparing' : (o.status === 'ready' ? 'Ready for Pickup' : (o.status === 'out_for_delivery' ? 'Out for Delivery 🚚' : (o.status === 'completed' ? 'Delivered & Received ✅' : 'Cancelled'))))),
        badgeClass: o.status === 'completed' ? 'completed' : (o.status === 'out_for_delivery' ? 'to-receive' : 'to-ship'),
        total: o.total || 0,
        payment_method: (o.payment_method || 'cod').toUpperCase() + (o.payment_method === 'cod' ? ' (Pay on delivery)' : ' (Paid)'),
        fulfillment: o.delivery_type === 'pickup' ? 'Store Counter Pickup' : 'Standard Truck Delivery',
        driver: o.status === 'out_for_delivery' ? { name: 'Kuya Dante', phone: '0918-777-8899', vehicle: 'Isuzu Elf (NBD-9124)' } : null,
        eta: o.status === 'out_for_delivery' ? 'Today, ~11:30 AM' : '1-2 Days standard dispatch',
        items: (o.items || []).map(it => ({
          name: it.product?.name || it.name || 'Hardware Supply',
          qty: it.quantity || it.qty || 1,
          price: it.unit_price || it.price || 0,
          emoji: it.emoji || '🧱'
        }))
      }))
      setOrders(formatted)
    }

    const interval = setInterval(syncWithCentralOrders, 3000)
    return () => clearInterval(interval)
  }, [])


  // Notifications State
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS)
  const [notificationTab, setNotificationTab] = useState('all')

  // Modals & Sheets
  const [showCameraScanner, setShowCameraScanner] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [toastMsg, setToastMsg] = useState('')


  // Banner Carousel Auto Timer
  const [bannerIndex, setBannerIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % PROMO_BANNERS.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  // Flash Sale Countdown Timer
  const [flashTime, setFlashTime] = useState({ hrs: 3, mins: 42, secs: 18 })
  useEffect(() => {
    const timer = setInterval(() => {
      setFlashTime(prev => {
        if (prev.secs > 0) return { ...prev, secs: prev.secs - 1 }
        if (prev.mins > 0) return { ...prev, mins: 59, secs: 59 }
        if (prev.hrs > 0) return { ...prev, hrs: prev.hrs - 1, mins: 59, secs: 59 }
        return { hrs: 0, mins: 0, secs: 0 }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const triggerToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  // Handle Cart Operations
  const handleAddToCart = (product, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + qty } : item)
      }
      return [...prev, { ...product, quantity: qty, selected: true }]
    })
    triggerToast(`Added ${product.name} to cart! 🛒`)
  }

  const handleUpdateCartQty = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : null
      }
      return item
    }).filter(Boolean))
  }

  const handleToggleCartItem = (productId) => {
    setCart(prev => prev.map(item => item.id === productId ? { ...item, selected: !item.selected } : item))
  }

  const handleToggleSelectAll = () => {
    const allSelected = cart.every(i => i.selected)
    setCart(prev => prev.map(i => ({ ...i, selected: !allSelected })))
  }

  const handleToggleWishlist = (product) => {
    setWishlist(prev => {
      const exists = prev.some(i => i.id === product.id)
      if (exists) {
        triggerToast(`Removed from Wishlist`)
        return prev.filter(i => i.id !== product.id)
      } else {
        triggerToast(`Saved to Wishlist! ❤️`)
        return [...prev, product]
      }
    })
  }

  const handleApplyVoucher = (e) => {
    if (e) e.preventDefault()
    const code = voucherCode.trim().toUpperCase()
    if (code === 'JEMBUILD10' || code === 'BUILD10') {
      setAppliedDiscount(200)
      setAppliedVoucherName('JEMBUILD10 (-₱200)')
      triggerToast('Voucher Applied: ₱200 OFF! 🎉')
    } else if (code === 'FREESHIP') {
      setAppliedDiscount(150)
      setAppliedVoucherName('FREESHIP (-₱150 Delivery)')
      triggerToast('Voucher Applied: Free Shipping Discount! 🚚')
    } else if (code === 'WELCOME50') {
      setAppliedDiscount(100)
      setAppliedVoucherName('WELCOME50 (-₱100)')
      triggerToast('Voucher Applied: ₱100 New Builder Discount!')
    } else {
      triggerToast('Invalid or expired voucher code.')
    }
  }

  // Cart Subtotals
  const selectedCartItems = cart.filter(i => i.selected)
  const cartSubtotal = selectedCartItems.reduce((acc, i) => acc + (i.base_price * i.quantity), 0)
  const deliveryFee = checkoutFulfillment === 'pickup' ? 0 : (checkoutFulfillment === 'express' ? 350 : 200)
  const cartGrandTotal = Math.max(cartSubtotal + deliveryFee - appliedDiscount, 0)

  // Filtered Products for Catalog & Search
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory || p.category.toLowerCase().includes(selectedCategory.toLowerCase())
      const q = searchQuery.toLowerCase().trim()
      const matchQuery = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      const matchBrand = selectedBrands.length === 0 || selectedBrands.includes(p.brand)
      const matchPrice = p.base_price <= priceRangeMax
      const matchStock = !inStockOnly || p.stock_quantity > 0
      return matchCat && matchQuery && matchBrand && matchPrice && matchStock
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.base_price - b.base_price
      if (sortBy === 'price_desc') return b.base_price - a.base_price
      if (sortBy === 'rating') return b.rating - a.rating
      return b.reviews_count - a.reviews_count
    })
  }, [products, selectedCategory, searchQuery, selectedBrands, priceRangeMax, inStockOnly, sortBy])

  // Navigation Helper
  const navigateTo = (screen, bottomTab = null) => {
    setCurrentScreen(screen)
    if (bottomTab) setActiveBottomNav(bottomTab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Checkout & Payment Handlers
  const handleProceedToPayment = () => {
    if (selectedCartItems.length === 0) {
      triggerToast('Please select at least 1 item to checkout.')
      return
    }
    if (checkoutPaymentMethod === 'gcash' || checkoutPaymentMethod === 'maya') {
      setSimStep('login')
      setCurrentScreen('payment_sim')
    } else {
      handleFinalizeOrder()
    }
  }

  const handleFinalizeOrder = () => {
    const newOrderId = `JEM-2026-${Math.floor(1000 + Math.random() * 9000)}`
    const orderPayload = {
      order_number: newOrderId,
      customer_name: user?.name || 'Engr. Juan Dela Cruz',
      customer_phone: user?.phone || '0917-555-1234',
      customer_email: user?.email || 'juan.contractor@gmail.com',
      total: cartGrandTotal,
      subtotal: cartSubtotal,
      shipping_fee: deliveryFee,
      payment_method: checkoutPaymentMethod,
      delivery_type: checkoutFulfillment,
      delivery_address: selectedAddress,
      notes: checkoutNotes,
      status: 'pending',
      items: selectedCartItems.map(i => ({
        product_id: i.id,
        name: i.name,
        quantity: i.quantity,
        unit_price: i.base_price,
        emoji: i.emoji
      }))
    }

    // Save to shared database store (instantly visible on Staff & Admin Web Dashboards)
    addSharedMobileOrder(orderPayload)

    const newOrder = {
      id: newOrderId,
      date: 'Just now',
      status: 'to_ship',
      statusLabel: 'Pending Store Confirmation',
      badgeClass: 'to-ship',
      total: cartGrandTotal,
      payment_method: checkoutPaymentMethod.toUpperCase() + (checkoutPaymentMethod === 'cod' ? ' (Pay on delivery)' : ' (Paid)'),
      fulfillment: checkoutFulfillment === 'pickup' ? 'Store Counter Pickup' : (checkoutFulfillment === 'express' ? 'Express Same-Day' : 'Standard Delivery'),
      driver: null,
      eta: checkoutFulfillment === 'express' ? 'Today within 3 hours' : 'Tomorrow morning',
      items: selectedCartItems.map(i => ({ name: i.name, qty: i.quantity, price: i.base_price, emoji: i.emoji }))
    }
    setOrders(prev => [newOrder, ...prev])
    setSelectedOrderForTracking(newOrder)
    setCart(prev => prev.filter(i => !i.selected))
    triggerToast('Order submitted to JEM Warehouse! 🏗️')
    setCurrentScreen('success')
  }


  const handleSimulatePaymentProcess = () => {
    setSimLoading(true)
    setTimeout(() => {
      setSimLoading(false)
      setSimStep('success')
      setTimeout(() => {
        handleFinalizeOrder()
      }, 1500)
    }, 1800)
  }

  return (
    <div className="customer-app-root">
      {/* Toast Floating Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#ffffff',
          padding: '10px 22px',
          borderRadius: '9999px',
          fontSize: '13px',
          fontWeight: '700',
          zIndex: 9999,
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid rgba(249, 115, 22, 0.4)',
          animation: 'fadeIn 0.2s ease'
        }}>
          <Sparkles size={16} color="#f97316" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Desktop Prototype Screen Switcher Toolbar */}
      <div className="prototype-toolbar">
        <div className="prototype-branding">
          <span className="prototype-badge">JEM Mobile UI</span>
          <span className="prototype-title">Shopee-Style Customer Experience</span>
        </div>

        <div className="prototype-screen-select">
          {[
            { id: 'splash', label: '1. Splash' },
            { id: 'onboarding', label: '2. Onboarding' },
            { id: 'auth', label: '3. Login/Auth' },
            { id: 'home', label: '4. Home' },
            { id: 'search', label: '5. Search/Filter' },
            { id: 'catalog', label: '6. Catalog' },
            { id: 'details', label: '7. Details' },
            { id: 'cart', label: '8. Cart' },
            { id: 'checkout', label: '9. Checkout' },
            { id: 'payment_sim', label: '10. Payment' },
            { id: 'success', label: '11. Success' },
            { id: 'orders', label: '12. My Orders' },
            { id: 'tracking', label: '13. Live Tracking' },
            { id: 'notifications', label: '14. Alerts' },
            { id: 'wishlist', label: '15. Wishlist' },
            { id: 'profile', label: '16. Profile' }
          ].map((screen) => (
            <button
              key={screen.id}
              className={`prototype-screen-btn ${currentScreen === screen.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentScreen(screen.id)
                if (['home', 'catalog', 'cart', 'orders', 'profile'].includes(screen.id)) {
                  setActiveBottomNav(screen.id)
                }
              }}
            >
              {screen.label}
            </button>
          ))}
        </div>

        <div className="prototype-actions">
          <button
            className={`prototype-toggle-frame ${deviceFrameMode ? 'active' : ''}`}
            onClick={() => setDeviceFrameMode(!deviceFrameMode)}
            title="Toggle Device Mockup Frame"
          >
            <Smartphone size={14} />
            <span>{deviceFrameMode ? 'Mobile Frame' : 'Full Width'}</span>
          </button>
        </div>
      </div>

      {/* Main Mobile App Frame */}
      <div className={`device-frame-container ${deviceFrameMode ? 'framed' : 'fullscreen'}`}>
        
        {/* Dynamic Island & Status Bar */}
        <div className="mobile-status-bar">
          <span className="status-time">9:41 AM</span>
          <div className="dynamic-island">
            <span className="island-camera"></span>
            <span className="island-sensor"></span>
          </div>
          <div className="status-icons">
            <span>5G</span>
            <span>100% 🔋</span>
          </div>
        </div>

        {/* Core Mobile Application Screen Router */}
        <div className="customer-app">

          {/* ================================================================
              SCREEN 1: SPLASH SCREEN
              ================================================================ */}
          {currentScreen === 'splash' && (
            <div className="splash-screen">
              <div className="splash-center">
                <div className="splash-logo-box">
                  <Building size={48} color="#ffffff" />
                </div>
                <div>
                  <h1 className="splash-brand-title">JEM HARDWARE</h1>
                  <p className="splash-brand-sub">& CONSTRUCTION SUPPLY</p>
                </div>
                <p className="splash-tagline">
                  Your trusted online hardware partner for residential and commercial builds across the Philippines.
                </p>
              </div>

              <div className="splash-loader">
                <div className="splash-progress-track">
                  <div className="splash-progress-fill"></div>
                </div>
                <p className="splash-footer-text">
                  <ShieldCheck size={14} color="#f97316" />
                  <span>Licensed Contractor Supplier & Verified Distributor</span>
                </p>
                <button
                  className="auth-btn-primary"
                  style={{ width: 'auto', padding: '10px 24px', marginTop: '12px' }}
                  onClick={() => navigateTo('onboarding')}
                >
                  Enter App <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
              SCREEN 2: ONBOARDING CAROUSEL (3 SCREENS)
              ================================================================ */}
          {currentScreen === 'onboarding' && (
            <div className="onboarding-screen">
              <div className="onboarding-top-bar">
                <div />
                <button className="onboarding-skip-btn" onClick={() => navigateTo('auth')}>
                  Skip
                </button>
              </div>

              <div className="onboarding-content">
                {onboardingIndex === 0 && (
                  <>
                    <div className="onboarding-illustration">
                      <span style={{ fontSize: '72px' }}>🏗️</span>
                    </div>
                    <h2 className="onboarding-title">Browse 500+ Products</h2>
                    <p className="onboarding-desc">
                      Explore a wide selection of cement, steel, tools, electrical, plumbing, and roofing supplies — all in one place.
                    </p>
                  </>
                )}

                {onboardingIndex === 1 && (
                  <>
                    <div className="onboarding-illustration">
                      <span style={{ fontSize: '72px' }}>📦</span>
                    </div>
                    <h2 className="onboarding-title">Order Anytime, Anywhere</h2>
                    <p className="onboarding-desc">
                      Place orders from your phone and get your construction materials delivered directly to your site or project.
                    </p>
                  </>
                )}

                {onboardingIndex === 2 && (
                  <>
                    <div className="onboarding-illustration">
                      <span style={{ fontSize: '72px' }}>💳</span>
                    </div>
                    <h2 className="onboarding-title">Flexible Payment Methods</h2>
                    <p className="onboarding-desc">
                      Pay via GCash, Maya, or Cash on Delivery. Safe, secure, and convenient for every transaction.
                    </p>
                  </>
                )}
              </div>

              <div className="onboarding-pagination">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className={`pagination-dot ${onboardingIndex === idx ? 'active' : ''}`}
                    onClick={() => setOnboardingIndex(idx)}
                  />
                ))}
              </div>

              <div className="onboarding-actions">
                {onboardingIndex < 2 ? (
                  <button
                    className="auth-btn-primary"
                    onClick={() => setOnboardingIndex(prev => prev + 1)}
                  >
                    Next <ArrowRight size={16} />
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    <button
                      className="auth-btn-primary"
                      onClick={() => { setAuthMode('login'); navigateTo('auth'); }}
                    >
                      Get Started
                    </button>
                    <button
                      type="button"
                      className="catalog-btn"
                      style={{ width: '100%', justifyContent: 'center', borderColor: '#f97316', color: '#f97316', background: '#fff', fontWeight: '800' }}
                      onClick={() => { setAuthMode('register'); navigateTo('auth'); }}
                    >
                      Create an Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              SCREEN 3: LOGIN, REGISTRATION & PASSWORD RECOVERY
              ================================================================ */}
          {currentScreen === 'auth' && (
            <div className="auth-container">
              <div>
                <div className="auth-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#f97316', color: '#fff', fontWeight: '900', fontSize: '11px', display: 'grid', placeItems: 'center' }}>
                      JEM
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#fff' }}>JEM Hardware</div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#f97316' }}>&amp; Construction Supply</div>
                    </div>
                  </div>
                  <h2 className="auth-title">
                    {authMode === 'login' && 'Welcome back! 👋'}
                    {authMode === 'register' && 'Create Account 🚀'}
                    {authMode === 'forgot' && 'Reset Your Password'}
                  </h2>
                  <p className="auth-subtitle">
                    {authMode === 'login' && 'Sign in to continue shopping'}
                    {authMode === 'register' && 'Join JEM Hardware for exclusive contractor deals'}
                    {authMode === 'forgot' && 'Enter your registered mobile or email to receive a secure OTP code.'}
                  </p>
                </div>


                <form className="auth-form" onSubmit={(e) => {
                  e.preventDefault()
                  if (authMode === 'forgot') {
                    triggerToast('OTP verification code sent to your mobile number!')
                    setAuthMode('login')
                  } else {
                    triggerToast(`Welcome, ${authFormData.name || 'Juan'}! 👋`)
                    navigateTo('home', 'home')
                  }
                }}>
                  {authMode === 'register' && (
                    <div className="form-group">
                      <label className="form-label">Full Name / Company Name</label>
                      <div className="form-input-box">
                        <User className="form-input-icon" size={16} />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Juan Dela Cruz (JDC Builders)"
                          value={authFormData.name}
                          onChange={(e) => setAuthFormData({ ...authFormData, name: e.target.value })}
                          required
                        />

                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Mobile Number or Email</label>
                    <div className="form-input-box">
                      <Phone className="form-input-icon" size={16} />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="0917-XXX-XXXX or email@domain.com"
                        value={authFormData.email}
                        onChange={(e) => setAuthFormData({ ...authFormData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {authMode !== 'forgot' && (
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <div className="form-input-box">
                        <Lock className="form-input-icon" size={16} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="form-input"
                          placeholder="••••••••"
                          value={authFormData.password}
                          onChange={(e) => setAuthFormData({ ...authFormData, password: e.target.value })}
                          required
                        />
                        <button
                          type="button"
                          className="form-toggle-pwd"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {authMode === 'login' && (
                    <div className="auth-helper-row">
                      <label className="auth-remember-me">
                        <input
                          type="checkbox"
                          checked={authFormData.rememberMe}
                          onChange={(e) => setAuthFormData({ ...authFormData, rememberMe: e.target.checked })}
                          style={{ accentColor: '#f97316' }}
                        />
                        <span>Remember me</span>
                      </label>
                      <button
                        type="button"
                        className="auth-forgot-link"
                        onClick={() => setAuthMode('forgot')}
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <button type="submit" className="auth-btn-primary">
                    {authMode === 'login' && 'Log In to Account'}
                    {authMode === 'register' && 'Register New Account'}
                    {authMode === 'forgot' && 'Send Reset Instructions'}
                  </button>
                </form>

                <div className="auth-divider">OR QUICK GUEST ACCESS</div>

                <button
                  type="button"
                  className="catalog-btn"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                  onClick={() => navigateTo('home', 'home')}
                >
                  Continue as Guest Shopper <ArrowRight size={14} />
                </button>
              </div>

              <div className="auth-footer">
                {authMode === 'login' ? (
                  <span>
                    New to JEM Hardware?{' '}
                    <button className="auth-switch-btn" onClick={() => setAuthMode('register')}>
                      Create an account
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{' '}
                    <button className="auth-switch-btn" onClick={() => setAuthMode('login')}>
                      Sign In here
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              SCREEN 4: HOME SCREEN (SHOPEE-INSPIRED BLUEPRINT)
              ================================================================ */}
          {currentScreen === 'home' && (
            <div>
              {/* Header Bar */}
              <header className="shopee-header">
                <div className="shopee-top-bar">
                  <div
                    className="shopee-deliver-location"
                    onClick={() => setShowAddressModal(true)}
                  >
                    <MapPin size={13} color="#f97316" />
                    <span>Deliver to: <strong>San Pablo City, Laguna</strong></span>
                    <ChevronDown size={12} />
                  </div>

                  <div className="shopee-top-actions">
                    <button
                      className="shopee-icon-btn"
                      onClick={() => navigateTo('notifications')}
                      aria-label="Notifications"
                    >
                      <AlertCircle size={18} />
                      <span className="shopee-badge">2</span>
                    </button>
                    <button
                      className="shopee-icon-btn"
                      onClick={() => navigateTo('cart', 'cart')}
                      aria-label="Shopping Cart"
                    >
                      <ShoppingCart size={18} />
                      {cart.length > 0 && <span className="shopee-badge">{cart.length}</span>}
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="shopee-search-row">
                  <div
                    className="shopee-search-box"
                    onClick={() => navigateTo('search')}
                  >
                    <Search size={18} color="#94a3b8" />
                    <input
                      type="text"
                      placeholder="Search cement, coco lumber, angle grinder..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    className="shopee-camera-btn"
                    onClick={() => setShowCameraScanner(true)}
                    title="Camera Material Scanner"
                  >
                    <Camera size={20} />
                  </button>
                </div>
              </header>

              {/* Promotional Banner Carousel */}
              <div className="promo-carousel-container">
                <div
                  className="promo-banner"
                  style={{ background: PROMO_BANNERS[bannerIndex].color }}
                >
                  <span className="promo-banner-badge">{PROMO_BANNERS[bannerIndex].badge}</span>
                  <h2>{PROMO_BANNERS[bannerIndex].title}</h2>
                  <p>{PROMO_BANNERS[bannerIndex].subtitle}</p>
                  <button
                    className="promo-banner-btn"
                    onClick={() => {
                      setVoucherCode(PROMO_BANNERS[bannerIndex].code)
                      navigateTo('catalog', 'catalog')
                    }}
                  >
                    Shop Deals <ArrowRight size={12} />
                  </button>
                  <div className="promo-banner-icon-art">{PROMO_BANNERS[bannerIndex].icon}</div>
                </div>

                <div className="carousel-dots-row">
                  {PROMO_BANNERS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`carousel-dot ${bannerIndex === idx ? 'active' : ''}`}
                      onClick={() => setBannerIndex(idx)}
                    />
                  ))}
                </div>
              </div>

              {/* Quick Service Shortcuts (Shopee 8-Feature Row) */}
              <div className="quick-shortcuts-grid">
                {[
                  { icon: '🏷️', label: 'Vouchers', bg: '#fff7ed', action: () => { setVoucherCode('JEMBUILD10'); navigateTo('cart', 'cart'); } },
                  { icon: '⚡', label: 'Flash Deals', bg: '#fef2f2', action: () => { setSelectedCategory('tools'); navigateTo('catalog', 'catalog'); } },
                  { icon: '🪵', label: 'Lumber', bg: '#fefce8', action: () => { setSelectedCategory('lumber'); navigateTo('catalog', 'catalog'); } },
                  { icon: '🧱', label: 'Cement', bg: '#f0fdf4', action: () => { setSelectedCategory('cement'); navigateTo('catalog', 'catalog'); } },
                  { icon: '🚚', label: 'Fast Delivery', bg: '#eff6ff', action: () => navigateTo('orders', 'orders') },
                  { icon: '📐', label: 'Estimator', bg: '#faf5ff', action: () => triggerToast('JEM Material Calculator: 1 Bag Cement = 25 Hollow blocks') },
                  { icon: '👷', label: 'Pro Club', bg: '#fff1f2', action: () => navigateTo('profile', 'profile') },
                  { icon: '🏬', label: 'Store Pickup', bg: '#ecfdf5', action: () => setShowAboutModal(true) }
                ].map((item, idx) => (
                  <button key={idx} className="shortcut-item" onClick={item.action}>
                    <div className="shortcut-icon-circle" style={{ background: item.bg }}>
                      <span>{item.icon}</span>
                    </div>
                    <span className="shortcut-label">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Flash Deals Card */}
              <div className="flash-deals-card">
                <div className="flash-deals-header">
                  <div className="flash-deals-title">
                    <Flame size={20} color="#ea580c" />
                    <span className="flash-badge-text">Flash Deals</span>
                  </div>
                  <div className="flash-timer-box">
                    <span className="timer-block">{String(flashTime.hrs).padStart(2, '0')}</span>
                    <span className="timer-colon">:</span>
                    <span className="timer-block">{String(flashTime.mins).padStart(2, '0')}</span>
                    <span className="timer-colon">:</span>
                    <span className="timer-block">{String(flashTime.secs).padStart(2, '0')}</span>
                  </div>
                </div>

                <div className="flash-scroll-row">
                  {products.slice(0, 5).map((prod) => (
                    <div
                      key={prod.id}
                      className="flash-item-card"
                      onClick={() => {
                        setSelectedProduct(prod)
                        navigateTo('details')
                      }}
                    >
                      <div className="flash-item-img">
                        <span>{prod.emoji}</span>
                        <span className="flash-discount-tag">-20%</span>
                      </div>
                      <div className="flash-item-price">₱{prod.base_price}</div>
                      <div className="flash-progress-bar">
                        <div className="flash-progress-fill" style={{ width: '75%' }}></div>
                      </div>
                      <span className="flash-claimed-text">75% Claimed</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Pills Bar */}
              <div className="category-pills-section">
                <div className="category-pills-row">
                  {CATEGORIES_DATA.map((cat) => (
                    <button
                      key={cat.id}
                      className={`category-pill-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Home Sub Tabs (Featured, Best Sellers, New, Offers) */}
              <div className="home-section-tabs">
                {[
                  { id: 'featured', label: 'Featured Materials' },
                  { id: 'best_sellers', label: 'Top Best Sellers' },
                  { id: 'new', label: 'New Arrivals' },
                  { id: 'offers', label: 'Discounted' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`home-tab-item ${homeSubTab === tab.id ? 'active' : ''}`}
                    onClick={() => setHomeSubTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Product Grid */}
              <div className="products-container">
                <div className="product-grid">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="product-card-grid"
                      onClick={() => {
                        setSelectedProduct(product)
                        navigateTo('details')
                      }}
                    >
                      <div className="product-card-thumb-wrap">
                        <span>{product.emoji}</span>
                        <span className={`product-card-badge ${product.badgeClass}`}>
                          {product.badge}
                        </span>
                        <button
                          className={`product-card-wish-btn ${wishlist.some(w => w.id === product.id) ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleWishlist(product)
                          }}
                        >
                          <Heart size={14} fill={wishlist.some(w => w.id === product.id) ? '#ef4444' : 'none'} />
                        </button>
                      </div>

                      <div className="product-card-body">
                        <div>
                          <span className="product-card-brand">{product.brand}</span>
                          <h3 className="product-card-title">{product.name}</h3>
                        </div>

                        <div className="product-card-rating-row">
                          <Star size={12} fill="#f59e0b" color="#f59e0b" />
                          <span>{product.rating}</span>
                          <span className="product-card-reviews">({product.reviews_count} sold)</span>
                        </div>

                        <div className="product-card-bottom">
                          <div className="product-card-price-block">
                            <span className="product-card-price">₱{product.base_price.toLocaleString()}</span>
                            <span className="product-card-unit">per {product.unit}</span>
                          </div>

                          <button
                            className="product-card-add-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddToCart(product, 1)
                            }}
                            title="Add to cart"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              SCREEN 5: PRODUCT SEARCH & ADVANCED MULTI-FILTER
              ================================================================ */}
          {currentScreen === 'search' && (
            <div className="search-view-container">
              <div className="shopee-search-row">
                <button className="catalog-btn" onClick={() => navigateTo('home', 'home')}>
                  <ArrowLeft size={16} />
                </button>
                <div className="shopee-search-box">
                  <Search size={18} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="Search all construction supplies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button className="catalog-btn" onClick={() => setShowFilterDrawer(true)}>
                  <Filter size={16} />
                </button>
              </div>

              {/* Hot Searches & Recent Tags */}
              <div className="search-tags-box">
                <div className="search-tags-title">
                  <span>Trending Material Searches 🔥</span>
                </div>
                <div className="search-tags-chips">
                  {['Portland Cement 40kg', 'Coco Lumber 2x3', 'Angle Grinder', 'Boysen White Paint', 'Deformed Steel Bar 12mm', 'GI Sheet G24', 'PVC Pipe 4"'].map((tag, idx) => (
                    <button
                      key={idx}
                      className="search-chip"
                      onClick={() => setSearchQuery(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Results Preview */}
              <div>
                <div className="catalog-toolbar">
                  <span className="catalog-toolbar-left">{filteredProducts.length} Items Found</span>
                  <div className="catalog-toolbar-right">
                    <button
                      className={`catalog-btn ${viewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid size={14} />
                    </button>
                    <button
                      className={`catalog-btn ${viewMode === 'list' ? 'active' : ''}`}
                      onClick={() => setViewMode('list')}
                    >
                      <List size={14} />
                    </button>
                  </div>
                </div>

                <div className={viewMode === 'grid' ? 'product-grid' : 'product-list'}>
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={viewMode === 'grid' ? 'product-card-grid' : 'product-card-list'}
                      onClick={() => {
                        setSelectedProduct(product)
                        navigateTo('details')
                      }}
                    >
                      <div className={viewMode === 'grid' ? 'product-card-thumb-wrap' : 'product-list-thumb'}>
                        <span>{product.emoji}</span>
                      </div>
                      <div className={viewMode === 'grid' ? 'product-card-body' : 'product-list-content'}>
                        <div>
                          <span className="product-card-brand">{product.brand}</span>
                          <h3 className="product-card-title">{product.name}</h3>
                          <div className="product-card-rating-row" style={{ marginTop: '4px' }}>
                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                            <span>{product.rating}</span>
                            <span className="product-card-reviews">({product.reviews_count} sold)</span>
                          </div>
                        </div>
                        <div className="product-card-bottom">
                          <span className="product-card-price">₱{product.base_price.toLocaleString()}</span>
                          <button
                            className="product-card-add-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddToCart(product, 1)
                            }}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              SCREEN 6: PRODUCT LISTING / FULL CATALOG
              ================================================================ */}
          {currentScreen === 'catalog' && (
            <div>
              <div className="product-detail-header-nav">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button className="catalog-btn" onClick={() => navigateTo('home', 'home')}>
                    <ArrowLeft size={16} />
                  </button>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    Hardware Catalog
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="catalog-btn" onClick={() => setShowFilterDrawer(true)}>
                    <SlidersHorizontal size={14} /> Filter
                  </button>
                </div>
              </div>

              {/* Category Pills Bar */}
              <div className="category-pills-section">
                <div className="category-pills-row">
                  {CATEGORIES_DATA.map((cat) => (
                    <button
                      key={cat.id}
                      className={`category-pill-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* View Mode & Sorter Toolbar */}
              <div className="catalog-toolbar">
                <span className="catalog-toolbar-left">Showing {filteredProducts.length} Supplies</span>
                <div className="catalog-toolbar-right">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: '#0f172a',
                      background: '#fff'
                    }}
                  >
                    <option value="popular">Most Popular</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                  <button
                    className={`catalog-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid size={14} />
                  </button>
                  <button
                    className={`catalog-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>

              {/* Product Grid / List */}
              <div className="products-container">
                <div className={viewMode === 'grid' ? 'product-grid' : 'product-list'}>
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={viewMode === 'grid' ? 'product-card-grid' : 'product-card-list'}
                      onClick={() => {
                        setSelectedProduct(product)
                        navigateTo('details')
                      }}
                    >
                      <div className={viewMode === 'grid' ? 'product-card-thumb-wrap' : 'product-list-thumb'}>
                        <span>{product.emoji}</span>
                        <span className={`product-card-badge ${product.badgeClass}`}>
                          {product.badge}
                        </span>
                      </div>

                      <div className={viewMode === 'grid' ? 'product-card-body' : 'product-list-content'}>
                        <div>
                          <span className="product-card-brand">{product.brand}</span>
                          <h3 className="product-card-title">{product.name}</h3>
                          <div className="product-card-rating-row" style={{ marginTop: '4px' }}>
                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                            <span>{product.rating}</span>
                            <span className="product-card-reviews">({product.reviews_count} reviews)</span>
                          </div>
                        </div>

                        <div className="product-card-bottom">
                          <div className="product-card-price-block">
                            <span className="product-card-price">₱{product.base_price.toLocaleString()}</span>
                            <span className="product-card-unit">per {product.unit}</span>
                          </div>
                          <button
                            className="product-card-add-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddToCart(product, 1)
                            }}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              SCREEN 7: PRODUCT DETAILS SCREEN
              ================================================================ */}
          {currentScreen === 'details' && selectedProduct && (
            <div className="product-details-view">
              {/* Header Navigation */}
              <div className="product-detail-header-nav">
                <button className="catalog-btn" onClick={() => navigateTo('home', 'home')}>
                  <ArrowLeft size={16} />
                </button>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  Product Details
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="catalog-btn"
                    onClick={() => handleToggleWishlist(selectedProduct)}
                  >
                    <Heart size={16} fill={wishlist.some(w => w.id === selectedProduct.id) ? '#ef4444' : 'none'} />
                  </button>
                  <button className="catalog-btn" onClick={() => navigateTo('cart', 'cart')}>
                    <ShoppingCart size={16} />
                  </button>
                </div>
              </div>

              {/* Swipe Gallery */}
              <div className="product-detail-gallery">
                <span>{selectedProduct.images[activeImageIndex] || selectedProduct.emoji}</span>
                <span className="gallery-counter-badge">
                  {activeImageIndex + 1} / {selectedProduct.images.length} Photos
                </span>
              </div>

              {/* Thumbnails Row */}
              <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                {selectedProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      border: activeImageIndex === idx ? '2px solid #f97316' : '1px solid #e2e8f0',
                      background: '#f8fafc',
                      fontSize: '20px',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    {img}
                  </button>
                ))}
              </div>

              {/* Product Pricing & Title Card */}
              <div className="product-detail-info-card">
                <div className="product-detail-price-row">
                  <span className="product-detail-price">₱{selectedProduct.base_price.toLocaleString()}</span>
                  <span className="product-detail-unit">/ {selectedProduct.unit}</span>
                  <span className="product-card-badge best-seller">Wholesale Ready</span>
                </div>

                <h1 className="product-detail-title">{selectedProduct.name}</h1>

                <div className="product-detail-badges-row">
                  <span className="detail-pill-badge brand-badge">
                    <Award size={12} /> {selectedProduct.brand}
                  </span>
                  <span className={`detail-pill-badge ${selectedProduct.stock_quantity < 25 ? 'stock-red' : 'stock-green'}`}>
                    <Package size={12} /> {selectedProduct.stock_quantity} units available
                  </span>
                  <span className="detail-pill-badge" style={{ background: '#fff7ed', color: '#c2410c' }}>
                    <Star size={12} fill="#f59e0b" color="#f59e0b" /> {selectedProduct.rating} ({selectedProduct.reviews_count} reviews)
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', marginTop: '14px' }}>
                  {selectedProduct.description}
                </p>
              </div>

              {/* Specifications Sheet Card */}
              <div className="product-detail-specs-card">
                <h3 className="specs-title">Technical Specifications</h3>
                <table className="specs-table">
                  <tbody>
                    {Object.entries(selectedProduct.specs || {}).map(([key, val]) => (
                      <tr key={key}>
                        <td className="specs-label">{key}</td>
                        <td className="specs-val">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Quantity Selector Card */}
              <div className="checkout-card" style={{ margin: '0 16px 10px' }}>
                <div className="checkout-card-header">
                  <span className="checkout-card-title">Select Order Quantity</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#ea580c' }}>
                    Subtotal: ₱{(selectedProduct.base_price * detailQuantity).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
                  <div className="cart-stepper">
                    <button
                      className="cart-step-btn"
                      onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="cart-step-val">{detailQuantity}</span>
                    <button
                      className="cart-step-btn"
                      onClick={() => setDetailQuantity(detailQuantity + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Standard packaging: 1 {selectedProduct.unit}
                  </span>
                </div>
              </div>

              {/* Customer Reviews Section */}
              <div className="reviews-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 className="specs-title" style={{ margin: 0 }}>Customer Reviews & Ratings</h3>
                  <span style={{ fontSize: '12px', color: '#f97316', fontWeight: '700' }}>
                    4.9 / 5.0 (98% Satisfied)
                  </span>
                </div>

                {SAMPLE_REVIEWS.map((rev) => (
                  <div key={rev.id} className="review-item">
                    <div className="review-top">
                      <span className="reviewer-name">{rev.name}</span>
                      <span className="review-date">{rev.date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '2px', margin: '2px 0' }}>
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} size={11} fill="#f59e0b" color="#f59e0b" />
                      ))}
                    </div>
                    <p className="review-comment">{rev.comment}</p>
                  </div>
                ))}
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="product-detail-bottom-bar">
                <button
                  className="detail-action-icon-btn"
                  onClick={() => setShowSupportModal(true)}
                >
                  <MessageSquare size={18} />
                  <span>Chat</span>
                </button>
                <button
                  className="detail-action-icon-btn"
                  onClick={() => handleToggleWishlist(selectedProduct)}
                >
                  <Heart size={18} fill={wishlist.some(w => w.id === selectedProduct.id) ? '#ef4444' : 'none'} />
                  <span>Wishlist</span>
                </button>
                <button
                  className="detail-btn-add-cart"
                  onClick={() => handleAddToCart(selectedProduct, detailQuantity)}
                >
                  Add to Cart
                </button>
                <button
                  className="detail-btn-buy-now"
                  onClick={() => {
                    handleAddToCart(selectedProduct, detailQuantity)
                    navigateTo('checkout')
                  }}
                >
                  Buy Now
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
              SCREEN 8: SHOPPING CART SCREEN
              ================================================================ */}
          {currentScreen === 'cart' && (
            <div className="cart-view-container">
              <div className="product-detail-header-nav" style={{ margin: '-14px -16px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button className="catalog-btn" onClick={() => navigateTo('home', 'home')}>
                    <ArrowLeft size={16} />
                  </button>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    Shopping Cart ({cart.length})
                  </span>
                </div>
                <button
                  className="checkout-action-link"
                  onClick={() => setCart([])}
                >
                  Clear All
                </button>
              </div>

              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px' }}>
                  <div style={{ fontSize: '64px', marginBottom: '12px' }}>🛒</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                    Your Cart is Empty
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                    Explore top hardware deals, cement, lumber, and power tools to get started.
                  </p>
                  <button
                    className="auth-btn-primary"
                    style={{ width: 'auto', padding: '10px 24px', margin: '0 auto' }}
                    onClick={() => navigateTo('catalog', 'catalog')}
                  >
                    Start Shopping <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <>
                  {/* Select All Checkbox Header */}
                  <div className="cart-select-all-bar">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                      <input
                        type="checkbox"
                        className="cart-item-checkbox"
                        checked={cart.length > 0 && cart.every(i => i.selected)}
                        onChange={handleToggleSelectAll}
                      />
                      <span>Select All ({cart.length} items)</span>
                    </label>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {selectedCartItems.length} selected
                    </span>
                  </div>

                  {/* Cart Items List */}
                  {cart.map((item) => (
                    <div key={item.id} className="cart-item-card">
                      <input
                        type="checkbox"
                        className="cart-item-checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleCartItem(item.id)}
                      />
                      <div className="cart-item-thumb">
                        <span>{item.emoji}</span>
                      </div>
                      <div className="cart-item-details">
                        <h4 className="cart-item-name">{item.name}</h4>
                        <span className="cart-item-price">₱{item.base_price.toLocaleString()}</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <div className="cart-stepper">
                            <button
                              className="cart-step-btn"
                              onClick={() => handleUpdateCartQty(item.id, -1)}
                            >
                              <Minus size={12} />
                            </button>
                            <span className="cart-step-val">{item.quantity}</span>
                            <button
                              className="cart-step-btn"
                              onClick={() => handleUpdateCartQty(item.id, 1)}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            onClick={() => handleUpdateCartQty(item.id, -item.quantity)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Voucher Apply Box */}
                  <form className="voucher-apply-box" onSubmit={handleApplyVoucher}>
                    <Tag size={18} color="#f97316" />
                    <input
                      type="text"
                      placeholder="Enter promo voucher (JEMBUILD10)"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                    />
                    <button type="submit" className="voucher-btn-apply">
                      Apply
                    </button>
                  </form>

                  {appliedVoucherName && (
                    <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#047857', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
                      <span>✅ {appliedVoucherName}</span>
                      <button onClick={() => { setAppliedDiscount(0); setAppliedVoucherName(''); }} style={{ background: 'none', border: 'none', color: '#047857', fontWeight: '800', cursor: 'pointer' }}>✕</button>
                    </div>
                  )}

                  {/* Sticky Cart Checkout Summary */}
                  <div className="cart-sticky-bottom">
                    <div>
                      <span className="cart-total-text">Total Payment ({selectedCartItems.length} items):</span>
                      <div className="cart-total-num">₱{cartGrandTotal.toLocaleString()}</div>
                    </div>
                    <button
                      className="cart-checkout-btn"
                      onClick={() => navigateTo('checkout')}
                      disabled={selectedCartItems.length === 0}
                    >
                      Checkout <ArrowRight size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================================================================
              SCREEN 9: CHECKOUT SCREEN
              ================================================================ */}
          {currentScreen === 'checkout' && (
            <div className="checkout-view-container">
              <div className="product-detail-header-nav" style={{ margin: '-14px -16px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button className="catalog-btn" onClick={() => navigateTo('cart', 'cart')}>
                    <ArrowLeft size={16} />
                  </button>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    Checkout Order
                  </span>
                </div>
              </div>

              {/* Delivery Address Card */}
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <span className="checkout-card-title">
                    <MapPin size={16} color="#f97316" /> Delivery Address
                  </span>
                  <button
                    className="checkout-action-link"
                    onClick={() => setShowAddressModal(true)}
                  >
                    Edit / Change
                  </button>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                    {user.name} | {user.phone}
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px', lineHeight: '1.4' }}>
                    {selectedAddress}
                  </p>
                </div>
              </div>

              {/* Delivery Method Picker */}
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <span className="checkout-card-title">
                    <Truck size={16} color="#f97316" /> Fulfillment Options
                  </span>
                </div>
                <div className="delivery-options-row">
                  {[
                    { id: 'delivery', name: 'Standard Truck', fee: '₱200 (1-2 Days)', icon: '🚛' },
                    { id: 'express', name: 'Express Same-Day', fee: '₱350 (Today)', icon: '⚡' },
                    { id: 'pickup', name: 'Store Pickup', fee: 'FREE (Ready in 2h)', icon: '🏬' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      className={`delivery-pill-btn ${checkoutFulfillment === opt.id ? 'active' : ''}`}
                      onClick={() => setCheckoutFulfillment(opt.id)}
                    >
                      <span style={{ fontSize: '18px' }}>{opt.icon}</span>
                      <span className="delivery-pill-name">{opt.name}</span>
                      <span className="delivery-pill-fee">{opt.fee}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Instructions Notes */}
              <div className="checkout-card">
                <span className="checkout-card-title">Site Delivery Instructions</span>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '10px 12px' }}
                  placeholder="Unload near garage gate, call before entering"
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                />

              </div>

              {/* Order Summary & Breakdown */}
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <span className="checkout-card-title">
                    <ClipboardList size={16} color="#f97316" /> Order Items ({selectedCartItems.length})
                  </span>
                </div>
                {selectedCartItems.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{item.emoji}</span>
                      <span>{item.name} (x{item.quantity})</span>
                    </div>
                    <span style={{ fontWeight: '700' }}>₱{(item.base_price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}

                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="receipt-row">
                    <span className="receipt-label">Merchandise Subtotal:</span>
                    <span className="receipt-val">₱{cartSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Delivery Fee:</span>
                    <span className="receipt-val">₱{deliveryFee.toLocaleString()}</span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="receipt-row" style={{ color: '#047857' }}>
                      <span>Voucher Discount:</span>
                      <span style={{ fontWeight: '700' }}>-₱{appliedDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="receipt-row" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px', fontSize: '14px' }}>
                    <span style={{ fontWeight: '800', color: '#0f172a' }}>Total Payment:</span>
                    <span style={{ fontWeight: '800', color: '#ea580c', fontSize: '16px' }}>
                      ₱{cartGrandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector Card */}
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <span className="checkout-card-title">
                    <CreditCard size={16} color="#f97316" /> Select Payment Method
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { id: 'gcash', name: 'GCash E-Wallet', desc: 'Instant QR/OTP payment with official gateway', icon: '💳', bg: '#007dfe' },
                    { id: 'maya', name: 'Maya E-Wallet', desc: 'Secure card & wallet checkout', icon: '💚', bg: '#00be64' },
                    { id: 'cod', name: 'Cash on Delivery (COD)', desc: 'Pay cash upon truck delivery & material inspection', icon: '💵', bg: '#10b981' }
                  ].map((pm) => (
                    <div
                      key={pm.id}
                      className={`payment-method-card ${checkoutPaymentMethod === pm.id ? 'active' : ''}`}
                      onClick={() => setCheckoutPaymentMethod(pm.id)}
                    >
                      <div className="payment-method-left">
                        <div className="payment-method-icon-wrap" style={{ background: pm.bg }}>
                          {pm.icon}
                        </div>
                        <div className="payment-method-info">
                          <h4>{pm.name}</h4>
                          <p>{pm.desc}</p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="payment_method"
                        checked={checkoutPaymentMethod === pm.id}
                        onChange={() => setCheckoutPaymentMethod(pm.id)}
                        style={{ accentColor: '#f97316', width: '18px', height: '18px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Proceed Button */}
              <button
                className="auth-btn-primary"
                style={{ padding: '14px', fontSize: '15px' }}
                onClick={handleProceedToPayment}
              >
                Place Order (₱{cartGrandTotal.toLocaleString()}) <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ================================================================
              SCREEN 10: GCASH / MAYA PAYMENT SIMULATOR
              ================================================================ */}
          {currentScreen === 'payment_sim' && (
            <div className="simulator-modal-overlay">
              <div className="simulator-card">
                <div className={`simulator-header ${checkoutPaymentMethod}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={20} />
                    <span style={{ fontWeight: '800', fontSize: '16px' }}>
                      {checkoutPaymentMethod.toUpperCase()} Secure Pay
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentScreen('checkout')}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="simulator-body">
                  {simStep === 'login' && (
                    <>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        Merchant: <strong>JEM Hardware & Construction</strong>
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                        ₱{cartGrandTotal.toLocaleString()}
                      </div>

                      <div className="form-group" style={{ textAlign: 'left' }}>
                        <label className="form-label">Enter your {checkoutPaymentMethod.toUpperCase()} Mobile Number</label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '12px', textAlign: 'center', fontSize: '16px', fontWeight: '700' }}
                          value={simPhone}
                          onChange={(e) => setSimPhone(e.target.value)}
                        />
                      </div>

                      <button
                        className="auth-btn-primary"
                        onClick={() => setSimStep('otp')}
                      >
                        Next: Send 6-Digit OTP <ArrowRight size={14} />
                      </button>
                    </>
                  )}

                  {simStep === 'otp' && (
                    <>
                      <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                        Enter 6-Digit Authentication Code
                      </h4>
                      <p style={{ fontSize: '12px', color: '#64748b' }}>
                        We sent a verification code to {simPhone}.
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', margin: '10px 0' }}>
                        {simOtp.map((digit, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: '40px',
                              height: '46px',
                              borderRadius: '8px',
                              border: '1.5px solid #cbd5e1',
                              background: '#f8fafc',
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: '18px',
                              fontWeight: '800',
                              color: '#0f172a'
                            }}
                          >
                            {digit}
                          </div>
                        ))}
                      </div>

                      <button
                        className="auth-btn-primary"
                        onClick={handleSimulatePaymentProcess}
                        disabled={simLoading}
                      >
                        {simLoading ? 'Authorizing Payment...' : `Authorize ₱${cartGrandTotal.toLocaleString()}`}
                      </button>
                    </>
                  )}

                  {simStep === 'success' && (
                    <div style={{ padding: '20px 0' }}>
                      <CheckCircle2 size={56} color="#10b981" style={{ margin: '0 auto 12px' }} />
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                        Payment Verified!
                      </h3>
                      <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
                        Redirecting to JEM Order Confirmation...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              SCREEN 11: ORDER CONFIRMATION & SUCCESS
              ================================================================ */}
          {currentScreen === 'success' && (
            <div className="order-success-view">
              <div className="success-check-circle">
                <Check size={40} />
              </div>

              <h2 className="order-success-title">Order Placed Successfully!</h2>
              <p className="order-success-subtitle">
                Thank you for choosing JEM Hardware. We have received your order and sent SMS confirmation to {user.phone}.
              </p>

              <div className="order-receipt-card">
                <div className="receipt-row">
                  <span className="receipt-label">Order Number:</span>
                  <span className="receipt-val">{orders[0]?.id || 'JEM-2026-8942'}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Estimated Delivery:</span>
                  <span className="receipt-val">Today, ~11:30 AM (Kuya Dante)</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Delivery Address:</span>
                  <span className="receipt-val" style={{ maxWidth: '60%', textAlign: 'right' }}>{selectedAddress}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Payment Method:</span>
                  <span className="receipt-val">{checkoutPaymentMethod.toUpperCase()} (Confirmed)</span>
                </div>
                <div className="receipt-row" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                  <span style={{ fontWeight: '800' }}>Total Amount:</span>
                  <span style={{ fontWeight: '800', color: '#ea580c' }}>₱{cartGrandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <button
                  className="auth-btn-primary"
                  onClick={() => {
                    setSelectedOrderForTracking(orders[0])
                    navigateTo('tracking')
                  }}
                >
                  Track Live Delivery <Truck size={16} />
                </button>
                <button
                  className="catalog-btn"
                  style={{ justifyContent: 'center', padding: '12px' }}
                  onClick={() => navigateTo('home', 'home')}
                >
                  Continue Shopping <Home size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
              SCREEN 12: MY ORDERS (7-TAB SHOPEE FLOW)
              ================================================================ */}
          {currentScreen === 'orders' && (
            <div>
              <div className="product-detail-header-nav">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button className="catalog-btn" onClick={() => navigateTo('home', 'home')}>
                    <ArrowLeft size={16} />
                  </button>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    My Orders
                  </span>
                </div>
              </div>

              {/* 7 Shopee Status Tabs */}
              <div className="orders-tabs-row">
                {[
                  { id: 'all', label: 'All Orders' },
                  { id: 'to_pay', label: 'To Pay' },
                  { id: 'to_process', label: 'To Process' },
                  { id: 'to_ship', label: 'To Ship' },
                  { id: 'to_receive', label: 'To Receive' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'cancelled', label: 'Cancelled' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`orders-tab-btn ${activeOrderTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveOrderTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Order Cards */}
              <div style={{ paddingBottom: '30px' }}>
                {orders
                  .filter(o => activeOrderTab === 'all' || o.status === activeOrderTab)
                  .map((order) => (
                    <div key={order.id} className="order-history-card">
                      <div className="order-history-top">
                        <span className="order-num-text">{order.id}</span>
                        <span className={`order-status-badge ${order.badgeClass}`}>
                          {order.statusLabel}
                        </span>
                      </div>

                      <div>
                        {order.items.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', padding: '4px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{item.emoji || '📦'}</span>
                              <span>{item.name} (x{item.qty})</span>
                            </div>
                            <span style={{ fontWeight: '700' }}>₱{(item.price * item.qty).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Total Payment:</span>
                          <div style={{ fontSize: '15px', fontWeight: '800', color: '#ea580c' }}>
                            ₱{order.total.toLocaleString()}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {order.status !== 'cancelled' && order.status !== 'completed' && (
                            <button
                              className="catalog-btn"
                              style={{ color: '#ef4444' }}
                              onClick={() => {
                                setOrderToCancel(order)
                                setShowCancelModal(true)
                              }}
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            className="auth-btn-primary"
                            style={{ padding: '7px 14px', fontSize: '12px', marginTop: 0 }}
                            onClick={() => {
                              setSelectedOrderForTracking(order)
                              navigateTo('tracking')
                            }}
                          >
                            Track Delivery
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ================================================================
              SCREEN 13: LIVE ORDER TRACKING & 6-STAGE TIMELINE
              ================================================================ */}
          {currentScreen === 'tracking' && selectedOrderForTracking && (
            <div className="tracking-view-container">
              <div className="product-detail-header-nav" style={{ margin: '-16px -16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button className="catalog-btn" onClick={() => navigateTo('orders', 'orders')}>
                    <ArrowLeft size={16} />
                  </button>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    Live Delivery Tracking
                  </span>
                </div>
              </div>

              {/* Driver & Truck Info Card */}
              <div className="tracking-driver-card">
                <div className="driver-info-left">
                  <div className="driver-avatar">👷</div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '800' }}>
                      {selectedOrderForTracking.driver?.name || 'Kuya Dante'}
                    </h3>
                    <p style={{ fontSize: '11.5px', color: '#cbd5e1' }}>
                      {selectedOrderForTracking.driver?.vehicle || 'Isuzu Elf Truck (Plate NBD-9124)'}
                    </p>
                    <span style={{ fontSize: '10.5px', background: '#f97316', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                      ETA: {selectedOrderForTracking.eta}
                    </span>
                  </div>
                </div>
                <button
                  className="shopee-icon-btn"
                  onClick={() => triggerToast('Calling Delivery Driver Kuya Dante (0918-777-8899)...')}
                  style={{ background: '#f97316', border: 'none' }}
                >
                  <Phone size={18} />
                </button>
              </div>

              {/* 6-Stage Timeline Stepper */}
              <div className="tracking-timeline-card">
                <h3 className="specs-title" style={{ marginBottom: '16px' }}>
                  Delivery Progress Timeline
                </h3>

                {[
                  { step: 1, title: 'Order Placed', desc: 'Order details and hardware specs verified', done: true },
                  { step: 2, title: 'Payment Confirmed', desc: selectedOrderForTracking.payment_method, done: true },
                  { step: 3, title: 'Warehouse Preparing & Palletizing', desc: 'Lumber measured, cement bags palletized', done: true },
                  { step: 4, title: 'Dispatched to Delivery Truck', desc: 'Loaded on Isuzu Elf at San Pablo Central Depot', done: true },
                  { step: 5, title: 'Out for Delivery (On the Way)', desc: 'Driver en route to your construction site', done: selectedOrderForTracking.status === 'to_receive' || selectedOrderForTracking.status === 'completed' },
                  { step: 6, title: 'Delivered & Inspected', desc: 'Unloading completed and signed by site manager', done: selectedOrderForTracking.status === 'completed' }
                ].map((item) => (
                  <div key={item.step} className={`timeline-step ${item.done ? 'completed' : ''}`}>
                    <div className="timeline-icon-wrap">
                      {item.done ? <Check size={14} /> : <Clock size={14} color="#94a3b8" />}
                    </div>
                    <div className="timeline-content">
                      <h4>{item.title}</h4>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Destination Details */}
              <div className="checkout-card">
                <span className="checkout-card-title">
                  <MapPin size={16} color="#f97316" /> Unloading Site Address
                </span>
                <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.4' }}>
                  {selectedAddress}
                </p>
              </div>
            </div>
          )}

          {/* ================================================================
              SCREEN 14: NOTIFICATION CENTER
              ================================================================ */}
          {currentScreen === 'notifications' && (
            <div>
              <div className="product-detail-header-nav">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button className="catalog-btn" onClick={() => navigateTo('home', 'home')}>
                    <ArrowLeft size={16} />
                  </button>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    Notifications
                  </span>
                </div>
                <button
                  className="checkout-action-link"
                  onClick={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
                    triggerToast('All notifications marked as read!')
                  }}
                >
                  Mark All Read
                </button>
              </div>

              {/* Tabs */}
              <div className="orders-tabs-row">
                {['all', 'orders', 'promos', 'system'].map((t) => (
                  <button
                    key={t}
                    className={`orders-tab-btn ${notificationTab === t ? 'active' : ''}`}
                    onClick={() => setNotificationTab(t)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {t === 'all' ? 'All Alerts' : t}
                  </button>
                ))}
              </div>

              {/* Notifications List */}
              <div className="notifications-list">
                {notifications
                  .filter(n => notificationTab === 'all' || n.type === notificationTab)
                  .map((notif) => (
                    <div
                      key={notif.id}
                      className={`notification-card ${notif.unread ? 'unread' : ''}`}
                      onClick={() => {
                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n))
                        if (notif.type === 'orders') navigateTo('orders', 'orders')
                        else if (notif.type === 'promos') navigateTo('catalog', 'catalog')
                      }}
                    >
                      <div className="notification-icon-wrap">
                        {notif.type === 'orders' ? '🚚' : notif.type === 'promos' ? '🏷️' : '⚙️'}
                      </div>
                      <div className="notification-body">
                        <h4>{notif.title}</h4>
                        <p>{notif.message}</p>
                        <span className="notification-time">{notif.time}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ================================================================
              SCREEN 15: WISHLIST SCREEN
              ================================================================ */}
          {currentScreen === 'wishlist' && (
            <div style={{ padding: '16px' }}>
              <div className="product-detail-header-nav" style={{ margin: '-16px -16px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button className="catalog-btn" onClick={() => navigateTo('profile', 'profile')}>
                    <ArrowLeft size={16} />
                  </button>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    My Wishlist ({wishlist.length})
                  </span>
                </div>
              </div>

              {wishlist.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px' }}>
                  <Heart size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>No Saved Materials</h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: '16px' }}>
                    Tap the heart icon on any hardware product to bookmark it for future projects.
                  </p>
                  <button className="auth-btn-primary" onClick={() => navigateTo('catalog', 'catalog')}>
                    Browse Catalog
                  </button>
                </div>
              ) : (
                <div className="product-grid">
                  {wishlist.map((item) => (
                    <div key={item.id} className="product-card-grid">
                      <div className="product-card-thumb-wrap">
                        <span>{item.emoji}</span>
                        <button
                          className="product-card-wish-btn active"
                          onClick={() => handleToggleWishlist(item)}
                        >
                          <Heart size={14} fill="#ef4444" />
                        </button>
                      </div>
                      <div className="product-card-body">
                        <div>
                          <span className="product-card-brand">{item.brand}</span>
                          <h3 className="product-card-title">{item.name}</h3>
                        </div>
                        <div className="product-card-bottom">
                          <span className="product-card-price">₱{item.base_price.toLocaleString()}</span>
                          <button
                            className="product-card-add-btn"
                            onClick={() => {
                              handleAddToCart(item, 1)
                              handleToggleWishlist(item)
                            }}
                            title="Move to Cart"
                          >
                            <ShoppingCart size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              SCREEN 16: CUSTOMER PROFILE & ACCOUNT
              ================================================================ */}
          {currentScreen === 'profile' && (
            <div className="profile-view-container">
              {/* Profile Hero Card */}
              <div className="profile-hero-card">
                <div className="profile-avatar-wrap">👷‍♂️</div>
                <div className="profile-info">
                  <h3>{user.name}</h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>{user.email}</p>
                  <span className="profile-tier-badge">
                    <Award size={12} /> {user.tier} ({user.points} Pts)
                  </span>
                </div>
              </div>

              {/* Quick Profile Stats */}
              <div className="profile-stats-row">
                <div className="profile-stat-item" onClick={() => navigateTo('orders', 'orders')} style={{ cursor: 'pointer' }}>
                  <h4>{orders.length}</h4>
                  <p>My Orders</p>
                </div>
                <div className="profile-stat-item" onClick={() => navigateTo('wishlist')} style={{ cursor: 'pointer' }}>
                  <h4>{wishlist.length}</h4>
                  <p>Wishlist</p>
                </div>
                <div className="profile-stat-item" onClick={() => triggerToast('You have 3 active vouchers available!')} style={{ cursor: 'pointer' }}>
                  <h4>3</h4>
                  <p>Vouchers</p>
                </div>
              </div>

              {/* Account Options Menu */}
              <div className="profile-menu-card">
                {[
                  { icon: <ClipboardList size={18} color="#f97316" />, label: 'My Order History', action: () => navigateTo('orders', 'orders') },
                  { icon: <Heart size={18} color="#ef4444" />, label: 'Saved Wishlist Items', action: () => navigateTo('wishlist') },
                  { icon: <MapPin size={18} color="#10b981" />, label: 'Manage Delivery Addresses', action: () => setShowAddressModal(true) },
                  { icon: <CreditCard size={18} color="#2563eb" />, label: 'Payment Methods (GCash / Maya)', action: () => triggerToast('GCash primary wallet connected (0917-***-1234)') },
                  { icon: <AlertCircle size={18} color="#f59e0b" />, label: 'Notification Preferences', action: () => navigateTo('notifications') },
                  { icon: <HelpCircle size={18} color="#8b5cf6" />, label: 'Help & Contractor Support', action: () => setShowSupportModal(true) },
                  { icon: <Info size={18} color="#64748b" />, label: 'About JEM Hardware', action: () => setShowAboutModal(true) }
                ].map((item, idx) => (
                  <button key={idx} className="profile-menu-item" onClick={item.action}>
                    <div className="profile-menu-left">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight size={16} color="#94a3b8" />
                  </button>
                ))}
              </div>

              {/* Logout Button */}
              <button
                className="catalog-btn"
                style={{ justifyContent: 'center', padding: '14px', color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2' }}
                onClick={() => setShowLogoutModal(true)}
              >
                <LogOut size={16} /> Sign Out of Account
              </button>
            </div>
          )}


        </div>

        {/* ================================================================
            PERSISTENT 5-TAB BOTTOM NAVIGATION BAR
            ================================================================ */}
        {['home', 'catalog', 'search', 'cart', 'orders', 'profile'].includes(currentScreen) && (
          <nav className="mobile-bottom-nav">
            {[
              { id: 'home', label: 'Home', icon: Home, screen: 'home' },
              { id: 'catalog', label: 'Categories', icon: Layers, screen: 'catalog' },
              { id: 'cart', label: 'Cart', icon: ShoppingCart, screen: 'cart', badge: cart.length },
              { id: 'orders', label: 'Orders', icon: ClipboardList, screen: 'orders', badge: orders.filter(o => o.status === 'to_receive').length },
              { id: 'profile', label: 'Profile', icon: User, screen: 'profile' }
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeBottomNav === tab.id
              return (
                <button
                  key={tab.id}
                  className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveBottomNav(tab.id)
                    navigateTo(tab.screen, tab.id)
                  }}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && <span className="nav-badge">{tab.badge}</span>}
                </button>
              )
            })}
          </nav>
        )}

        {/* Device Home Indicator */}
        <div className="home-indicator"></div>
      </div>

      {/* ================================================================
          MODAL 1: ADVANCED FILTER BOTTOM SHEET DRAWER
          ================================================================ */}
      {showFilterDrawer && (
        <div className="filter-drawer-overlay" onClick={() => setShowFilterDrawer(false)}>
          <div className="filter-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="filter-drawer-header">
              <span className="filter-drawer-title">Filter Hardware Supplies</span>
              <button
                onClick={() => setShowFilterDrawer(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Price Range Slider */}
            <div className="filter-section">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="filter-section-label">Max Price Range:</span>
                <span style={{ fontWeight: '800', color: '#ea580c' }}>₱{priceRangeMax.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="50"
                value={priceRangeMax}
                onChange={(e) => setPriceRangeMax(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#f97316' }}
              />
            </div>

            {/* Brand Checkboxes */}
            <div className="filter-section">
              <span className="filter-section-label">Manufacturer Brand</span>
              <div className="filter-options-grid">
                {['Holcim Excel', 'James Hardie', 'Phelps Dodge', 'Boysen Paints', 'Bosch Professional', 'Makita', 'SteelAsia', 'Union Galvasteel'].map((b) => (
                  <button
                    key={b}
                    className={`filter-option-btn ${selectedBrands.includes(b) ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedBrands(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock Availability */}
            <div className="filter-section">
              <span className="filter-section-label">Availability</span>
              <button
                className={`filter-option-btn ${inStockOnly ? 'active' : ''}`}
                onClick={() => setInStockOnly(!inStockOnly)}
              >
                {inStockOnly ? '✅ In-Stock Only Active' : 'Show All Stock Items'}
              </button>
            </div>

            <div className="filter-drawer-footer">
              <button
                className="catalog-btn"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  setSelectedBrands([])
                  setPriceRangeMax(5000)
                  setInStockOnly(false)
                }}
              >
                Reset
              </button>
              <button
                className="auth-btn-primary"
                style={{ flex: 2, marginTop: 0 }}
                onClick={() => setShowFilterDrawer(false)}
              >
                Apply Filters ({filteredProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL 2: CANCEL ORDER CONFIRMATION
          ================================================================ */}
      {showCancelModal && orderToCancel && (
        <div className="simulator-modal-overlay">
          <div className="simulator-card" style={{ padding: '24px', textAlign: 'center' }}>
            <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              Cancel Order {orderToCancel.id}?
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
              Are you sure you want to cancel this order? If payment was made via GCash/Maya, refund will be processed back within 24 hours.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="catalog-btn"
                style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                onClick={() => setShowCancelModal(false)}
              >
                Keep Order
              </button>
              <button
                className="auth-btn-primary"
                style={{ flex: 1, background: '#ef4444', marginTop: 0 }}
                onClick={() => {
                  setOrders(prev => prev.map(o => o.id === orderToCancel.id ? { ...o, status: 'cancelled', statusLabel: 'Cancelled by Customer', badgeClass: 'cancelled' } : o))
                  setShowCancelModal(false)
                  triggerToast(`Order ${orderToCancel.id} has been cancelled.`)
                }}
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL 3: CAMERA MATERIAL SCANNER SIMULATOR
          ================================================================ */}
      {showCameraScanner && (
        <div className="simulator-modal-overlay">
          <div className="simulator-card" style={{ background: '#0f172a', color: '#fff', padding: '24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: '800', fontSize: '15px' }}>AI Material Visual Scanner</span>
              <button
                onClick={() => setShowCameraScanner(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              height: '200px',
              border: '2px dashed #f97316',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: 'rgba(255,255,255,0.05)',
              marginBottom: '16px'
            }}>
              <Camera size={44} color="#f97316" />
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Point camera at lumber, pipe, or paint barcode
              </span>
            </div>

            <button
              className="auth-btn-primary"
              onClick={() => {
                setShowCameraScanner(false)
                setSelectedProduct(HARDWARE_CATALOG[1])
                navigateTo('details')
                triggerToast('Identified: Portland Cement 40kg (Holcim)')
              }}
            >
              Simulate Scan: Cement Bag 🧱
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL 4: ADDRESS MANAGER
          ================================================================ */}
      {showAddressModal && (
        <div className="simulator-modal-overlay">
          <div className="simulator-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>Delivery Addresses</span>
              <button
                onClick={() => setShowAddressModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              {[
                { id: 'addr1', title: 'Site 1 (San Pablo Villa)', full: 'Lot 4 Block 2, Villa San Antonio, San Pablo City, Laguna' },
                { id: 'addr2', title: 'Site 2 (Calamba Warehouse)', full: 'Km 54 National Highway, Barangay Real, Calamba City, Laguna' }
              ].map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => {
                    setSelectedAddress(addr.full)
                    setShowAddressModal(false)
                    triggerToast(`Delivery set to: ${addr.title}`)
                  }}
                  style={{
                    border: selectedAddress === addr.full ? '2px solid #f97316' : '1px solid #e2e8f0',
                    background: selectedAddress === addr.full ? '#fff7ed' : '#fff',
                    padding: '12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{addr.title}</div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{addr.full}</p>
                </div>
              ))}
            </div>

            <button
              className="auth-btn-primary"
              onClick={() => {
                setShowAddressModal(false)
                triggerToast('New construction job site address added!')
              }}
            >
              + Add New Site Address
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL 5: HELP & SUPPORT
          ================================================================ */}
      {showSupportModal && (
        <div className="simulator-modal-overlay">
          <div className="simulator-card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>Contractor Support Hotline</span>
              <button
                onClick={() => setShowSupportModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', marginBottom: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>📞 Phone Orders & Inquiries:</div>
                <div style={{ fontSize: '13.5px', color: '#ea580c', fontWeight: '800', marginTop: '2px' }}>
                  (049) 562-8899 / 0917-888-JEM1
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>💬 Viber / WhatsApp:</div>
                <div style={{ fontSize: '13px', color: '#2563eb', fontWeight: '700', marginTop: '2px' }}>
                  0917-555-4321 (Estimates & Quotations)
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>🕒 Operating Hours:</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Monday to Saturday: 7:00 AM – 6:00 PM<br />Sunday: 8:00 AM – 1:00 PM
                </div>
              </div>
            </div>

            <button
              className="auth-btn-primary"
              onClick={() => {
                setShowSupportModal(false)
                triggerToast('Live chat session started with JEM sales rep!')
              }}
            >
              Start Live Chat Now
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL 6: ABOUT JEM HARDWARE
          ================================================================ */}
      {showAboutModal && (
        <div className="simulator-modal-overlay">
          <div className="simulator-card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>About JEM Hardware</span>
              <button
                onClick={() => setShowAboutModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ textAlign: 'left', fontSize: '12.5px', color: '#475569', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p>
                <strong>JEM Hardware and Construction Supply</strong> is a premier distributor of structural lumber, cement, deformed steel bars, plumbing, electrical, and power tools in Southern Luzon and Metro Manila.
              </p>
              <p>
                🏢 <strong>Main Warehouse:</strong> San Pablo City, Laguna<br />
                📍 <strong>Calamba Depot:</strong> National Highway, Real, Calamba City<br />
                🚛 <strong>Delivery Fleet:</strong> 6-wheeler boom trucks, 4-wheeler dropsides, and express elf delivery vans.
              </p>
            </div>

            <button
              className="auth-btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => setShowAboutModal(false)}
            >
              Close Info
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onConfirm={() => {
          setShowLogoutModal(false)
          triggerToast('Logged out successfully.')
          navigateTo('auth')
        }}
        onCancel={() => setShowLogoutModal(false)}
        title="Customer Sign Out"
        message="Are you sure you want to log out?"
      />

    </div>
  )
}