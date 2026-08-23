export const products = [
  {
    id: 1,
    name: 'Cordless Drill',
    sku: 'DRL-312',
    category: 'Power Tools',
    stock: 48,
    price: '89.99',
    cost: '54.00',
    margin: '35%',
    status: 'In stock',
    supplier: 'Prime Hardware Co.',
    variants: { size: 'Standard', color: 'Black', grade: 'Pro', thickness: 'N/A' },
  },
  {
    id: 2,
    name: 'Zip Ties 100pc',
    sku: 'ZIP-100',
    category: 'Hardware',
    stock: 120,
    price: '12.50',
    cost: '4.50',
    margin: '60%',
    status: 'In stock',
    supplier: 'ElectroSupply',
    variants: { size: '100pc', color: 'Black', grade: 'Standard', thickness: '2mm' },
  },
  {
    id: 3,
    name: 'Screwdriver Set',
    sku: 'SDK-7',
    category: 'Hand Tools',
    stock: 24,
    price: '42.00',
    cost: '24.00',
    margin: '42%',
    status: 'Low stock',
    supplier: 'SecurePack Logistics',
    variants: { size: '7-piece', color: 'Silver', grade: 'Commercial', thickness: 'N/A' },
  },
  {
    id: 4,
    name: 'Industrial Tape',
    sku: 'TAP-45',
    category: 'Adhesives',
    stock: 18,
    price: '9.75',
    cost: '3.20',
    margin: '55%',
    status: 'Low stock',
    supplier: 'Prime Hardware Co.',
    variants: { size: '48mm', color: 'Yellow', grade: 'Heavy Duty', thickness: '0.45mm' },
  },
  {
    id: 5,
    name: 'Outlet Tester',
    sku: 'OTR-20',
    category: 'Electrical',
    stock: 62,
    price: '14.30',
    cost: '7.50',
    margin: '48%',
    status: 'In stock',
    supplier: 'ElectroSupply',
    variants: { size: 'Standard', color: 'Red', grade: 'Retail', thickness: 'N/A' },
  },
  {
    id: 6,
    name: 'Packing Foam',
    sku: 'PKG-11',
    category: 'Packaging',
    stock: 132,
    price: '7.20',
    cost: '2.10',
    margin: '70%',
    status: 'In stock',
    supplier: 'SecurePack Logistics',
    variants: { size: '1m', color: 'White', grade: 'Standard', thickness: '5mm' },
  },
]

export const categories = ['Power Tools', 'Hardware', 'Hand Tools', 'Adhesives', 'Electrical', 'Packaging']

export const brands = ['JEM HARDWARE', 'COCO LUMBER', 'Prime Hardware Co.', 'ElectroSupply']

export const orders = [
  { id: 'ORD-1001', customer: 'Aria Mills', items: 3, total: '₱178.60', status: 'Delivered', payment: 'Card', date: '2026-08-10', tracking: 'Delivered', channel: 'Online' },
  { id: 'ORD-1002', customer: 'Dean Harper', items: 5, total: '₱243.90', status: 'Processing', payment: 'Cash', date: '2026-08-10', tracking: 'In transit', channel: 'Cash' },
  { id: 'ORD-1003', customer: 'Sofia Pike', items: 2, total: '₱87.50', status: 'Confirmed', payment: 'Card', date: '2026-08-09', tracking: 'Label created', channel: 'Online' },
  { id: 'ORD-1004', customer: 'Noah Shin', items: 1, total: '₱24.75', status: 'Cancelled', payment: 'Refunded', date: '2026-08-09', tracking: 'Cancelled', channel: 'Online' },
  { id: 'ORD-1005', customer: 'Vivian Lee', items: 4, total: '₱159.20', status: 'Shipped', payment: 'Card', date: '2026-08-08', tracking: 'Shipped', channel: 'Cash' },
  { id: 'ORD-1006', customer: 'Mila Rivers', items: 2, total: '₱63.90', status: 'Delivered', payment: 'Card', date: '2026-08-07', tracking: 'Delivered', channel: 'Online' },
]

export const inventoryAdjustments = [
  { id: 1, item: 'Screwdriver Set', type: 'Count correction', quantity: -2, location: 'Warehouse A', user: 'Lucas Kim', date: 'Aug 10' },
  { id: 2, item: 'Zip Ties 100pc', type: 'Received shipment', quantity: 80, location: 'Warehouse B', user: 'Maya Sun', date: 'Aug 09' },
  { id: 3, item: 'Industrial Tape', type: 'Damage report', quantity: -5, location: 'Warehouse C', user: 'Avery Cruz', date: 'Aug 08' },
  { id: 4, item: 'Cordless Drill', type: 'Restock', quantity: 20, location: 'Warehouse A', user: 'Reed Park', date: 'Aug 07' },
  { id: 5, item: 'Outlet Tester', type: 'Count correction', quantity: -3, location: 'Warehouse B', user: 'Maya Sun', date: 'Aug 06' },
]

