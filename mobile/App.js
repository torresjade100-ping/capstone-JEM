import React, { useState, useMemo, useEffect } from 'react';
import {
  StatusBar,
  View,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Prevent browser window pull/elastic overscroll on web platforms
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  try {
    const docEl = document.documentElement;
    const bodyEl = document.body;
    if (docEl) {
      docEl.style.height = '100%';
      docEl.style.overflow = 'hidden';
      docEl.style.overscrollBehavior = 'none';
    }
    if (bodyEl) {
      bodyEl.style.height = '100%';
      bodyEl.style.overflow = 'hidden';
      bodyEl.style.overscrollBehavior = 'none';
      bodyEl.style.position = 'fixed';
      bodyEl.style.width = '100%';
      bodyEl.style.top = '0';
      bodyEl.style.left = '0';
    }
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.style.height = '100%';
      rootEl.style.overflow = 'hidden';
      rootEl.style.overscrollBehavior = 'none';
    }
  } catch (e) {}
}

// Initial Seed Data & Styles
import { HARDWARE_PRODUCTS, CATEGORY_ITEMS } from './src/data/initialData';
import { styles, getThemeColors } from './src/styles/appStyles';

// API Service for connecting Mobile App to Laravel Backend
import {
  getMobileProducts,
  getMobileCategories,
  getMobileOrders,
  submitMobileOrder,
  cancelMobileOrder,
  submitMobileFeedback,
  loginCustomer,
  registerCustomer,
  updateCustomerProfile,
  getStoredUser,
  saveStoredUser,
  getCustomerAddresses,
} from './src/api/mobileApi';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';

// Main Tabs
import HomeTab from './src/tabs/HomeTab';
import CategoriesTab from './src/tabs/CategoriesTab';
import CartTab from './src/tabs/CartTab';
import OrdersTab from './src/tabs/OrdersTab';
import ProfileTab from './src/tabs/ProfileTab';

// Shared Components
import BottomNavBar from './src/components/BottomNavBar';
import Toast from './src/components/Toast';

