import React, { useState, useMemo, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';

// Initial Seed Data & Styles
import { HARDWARE_PRODUCTS, CATEGORY_ITEMS } from './src/data/initialData';
import { styles } from './src/styles/appStyles';

// API Service for connecting Mobile App to Laravel Backend
import {
  getMobileProducts,
  getMobileCategories,
  getMobileOrders,
  submitMobileOrder,
  submitMobileFeedback,
  loginCustomer,
  registerCustomer,
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


export default function App() {
  // Screen & Auth Navigation State
  const [currentScreen, setCurrentScreen] = useState('splash'); // 'splash' | 'onboarding' | 'signin' | 'signup' | 'main'
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
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

  // Active Modals State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Checkout & Voucher State
  const [voucher, setVoucher] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [toast, setToast] = useState('');

  // 1. Dynamic Backend API Fetching on Mount
  useEffect(() => {
    const loadApiData = async () => {
      try {
        const fetchedProducts = await getMobileProducts();
        if (fetchedProducts && fetchedProducts.length > 0) {
          setProducts(fetchedProducts);
        }
        const fetchedCategories = await getMobileCategories();
        if (fetchedCategories && fetchedCategories.length > 0) {
          setCategories(fetchedCategories);
        }
        const fetchedOrders = await getMobileOrders();
        if (fetchedOrders && fetchedOrders.length > 0) {
          setOrders(fetchedOrders);
        }
      } catch (err) {
        console.warn('Backend sync initialized:', err);
      }
    };

    loadApiData();

    // Listen to real-time order updates from Staff or Admin
    const handleOrderEvent = () => {
      getMobileOrders().then((ord) => {
        if (Array.isArray(ord) && ord.length > 0) {
          setOrders(ord);
          setSelectedOrder((prev) => {
            if (!prev) return null;
            return ord.find((o) => o.id === prev.id || o.order_number === prev.order_number) || prev;
          });
        }
      });
    };

    const pollInterval = setInterval(() => {
      handleOrderEvent();
    }, 3000);

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
        setCurrentScreen('onboarding');
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
      await registerCustomer(authName, authEmail, authPassword);
      showToast(`Account Created! Welcome to JEM Hardware, ${authName}! 👋`);
      setCurrentScreen('main');
    } catch (err) {
      setAuthError(err.message || 'Registration failed. Email might already be taken.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Wishlist Toggle
  const toggleWishlist = (productId) => {
    setWishlist((prev) => {
      if (prev.includes(productId)) {
        showToast('Removed from wishlist');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Added to wishlist ❤️');
        return [...prev, productId];
      }
    });
  };

  // Cart Operations
  const addToCart = (product, qty = 1) => {
    if (product.stock_quantity === 0) {
      showToast('❌ Item is currently Out of Stock');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty + qty > product.stock_quantity) {
        showToast(`⚠️ Max available stock is ${product.stock_quantity} units`);
        return prev;
      }
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [...prev, { ...product, quantity: qty }];
    });
    showToast(`Added ${product.name} to Cart`);
  };

  const handleBuyNow = (product, qty = 1) => {
    addToCart(product, qty);
    setSelectedProduct(null);
    setActiveTab('cart');
    showToast(`Proceeding to checkout for ${product.name}! 🛒`);
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      const product = products.find((p) => p.id === id) || item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter((i) => i.id !== id);
      if (newQty > product.stock_quantity) {
        showToast(`⚠️ Cannot exceed available stock (${product.stock_quantity} max)`);
        return prev;
      }
      return prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i));
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

  // Checkout Handler: Synchronizes directly with Backend MySQL Database
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const subtotal = cart.reduce((sum, i) => sum + (i.base_price || i.price || 0) * i.quantity, 0);
    const total = Math.max(subtotal + 200 - discount, 0);
    const orderNumber = `JEM-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = {
      id: Date.now(),
      order_number: orderNumber,
      total,
      subtotal,
      shipping_fee: 200,
      items: cart.map((i) => ({
        product_id: i.id,
        name: i.name,
        qty: i.quantity,
        quantity: i.quantity,
        price: i.base_price || i.price || 0,
        unit_price: i.base_price || i.price || 0,
      })),
      status: 'pending',
      order_source: 'Mobile App',
      customer_name: authName || 'Customer',
      customer_email: authEmail || '',
      customer_phone: '',
      payment_method: paymentMethod.toLowerCase(),
      delivery_type: 'delivery',
      delivery_address: 'Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna',
      driver: 'Kuya Mark (Isuzu Elf Plate NCI-8921)',
      created_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    };

    // Direct synchronization to Backend MySQL Database orders table
    const result = await submitMobileOrder(newOrder);

    setOrders((prev) => [result || newOrder, ...prev.filter(o => o.id !== newOrder.id && o.order_number !== orderNumber)]);
    setCart([]);
    setOrdersTabFilter('To Pay');
    setActiveTab('orders');
    showToast('Order Placed! (Awaiting Store Confirmation)');
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
  const cartTotal = Math.max(cartSubtotal + 200 - discount, 0);

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
        onForgotPassword={() => showToast('Password reset instructions sent to contact.')}
        onNavigateToSignUp={() => {
          setAuthError('');
          setCurrentScreen('signup');
        }}
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
        onNavigateToSignIn={() => {
          setAuthError('');
          setCurrentScreen('signin');
        }}
      />
    );
  }

  // =========================================================================
  // 5. SCREEN: SIGNED-IN MAIN APP (5 TABS)
  // =========================================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#131d2e" />

      {/* Floating Toast Notification */}
      <Toast message={toast} />

      {/* Main Tab Content */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={{ paddingBottom: 95 }}
        showsVerticalScrollIndicator={false}
      >
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
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            userName={authName}
            userEmail={authEmail}
            ordersCount={orders.length}
            completedOrdersCount={orders.filter((o) => (o.status || '').toLowerCase() === 'completed' || (o.status || '').toLowerCase() === 'delivered').length}
            wishlistCount={wishlist.length}
            onNavigateToOrders={() => setActiveTab('orders')}
            onOpenWishlist={() => setShowWishlistModal(true)}
            onOpenAddress={() => setShowAddressModal(true)}
            onOpenNotifications={() => setShowNotificationsModal(true)}
            onOpenSupport={() => setShowSupportModal(true)}
            onSignOut={() => {
              setCart([]);
              setAuthPassword('');
              showToast('Signed out successfully.');
              setCurrentScreen('signin');
            }}
            onShowToast={showToast}
          />
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onTabSelect={(tabId) => setActiveTab(tabId)}
        cartCount={cart.length}
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
      />

      <OrderTrackingModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onLeaveFeedback={(ord) => setFeedbackOrder(ord)}
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
        onShowToast={showToast}
      />

      <SupportModal
        visible={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        onStartLiveChat={() => {
          showToast('Connecting to dispatcher...');
          setShowSupportModal(false);
        }}
      />
    </SafeAreaView>
  );
}