export const backorders = [
  { id: 'BO-4081', customer: 'Bryce Cole', product: 'Cordless Drill', ordered: 12, available: 0, backordered: 12, restock: 'Aug 16', orderStatus: 'Backordered', fulfillment: 'Partial' },
  { id: 'BO-4082', customer: 'Selena Hart', product: 'Screwdriver Set', ordered: 8, available: 3, backordered: 5, restock: 'Aug 13', orderStatus: 'Backordered', fulfillment: 'Partial' },
  { id: 'BO-4083', customer: 'Finn Jones', product: 'Outlet Tester', ordered: 15, available: 10, backordered: 5, restock: 'Aug 14', orderStatus: 'Backordered', fulfillment: 'Partial' },
]

export const suppliers = [
  { id: 1, name: 'Prime Hardware Co.', contact: 'Ellen Brooks', phone: '+1 (206) 555-0128', email: 'ellen@primehw.com', address: '712 Market St, Seattle, WA', products: 120 },
  { id: 2, name: 'ElectroSupply', contact: 'Miles Turner', phone: '+1 (415) 555-0190', email: 'miles@electrosupply.com', address: '815 Castro St, San Francisco, CA', products: 82 },
  { id: 3, name: 'SecurePack Logistics', contact: 'Dana Reeves', phone: '+1 (312) 555-0145', email: 'dana@securepack.com', address: '402 Lakeshore Dr, Chicago, IL', products: 98 },
]

export const staff = [
  {
    id: 1,
    name: 'Grace Lin',
    role: 'Store Manager',
    email: 'grace.lin@jemhardware.com',
    shift: 'Morning',
    status: 'Active',
    permissions: ['Inventory', 'Orders', 'Reports'],
  },
  {
    id: 2,
    name: 'Marco Ortiz',
    role: 'Sales Lead',
    email: 'marco.ortiz@jemhardware.com',
    shift: 'Afternoon',
    status: 'Active',
    permissions: ['POS', 'Customer Support', 'Sales'],
  },
  {
    id: 3,
    name: 'Priya Nair',
    role: 'Warehouse Lead',
    email: 'priya.nair@jemhardware.com',
    shift: 'Night',
    status: 'Active',
    permissions: ['Stock Adjustments', 'Receiving', 'Backorders'],
  },
  {
    id: 4,
    name: 'Ella Price',
    role: 'Customer Support',
    email: 'ella.price@jemhardware.com',
    shift: 'Morning',
    status: 'Inactive',
    permissions: ['Feedback', 'Orders'],
  },
]

export const auditTrail = [
  { id: 1, action: 'Updated stock level', detail: 'Screwdriver Set stock corrected by -2 units.', user: 'Lucas Kim', date: 'Aug 10' },
  { id: 2, action: 'Created new order', detail: 'Order ORD-1005 created for Vivian Lee.', user: 'Maya Sun', date: 'Aug 08' },
  { id: 3, action: 'Added new supplier', detail: 'SecurePack Logistics added to supplier list.', user: 'Ellen Brooks', date: 'Aug 07' },
  { id: 4, action: 'Completed payment', detail: 'Order ORD-1003 marked as paid.', user: 'Priya Nair', date: 'Aug 09' },
]

export const topSellingProducts = [
  { name: 'Cordless Drill', sold: 118, revenue: '₱10,550' },
  { name: 'Zip Ties 100pc', sold: 240, revenue: '₱3,000' },
  { name: 'Outlet Tester', sold: 92, revenue: '₱1,315' },
]

export const salesByChannel = [
  { day: 'Mon', online: 720, cash: 430 },
  { day: 'Tue', online: 650, cash: 380 },
  { day: 'Wed', online: 820, cash: 470 },
  { day: 'Thu', online: 740, cash: 500 },
  { day: 'Fri', online: 910, cash: 610 },
  { day: 'Sat', online: 660, cash: 540 },
  { day: 'Sun', online: 780, cash: 590 },
]

export const orderStatusShare = [
  { name: 'Confirmed', value: 32 },
  { name: 'Processing', value: 26 },
  { name: 'Shipped', value: 22 },
  { name: 'Delivered', value: 14 },
  { name: 'Cancelled', value: 6 },
]

export const customerOrders = [
  { id: 'C-2301', date: 'Aug 10', status: 'Delivered', total: '₱68.70', items: 2, tracking: 'Delivered', timeline: ['Order placed', 'Packed', 'Shipped', 'Delivered'] },
  { id: 'C-2302', date: 'Aug 12', status: 'Processing', total: '₱122.50', items: 4, tracking: 'In transit', timeline: ['Order placed', 'Confirmed', 'Packed'] },
]

export const reportPeriods = ['This week', 'This month', 'Last 30 days', 'Last quarter']

