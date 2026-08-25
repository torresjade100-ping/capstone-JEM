import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';

const { width } = Dimensions.get('window');

const HARDWARE_PRODUCTS = [
  {
    id: 1,
    name: 'Portland Cement Type 1P (40kg)',
    brand: 'Holcim',
    category: 'Cement & Materials',
    category_id: 'cement',
    base_price: 285,
    unit: 'bag',
    stock_quantity: 350,
    rating: 4.9,
    reviews: 528,
    discount_pct: '-8%',
    emoji: '🧱',
    description: 'High-strength premium Portland cement type 1P for structural concrete, foundations, and masonry.'
  },
  {
    id: 2,
    name: 'Cordless Drill Driver 18V (with 2 batteries)',
    brand: 'Makita',
    category: 'Tools & Equipment',
    category_id: 'tools',
    base_price: 4250,
    unit: 'set',
    stock_quantity: 45,
    rating: 4.9,
    reviews: 187,
    discount_pct: '-18%',
    emoji: '⚙️',
    description: 'Heavy-duty 18V brushless motor cordless drill with 2 lithium-ion batteries, fast charger, and case.'
  },
  {
    id: 3,
    name: 'Deformed Steel Rebar 12mm × 6m (Grade 40)',
    brand: 'SteelAsia',
    category: 'Roofing',
    category_id: 'roofing',
    base_price: 285,
    unit: 'length',
    stock_quantity: 210,
    rating: 4.9,
    reviews: 310,
    discount_pct: '-10%',
    emoji: '🏗️',
    description: 'PNS 49 certified standard hot rolled deformed steel rebars for concrete foundations and columns.'
  },
  {
    id: 4,
    name: 'THHN Copper Wire 2.0mm² (150m)',
    brand: 'Phelps Dodge',
    category: 'Electrical',
    category_id: 'electrical',
    base_price: 2450,
    unit: 'box',
    stock_quantity: 42,
    rating: 4.9,
    reviews: 87,
    discount_pct: '-12%',
    emoji: '⚡',
    description: '100% pure copper building wire 150m thermoplastic high heat resistant with nylon jacket.'
  },
  {
    id: 5,
    name: 'PVC Sanitary Pipe 4" × 3m (Series 1000)',
    brand: 'Emerald Pipes',
    category: 'Plumbing',
    category_id: 'plumbing',
    base_price: 195,
    unit: 'length',
    stock_quantity: 145,
    rating: 4.6,
    reviews: 132,
    discount_pct: '-15%',
    emoji: '🚿',
    description: 'Heavy-duty series 1000 PVC sanitary pipe for residential drainage, storm, and vent lines.'
  },
  {
    id: 6,
    name: 'Permacoat Latex Paint White 4L',
    brand: 'Boysen Paints',
    category: 'Paint & Accessories',
    category_id: 'paint',
    base_price: 740,
    unit: 'gallon',
    stock_quantity: 85,
    rating: 4.8,
    reviews: 215,
    discount_pct: '-5%',
    emoji: '🎨',
    description: '100% acrylic latex paint for interior and exterior concrete, drywall, and masonry walls.'
  },
  {
    id: 7,
    name: 'GI Corrugated Sheet G24 (8ft)',
    brand: 'Union Galvasteel',
    category: 'Roofing',
    category_id: 'roofing',
    base_price: 380,
    unit: 'sheet',
    stock_quantity: 120,
    rating: 4.7,
    reviews: 198,
    discount_pct: '-7%',
    emoji: '🏠',
    description: 'Hot-dipped galvanized iron roofing sheet gauge 24 with zinc-shield weather endurance.'
  },
  {
    id: 8,
    name: 'Common Wire Nails 4" (1kg pack)',
    brand: 'JEM Hardware',
    category: 'Hardware & Fasteners',
    category_id: 'hardware',
    base_price: 85,
    unit: 'kilo',
    stock_quantity: 340,
    rating: 4.8,
    reviews: 142,
    discount_pct: '-10%',
    emoji: '🔩',
    description: 'High tensile strength carbon steel wire nails for general framing, formworks, and timber.'
  },
  {
    id: 9,
    name: 'Reflective Safety Vest High-Visibility (Orange)',
    brand: 'ProSafe',
    category: 'Safety Equipment',
    category_id: 'safety',
    base_price: 140,
    unit: 'piece',
    stock_quantity: 95,
    rating: 4.9,
    reviews: 78,
    discount_pct: '-15%',
    emoji: '🦺',
    description: 'Breathable mesh safety vest with 2-inch wide 3M reflective tape for job site protection.'
  }
];

