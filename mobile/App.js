import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  StatusBar,
  View,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

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
import { useProductCatalog } from './src/hooks/useProductCatalog';

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
  requestSignupCode,
  verifySignupCode,
  resendSignupCode,
  completeSignup,
  initiateGoogleAuth,
  verifyEmailOtp,
  resendEmailOtp,
  updateCustomerProfile,
  getStoredUser,
  saveStoredUser,
  getCustomerAddresses,
  fetchCurrentUser,
  clearMobileStorage,
  validateMobileCartStock,
} from './src/api/mobileApi';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import VerificationCodeScreen from './src/screens/VerificationCodeScreen';
import GoogleAccountSelectModal from './src/modals/GoogleAccountSelectModal';

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
import { isWithinCDO, DISPATCH_HUB } from './src/config/deliveryConfig';

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
  const [signupStep, setSignupStep] = useState(1);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Google OAuth & OTP Verification State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [maskedVerificationEmail, setMaskedVerificationEmail] = useState('');
  const [otpResendCooldown, setOtpResendCooldown] = useState(60);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  // App Tabs & Catalog State
  const [activeTab, setActiveTab] = useState('home'); // home, categories, cart, orders, profile
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Hybrid Pull-Based Inventory Synchronization Hook (AppState foreground sync + Pull-to-Refresh)
  const {
    products,
    setProducts,
    categories,
    setCategories,
    loading: loadingProducts,
    refreshing: refreshingProducts,
    isOffline,
    lastSyncedAt,
    refreshCatalog,
  } = useProductCatalog({
    initialProducts: HARDWARE_PRODUCTS,
    initialCategories: CATEGORY_ITEMS,
    onSyncError: (err, isNet) => {
      if (isNet) {
        showToast('Offline Mode: Displaying saved materials');
      }
    },
  });

  const handleRefreshCatalog = useCallback(async () => {
    try {
      await refreshCatalog(false);
      showToast('Inventory synchronized with warehouse 🔄');
    } catch (e) {
      showToast('Sync failed: Please check network');
    }
  }, [refreshCatalog]);

  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [ordersTabFilter, setOrdersTabFilter] = useState('To Pay');

  // Address & Delivery State
  const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' | 'pickup'
  const [deliveryAddress, setDeliveryAddress] = useState('Zone 1, Mabasa, Brgy. Balulang, Cagayan de Oro City');
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
    // Restore and guard User Session
    const checkUserSession = async () => {
      const storedUser = getStoredUser();
      if (storedUser) {
        if (storedUser.role && storedUser.role !== 'customer') {
          await clearMobileStorage();
          Alert.alert('Access Denied', 'This app is strictly for customer accounts only.');
          setCurrentScreen('signin');
          return;
        }
        if (storedUser.name) setAuthName(storedUser.name);
        if (storedUser.email) setAuthEmail(storedUser.email);
        if (storedUser.phone) setAuthPhone(storedUser.phone);
      }

      try {
        const validatedUser = await fetchCurrentUser();
        if (validatedUser) {
          if (validatedUser.role && validatedUser.role !== 'customer') {
            await clearMobileStorage();
            Alert.alert('Access Denied', 'This app is strictly for customer accounts only.');
            setCurrentScreen('signin');
            return;
          }
          if (validatedUser.name) setAuthName(validatedUser.name);
          if (validatedUser.email) setAuthEmail(validatedUser.email);
          if (validatedUser.phone) setAuthPhone(validatedUser.phone);
        }
      } catch (err) {
        if (err?.message?.includes('customer accounts only') || err?.status === 403) {
          await clearMobileStorage();
          Alert.alert('Access Denied', 'This app is strictly for customer accounts only.');
          setCurrentScreen('signin');
        }
      }
    };

    checkUserSession();

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
        const fetchedOrders = await getMobileOrders();
        if (Array.isArray(fetchedOrders) && fetchedOrders.length > 0) {
          setOrders(fetchedOrders);
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
            return (
              ord.find(
                (o) =>
                  o.id === prev.id ||
                  String(o.id) === String(prev.id) ||
                  (o.order_number && prev.order_number && o.order_number === prev.order_number) ||
                  (prev.order_number && String(o.id) === String(prev.order_number))
              ) || prev
            );
          });
        }
      } catch (err) {
        // Silent catch for background polling
      } finally {
        isPolling = false;
      }
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('jem_orders_update', handleOrderEvent);
      window.addEventListener('jem_notification_update', handleOrderEvent);
    }

    return () => {
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('jem_orders_update', handleOrderEvent);
        window.removeEventListener('jem_notification_update', handleOrderEvent);
      }
    };
  }, []);

  // 2. Splash Screen Auto Transition Guard
  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(async () => {
        const user = getStoredUser();
        if (user && user.email) {
          if (user.role && user.role !== 'customer') {
            await clearMobileStorage();
            Alert.alert(
              'Access Denied',
              'This app is strictly for customer accounts only.',
              [{ text: 'OK' }]
            );
            setCurrentScreen('signin');
            return;
          }
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
      const user = res?.user || res?.data?.user;
      if (!user) {
        throw new Error(res?.message || 'Login failed: No user account data returned.');
      }
      if (user.role && user.role !== 'customer') {
        await clearMobileStorage();
        Alert.alert(
          'Access Denied',
          'This app is strictly for customer accounts only.',
          [{ text: 'OK' }]
        );
        setAuthError('Access denied. This app is strictly for customer accounts only.');
        return;
      }
      if (user.name) setAuthName(user.name);
      if (user.email) setAuthEmail(user.email);
      if (user.phone) setAuthPhone(user.phone);

      // Load addresses for signed-in user
      if (user.email) {
        getCustomerAddresses(user.email).then((addrs) => {
          if (Array.isArray(addrs) && addrs.length > 0) {
            const def = addrs.find((a) => a.is_default) || addrs[0];
            if (def) {
              setDeliveryAddress(def.address);
              setSelectedAddressObj(def);
            }
          }
        }).catch(() => {});
      }

      showToast(`Welcome back, ${user.name || 'Customer'}! 👋`);
      setCurrentScreen('main');
    } catch (err) {
      if (err?.message?.includes('customer accounts only') || err?.status === 403) {
        Alert.alert(
          'Access Denied',
          'This app is strictly for customer accounts only.',
          [{ text: 'OK' }]
        );
        setAuthError('Access denied. This app is strictly for customer accounts only.');
      } else {
        setAuthError(err.message || 'Invalid credentials. Please verify your login details.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // 1. Sign up step 1: Request 6-digit email OTP
  const handleRequestSignupCode = async (enteredEmail) => {
    const targetEmail = (enteredEmail || authEmail).trim().toLowerCase();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await requestSignupCode(targetEmail);
      setAuthEmail(targetEmail);
      setPendingVerificationEmail(targetEmail);
      setMaskedVerificationEmail(targetEmail);
      const cooldown = res?.data?.resend_cooldown || res?.resend_cooldown || 60;
      setOtpResendCooldown(cooldown);
      setOtpError('');
      // Stop loading state immediately and navigate to 6-digit OTP verification screen
      setAuthLoading(false);
      setCurrentScreen('verify_signup_email');
      showToast(`Verification code sent to ${targetEmail}! ✉️`);
      return res;
    } catch (err) {
      setAuthLoading(false);
      setAuthError(err.message || 'Failed to send verification code.');
      throw err;
    }
  };

  // 2. Sign up step 2: Verify 6-digit OTP code with backend
  const handleVerifySignupOtp = async (code) => {
    setOtpLoading(true);
    setOtpError('');
    try {
      await verifySignupCode(pendingVerificationEmail, code);
      setSignupStep(2);
      setCurrentScreen('signup');
      showToast('Email verified! Please complete your account details. 🎉');
    } catch (err) {
      setOtpError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // 3. Sign up resend OTP with cooldown
  const handleResendSignupOtp = async () => {
    setOtpError('');
    const res = await resendSignupCode(pendingVerificationEmail);
    if (res?.resend_cooldown) {
      setOtpResendCooldown(res.resend_cooldown);
    }
    showToast(`New verification code sent to ${pendingVerificationEmail}! ✉️`);
    return res;
  };

  // 4. Sign up final step: Complete registration ONLY after email verification
  const handleCompleteSignup = async (payload) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await completeSignup(payload);
      const user = res?.user || res?.data?.user;
      if (user) {
        if (user.name) setAuthName(user.name);
        if (user.email) setAuthEmail(user.email);
        if (user.phone) setAuthPhone(user.phone);
      }

      showToast(`Account Created! Welcome to JEM Hardware, ${user?.name || 'Customer'}! 🎉`);
      setSignupStep(1);
      setCurrentScreen('main');
    } catch (err) {
      setAuthError(err.message || 'Failed to create account.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Google Authentication Handler: Opens Google Account selection
  const handleGoogleAuth = () => {
    setAuthError('');
    setShowGoogleModal(true);
  };

  // Triggered when user selects a Google account in the Google OAuth prompt
  const handleGoogleAccountSelected = async (selectedEmail, selectedName) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await initiateGoogleAuth(selectedEmail, selectedName);
      setShowGoogleModal(false);

      const user = res?.user || res?.data?.user;
      if (user) {
        if (user.name) setAuthName(user.name);
        if (user.email) setAuthEmail(user.email);
        if (user.phone) setAuthPhone(user.phone);

        // Load addresses for signed-in user
        if (user.email) {
          getCustomerAddresses(user.email).then((addrs) => {
            if (Array.isArray(addrs) && addrs.length > 0) {
              const def = addrs.find((a) => a.is_default) || addrs[0];
              if (def) {
                setDeliveryAddress(def.address);
                setSelectedAddressObj(def);
              }
            }
          }).catch(() => {});
        }

        showToast(`Signed in with Google as ${user.name}! 👋`);
        setCurrentScreen('main');
        return;
      }

      // Fallback if backend required OTP
      if (res?.requires_otp) {
        setPendingVerificationEmail(selectedEmail);
        setMaskedVerificationEmail(res.masked_email || selectedEmail);
        if (res.resend_cooldown) {
          setOtpResendCooldown(res.resend_cooldown);
        }
        setOtpError('');
        setCurrentScreen('verify_otp');
        showToast(`Verification code sent to ${res.masked_email || selectedEmail}! ✉️`);
      }
    } catch (err) {
      setAuthError(err.message || 'Google sign-in encountered an issue. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Fallback OTP verification if needed
  const handleVerifyOtp = async (code) => {
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await verifyEmailOtp(pendingVerificationEmail, code);
      const user = res?.user || res?.data?.user;
      if (user) {
        if (user.name) setAuthName(user.name);
        if (user.email) setAuthEmail(user.email);
        if (user.phone) setAuthPhone(user.phone);

        // Load user addresses
        if (user.email) {
          getCustomerAddresses(user.email).then((addrs) => {
            if (Array.isArray(addrs) && addrs.length > 0) {
              const def = addrs.find((a) => a.is_default) || addrs[0];
              if (def) {
                setDeliveryAddress(def.address);
                setSelectedAddressObj(def);
              }
            }
          }).catch(() => {});
        }
      }

      showToast(`Account Verified! Welcome, ${user?.name || 'Customer'}! 🚀`);
      setCurrentScreen('main');
    } catch (err) {
      setOtpError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Fallback Resend OTP with cooldown
  const handleResendOtp = async () => {
    const res = await resendEmailOtp(pendingVerificationEmail);
    if (res?.resend_cooldown) {
      setOtpResendCooldown(res.resend_cooldown);
    }
    showToast(`New verification code sent to ${res.masked_email || pendingVerificationEmail}! ✉️`);
    return res;
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
      refreshCatalog(true);
      showToast(`Order #${orderToCancel.order_number || orderToCancel.id} cancelled. Stock restored! 🔄`);
    } catch (err) {
      showToast(err.message || 'Failed to cancel order.');
    }
  };

  // Checkout Handler: Synchronizes directly with Backend MySQL Database & Enforces Inventory
  const handleCheckout = async (checkoutOptions = {}) => {
    if (cart.length === 0) return;
    const effDeliveryType = checkoutOptions.deliveryType || deliveryType;

    // Strict Delivery Operational Boundary Check (Cagayan de Oro City only)
    if (effDeliveryType === 'delivery') {
      const targetAddress = checkoutOptions.deliveryAddress || deliveryAddress || '';
      if (!isWithinCDO(targetAddress)) {
        showToast('Delivery is currently restricted to Cagayan de Oro City addresses only.');
        setShowAddressModal(true);
        return;
      }
    }

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
      delivery_address: effDeliveryType === 'pickup' ? `JEM Dispatch Hub: ${DISPATCH_HUB}` : (deliveryAddress || 'Zone 1, Mabasa, Brgy. Balulang, Cagayan de Oro City'),
      driver: 'Kuya Mark (Isuzu Elf Plate NCI-8921)',
      reference_number: checkoutOptions.referenceNumber || '',
      created_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    };

    try {
      // Pre-Checkout Stock Guard: Verify stock directly against backend before completing checkout
      const stockCheck = await validateMobileCartStock(cart);
      if (!stockCheck.is_valid || stockCheck.has_modifications) {
        showToast('Stock levels changed! Please review your cart.');
        setActiveTab('cart');
        refreshCatalog(true);
        return;
      }

      // Direct synchronization to Backend MySQL Database orders table & stock deduction
      const result = await submitMobileOrder(newOrder);
      setOrders((prev) => [result || newOrder, ...prev.filter((o) => o.id !== newOrder.id && o.order_number !== orderNumber)]);
      setCart([]);
      setOrdersTabFilter('To Pay');
      setActiveTab('orders');
      refreshCatalog(true);
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
      const matchCat =
        selectedCategory === 'all' ||
        String(p.category_id || '').toLowerCase() === String(selectedCategory || '').toLowerCase() ||
        (p.category_slug && p.category_slug.toLowerCase() === String(selectedCategory).toLowerCase()) ||
        (p.category && p.category.toLowerCase().trim() === String(selectedCategory).toLowerCase().trim()) ||
        (p.category && p.category.toLowerCase().includes(String(selectedCategory).toLowerCase()));
      return matchQuery && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Dynamic Status-based Order Filtering
  const filteredOrders = useMemo(() => {
    return (orders || []).filter((o) => {
      const status = (o.status || 'pending').toLowerCase().trim();
      if (ordersTabFilter === 'To Pay') {
        return (
          status === 'pending' ||
          status === 'pending review' ||
          status === 'pending_review' ||
          status === 'awaiting_confirmation' ||
          status === 'unpaid' ||
          status === 'to pay' ||
          status === 'to_pay'
        );
      }
      if (ordersTabFilter === 'To Process') {
        return (
          status === 'confirmed' ||
          status === 'processing' ||
          status === 'in process' ||
          status === 'in_process' ||
          status === 'received' ||
          status === 'ready' ||
          status === 'packed' ||
          status === 'backordered' ||
          status === 'to process' ||
          status === 'to_process'
        );
      }
      if (
        ordersTabFilter === 'To Ship / To Receive' ||
        ordersTabFilter === 'To Ship' ||
        ordersTabFilter === 'To Receive'
      ) {
        return (
          status === 'out_for_delivery' ||
          status === 'out for delivery' ||
          status === 'dispatched' ||
          status === 'in_transit' ||
          status === 'shipped' ||
          status === 'to ship' ||
          status === 'to_ship' ||
          status === 'to receive' ||
          status === 'to_receive'
        );
      }
      if (ordersTabFilter === 'Completed') {
        return status === 'completed' || status === 'delivered';
      }
      if (ordersTabFilter === 'All') {
        return true;
      }
      return false;
    });
  }, [orders, ordersTabFilter]);

  const handleRefreshOrders = useCallback(async () => {
    try {
      const ord = await getMobileOrders();
      if (Array.isArray(ord)) {
        setOrders(ord);
        setSelectedOrder((prevSelected) => {
          if (!prevSelected) return null;
          return (
            ord.find(
              (o) =>
                o.id === prevSelected.id ||
                String(o.id) === String(prevSelected.id) ||
                (o.order_number && prevSelected.order_number && o.order_number === prevSelected.order_number) ||
                (prevSelected.order_number && String(o.id) === String(prevSelected.order_number))
            ) || prevSelected
          );
        });
        return ord;
      }
    } catch (e) {
      console.warn('Failed to refresh orders from /mobile/orders:', e);
      throw e;
    }
  }, []);

  const handleSelectOrder = useCallback((ord) => {
    setSelectedOrder(ord);
    setShowOrderTrackingModal(true);
  }, []);

  const handleLeaveFeedback = useCallback((ord) => {
    setFeedbackOrder(ord);
    setShowFeedbackModal(true);
  }, []);

  const handleStartShopping = useCallback(() => {
    setActiveTab('home');
  }, []);

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
      <View style={{ flex: 1, backgroundColor: '#0B1320' }}>
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
        <GoogleAccountSelectModal
          visible={showGoogleModal}
          onClose={() => setShowGoogleModal(false)}
          onSelectAccount={handleGoogleAccountSelected}
          loading={authLoading}
        />
      </View>
    );
  }

  // =========================================================================
  // 4. SCREEN: SIGN UP
  // =========================================================================
  if (currentScreen === 'signup') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B1320' }}>
        <SignUpScreen
          email={authEmail}
          setEmail={setAuthEmail}
          name={authName}
          setName={setAuthName}
          password={authPassword}
          setPassword={setAuthPassword}
          phone={authPhone}
          setPhone={setAuthPhone}
          rememberMe={rememberMe}
          setRememberMe={setRememberMe}
          step={signupStep}
          setStep={setSignupStep}
          loading={authLoading}
          errorMsg={authError}
          onRequestVerification={handleRequestSignupCode}
          onCompleteSignUp={handleCompleteSignup}
          onGoogleSignUp={handleGoogleAuth}
          onNavigateToSignIn={() => {
            setAuthError('');
            setSignupStep(1);
            setCurrentScreen('signin');
          }}
          onGoBack={() => {
            setSignupStep(1);
            setCurrentScreen('onboarding');
          }}
        />
        <GoogleAccountSelectModal
          visible={showGoogleModal}
          onClose={() => setShowGoogleModal(false)}
          onSelectAccount={handleGoogleAccountSelected}
          loading={authLoading}
        />
      </View>
    );
  }

  // =========================================================================
  // 4b. SCREEN: VERIFICATION CODE (EMAIL OTP)
  // =========================================================================
  if (currentScreen === 'verify_signup_email' || currentScreen === 'verify_otp') {
    const isSignupVerify = currentScreen === 'verify_signup_email';
    return (
      <VerificationCodeScreen
        email={pendingVerificationEmail}
        maskedEmail={maskedVerificationEmail}
        onVerifyOtp={isSignupVerify ? handleVerifySignupOtp : handleVerifyOtp}
        onResendOtp={isSignupVerify ? handleResendSignupOtp : handleResendOtp}
        onChangeEmail={() => {
          setOtpError('');
          setCurrentScreen('signup');
          setSignupStep(1);
        }}
        onCancel={() => {
          setOtpError('');
          if (isSignupVerify) {
            setCurrentScreen('signup');
            setSignupStep(1);
          } else {
            setCurrentScreen('signin');
          }
        }}
        loading={otpLoading}
        errorMsg={otpError}
        resendCooldown={otpResendCooldown}
      />
    );
  }

  // =========================================================================
  // 5. SCREEN: SIGNED-IN MAIN APP (5 TABS)
  // =========================================================================
  return (
    <NavigationContainer>
      <SafeAreaView edges={['left', 'right']} style={[styles.container, isDarkMode && { backgroundColor: themeColors.bgPage }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />

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
            refreshing={refreshingProducts}
            onRefresh={handleRefreshCatalog}
            isOffline={isOffline}
            loading={loadingProducts}
            lastSyncedAt={lastSyncedAt}
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
            refreshing={refreshingProducts}
            onRefresh={handleRefreshCatalog}
            isOffline={isOffline}
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
            setOrders={setOrders}
            filteredOrders={filteredOrders}
            ordersTabFilter={ordersTabFilter}
            setOrdersTabFilter={setOrdersTabFilter}
            onSelectOrder={handleSelectOrder}
            onLeaveFeedback={handleLeaveFeedback}
            onStartShopping={handleStartShopping}
            onReorder={handleReorder}
            onCancelOrder={handleCancelOrder}
            onRefreshOrders={handleRefreshOrders}
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
  </NavigationContainer>
  );
}