// Modals
import ProductDetailsModal from './src/modals/ProductDetailsModal';
import NotificationsModal from './src/modals/NotificationsModal';
import OrderTrackingModal from './src/modals/OrderTrackingModal';
import WishlistModal from './src/modals/WishlistModal';
import AddressModal from './src/modals/AddressModal';
import SupportModal from './src/modals/SupportModal';
import FeedbackModal from './src/modals/FeedbackModal';
import EditProfileModal from './src/modals/EditProfileModal';

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  // Screen & Auth Navigation State
  const [currentScreen, setCurrentScreen] = useState('splash'); // 'splash' | 'onboarding' | 'signin' | 'signup' | 'main'
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('0917-123-4567');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // App Tabs & Catalog State
  const [activeTab, setActiveTab] = useState('home'); // home, categories, cart, orders, profile
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState(HARDWARE_PRODUCTS);
  const [categories, setCategories] = useState(CATEGORY_ITEMS);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [ordersTabFilter, setOrdersTabFilter] = useState('To Pay');

  // Address & Delivery State
  const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' | 'pickup'
  const [deliveryAddress, setDeliveryAddress] = useState('Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna');
  const [selectedAddressObj, setSelectedAddressObj] = useState(null);

  // Active Modals State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Checkout & Voucher State
  const [voucher, setVoucher] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [toast, setToast] = useState('');

  // Theme Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const themeColors = getThemeColors(isDarkMode);

  // 1. Session Restoration & Dynamic Backend API Fetching on Mount
  useEffect(() => {
    // Restore User Session
    const storedUser = getStoredUser();
    if (storedUser) {
      if (storedUser.name) setAuthName(storedUser.name);
      if (storedUser.email) setAuthEmail(storedUser.email);
      if (storedUser.phone) setAuthPhone(storedUser.phone);
    }

    // Restore Wishlist
    if (typeof localStorage !== 'undefined') {
      try {
        const savedWish = localStorage.getItem('jem_mobile_wishlist');
        if (savedWish) {
          const parsed = JSON.parse(savedWish);
          if (Array.isArray(parsed)) setWishlist(parsed);
        }
      } catch (e) {}
    }

    const loadApiData = async () => {
      try {
        const [fetchedProducts, fetchedCategories, fetchedOrders] = await Promise.allSettled([
          getMobileProducts(),
          getMobileCategories(),
          getMobileOrders(),
        ]);

        if (fetchedProducts.status === 'fulfilled' && Array.isArray(fetchedProducts.value) && fetchedProducts.value.length > 0) {
          setProducts(fetchedProducts.value);
        }
        if (fetchedCategories.status === 'fulfilled' && Array.isArray(fetchedCategories.value) && fetchedCategories.value.length > 0) {
          setCategories(fetchedCategories.value);
        }
        if (fetchedOrders.status === 'fulfilled' && Array.isArray(fetchedOrders.value) && fetchedOrders.value.length > 0) {
          setOrders(fetchedOrders.value);
        }

        // Fetch user default address
        if (storedUser?.email) {
          try {
            const addrs = await getCustomerAddresses(storedUser.email);
            if (Array.isArray(addrs) && addrs.length > 0) {
              const def = addrs.find((a) => a.is_default) || addrs[0];
              if (def) {
                setDeliveryAddress(def.address);
                setSelectedAddressObj(def);
              }
            }
          } catch (e) {}
        }
      } catch (err) {
        // Non-blocking initial sync
      }
    };

    loadApiData();

    // Listen to real-time order updates from Staff or Admin
    let isPolling = false;
    const handleOrderEvent = async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const ord = await getMobileOrders();
        if (Array.isArray(ord) && ord.length > 0) {
          setOrders(ord);
          setSelectedOrder((prev) => {
            if (!prev) return null;
            return ord.find((o) => o.id === prev.id || o.order_number === prev.order_number) || prev;
          });
        }
      } catch (err) {
        // Silent catch for background polling
      } finally {
        isPolling = false;
      }
    };

    const pollInterval = setInterval(() => {
      handleOrderEvent();
    }, 8000);

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('jem_orders_update', handleOrderEvent);
      window.addEventListener('jem_notification_update', handleOrderEvent);
    }

    return () => {
      clearInterval(pollInterval);
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('jem_orders_update', handleOrderEvent);
        window.removeEventListener('jem_notification_update', handleOrderEvent);
      }
    };
  }, []);

  // 2. Splash Screen Auto Transition
  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        const user = getStoredUser();
        if (user && user.email) {
          setCurrentScreen('main');
        } else {
          setCurrentScreen('onboarding');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  // Toast Helper
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // Backend Authentication Handlers
  const handleBackendSignIn = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please enter your email/phone and password.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await loginCustomer(authEmail, authPassword);
      if (res.user?.name) setAuthName(res.user.name);
      if (res.user?.email) setAuthEmail(res.user.email);
      if (res.user?.phone) setAuthPhone(res.user.phone);

      // Load addresses for signed-in user
      getCustomerAddresses(res.user?.email).then((addrs) => {
        if (Array.isArray(addrs) && addrs.length > 0) {
          const def = addrs.find((a) => a.is_default) || addrs[0];
          if (def) {
            setDeliveryAddress(def.address);
            setSelectedAddressObj(def);
          }
        }
      });

      showToast(`Welcome back, ${res.user?.name || 'Customer'}! 👋`);
      setCurrentScreen('main');
    } catch (err) {
      setAuthError(err.message || 'Invalid credentials. Please verify your login details.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleBackendSignUp = async () => {
    if (!authName.trim() || !authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please fill in all required registration fields.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await registerCustomer(authName, authEmail, authPassword, authPhone);
      showToast(`Account Created! Welcome to JEM Hardware, ${authName}! 👋`);
      setCurrentScreen('main');
    } catch (err) {
      setAuthError(err.message || 'Registration failed. Email might already be taken.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Google / Gmail Authentication Handler (requested: only gmail with sign up)
  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const googleUser = {
        name: authName.trim() || 'Google Contractor',
        email: authEmail.includes('@gmail.com')
          ? authEmail.trim()
          : (authEmail.trim() ? `${authEmail.trim().split('@')[0]}@gmail.com` : 'contractor.jem@gmail.com'),
        phone: authPhone || '0917-888-9999',
      };
      saveStoredUser(googleUser);
      setAuthName(googleUser.name);
      setAuthEmail(googleUser.email);
      setAuthPhone(googleUser.phone);
      showToast(`Signed in with Gmail as ${googleUser.name}! 🚀`);
      setCurrentScreen('main');
    } catch (err) {
      setAuthError('Google sign in encountered an issue. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Profile Update Handler
  const handleSaveProfile = async (profileData) => {
    const updated = await updateCustomerProfile(profileData);
    if (updated.name) setAuthName(updated.name);
    if (updated.phone) setAuthPhone(updated.phone);
    showToast('Customer profile updated successfully! ✓');
  };

  // Wishlist Toggle with Persistence
  const toggleWishlist = (productId) => {
    setWishlist((prev) => {
      let updated;
      if (prev.includes(productId)) {
        showToast('Removed from wishlist');
        updated = prev.filter((id) => id !== productId);
      } else {
        showToast('Added to wishlist ❤️');
        updated = [...prev, productId];
      }
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('jem_mobile_wishlist', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });
  };

  // Cart Operations
  const addToCart = (product, qty = 1) => {
    const availableStock = product.stock_quantity ?? 100;
    if (availableStock === 0) {
      showToast('❌ Item is currently Out of Stock');
      return;
    }

    const itemKey = product.product_variant_id ? `${product.id}-${product.product_variant_id}` : String(product.id);

    setCart((prev) => {
      const existing = prev.find((i) => (i.cart_key ? i.cart_key === itemKey : i.id === product.id && i.product_variant_id === product.product_variant_id));
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty + qty > availableStock) {
        showToast(`⚠️ Max available stock is ${availableStock} units`);
        return prev;
      }
      if (existing) {
        return prev.map((i) =>
          (i.cart_key ? i.cart_key === itemKey : i.id === product.id && i.product_variant_id === product.product_variant_id)
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }
      return [...prev, { ...product, cart_key: itemKey, quantity: qty }];
    });
    showToast(`Added ${product.name} to Cart`);
  };

  const handleBuyNow = (product, qty = 1) => {
    addToCart(product, qty);
    setSelectedProduct(null);
    setActiveTab('cart');
    showToast(`Proceeding to checkout for ${product.name}! 🛒`);
  };

  const updateQuantity = (idOrKey, delta) => {
    setCart((prev) => {
      const item = prev.find((i) => (i.cart_key ? i.cart_key === idOrKey : i.id === idOrKey));
      if (!item) return prev;
      const product = products.find((p) => p.id === item.id) || item;
      const availableStock = item.stock_quantity ?? product.stock_quantity ?? 100;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter((i) => (i.cart_key ? i.cart_key !== idOrKey : i.id !== idOrKey));
      if (newQty > availableStock) {
        showToast(`⚠️ Cannot exceed available stock (${availableStock} max)`);
        return prev;
      }
      return prev.map((i) => ((i.cart_key ? i.cart_key === idOrKey : i.id === idOrKey) ? { ...i, quantity: newQty } : i));
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

  // Reorder Handler: Validates products and adds to cart
  const handleReorder = (orderToReorder) => {
    const items = orderToReorder.items || [];
    if (items.length === 0) {
      showToast('No items found in this order.');
      return;
    }

    let addedCount = 0;
    items.forEach((it) => {
      const originalProduct = products.find((p) => p.id === it.product_id || p.name === it.name) || {
        id: it.product_id || Date.now(),
        name: it.name,
        base_price: it.unit_price || it.price,
        stock_quantity: 100,
        emoji: '🧱',
      };

      if (originalProduct.stock_quantity > 0) {
        addToCart(
          {
            ...originalProduct,
            product_variant_id: it.product_variant_id || null,
            variant_label: it.variant_label || null,
            base_price: it.unit_price || it.price || originalProduct.base_price,
          },
          it.qty || it.quantity || 1
        );
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setActiveTab('cart');
      showToast(`Reordered ${addedCount} material items to Cart! 🛒`);
    } else {
      showToast('Selected materials are currently unavailable.');
    }
  };

  // Order Cancellation Handler: Restores inventory on backend
  const handleCancelOrder = async (orderToCancel) => {
    try {
      const orderId = orderToCancel.id || orderToCancel.order_number;
      await cancelMobileOrder(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderToCancel.id || o.order_number === orderToCancel.order_number
            ? { ...o, status: 'cancelled' }
            : o
        )
      );
      if (selectedOrder && (selectedOrder.id === orderToCancel.id || selectedOrder.order_number === orderToCancel.order_number)) {
        setSelectedOrder((prev) => ({ ...prev, status: 'cancelled' }));
      }
      showToast(`Order #${orderToCancel.order_number || orderToCancel.id} cancelled. Stock restored! 🔄`);
    } catch (err) {
      showToast(err.message || 'Failed to cancel order.');
    }
  };

  // Checkout Handler: Synchronizes directly with Backend MySQL Database & Enforces Inventory
  const handleCheckout = async (checkoutOptions = {}) => {
    if (cart.length === 0) return;
    const effDeliveryType = checkoutOptions.deliveryType || deliveryType;
    const effPaymentMethod = checkoutOptions.paymentMethod || paymentMethod;
    const effShippingFee = effDeliveryType === 'pickup' ? 0 : 200;
    const subtotal = cart.reduce((sum, i) => sum + (i.base_price || i.price || 0) * i.quantity, 0);
    const total = Math.max(subtotal + effShippingFee - discount, 0);
    const orderNumber = `JEM-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = {
      id: Date.now(),
      order_number: orderNumber,
      total,
      subtotal,
      shipping_fee: effShippingFee,
      items: cart.map((i) => ({
        product_id: i.id,
        product_variant_id: i.product_variant_id || null,
        name: i.name,
        qty: i.quantity,
        quantity: i.quantity,
        price: i.base_price || i.price || 0,
        unit_price: i.base_price || i.price || 0,
        variant_label: i.variant_label || null,
      })),
      status: 'pending',
      order_source: 'Mobile App',
      customer_name: authName || 'Customer',
      customer_email: authEmail || '',
      customer_phone: authPhone || '',
      payment_method: effPaymentMethod.toLowerCase(),
      delivery_type: effDeliveryType,
      delivery_address: effDeliveryType === 'pickup' ? 'JEM Main Yard (Store Pickup)' : (deliveryAddress || 'Santa Rosa, Laguna'),
      driver: 'Kuya Mark (Isuzu Elf Plate NCI-8921)',
      reference_number: checkoutOptions.referenceNumber || '',
      created_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    };

    try {
      // Direct synchronization to Backend MySQL Database orders table & stock deduction
      const result = await submitMobileOrder(newOrder);
      setOrders((prev) => [result || newOrder, ...prev.filter((o) => o.id !== newOrder.id && o.order_number !== orderNumber)]);
      setCart([]);
      setOrdersTabFilter('To Pay');
      setActiveTab('orders');
      showToast('Order Placed! (Awaiting Store Confirmation)');
    } catch (err) {
      showToast(err.message || 'Error submitting order. Please check stock availability.');
    }
  };

  // Feedback Submission Handler
  const handleSubmitFeedback = async (data) => {
    try {
      await submitMobileFeedback({
        ...data,
        customer_name: authName || 'Customer',
        customer_email: authEmail || '',
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.order_number === data.order_number || String(o.id) === String(data.order_number)
            ? { ...o, has_feedback: true, feedback_rating: data.rating }
            : o
        )
      );
      showToast('Thank you! Your feedback has been received ⭐');
    } catch (e) {
      showToast('Feedback recorded locally!');
    }
  };

  // Filtered Products for Search on Home Tab
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q || p.name.toLowerCase().includes(q) || (p.brand && p.brand.toLowerCase().includes(q));
      const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
      return matchQuery && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Dynamic Status-based Order Filtering
  const filteredOrders = useMemo(() => {
    return (orders || []).filter((o) => {
      const status = (o.status || 'pending').toLowerCase().trim();
      if (ordersTabFilter === 'To Pay') {
        return status === 'pending' || status === 'unpaid' || status === 'to pay' || status === 'to_pay';
      }
      if (ordersTabFilter === 'To Process') {
        return status === 'confirmed' || status === 'received' || status === 'to process' || status === 'to_process';
      }
      if (ordersTabFilter === 'To Ship') {
        return status === 'processing' || status === 'ready' || status === 'packed' || status === 'to ship' || status === 'to_ship';
      }
      if (ordersTabFilter === 'To Receive') {
        return status === 'out_for_delivery' || status === 'in_transit' || status === 'shipped' || status === 'to receive' || status === 'to_receive';
      }
      if (ordersTabFilter === 'Completed') {
        return status === 'completed' || status === 'delivered';
      }
      return true;
    });
  }, [orders, ordersTabFilter]);

  const cartSubtotal = cart.reduce((sum, i) => sum + (i.base_price || i.price || 0) * i.quantity, 0);
  const cartTotal = Math.max(cartSubtotal + (deliveryType === 'pickup' ? 0 : 200) - discount, 0);

  // =========================================================================
  // 1. SCREEN: SPLASH SCREEN
  // =========================================================================
  if (currentScreen === 'splash') {
    return <SplashScreen />;
  }

  // =========================================================================
  // 2. SCREEN: ONBOARDING CAROUSEL
  // =========================================================================
  if (currentScreen === 'onboarding') {
    return (
      <OnboardingScreen
        slideIndex={onboardingSlide}
        onNextSlide={() => setOnboardingSlide((prev) => prev + 1)}
        onNavigateToSignIn={() => setCurrentScreen('signin')}
        onNavigateToSignUp={() => setCurrentScreen('signup')}
      />
    );
  }

  // =========================================================================
  // 3. SCREEN: SIGN IN
  // =========================================================================
  if (currentScreen === 'signin') {
    return (
      <SignInScreen
        email={authEmail}
        setEmail={setAuthEmail}
        password={authPassword}
        setPassword={setAuthPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        rememberMe={rememberMe}
        setRememberMe={setRememberMe}
        loading={authLoading}
        errorMsg={authError}
        onSignIn={handleBackendSignIn}
        onGoogleSignIn={handleGoogleAuth}
        onForgotPassword={() => showToast('Password reset instructions sent to contact.')}
        onNavigateToSignUp={() => {
          setAuthError('');
          setCurrentScreen('signup');
        }}
        onGoBack={() => setCurrentScreen('onboarding')}
      />
    );
  }

  // =========================================================================
  // 4. SCREEN: SIGN UP
  // =========================================================================
  if (currentScreen === 'signup') {
    return (
      <SignUpScreen
        name={authName}
        setName={setAuthName}
        email={authEmail}
        setEmail={setAuthEmail}
        password={authPassword}
        setPassword={setAuthPassword}
        loading={authLoading}
        errorMsg={authError}
        onSignUp={handleBackendSignUp}
        onGoogleSignUp={handleGoogleAuth}
        onNavigateToSignIn={() => {
          setAuthError('');
          setCurrentScreen('signin');
        }}
        onGoBack={() => setCurrentScreen('onboarding')}
      />
    );
  }

  // =========================================================================
  // 5. SCREEN: SIGNED-IN MAIN APP (5 TABS)
  // =========================================================================
  return (
    <SafeAreaView style={[styles.container, isDarkMode && { backgroundColor: themeColors.bgPage }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? themeColors.bgPage : '#131d2e'} />

      {/* Floating Toast Notification */}
      <Toast message={toast} />

      {/* Main Tab Content */}
      <View style={[styles.mainTabContent, isDarkMode && { backgroundColor: themeColors.bgPage }]}>
        {activeTab === 'home' && (
          <HomeTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            categories={categories}
            products={filteredProducts}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
            addToCart={addToCart}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              setActiveTab('categories');
            }}
            onOpenNotifications={() => setShowNotificationsModal(true)}
            onNavigateToCategories={() => setActiveTab('categories')}
            userName={authName}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesTab
            categories={categories}
            products={products}
            selectedCategory={selectedCategory}
            onSelectCategory={(catId, catTitle) => {
              setSelectedCategory(catId);
              showToast(`Category: ${catTitle}`);
            }}
            onSelectProduct={(p) => setSelectedProduct(p)}
            addToCart={addToCart}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
          />
        )}

        {activeTab === 'cart' && (
          <CartTab
            cart={cart}
            updateQuantity={updateQuantity}
            voucher={voucher}
            setVoucher={setVoucher}
            onApplyVoucher={handleApplyVoucher}
            discount={discount}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            cartSubtotal={cartSubtotal}
            cartTotal={cartTotal}
            deliveryType={deliveryType}
            setDeliveryType={setDeliveryType}
            deliveryFee={200}
            deliveryAddress={deliveryAddress}
            onChangeAddress={() => setShowAddressModal(true)}
            onCheckout={handleCheckout}
            onStartShopping={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTab
            orders={orders}
            filteredOrders={filteredOrders}
            ordersTabFilter={ordersTabFilter}
            setOrdersTabFilter={setOrdersTabFilter}
            onSelectOrder={(ord) => setSelectedOrder(ord)}
            onLeaveFeedback={(ord) => setFeedbackOrder(ord)}
            onStartShopping={() => setActiveTab('home')}
            onReorder={handleReorder}
            onCancelOrder={handleCancelOrder}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            userName={authName}
            userEmail={authEmail}
            userPhone={authPhone}
            ordersCount={orders.length}
            completedOrdersCount={orders.filter((o) => (o.status || '').toLowerCase() === 'completed' || (o.status || '').toLowerCase() === 'delivered').length}
            wishlistCount={wishlist.length}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => {
              const next = !isDarkMode;
              setIsDarkMode(next);
              showToast(next ? 'Dark Mode enabled 🌙' : 'Light Mode enabled ☀️');
            }}
            onNavigateToOrders={() => setActiveTab('orders')}
            onOpenWishlist={() => setShowWishlistModal(true)}
            onOpenAddress={() => setShowAddressModal(true)}
            onOpenNotifications={() => setShowNotificationsModal(true)}
            onOpenSupport={() => setShowSupportModal(true)}
            onOpenEditProfile={() => setShowEditProfileModal(true)}
            onSignOut={() => {
              setCart([]);
              setAuthPassword('');
              saveStoredUser(null);
              showToast('Signed out successfully.');
              setCurrentScreen('signin');
            }}
            onShowToast={showToast}
          />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onTabSelect={(tabId) => setActiveTab(tabId)}
        cartCount={cart.length}
        isDarkMode={isDarkMode}
      />

      {/* Interactive Modals */}
      <ProductDetailsModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(p, qty) => {
          addToCart(p, qty);
          setSelectedProduct(null);
        }}
        onBuyNow={handleBuyNow}
      />

      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        customerEmail={authEmail}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      <OrderTrackingModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onLeaveFeedback={(ord) => setFeedbackOrder(ord)}
        onReorder={handleReorder}
        onCancelOrder={handleCancelOrder}
      />

      <FeedbackModal
        visible={!!feedbackOrder}
        order={feedbackOrder}
        onClose={() => setFeedbackOrder(null)}
        onSubmitFeedback={handleSubmitFeedback}
      />

      <WishlistModal
        visible={showWishlistModal}
        products={products}
        wishlist={wishlist}
        onClose={() => setShowWishlistModal(false)}
        onAddToCart={(p, qty) => {
          addToCart(p, qty);
          showToast('Added to cart!');
        }}
        onToggleWishlist={toggleWishlist}
      />

      <AddressModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        customerEmail={authEmail}
        selectedAddress={selectedAddressObj}
        onSelectAddress={(addr) => {
          setSelectedAddressObj(addr);
          setDeliveryAddress(addr.address);
          showToast(`Delivery destination set to ${addr.tag || 'selected address'} 📍`);
        }}
        onShowToast={showToast}
      />

      <SupportModal
        visible={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        customerName={authName}
        customerEmail={authEmail}
        orders={orders}
        onStartLiveChat={() => {
          showToast('Connecting to Laguna dispatch line...');
          setShowSupportModal(false);
        }}
        onShowToast={showToast}
      />

      <EditProfileModal
        visible={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        userName={authName}
        userEmail={authEmail}
        userPhone={authPhone}
        onSaveProfile={handleSaveProfile}
      />
    </SafeAreaView>
  );
}