const CATEGORY_ITEMS = [
  { id: 'cement', name: 'Cement', title: 'Cement & Materials', count: 48, icon: '🧱', bg: '#fee2e2' },
  { id: 'tools', name: 'Tools', title: 'Tools & Equipment', count: 135, icon: '🔧', bg: '#f1f5f9' },
  { id: 'electrical', name: 'Electrical', title: 'Electrical', count: 92, icon: '⚡', bg: '#fef3c7' },
  { id: 'plumbing', name: 'Plumbing', title: 'Plumbing', count: 74, icon: '🚿', bg: '#e0f2fe' },
  { id: 'paint', name: 'Paint', title: 'Paint & Accessories', count: 56, icon: '🎨', bg: '#fce7f3' },
  { id: 'roofing', name: 'Roofing', title: 'Roofing', count: 38, icon: '🏠', bg: '#ede9fe' },
  { id: 'hardware', name: 'Hardware', title: 'Hardware & Fasteners', count: 120, icon: '🔩', bg: '#f1f5f9' },
  { id: 'safety', name: 'Safety Equipment', title: 'Safety Equipment', count: 25, icon: '🦺', bg: '#ffedd5' },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash'); // 'splash' | 'onboarding' | 'signin' | 'signup' | 'main'
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [activeTab, setActiveTab] = useState('home'); // home, categories, cart, orders, profile
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState(HARDWARE_PRODUCTS);
  const [categories, setCategories] = useState(CATEGORY_ITEMS);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([1, 2]);
  const [ordersTabFilter, setOrdersTabFilter] = useState('To Process');
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const [voucher, setVoucher] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [toast, setToast] = useState('');

  // Dynamic API Fetching on Mount
  useEffect(() => {
    const fetchApiData = async () => {
      const endpoints = [
        'http://127.0.0.1:8000/api',
        'http://localhost:8000/api',
        'http://10.0.2.2:8000/api'
      ];

      for (const base of endpoints) {
        try {
          const res = await fetch(`${base}/products`);
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data?.data || []);
            if (list.length > 0) {
              const mapped = list.map(p => ({
                id: p.id,
                name: p.name,
                brand: p.brand?.name || p.brand || 'JEM Hardware',
                category: p.category?.name || p.category || 'Cement & Materials',
                category_id: p.category?.name ? p.category.name.toLowerCase().split(' ')[0] : 'cement',
                base_price: Number(p.base_price || 0),
                unit: p.unit || 'piece',
                stock_quantity: Number(p.stock_quantity ?? 100),
                rating: Number(p.rating || 4.9),
                reviews: Number(p.reviews_count || 128),
                discount_pct: '-10%',
                emoji: p.emoji || (p.category?.name?.toLowerCase().includes('cement') ? '🧱' : p.category?.name?.toLowerCase().includes('tool') ? '🔧' : p.category?.name?.toLowerCase().includes('roof') ? '🏠' : p.category?.name?.toLowerCase().includes('plumb') ? '🚿' : p.category?.name?.toLowerCase().includes('paint') ? '🎨' : p.category?.name?.toLowerCase().includes('elec') ? '⚡' : '🪵'),
                description: p.description || 'Contractor-grade building and hardware supply.'
              }));
              setProducts(mapped);
              break;
            }
          }
        } catch (e) {
          // try next endpoint
        }
      }
    };

    fetchApiData();
  }, []);

  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        setCurrentScreen('onboarding');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const toggleWishlist = (productId) => {
    setWishlist(prev => {
      if (prev.includes(productId)) {
        showToast('Removed from wishlist');
        return prev.filter(id => id !== productId);
      } else {
        showToast('Added to wishlist ❤️');
        return [...prev, productId];
      }
    });
  };

  const addToCart = (product, qty = 1) => {
    if (product.stock_quantity === 0) {
      showToast('❌ Item is currently Out of Stock');
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty + qty > product.stock_quantity) {
        showToast(`⚠️ Max available stock is ${product.stock_quantity} units`);
        return prev;
      }
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { ...product, quantity: qty }];
    });
    showToast(`Added ${product.name} to Cart`);
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;
      const product = products.find(p => p.id === id) || item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter(i => i.id !== id);
      if (newQty > product.stock_quantity) {
        showToast(`⚠️ Cannot exceed available stock (${product.stock_quantity} max)`);
        return prev;
      }
      return prev.map(i => i.id === id ? { ...i, quantity: newQty } : i);
    });
  };

  const handleApplyVoucher = () => {
    const code = voucher.trim().toUpperCase();
    if (code === 'JEMBUILD10' || code === 'BUILD10') {
      setDiscount(200);
      showToast('Voucher Applied: ₱200 OFF!');
    } else {
      showToast('Invalid voucher code');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const subtotal = cart.reduce((sum, i) => sum + (i.base_price * i.quantity), 0);
    const total = Math.max(subtotal + 200 - discount, 0);
    const orderNumber = `JEM-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = {
      id: Date.now(),
      order_number: orderNumber,
      total,
      subtotal,
      shipping_fee: 200,
      items: cart.map(i => ({
        product_id: i.id,
        name: i.name,
        qty: i.quantity,
        quantity: i.quantity,
        price: i.base_price,
        unit_price: i.base_price
      })),
      status: 'pending',
      order_source: 'Mobile App',
      customer_name: authName || 'Juan dela Cruz',
      customer_email: authEmail || 'juan@email.com',
      customer_phone: '0917-123-4567',
      payment_method: paymentMethod.toLowerCase(),
      delivery_type: 'delivery',
      delivery_address: 'Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna',
      driver: 'Kuya Mark (Isuzu Elf Plate NCI-8921)',
      created_at: new Date().toISOString(),
      date: new Date().toLocaleDateString()
    };

    // 1. Sync to shared browser database storage
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('jem_shared_orders');
        const existing = raw ? JSON.parse(raw) : [];
        localStorage.setItem('jem_shared_orders', JSON.stringify([newOrder, ...(Array.isArray(existing) ? existing : [])]));
      } catch (e) {}

      // Dispatch real-time browser event for Staff and Admin notifications
      try {
        const notifObj = {
          targetRole: 'all',
          title: 'New Customer Mobile Order 🛒',
          message: `Order #${orderNumber} (₱${total.toLocaleString()}) placed by ${authName || 'Juan dela Cruz'} via ${paymentMethod.toUpperCase()}`,
          type: 'order',
          data: {
            order_id: newOrder.id,
            order_number: orderNumber,
            total,
            customer_name: authName || 'Juan dela Cruz'
          }
        };
        window.dispatchEvent(new CustomEvent('jem_notification_pop', { detail: notifObj }));
        window.dispatchEvent(new CustomEvent('jem_notification_update', { detail: notifObj }));
        window.dispatchEvent(new CustomEvent('jem_orders_update', { detail: newOrder }));
      } catch (e) {}
    }

    // 2. Post to backend API
    const endpoints = ['http://127.0.0.1:8000/api', 'http://localhost:8000/api', 'http://10.0.2.2:8000/api'];
    for (const base of endpoints) {
      try {
        await fetch(`${base}/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            type: 'new_mobile_order',
            data: {
              title: 'New Customer Mobile Order 🛒',
              message: `New Order ${orderNumber} (₱${total.toLocaleString()}) from ${authName || 'Juan dela Cruz'} via ${paymentMethod.toUpperCase()}`,
              order_id: newOrder.id,
              order_number: orderNumber,
              total,
              customer_name: authName || 'Juan dela Cruz'
            }
          })
        });
        break;
      } catch (e) {}
    }

    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    setOrdersTabFilter('To Process');
    setActiveTab('orders');
    showToast('Order Placed! (Synced with JEM Staff & Admin)');
  };


  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
      const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
      return matchQuery && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const filteredOrders = useMemo(() => {
    if (ordersTabFilter === 'Completed') return orders.filter(o => o.status === 'completed' || o.status === 'Completed');
    return orders.filter(o => o.status === ordersTabFilter || o.status === 'To Process');
  }, [orders, ordersTabFilter]);

  const cartSubtotal = cart.reduce((sum, i) => sum + (i.base_price * i.quantity), 0);
  const cartTotal = Math.max(cartSubtotal + 200 - discount, 0);

  // =========================================================================
  // 1. SCREEN: SPLASH SCREEN
  // =========================================================================
  if (currentScreen === 'splash') {
    return (
      <SafeAreaView style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0d131f" />
        <View style={styles.splashOrbTop} />
        <View style={styles.splashOrbBottom} />

        <View style={styles.splashCenter}>
          <View style={styles.splashLogoBox}>
            <Text style={styles.splashLogoText}>JEM</Text>
          </View>
          <Text style={styles.splashTitle}>JEM Hardware</Text>
          <Text style={styles.splashSubtitle}>& Construction Supply</Text>
          <Text style={styles.splashTagline}>
            Your trusted partner for all{'\n'}construction and hardware needs
          </Text>
        </View>

        <View style={styles.splashFooter}>
          <ActivityIndicator size="small" color="#f97316" />
          <Text style={styles.splashLoadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // 2. SCREEN: 3-SLIDE ONBOARDING CAROUSEL
  // =========================================================================
  if (currentScreen === 'onboarding') {
    const slides = [
      {
        title: 'Browse 500+ Products',
        desc: 'Explore a wide selection of cement, steel, tools, electrical, plumbing, and roofing supplies — all in one place.',
        icon: '🏗️',
        bg: '#fdfbf7',
        activeDotColor: '#f97316',
      },
      {
        title: 'Order Anytime, Anywhere',
        desc: 'Place orders from your phone and get your construction materials delivered directly to your site or project.',
        icon: '📦',
        bg: '#f0f7ff',
        activeDotColor: '#0f172a',
      },
      {
        title: 'Flexible Payment Methods',
        desc: 'Pay via GCash, Maya, or Cash on Delivery. Safe, secure, and convenient for every transaction.',
        icon: '💳',
        bg: '#effcf6',
        activeDotColor: '#10b981',
      },
    ];

    const currentSlide = slides[onboardingSlide];

    return (
      <SafeAreaView style={[styles.onboardingContainer, { backgroundColor: currentSlide.bg }]}>
        <StatusBar barStyle="dark-content" backgroundColor={currentSlide.bg} />
        
        {/* Header Skip */}
        <View style={styles.onboardingHeader}>
          <View />
          <TouchableOpacity 
            style={styles.skipBtn} 
            onPress={() => setCurrentScreen('signin')}
          >
            <Text style={styles.skipBtnText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Center Illustration */}
        <View style={styles.onboardingBody}>
          <View style={styles.onboardingIconCircle}>
            <Text style={{ fontSize: 68 }}>{currentSlide.icon}</Text>
          </View>

          <Text style={styles.onboardingTitle}>{currentSlide.title}</Text>
          <Text style={styles.onboardingDesc}>{currentSlide.desc}</Text>
        </View>

        {/* Footer */}
        <View style={styles.onboardingFooter}>
          <View style={styles.dotsRow}>
            {slides.map((_, idx) => (
              <View 
                key={idx} 
                style={[
                  styles.dot, 
                  idx === onboardingSlide 
                    ? [styles.activeDot, { backgroundColor: currentSlide.activeDotColor }] 
                    : styles.inactiveDot
                ]} 
              />
            ))}
          </View>

          {onboardingSlide < 2 ? (
            <TouchableOpacity 
              style={styles.primaryAuthBtn} 
              onPress={() => setOnboardingSlide(prev => prev + 1)}
            >
              <Text style={styles.primaryAuthBtnText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 12 }}>
              <TouchableOpacity 
                style={styles.primaryAuthBtn} 
                onPress={() => setCurrentScreen('signin')}
              >
                <Text style={styles.primaryAuthBtnText}>Get Started</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryAuthBtn} 
                onPress={() => setCurrentScreen('signup')}
              >
                <Text style={styles.secondaryAuthBtnText}>Create an Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // 3. SCREEN: SIGN IN (WELCOME BACK! 👋)
  // =========================================================================
  if (currentScreen === 'signin') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#131d2e" />
        
        {/* Top Dark Navy Header */}
        <View style={styles.authTopHeader}>
          <View style={styles.authMiniBrand}>
            <View style={styles.authMiniLogoBox}>
              <Text style={styles.authMiniLogoText}>JEM</Text>
            </View>
            <View>
              <Text style={styles.authMiniTitle}>JEM Hardware</Text>
              <Text style={styles.authMiniSubtitle}>& Construction Supply</Text>
            </View>
          </View>

          <Text style={styles.authHeroTitle}>Welcome back! 👋</Text>
          <Text style={styles.authHeroSubtitle}>Sign in to continue shopping</Text>
        </View>

        {/* White Card Form */}
        <ScrollView style={styles.authFormCard} showsVerticalScrollIndicator={false}>
          <View style={styles.authFieldGroup}>
            <Text style={styles.authFieldLabel}>Email / Mobile Number</Text>
            <TextInput
              style={styles.authInput}
              placeholder="Enter email or 09xxxxxxxxx"
              placeholderTextColor="#94a3b8"
              value={authEmail}
              onChangeText={setAuthEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.authFieldGroup}>
            <Text style={styles.authFieldLabel}>Password</Text>
            <View style={styles.authPasswordInputBox}>
              <TextInput
                style={[styles.authInput, { flex: 1, borderWidth: 0, paddingRight: 0 }]}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                value={authPassword}
                onChangeText={setAuthPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                style={styles.eyeBtn} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.authOptionsRow}>
            <TouchableOpacity 
              style={styles.rememberMeBox} 
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberMeText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => showToast('Password reset instructions sent to contact.')}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.primaryAuthBtn} 
            onPress={() => {
              showToast(`Welcome back, ${authEmail ? authEmail.split('@')[0] : 'Juan'}! 👋`);
              setCurrentScreen('main');
            }}
          >
            <Text style={styles.primaryAuthBtnText}>Sign In</Text>
          </TouchableOpacity>

          <View style={styles.authFooterRow}>
            <Text style={styles.authFooterText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => setCurrentScreen('signup')}>
              <Text style={styles.authFooterLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // 4. SCREEN: SIGN UP (CREATE ACCOUNT 🚀)
  // =========================================================================
  if (currentScreen === 'signup') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#131d2e" />
        
        <View style={styles.authTopHeader}>
          <View style={styles.authMiniBrand}>
            <View style={styles.authMiniLogoBox}>
              <Text style={styles.authMiniLogoText}>JEM</Text>
            </View>
            <View>
              <Text style={styles.authMiniTitle}>JEM Hardware</Text>
              <Text style={styles.authMiniSubtitle}>& Construction Supply</Text>
            </View>
          </View>

          <Text style={styles.authHeroTitle}>Create Account 🚀</Text>
          <Text style={styles.authHeroSubtitle}>Join JEM Hardware for exclusive contractor deals</Text>
        </View>

        <ScrollView style={styles.authFormCard} showsVerticalScrollIndicator={false}>
          <View style={styles.authFieldGroup}>
            <Text style={styles.authFieldLabel}>Full Name / Contractor Name</Text>
            <TextInput
              style={styles.authInput}
              placeholder="e.g. Juan dela Cruz"
              placeholderTextColor="#94a3b8"
              value={authName}
              onChangeText={setAuthName}
            />
          </View>

          <View style={styles.authFieldGroup}>
            <Text style={styles.authFieldLabel}>Email / Mobile Number</Text>
            <TextInput
              style={styles.authInput}
              placeholder="Enter email or 09xxxxxxxxx"
              placeholderTextColor="#94a3b8"
              value={authEmail}
              onChangeText={setAuthEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.authFieldGroup}>
            <Text style={styles.authFieldLabel}>Password</Text>
            <TextInput
              style={styles.authInput}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#94a3b8"
              value={authPassword}
              onChangeText={setAuthPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={styles.primaryAuthBtn} 
            onPress={() => {
              showToast(`Account Created! Welcome, ${authName || 'Builder'}! 👋`);
              setCurrentScreen('main');
            }}
          >
            <Text style={styles.primaryAuthBtnText}>Create Account</Text>
          </TouchableOpacity>

          <View style={styles.authFooterRow}>
            <Text style={styles.authFooterText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => setCurrentScreen('signin')}>
              <Text style={styles.authFooterLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // 5. SCREEN: SIGNED-IN MAIN APP (5 TABS)
  // =========================================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#131d2e" />

      {/* Floating Toast */}
      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✨ {toast}</Text>
        </View>
      ) : null}

      {/* Scrollable Main Views */}
      <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 85 }} showsVerticalScrollIndicator={false}>

        {/* =========================================================================
            TAB 1: HOME (Screenshot 1)
            ========================================================================= */}
        {activeTab === 'home' && (
          <View>
            {/* Header with Search and Bell */}
            <View style={styles.homeHeader}>
              <View style={styles.homeHeaderTop}>
                <View>
                  <Text style={styles.homeHeaderGreeting}>Good day! 👋</Text>
                  <Text style={styles.homeHeaderBrand}>JEM Hardware</Text>
                </View>
                <TouchableOpacity 
                  style={styles.bellBtn} 
                  onPress={() => setShowNotificationsModal(true)}
                >
                  <Text style={{ fontSize: 20 }}>🔔</Text>
                  <View style={styles.bellBadgeDot} />
                </TouchableOpacity>
              </View>

              <View style={styles.homeSearchBox}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
                <TextInput
                  style={styles.homeSearchInput}
                  placeholder="Search cement, drill, paint..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text style={{ color: '#94a3b8', fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
              {/* Hero Banner with Worker Background Gradient */}
              <View style={styles.heroBanner}>
                <View style={styles.heroOverlay}>
                  <Text style={styles.heroHeadline}>Build Stronger, Build Smarter</Text>
                  <Text style={styles.heroSubheadline}>Up to 25% off on cement & steel this week</Text>
                </View>
                <View style={styles.heroDotsRow}>
                  <View style={styles.heroPillActive} />
                  <View style={styles.heroDot} />
                  <View style={styles.heroDot} />
                </View>
              </View>

              {/* Shop by Category Section */}
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionHeaderTitle}>Shop by Category</Text>
                <TouchableOpacity onPress={() => setActiveTab('categories')}>
                  <Text style={styles.seeAllOrangeLink}>See all ›</Text>
                </TouchableOpacity>
              </View>

              {/* 4x2 Category Grid (8 Items) */}
              <View style={styles.categoryGrid4x2}>
                {CATEGORY_ITEMS.map((cat, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.categoryCardItem}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      setActiveTab('categories');
                    }}
                  >
                    <View style={[styles.categoryIconBadge, { backgroundColor: cat.bg }]}>
                      <Text style={{ fontSize: 26 }}>{cat.icon}</Text>
                    </View>
                    <Text style={styles.categoryCardLabel} numberOfLines={1}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ⭐ Featured Products Section */}
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionHeaderTitle}>⭐ Featured</Text>
                <TouchableOpacity onPress={() => setActiveTab('categories')}>
                  <Text style={styles.seeAllOrangeLink}>See all ›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.featuredProductGrid}>
                {filteredProducts.map((product) => {
                  const isWish = wishlist.includes(product.id);
                  return (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.featuredCard}
                      onPress={() => setSelectedProduct(product)}
                      activeOpacity={0.88}
                    >
                      <View style={styles.featuredThumbBox}>
                        <View style={styles.discountTagBadge}>
                          <Text style={styles.discountTagText}>{product.discount_pct || '-10%'}</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.heartBtn}
                          onPress={() => toggleWishlist(product.id)}
                        >
                          <Text style={{ fontSize: 16 }}>{isWish ? '❤️' : '🤍'}</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 44 }}>{product.emoji}</Text>
                      </View>
                      <View style={styles.featuredCardBody}>
                        <Text style={styles.featuredBrandName}>{product.brand}</Text>
                        <Text style={styles.featuredProductName} numberOfLines={2}>{product.name}</Text>
                        <View style={styles.featuredRatingRow}>
                          <Text style={{ fontSize: 11.5, color: '#f59e0b', fontWeight: '700' }}>★ {product.rating}</Text>
                          <Text style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>({product.reviews})</Text>
                        </View>
                        <View style={styles.featuredPriceRow}>
                          <Text style={styles.featuredProductPrice}>₱{product.base_price.toLocaleString()}</Text>
                          <TouchableOpacity
                            style={styles.featuredAddBtn}
                            onPress={() => addToCart(product, 1)}
                          >
                            <Text style={styles.featuredAddBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* =========================================================================
            TAB 2: CATEGORIES (Screenshot 2)
            ========================================================================= */}
        {activeTab === 'categories' && (
          <View>
            <View style={styles.categoriesHeader}>
              <Text style={styles.categoriesHeaderTitle}>Shop by Category</Text>
              <Text style={styles.categoriesHeaderSubtitle}>Find what you need for your project</Text>
            </View>

            <View style={{ padding: 16, gap: 12 }}>
              {CATEGORY_ITEMS.map((cat, idx) => (
                <TouchableOpacity 
                  key={idx}
                  style={styles.categoryRowCard}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    showToast(`Filtered: ${cat.title}`);
                  }}
                >
                  <View style={[styles.categoryRowIconBox, { backgroundColor: cat.bg }]}>
                    <Text style={{ fontSize: 26 }}>{cat.icon}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.categoryRowTitle}>{cat.title}</Text>
                    <Text style={styles.categoryRowCount}>{cat.count} products available</Text>
                  </View>
                  <Text style={styles.categoryRowChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* =========================================================================
            TAB 3: CART (Screenshot 3)
            ========================================================================= */}
        {activeTab === 'cart' && (
          <View>
            <View style={styles.cartTopHeader}>
              <Text style={styles.cartTopTitle}>My Cart</Text>
            </View>

            {cart.length === 0 ? (
              <View style={styles.cartEmptyContainer}>
                <View style={styles.cartEmptyIconCircle}>
                  <Text style={{ fontSize: 64 }}>🛒</Text>
                </View>
                <Text style={styles.cartEmptyTitle}>Your cart is empty</Text>
                <Text style={styles.cartEmptySubtitle}>
                  Browse our products and add items to your cart.
                </Text>
                <TouchableOpacity 
                  style={styles.startShoppingBtn}
                  onPress={() => setActiveTab('home')}
                >
                  <Text style={styles.startShoppingBtnText}>Start Shopping</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ padding: 16 }}>
                {cart.map((item) => (
                  <View key={item.id} style={styles.cartItemCard}>
                    <Text style={{ fontSize: 36, marginRight: 12 }}>{item.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>{item.name}</Text>
                      <Text style={{ fontSize: 13, color: '#f97316', fontWeight: '800', marginTop: 2 }}>
                        ₱{item.base_price.toLocaleString()} / {item.unit}
                      </Text>
                    </View>
                    <View style={styles.cartQtyControls}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, -1)}>
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValueText}>{item.quantity}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, 1)}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* Voucher Input */}
                <View style={styles.voucherBox}>
                  <TextInput
                    style={styles.voucherInput}
                    placeholder="Enter Voucher Code (e.g. JEMBUILD10)"
                    placeholderTextColor="#94a3b8"
                    value={voucher}
                    onChangeText={setVoucher}
                  />
                  <TouchableOpacity style={styles.voucherBtn} onPress={handleApplyVoucher}>
                    <Text style={styles.voucherBtnText}>Apply</Text>
                  </TouchableOpacity>
                </View>

                {/* Payment Method Selector */}
                <View style={{ marginVertical: 14 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 8, color: '#0f172a' }}>Payment Method:</Text>
                  {['gcash', 'maya', 'cod'].map((pm) => (
                    <TouchableOpacity
                      key={pm}
                      style={[styles.payOption, paymentMethod === pm && styles.payOptionActive]}
                      onPress={() => setPaymentMethod(pm)}
                    >
                      <Text style={{ fontWeight: '700', fontSize: 13, textTransform: 'uppercase' }}>
                        {pm === 'cod' ? '💵 Cash on Delivery' : pm === 'gcash' ? '💳 GCash E-Wallet' : '💚 Maya E-Wallet'}
                      </Text>
                      <Text style={{ color: paymentMethod === pm ? '#f97316' : '#94a3b8' }}>
                        {paymentMethod === pm ? '●' : '○'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Price Breakdown */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryVal}>₱{cartSubtotal.toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Delivery Fee</Text>
                    <Text style={styles.summaryVal}>₱200</Text>
                  </View>
                  {discount > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: '#10b981' }]}>Voucher Discount</Text>
                      <Text style={[styles.summaryVal, { color: '#10b981' }]}>-₱{discount.toLocaleString()}</Text>
                    </View>
                  )}
                  <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 8, marginTop: 4 }]}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Total Payment</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#f97316' }}>₱{cartTotal.toLocaleString()}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.primaryAuthBtn} onPress={handleCheckout}>
                  <Text style={styles.primaryAuthBtnText}>Place Order (₱{cartTotal.toLocaleString()}) →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* =========================================================================
            TAB 4: ORDERS (Screenshot 4)
            ========================================================================= */}
        {activeTab === 'orders' && (
          <View>
            <View style={styles.ordersTopHeader}>
              <Text style={styles.ordersTopTitle}>My Orders</Text>
              <Text style={styles.ordersTopSubtitle}>Track and manage your orders</Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.ordersFilterBar}>
              {['To Pay', 'To Process', 'To Ship', 'To Receive', 'Completed'].map((tab) => (
                <TouchableOpacity 
                  key={tab} 
                  style={[styles.ordersFilterTab, ordersTabFilter === tab && styles.ordersFilterTabActive]}
                  onPress={() => setOrdersTabFilter(tab)}
                >
                  <Text style={[styles.ordersFilterTabText, ordersTabFilter === tab && styles.ordersFilterTabTextActive]}>
                    {tab}
                  </Text>
                  {ordersTabFilter === tab && <View style={styles.ordersActiveIndicator} />}
                </TouchableOpacity>
              ))}
            </View>

            {filteredOrders.length === 0 ? (
              <View style={styles.ordersEmptyContainer}>
                <View style={styles.ordersEmptyIconCircle}>
                  <Text style={{ fontSize: 56 }}>📦</Text>
                </View>
                <Text style={styles.ordersEmptyTitle}>No orders here</Text>
                <Text style={styles.ordersEmptySubtitle}>
                  Orders in this status will appear here.
                </Text>
                <TouchableOpacity 
                  style={styles.startShoppingBtn}
                  onPress={() => setActiveTab('home')}
                >
                  <Text style={styles.startShoppingBtnText}>Start Shopping</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ padding: 16 }}>
                {filteredOrders.map((ord) => (
                  <View key={ord.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <Text style={{ fontWeight: '800', fontSize: 14, color: '#0f172a' }}>{ord.id}</Text>
                      <Text style={{ fontWeight: '700', fontSize: 12, color: '#f97316' }}>{ord.status}</Text>
                    </View>
                    {ord.items.map((it, idx) => (
                      <Text key={idx} style={{ fontSize: 13, color: '#475569', marginVertical: 2 }}>
                        • {it.name} (x{it.qty}) - ₱{(it.price * it.qty).toLocaleString()}
                      </Text>
                    ))}
                    <View style={styles.orderFooter}>
                      <Text style={{ fontWeight: '800', fontSize: 15, color: '#0f172a' }}>
                        Total: ₱{ord.total.toLocaleString()}
                      </Text>
                      <TouchableOpacity
                        style={styles.trackBtn}
                        onPress={() => setSelectedOrder(ord)}
                      >
                        <Text style={styles.trackBtnText}>Live Tracker 📍</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* =========================================================================
            TAB 5: PROFILE (Screenshot 5)
            ========================================================================= */}
        {activeTab === 'profile' && (
          <View>
            <View style={styles.profileTopHeader}>
              <View style={styles.profileUserRow}>
                <View style={styles.profileAvatarBox}>
                  <Text style={styles.profileAvatarText}>J</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.profileUserName}>{authName || 'Juan dela Cruz'}</Text>
                  <Text style={styles.profileUserEmail}>{authEmail || 'juan@email.com'}</Text>
                  <Text style={styles.profileUserPhone}>0917-123-4567</Text>
                </View>
                <TouchableOpacity 
                  style={styles.profileGearBtn}
                  onPress={() => showToast('App Settings')}
                >
                  <Text style={{ fontSize: 18 }}>⚙️</Text>
                </TouchableOpacity>
              </View>

              {/* 3 Summary Stat Cards */}
              <View style={styles.profileStatsRow}>
                <View style={styles.profileStatCard}>
                  <Text style={styles.profileStatValue}>{orders.length}</Text>
                  <Text style={styles.profileStatLabel}>Total Orders</Text>
                </View>
                <View style={styles.profileStatCard}>
                  <Text style={styles.profileStatValue}>{orders.filter(o => o.status === 'completed').length}</Text>
                  <Text style={styles.profileStatLabel}>Completed</Text>
                </View>
                <View style={styles.profileStatCard}>
                  <Text style={styles.profileStatValue}>{wishlist.length}</Text>
                  <Text style={styles.profileStatLabel}>Wishlist</Text>
                </View>
              </View>
            </View>

            <View style={{ padding: 16 }}>
              {/* MY ACCOUNT Section */}
              <Text style={styles.profileSectionEyebrow}>MY ACCOUNT</Text>
              <View style={styles.profileGroupCard}>
                <TouchableOpacity style={styles.profileRowItem} onPress={() => setActiveTab('orders')}>
                  <Text style={{ fontSize: 18, marginRight: 12 }}>📦</Text>
                  <Text style={styles.profileRowLabel}>My Orders</Text>
                  <Text style={styles.profileRowChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.profileRowItem} onPress={() => setShowWishlistModal(true)}>
                  <Text style={{ fontSize: 18, marginRight: 12 }}>🤍</Text>
                  <Text style={styles.profileRowLabel}>Wishlist</Text>
                  <Text style={styles.profileRowChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.profileRowItem} onPress={() => setShowAddressModal(true)}>
                  <Text style={{ fontSize: 18, marginRight: 12 }}>📍</Text>
                  <Text style={styles.profileRowLabel}>Delivery Addresses</Text>
                  <Text style={styles.profileRowChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.profileRowItem} onPress={() => showToast('GCash / Maya / COD Enabled')}>
                  <Text style={{ fontSize: 18, marginRight: 12 }}>💳</Text>
                  <Text style={styles.profileRowLabel}>Payment Methods</Text>
                  <Text style={styles.profileRowChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.profileRowItem, { borderBottomWidth: 0 }]} onPress={() => setShowNotificationsModal(true)}>
                  <Text style={{ fontSize: 18, marginRight: 12 }}>🔔</Text>
                  <Text style={styles.profileRowLabel}>Notifications</Text>
                  <View style={styles.profileNotifBadge}>
                    <Text style={styles.profileNotifBadgeText}>3</Text>
                  </View>
                  <Text style={styles.profileRowChevron}>›</Text>
                </TouchableOpacity>
              </View>

              {/* SUPPORT Section */}
              <Text style={[styles.profileSectionEyebrow, { marginTop: 20 }]}>SUPPORT</Text>
              <View style={styles.profileGroupCard}>
                <TouchableOpacity style={styles.profileRowItem} onPress={() => setShowSupportModal(true)}>
                  <Text style={{ fontSize: 18, marginRight: 12 }}>❓</Text>
                  <Text style={styles.profileRowLabel}>Help &amp; Support</Text>
                  <Text style={styles.profileRowChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.profileRowItem} onPress={() => showToast('JEM Hardware & Construction Supply v2.0')}>
                  <Text style={{ fontSize: 18, marginRight: 12 }}>ℹ️</Text>
                  <Text style={styles.profileRowLabel}>About JEM Hardware</Text>
                  <Text style={styles.profileRowChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.profileRowItem, { borderBottomWidth: 0 }]} onPress={() => showToast('Settings Configured')}>
                  <Text style={{ fontSize: 18, marginRight: 12 }}>⚙️</Text>
                  <Text style={styles.profileRowLabel}>Settings</Text>
                  <Text style={styles.profileRowChevron}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Sign Out Button */}
              <TouchableOpacity
                style={styles.profileSignOutBtn}
                onPress={() => {
                  Alert.alert('Sign Out', 'Are you sure you want to log out of your account?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Sign Out',
                      style: 'destructive',
                      onPress: () => {
                        setCart([]);
                        showToast('Signed out successfully.');
                        setCurrentScreen('signin');
                      }
                    }
                  ]);
                }}
              >
                <Text style={styles.profileSignOutText}>🚪 Sign Out of Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* =========================================================================
          BOTTOM NAVIGATION BAR (5 TABS)
          ========================================================================= */}
      <View style={styles.bottomNav}>
        {[
          { id: 'home', label: 'Home', icon: '🏠' },
          { id: 'categories', label: 'Categories', icon: '⊞' },
          { id: 'cart', label: 'Cart', icon: '👜', badge: cart.length },
          { id: 'orders', label: 'Orders', icon: '📦' },
          { id: 'profile', label: 'Profile', icon: '👤' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.navItem}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={{ fontSize: 22 }}>{tab.icon}</Text>
            <Text style={[styles.navText, activeTab === tab.id && styles.navTextActive]}>
              {tab.label}
            </Text>
            {tab.badge > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{tab.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* =========================================================================
          MODAL: PRODUCT DETAILS
          ========================================================================= */}
      {selectedProduct && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' }}>
              <View style={styles.modalNav}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Product Details</Text>
                <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                  <Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailThumb}>
                  <Text style={{ fontSize: 80 }}>{selectedProduct.emoji}</Text>
                </View>
                <Text style={{ fontSize: 13, color: '#f97316', fontWeight: '800', textTransform: 'uppercase', marginTop: 12 }}>
                  {selectedProduct.brand} • {selectedProduct.category}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a', marginVertical: 4 }}>
                  {selectedProduct.name}
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#f97316' }}>
                  ₱{selectedProduct.base_price.toLocaleString()} <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '400' }}>/ {selectedProduct.unit}</Text>
                </Text>
                <Text style={{ fontSize: 13.5, color: '#475569', lineHeight: 20, marginTop: 10 }}>
                  {selectedProduct.description}
                </Text>
                <TouchableOpacity
                  style={[styles.primaryAuthBtn, { marginTop: 20 }]}
                  onPress={() => {
                    addToCart(selectedProduct, 1);
                    setSelectedProduct(null);
                  }}
                >
                  <Text style={styles.primaryAuthBtnText}>Add to Cart 🛒</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* =========================================================================
          MODAL: NOTIFICATIONS
          ========================================================================= */}
      {showNotificationsModal && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
              <View style={styles.modalNav}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>🔔 Notifications</Text>
                <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                  <Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ paddingVertical: 10 }}>
                {[
                  { title: 'Promo: 25% Off Cement', desc: 'Holcim & Republic cement bags on flash sale today!', time: '10m ago', icon: '🏷️' },
                  { title: 'Order Out for Delivery', desc: 'Your Isuzu delivery truck is en route to site.', time: '1h ago', icon: '🚚' },
                  { title: 'Welcome to JEM Hardware', desc: 'Thank you for joining our contractor network!', time: '1d ago', icon: '🎉' },
                ].map((n, i) => (
                  <View key={i} style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' }}>
                    <Text style={{ fontSize: 24, marginRight: 12 }}>{n.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>{n.title}</Text>
                      <Text style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>{n.desc}</Text>
                      <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{n.time}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* =========================================================================
          MODAL: LIVE ORDER TRACKING
          ========================================================================= */}
      {selectedOrder && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' }}>
              <View style={styles.modalNav}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Delivery Tracking 🚚</Text>
                <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                  <Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.driverCard}>
                  <Text style={{ fontSize: 32, marginRight: 12 }}>🚛</Text>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>{selectedOrder.driver}</Text>
                    <Text style={{ fontSize: 12, color: '#94a3b8' }}>JEM Logistics Truck #4 • Dispatch Laguna</Text>
                  </View>
                </View>
                <View style={{ marginVertical: 16, backgroundColor: '#f8fafc', padding: 14, borderRadius: 12 }}>
                  <Text style={{ fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>Delivery Stages:</Text>
                  <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 13 }}>✓ Order Confirmed at JEM Warehouse</Text>
                  <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 13, marginTop: 4 }}>✓ Materials Quality Checked & Loaded</Text>
                  <Text style={{ color: '#f97316', fontWeight: '700', fontSize: 13, marginTop: 4 }}>● In Transit to Job Site</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>○ Delivered & Received</Text>
                </View>
                <TouchableOpacity
                  style={styles.primaryAuthBtn}
                  onPress={() => setSelectedOrder(null)}
                >
                  <Text style={styles.primaryAuthBtnText}>Close Tracking</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* =========================================================================
          MODAL: WISHLIST
          ========================================================================= */}
      {showWishlistModal && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
              <View style={styles.modalNav}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>❤️ My Saved Wishlist</Text>
                <TouchableOpacity onPress={() => setShowWishlistModal(false)}>
                  <Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ paddingVertical: 10 }}>
                {products.filter(p => wishlist.includes(p.id)).map(p => (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f1f5f9' }}>
                    <Text style={{ fontSize: 32, marginRight: 12 }}>{p.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>{p.name}</Text>
                      <Text style={{ fontSize: 13, color: '#f97316', fontWeight: '800' }}>₱{p.base_price.toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity style={styles.featuredAddBtn} onPress={() => { addToCart(p, 1); showToast('Added to cart!'); }}>
                      <Text style={styles.featuredAddBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* =========================================================================
          MODAL: DELIVERY ADDRESSES
          ========================================================================= */}
      {showAddressModal && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%' }}>
              <View style={styles.modalNav}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>📍 Delivery Addresses</Text>
                <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                  <Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ paddingVertical: 10 }}>
                <View style={{ padding: 14, backgroundColor: '#fff7ed', borderRadius: 12, borderWidth: 1, borderColor: '#fed7aa', marginBottom: 12 }}>
                  <Text style={{ fontWeight: '800', color: '#ea580c' }}>Primary Job Site (Default)</Text>
                  <Text style={{ fontSize: 13, color: '#0f172a', marginTop: 4 }}>Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna</Text>
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Contact: 0917-123-4567</Text>
                </View>
                <TouchableOpacity style={styles.secondaryAuthBtn} onPress={() => showToast('Address Manager')}>
                  <Text style={styles.secondaryAuthBtnText}>+ Add New Site Address</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* =========================================================================
          MODAL: HELP & SUPPORT
          ========================================================================= */}
      {showSupportModal && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' }}>
              <View style={styles.modalNav}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>❓ Help &amp; Support</Text>
                <TouchableOpacity onPress={() => setShowSupportModal(false)}>
                  <Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={{ paddingVertical: 14, gap: 12 }}>
                <View style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 12 }}>
                  <Text style={{ fontWeight: '800', color: '#0f172a' }}>📞 Contractor Hotline</Text>
                  <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>(049) 562-8899 / 0917-888-JEM</Text>
                </View>
                <View style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 12 }}>
                  <Text style={{ fontWeight: '800', color: '#0f172a' }}>✉️ Customer Care Email</Text>
                  <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>support@jemhardware.com</Text>
                </View>
                <TouchableOpacity style={styles.primaryAuthBtn} onPress={() => { showToast('Connecting to dispatcher...'); setShowSupportModal(false); }}>
                  <Text style={styles.primaryAuthBtnText}>Start Live Chat 💬</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mainScroll: {
    flex: 1,
  },

  // =========================================================================
  // HOME SCREEN STYLES (Screenshot 1)
  // =========================================================================
  homeHeader: {
    backgroundColor: '#131d2e',
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  homeHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  homeHeaderGreeting: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  homeHeaderBrand: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#f97316',
  },
  homeSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  homeSearchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#ffffff',
  },
  heroBanner: {
    height: 140,
    borderRadius: 18,
    backgroundColor: '#ea580c',
    justifyContent: 'space-between',
    padding: 16,
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'center',
  },
  heroHeadline: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  heroSubheadline: {
    fontSize: 12.5,
    color: '#fed7aa',
    marginTop: 4,
    fontWeight: '600',
  },
  heroDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 5,
  },
  heroPillActive: {
    width: 18,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  heroDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  seeAllOrangeLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f97316',
  },
  categoryGrid4x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  categoryCardItem: {
    width: (width - 32 - 24) / 4,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  featuredProductGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  featuredCard: {
    width: (width - 32 - 12) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  featuredThumbBox: {
    height: 120,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  discountTagBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#f97316',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredCardBody: {
    padding: 10,
  },
  featuredBrandName: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  featuredProductName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
    height: 34,
  },
  featuredRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  featuredPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  featuredProductPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  featuredAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredAddBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },

  // =========================================================================
  // CATEGORIES SCREEN STYLES (Screenshot 2)
  // =========================================================================
  categoriesHeader: {
    backgroundColor: '#131d2e',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
  },
  categoriesHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  categoriesHeaderSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  categoryRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  categoryRowIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryRowTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  categoryRowCount: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
  },
  categoryRowChevron: {
    fontSize: 20,
    color: '#cbd5e1',
    fontWeight: '700',
  },

  // =========================================================================
  // CART SCREEN STYLES (Screenshot 3)
  // =========================================================================
  cartTopHeader: {
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  cartTopTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  cartEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  cartEmptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cartEmptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  cartEmptySubtitle: {
    fontSize: 13.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  startShoppingBtn: {
    backgroundColor: '#f97316',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  startShoppingBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  cartItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cartQtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontWeight: '800',
    fontSize: 14,
    color: '#0f172a',
  },
  qtyValueText: {
    marginHorizontal: 10,
    fontWeight: '800',
    fontSize: 13,
  },
  voucherBox: {
    flexDirection: 'row',
    marginVertical: 12,
    gap: 8,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  voucherBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
  },
  voucherBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  payOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  payOptionActive: {
    borderColor: '#f97316',
    backgroundColor: '#fff7ed',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },

  // =========================================================================
  // ORDERS SCREEN STYLES (Screenshot 4)
  // =========================================================================
  ordersTopHeader: {
    backgroundColor: '#131d2e',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  ordersTopTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  ordersTopSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  ordersFilterBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  ordersFilterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  ordersFilterTabActive: {},
  ordersFilterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  ordersFilterTabTextActive: {
    color: '#f97316',
    fontWeight: '800',
  },
  ordersActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: '#f97316',
    borderRadius: 2,
  },
  ordersEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  ordersEmptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  ordersEmptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  ordersEmptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 8,
  },
  trackBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  trackBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // =========================================================================
  // PROFILE SCREEN STYLES (Screenshot 5)
  // =========================================================================
  profileTopHeader: {
    backgroundColor: '#131d2e',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatarBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
  },
  profileUserName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  profileUserEmail: {
    fontSize: 12.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  profileUserPhone: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  profileGearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  profileStatCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  profileStatLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  profileSectionEyebrow: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  profileGroupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  profileRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  profileRowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  profileNotifBadge: {
    backgroundColor: '#f97316',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 6,
  },
  profileNotifBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  profileRowChevron: {
    fontSize: 18,
    color: '#cbd5e1',
    fontWeight: '700',
  },
  profileSignOutBtn: {
    marginTop: 20,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  profileSignOutText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
  },

  // =========================================================================
  // BOTTOM NAVIGATION BAR
  // =========================================================================
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    position: 'relative',
  },
  navText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  navTextActive: {
    color: '#f97316',
  },
  navBadge: {
    position: 'absolute',
    top: -3,
    right: -6,
    backgroundColor: '#f97316',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },

  // =========================================================================
  // MODAL SHARED STYLES
  // =========================================================================
  modalNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 10,
  },
  detailThumb: {
    height: 160,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
  },

  // =========================================================================
  // SPLASH SCREEN STYLES
  // =========================================================================
  splashContainer: {
    flex: 1,
    backgroundColor: '#0d131f',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  splashOrbTop: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
  splashOrbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
  },
  splashCenter: {
    alignItems: 'center',
    marginTop: 180,
  },
  splashLogoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
    marginBottom: 20,
  },
  splashLogoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  splashSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f97316',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  splashTagline: {
    fontSize: 13.5,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
    maxWidth: 260,
  },
  splashFooter: {
    alignItems: 'center',
    marginBottom: 20,
  },
  splashLoadingText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 10,
    fontWeight: '600',
  },

  // =========================================================================
  // ONBOARDING STYLES
  // =========================================================================
  onboardingContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  onboardingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  skipBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  onboardingBody: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  onboardingIconCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: 36,
  },
  onboardingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  onboardingDesc: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  onboardingFooter: {
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#cbd5e1',
  },
  primaryAuthBtn: {
    backgroundColor: '#f97316',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryAuthBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryAuthBtn: {
    backgroundColor: '#ffffff',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryAuthBtnText: {
    color: '#f97316',
    fontSize: 15,
    fontWeight: '800',
  },

  // =========================================================================
  // AUTH / SIGN IN & SIGN UP STYLES
  // =========================================================================
  authContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  authTopHeader: {
    backgroundColor: '#131d2e',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  authMiniBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  authMiniLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authMiniLogoText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  authMiniTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  authMiniSubtitle: {
    color: '#f97316',
    fontSize: 10,
    fontWeight: '700',
  },
  authHeroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  authHeroSubtitle: {
    fontSize: 13.5,
    color: '#94a3b8',
    marginTop: 4,
  },
  authFormCard: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  authFieldGroup: {
    marginBottom: 16,
  },
  authFieldLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  authInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  authPasswordInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingRight: 12,
  },
  eyeBtn: {
    padding: 6,
  },
  authOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  rememberMeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  rememberMeText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#f97316',
    fontWeight: '700',
  },
  authFooterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  authFooterText: {
    fontSize: 13.5,
    color: '#64748b',
    fontWeight: '500',
  },
  authFooterLink: {
    fontSize: 13.5,
    color: '#f97316',
    fontWeight: '800',
  },
  toast: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 9999,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
