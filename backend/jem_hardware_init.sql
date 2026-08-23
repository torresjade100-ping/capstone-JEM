DROP DATABASE IF EXISTS jem_hardware_db;

CREATE DATABASE jem_hardware_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE jem_hardware_db;

-- DISABLE FOREIGN KEY CHECKS DURING SETUP
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE staff_users (
    user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20),
    role ENUM('Administrator','Staff') NOT NULL DEFAULT 'Staff',
    profile_image VARCHAR(255),
    status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    last_login DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_staff_role (role),
    INDEX idx_staff_status (status)
) ENGINE=InnoDB;

CREATE TABLE staff_permissions (
    permission_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    permission_name ENUM(
        'Order Processing',
        'Inventory Viewing',
        'POS',
        'Restock Requests',
        'Customer Notifications',
        'Stock Adjustments'
    ) NOT NULL,
    granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_perm_user
        FOREIGN KEY (user_id) REFERENCES staff_users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uq_user_permission (user_id, permission_name)
) ENGINE=InnoDB;

CREATE TABLE customers (
    customer_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    default_address VARCHAR(255),
    status ENUM('Active','Inactive','Banned') NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_status (status)
) ENGINE=InnoDB;

CREATE TABLE customer_addresses (
    address_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    label VARCHAR(50) NOT NULL DEFAULT 'Home',
    full_address VARCHAR(255) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_addr_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_address_customer (customer_id)
) ENGINE=InnoDB;

CREATE TABLE categories (
    category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE brands (
    brand_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE products (
    product_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    description TEXT,
    category_id INT UNSIGNED NULL,
    brand_id INT UNSIGNED NULL,
    sku VARCHAR(50) NOT NULL UNIQUE,
    base_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(30) NOT NULL,
    product_image VARCHAR(255),
    stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 10,
    has_variants BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('Active','Inactive','Archived') NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_product_price CHECK (base_price >= 0),
    CONSTRAINT fk_product_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_product_brand
        FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_product_name (product_name),
    INDEX idx_product_category (category_id),
    INDEX idx_product_brand (brand_id),
    INDEX idx_product_status (status)
) ENGINE=InnoDB;

CREATE TABLE product_variants (
    variant_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    size VARCHAR(50),
    color VARCHAR(50),
    grade VARCHAR(50),
    thickness VARCHAR(50),
    variant_sku VARCHAR(50) NOT NULL UNIQUE,
    price DECIMAL(12,2) NOT NULL,
    stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 10,
    status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_variant_price CHECK (price >= 0),
    CONSTRAINT fk_variant_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_variant_product (product_id),
    INDEX idx_variant_status (status)
) ENGINE=InnoDB;

CREATE TABLE stock_adjustments (
    adjustment_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NULL,
    previous_quantity INT UNSIGNED NOT NULL,
    adjustment_type ENUM('Increase','Decrease') NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    new_quantity INT UNSIGNED NOT NULL,
    reason ENUM('Damaged','Expired','Return to Supplier','Miscount','Restock') NOT NULL,
    notes VARCHAR(255),
    adjusted_by INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_adjustment_quantity CHECK (quantity > 0),
    CONSTRAINT fk_adj_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_adj_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_adj_user
        FOREIGN KEY (adjusted_by) REFERENCES staff_users(user_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_adjustment_product (product_id),
    INDEX idx_adjustment_variant (variant_id),
    INDEX idx_adjustment_staff (adjusted_by),
    INDEX idx_adjustment_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE restock_requests (
    request_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NULL,
    requested_by INT UNSIGNED NOT NULL,
    quantity_requested INT UNSIGNED NOT NULL,
    reason VARCHAR(255),
    status ENUM('Pending','Approved','Rejected','Completed') NOT NULL DEFAULT 'Pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_restock_quantity CHECK (quantity_requested > 0),
    CONSTRAINT fk_restock_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_restock_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_restock_staff
        FOREIGN KEY (requested_by) REFERENCES staff_users(user_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_restock_status (status),
    INDEX idx_restock_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE suppliers (
    supplier_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    address VARCHAR(255),
    reference_link VARCHAR(255),
    status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_supplier_name (supplier_name),
    INDEX idx_supplier_status (status)
) ENGINE=InnoDB;

CREATE TABLE purchase_requests (
    pr_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id INT UNSIGNED NOT NULL,
    request_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
    notes VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pr_staff
        FOREIGN KEY (staff_id) REFERENCES staff_users(user_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_pr_status (status),
    INDEX idx_pr_staff (staff_id)
) ENGINE=InnoDB;

CREATE TABLE purchase_request_items (
    pr_item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pr_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NULL,
    quantity INT UNSIGNED NOT NULL,
    reason VARCHAR(255),
    CONSTRAINT chk_pritem_quantity CHECK (quantity > 0),
    CONSTRAINT fk_pritem_pr
        FOREIGN KEY (pr_id) REFERENCES purchase_requests(pr_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pritem_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pritem_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_pritem_product (product_id),
    INDEX idx_pritem_variant (variant_id)
) ENGINE=InnoDB;

CREATE TABLE purchase_orders (
    po_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    po_number VARCHAR(30) NOT NULL UNIQUE,
    supplier_id INT UNSIGNED NOT NULL,
    order_date DATE NOT NULL,
    expected_date DATE,
    status ENUM('Pending','Ordered','Partially Received','Received','Cancelled') NOT NULL DEFAULT 'Pending',
    total_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_by INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_po_total CHECK (total_cost >= 0),
    CONSTRAINT fk_po_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_po_staff
        FOREIGN KEY (created_by) REFERENCES staff_users(user_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_po_supplier (supplier_id),
    INDEX idx_po_status (status),
    INDEX idx_po_date (order_date)
) ENGINE=InnoDB;

CREATE TABLE purchase_order_items (
    po_item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    po_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    received_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT chk_poitem_quantity CHECK (quantity > 0),
    CONSTRAINT chk_poitem_cost CHECK (unit_cost >= 0),
    CONSTRAINT chk_poitem_subtotal CHECK (subtotal >= 0),
    CONSTRAINT fk_poitem_po
        FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_poitem_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_poitem_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_poitem_product (product_id),
    INDEX idx_poitem_variant (variant_id)
) ENGINE=InnoDB;

CREATE TABLE carts (
    cart_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cart_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE cart_items (
    cart_item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cart_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_cart_quantity CHECK (quantity > 0),
    CONSTRAINT fk_cartitem_cart
        FOREIGN KEY (cart_id) REFERENCES carts(cart_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cartitem_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cartitem_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE KEY uq_cart_line (cart_id, product_id, variant_id),
    INDEX idx_cartitem_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE orders (
    order_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(30) NOT NULL UNIQUE,
    customer_id INT UNSIGNED NOT NULL,
    order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivery_name VARCHAR(150) NOT NULL,
    delivery_contact VARCHAR(20) NOT NULL,
    delivery_address VARCHAR(255) NOT NULL,
    delivery_instructions VARCHAR(255),
    subtotal DECIMAL(12,2) NOT NULL,
    delivery_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL,
    payment_method ENUM('GCash','PayMaya','COD','Split') NOT NULL,
    payment_status ENUM('Paid','Awaiting COD Collection','Unpaid','Refunded') NOT NULL DEFAULT 'Unpaid',
    order_status ENUM('Confirmed (Online)','Confirmed (COD)','Processing','Shipped','Delivered','Cancelled') NOT NULL DEFAULT 'Processing',
    delivery_lead_time VARCHAR(50),
    staff_notes VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_order_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_order_delivery_fee CHECK (delivery_fee >= 0),
    CONSTRAINT chk_order_total CHECK (total >= 0),
    CONSTRAINT fk_order_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_order_customer (customer_id),
    INDEX idx_order_status (order_status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_order_date (order_date)
) ENGINE=InnoDB;

CREATE TABLE order_items (
    order_item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    fulfillment_status ENUM('Fulfilled','Backordered','Partially Fulfilled') NOT NULL DEFAULT 'Fulfilled',
    CONSTRAINT chk_orderitem_quantity CHECK (quantity > 0),
    CONSTRAINT chk_orderitem_price CHECK (unit_price >= 0),
    CONSTRAINT chk_orderitem_subtotal CHECK (subtotal >= 0),
    CONSTRAINT fk_oitem_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_oitem_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_oitem_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_oitem_order (order_id),
    INDEX idx_oitem_product (product_id),
    INDEX idx_oitem_variant (variant_id)
) ENGINE=InnoDB;

CREATE TABLE backorders (
    backorder_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    order_item_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NULL,
    ordered_quantity INT UNSIGNED NOT NULL,
    available_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    backordered_quantity INT UNSIGNED NOT NULL,
    expected_restock_date DATE,
    status ENUM('Pending','Notified','Partially Fulfilled','Fulfilled','Cancelled') NOT NULL DEFAULT 'Pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_backorder_ordered CHECK (ordered_quantity > 0),
    CONSTRAINT chk_backorder_quantity CHECK (backordered_quantity > 0),
    CONSTRAINT fk_backorder_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_backorder_item
        FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_backorder_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_backorder_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_backorder_status (status),
    INDEX idx_backorder_order (order_id),
    INDEX idx_backorder_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE order_status_history (
    history_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    status VARCHAR(50) NOT NULL,
    note VARCHAR(255),
    changed_by INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hist_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_hist_staff
        FOREIGN KEY (changed_by) REFERENCES staff_users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_hist_order (order_id),
    INDEX idx_hist_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE pos_transactions (
    pos_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_number VARCHAR(30) NOT NULL UNIQUE,
    cashier_id INT UNSIGNED NOT NULL,
    customer_name VARCHAR(150),
    subtotal DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL,
    payment_method ENUM('Cash','GCash','PayMaya') NOT NULL,
    amount_tendered DECIMAL(12,2),
    change_due DECIMAL(12,2),
    transaction_type ENUM('POS','Express Checkout') NOT NULL DEFAULT 'POS',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pos_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_pos_discount CHECK (discount >= 0),
    CONSTRAINT chk_pos_total CHECK (total >= 0),
    CONSTRAINT chk_pos_tendered CHECK (amount_tendered IS NULL OR amount_tendered >= 0),
    CONSTRAINT chk_pos_change CHECK (change_due IS NULL OR change_due >= 0),
    CONSTRAINT fk_pos_cashier
        FOREIGN KEY (cashier_id) REFERENCES staff_users(user_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_pos_cashier (cashier_id),
    INDEX idx_pos_date (created_at),
    INDEX idx_pos_type (transaction_type)
) ENGINE=InnoDB;

CREATE TABLE pos_transaction_items (
    item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pos_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    CONSTRAINT chk_positem_quantity CHECK (quantity > 0),
    CONSTRAINT chk_positem_price CHECK (unit_price >= 0),
    CONSTRAINT chk_positem_subtotal CHECK (subtotal >= 0),
    CONSTRAINT fk_positem_pos
        FOREIGN KEY (pos_id) REFERENCES pos_transactions(pos_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_positem_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_positem_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_positem_pos (pos_id),
    INDEX idx_positem_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE payments (
    payment_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NULL,
    pos_id INT UNSIGNED NULL,
    amount DECIMAL(12,2) NOT NULL,
    method ENUM('Cash','GCash','PayMaya','COD') NOT NULL,
    status ENUM('Paid','Pending','Refunded','Failed') NOT NULL DEFAULT 'Pending',
    reference_number VARCHAR(100),
    paid_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_payment_amount CHECK (amount > 0),
    CONSTRAINT chk_payment_parent CHECK (
        (order_id IS NOT NULL AND pos_id IS NULL)
        OR
        (order_id IS NULL AND pos_id IS NOT NULL)
    ),
    CONSTRAINT fk_pay_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pay_pos
        FOREIGN KEY (pos_id) REFERENCES pos_transactions(pos_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_payment_order (order_id),
    INDEX idx_payment_pos (pos_id),
    INDEX idx_payment_status (status),
    INDEX idx_payment_reference (reference_number)
) ENGINE=InnoDB;

CREATE TABLE notifications (
    notification_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recipient_type ENUM('Customer','Staff') NOT NULL,
    recipient_id INT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    message VARCHAR(255) NOT NULL,
    type ENUM('Order','Payment','Backorder','Restock','Feedback','System') NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_recipient (recipient_type, recipient_id, is_read),
    INDEX idx_notif_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE feedback (
    feedback_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    type ENUM('Review','Support Request') NOT NULL,
    product_id INT UNSIGNED NULL,
    rating TINYINT UNSIGNED NULL,
    issue_type VARCHAR(100),
    subject VARCHAR(150),
    message TEXT NOT NULL,
    attachment_image VARCHAR(255),
    status ENUM('Open','In Progress','Resolved','Closed') NOT NULL DEFAULT 'Open',
    admin_response TEXT,
    responded_by INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_feedback_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    CONSTRAINT fk_feedback_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_feedback_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_feedback_staff
        FOREIGN KEY (responded_by) REFERENCES staff_users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_feedback_customer (customer_id),
    INDEX idx_feedback_product (product_id),
    INDEX idx_feedback_status (status)
) ENGINE=InnoDB;

CREATE TABLE audit_trail (
    audit_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    record_id BIGINT UNSIGNED NULL,
    reason VARCHAR(255),
    before_value JSON,
    after_value JSON,
    ip_address VARCHAR(45),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id) REFERENCES staff_users(user_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_module (module),
    INDEX idx_audit_record (record_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW v_low_stock_items AS
SELECT
    p.product_id,
    p.product_name,
    p.sku,
    NULL AS variant_id,
    p.stock_quantity AS current_stock,
    p.low_stock_threshold,
    CASE
        WHEN p.stock_quantity = 0 THEN 'Out of Stock'
        WHEN p.stock_quantity <= (p.low_stock_threshold * 0.5) THEN 'Critical'
        WHEN p.stock_quantity <= p.low_stock_threshold THEN 'Low Stock'
        ELSE 'Sufficient'
    END AS stock_status
FROM products p
WHERE p.has_variants = FALSE
AND p.status = 'Active'
UNION ALL
SELECT
    v.product_id,
    p.product_name,
    v.variant_sku AS sku,
    v.variant_id,
    v.stock_quantity AS current_stock,
    v.low_stock_threshold,
    CASE
        WHEN v.stock_quantity = 0 THEN 'Out of Stock'
        WHEN v.stock_quantity <= (v.low_stock_threshold * 0.5) THEN 'Critical'
        WHEN v.stock_quantity <= v.low_stock_threshold THEN 'Low Stock'
        ELSE 'Sufficient'
    END AS stock_status
FROM product_variants v
INNER JOIN products p ON p.product_id = v.product_id
WHERE v.status = 'Active'
AND p.status = 'Active';

CREATE OR REPLACE VIEW v_top_selling_products AS
SELECT
    p.product_id,
    p.product_name,
    p.category_id,
    SUM(sold.qty) AS units_sold,
    SUM(sold.revenue) AS total_revenue
FROM (
    SELECT
        oi.product_id,
        oi.quantity AS qty,
        oi.subtotal AS revenue
    FROM order_items oi
    INNER JOIN orders o ON o.order_id = oi.order_id
    WHERE o.order_status = 'Delivered'
    UNION ALL
    SELECT
        pti.product_id,
        pti.quantity AS qty,
        pti.subtotal AS revenue
    FROM pos_transaction_items pti
) AS sold
INNER JOIN products p ON p.product_id = sold.product_id
GROUP BY p.product_id, p.product_name, p.category_id;

CREATE OR REPLACE VIEW v_order_summary AS
SELECT
    o.order_id,
    o.order_number,
    o.customer_id,
    c.full_name AS customer_name,
    o.order_date,
    o.subtotal,
    o.delivery_fee,
    o.total,
    o.payment_method,
    o.payment_status,
    o.order_status
FROM orders o
INNER JOIN customers c ON c.customer_id = o.customer_id;

CREATE OR REPLACE VIEW v_inventory_summary AS
SELECT
    p.product_id,
    p.product_name,
    p.sku,
    p.unit,
    p.stock_quantity,
    p.low_stock_threshold,
    p.status,
    CASE
        WHEN p.stock_quantity = 0 THEN 'Out of Stock'
        WHEN p.stock_quantity <= (p.low_stock_threshold * 0.5) THEN 'Critical'
        WHEN p.stock_quantity <= p.low_stock_threshold THEN 'Low Stock'
        ELSE 'Sufficient'
    END AS stock_status
FROM products p
WHERE p.has_variants = FALSE
UNION ALL
SELECT
    v.product_id,
    CONCAT(p.product_name, ' - ', v.variant_sku) AS product_name,
    v.variant_sku AS sku,
    p.unit,
    v.stock_quantity,
    v.low_stock_threshold,
    v.status,
    CASE
        WHEN v.stock_quantity = 0 THEN 'Out of Stock'
        WHEN v.stock_quantity <= (v.low_stock_threshold * 0.5) THEN 'Critical'
        WHEN v.stock_quantity <= v.low_stock_threshold THEN 'Low Stock'
        ELSE 'Sufficient'
    END AS stock_status
FROM product_variants v
INNER JOIN products p ON p.product_id = v.product_id;

-- ============================================================================
-- SAMPLE DATA - CATEGORIES
-- ============================================================================

INSERT INTO categories (category_name, description, status) VALUES
('Lumber', 'Wood and lumber construction materials', 'Active'),
('Tools', 'Hand tools and power tools', 'Active'),
('Hardware Supplies', 'General hardware and construction supplies', 'Active'),
('Electrical', 'Electrical supplies and accessories', 'Active'),
('Plumbing', 'Plumbing materials and accessories', 'Active'),
('Paint', 'Paint and painting supplies', 'Active'),
('Accessories', 'Hardware accessories and related items', 'Active');

-- ============================================================================
-- SAMPLE DATA - BRANDS
-- ============================================================================

INSERT INTO brands (brand_name, description, status) VALUES
('Bosch', 'Bosch tools and equipment', 'Active'),
('DeWalt', 'DeWalt tools and equipment', 'Active'),
('JEM', 'JEM Hardware house brand', 'Active'),
('Generic', 'Generic hardware products', 'Active');

-- ============================================================================
-- SAMPLE DATA - STAFF USERS
-- ============================================================================

-- Password: admin123 (Laravel bcrypt hash)
-- Password: staff123 (Laravel bcrypt hash)
INSERT INTO staff_users
(full_name, email, password_hash, contact_number, role, status)
VALUES
('System Administrator', 'admin@jemhardware.local', '$2y$10$92IXUNpkm1OjwWx6eH.KKuRkxMDWqq3dC0pHJlZX8Yo7BPXJKVt2S', '09000000001', 'Administrator', 'Active'),
('JEM Staff', 'staff@jemhardware.local', '$2y$10$FQyEb5g0jkZpx9R0pXLHOu5j5w5QO9ZpxFyLmRzR5Z5R4p4gYKe0S', '09000000002', 'Staff', 'Active');

-- ============================================================================
-- SAMPLE DATA - STAFF PERMISSIONS
-- ============================================================================

INSERT INTO staff_permissions (user_id, permission_name)
SELECT user_id, 'Order Processing'
FROM staff_users
WHERE email = 'staff@jemhardware.local'
UNION ALL
SELECT user_id, 'Inventory Viewing'
FROM staff_users
WHERE email = 'staff@jemhardware.local'
UNION ALL
SELECT user_id, 'POS'
FROM staff_users
WHERE email = 'staff@jemhardware.local'
UNION ALL
SELECT user_id, 'Restock Requests'
FROM staff_users
WHERE email = 'staff@jemhardware.local'
UNION ALL
SELECT user_id, 'Customer Notifications'
FROM staff_users
WHERE email = 'staff@jemhardware.local'
UNION ALL
SELECT user_id, 'Stock Adjustments'
FROM staff_users
WHERE email = 'staff@jemhardware.local';

-- SAMPLE DATA - CUSTOMERS
-- ============================================================================

-- Password: customer123 (Laravel bcrypt hash)
INSERT INTO customers
(full_name, email, password_hash, phone_number, default_address, status)
VALUES
('Sample Customer', 'customer@example.local', '$2y$10$dpgR0N9iKMPtVTJVGWBmxOmNqYWVtmMJ8wqI0k6hLYYVDvWVc2PzO', '09000000003', 'Cagayan de Oro City, Philippines', 'Active'),
('John Dela Cruz', 'john@example.local', '$2y$10$dpgR0N9iKMPtVTJVGWBmxOmNqYWVtmMJ8wqI0k6hLYYVDvWVc2PzO', '09123456789', 'Iligan City, Philippines', 'Active'),
('Maria Santos', 'maria@example.local', '$2y$10$dpgR0N9iKMPtVTJVGWBmxOmNqYWVtmMJ8wqI0k6hLYYVDvWVc2PzO', '09987654321', 'Butuan City, Philippines', 'Active');

-- SAMPLE DATA - CUSTOMER ADDRESSES
-- ============================================================================

INSERT INTO customer_addresses (customer_id, label, full_address, is_default)
SELECT customer_id, 'Home', 'Cagayan de Oro City, Philippines', TRUE
FROM customers WHERE email = 'customer@example.local'
UNION ALL
SELECT customer_id, 'Work', 'Kolambog, Cagayan de Oro', FALSE
FROM customers WHERE email = 'customer@example.local'
UNION ALL
SELECT customer_id, 'Home', 'Iligan City, Philippines', TRUE
FROM customers
WHERE email = 'john@example.local'
UNION ALL
SELECT customer_id, 'Home', 'Butuan City, Philippines', TRUE
FROM customers
WHERE email = 'maria@example.local';

-- SAMPLE DATA - SUPPLIERS
-- ============================================================================

INSERT INTO suppliers
(supplier_name, contact_person, phone, email, address, reference_link, status)
VALUES
('Sample Hardware Supplier', 'Supplier Contact', '09000000004', 'supplier@example.local', 'Cagayan de Oro City, Philippines', 'https://example.com', 'Active'),
('Metro Hardware Distributors', 'Mr. John Supplier', '09111111111', 'contact@metrohardware.local', 'Quezon City, Philippines', 'https://metrohardware.local', 'Active'),
('Provincial Lumber Supply', 'Ms. Rosa Lumberio', '09222222222', 'info@provlumber.local', 'Bulacan, Philippines', 'https://provlumber.local', 'Active');

-- SAMPLE DATA - PRODUCTS
-- ============================================================================

INSERT INTO products
(product_name, description, category_id, brand_id, sku, base_price, unit, stock_quantity, low_stock_threshold, has_variants, status)
VALUES
(
    'Portland Cement',
    'General purpose Portland cement for construction',
    (SELECT category_id FROM categories WHERE category_name = 'Hardware Supplies'),
    (SELECT brand_id FROM brands WHERE brand_name = 'Generic'),
    'CEM-001',
    250.00,
    'bag',
    50,
    10,
    FALSE,
    'Active'
),
(
    'Bosch Angle Grinder',
    'Electric angle grinder 4.5 inch for construction use',
    (SELECT category_id FROM categories WHERE category_name = 'Tools'),
    (SELECT brand_id FROM brands WHERE brand_name = 'Bosch'),
    'BOSCH-AG-001',
    3500.00,
    'piece',
    10,
    3,
    FALSE,
    'Active'
),
(
    'DeWalt Cordless Drill',
    '20V MAX cordless power drill for construction and hardware work',
    (SELECT category_id FROM categories WHERE category_name = 'Tools'),
    (SELECT brand_id FROM brands WHERE brand_name = 'DeWalt'),
    'DEWALT-DR-001',
    4500.00,
    'piece',
    8,
    3,
    FALSE,
    'Active'
),
(
    'Galvanized Nails',
    'Galvanized nails assorted sizes',
    (SELECT category_id FROM categories WHERE category_name = 'Hardware Supplies'),
    (SELECT brand_id FROM brands WHERE brand_name = 'Generic'),
    'NAIL-GAL-001',
    150.00,
    'kg',
    100,
    20,
    FALSE,
    'Active'
),
(
    'Wood Primer Paint',
    'Wood primer for interior and exterior use',
    (SELECT category_id FROM categories WHERE category_name = 'Paint'),
    (SELECT brand_id FROM brands WHERE brand_name = 'Generic'),
    'PAINT-PRIMER-001',
    500.00,
    'liter',
    30,
    10,
    FALSE,
    'Active'
);

-- Product with variants
INSERT INTO products
(product_name, description, category_id, brand_id, sku, base_price, unit, stock_quantity, low_stock_threshold, has_variants, status)
VALUES
(
    'Construction Lumber',
    'Construction lumber with selectable dimensions and grades',
    (SELECT category_id FROM categories WHERE category_name = 'Lumber'),
    (SELECT brand_id FROM brands WHERE brand_name = 'JEM'),
    'LUMBER-001',
    0.00,
    'piece',
    0,
    10,
    TRUE,
    'Active'
);


-- SAMPLE DATA - PRODUCT VARIANTS
-- ============================================================================

INSERT INTO product_variants
(product_id, size, color, grade, thickness, variant_sku, price, stock_quantity, low_stock_threshold, status)
SELECT
    product_id,
    '2x2',
    NULL,
    'Good',
    '2 inches',
    'LUMBER-001-2X2',
    180.00,
    100,
    20,
    'Active'
FROM products
WHERE sku = 'LUMBER-001'
UNION ALL
SELECT
    product_id,
    '2x4',
    NULL,
    'Good',
    '2 inches',
    'LUMBER-001-2X4',
    280.00,
    80,
    20,
    'Active'
FROM products
WHERE sku = 'LUMBER-001'
UNION ALL
SELECT
    product_id,
    '4x4',
    NULL,
    'Good',
    '4 inches',
    'LUMBER-001-4X4',
    450.00,
    60,
    20,
    'Active'
FROM products
WHERE sku = 'LUMBER-001';

-- SAMPLE DATA - CARTS
-- ============================================================================

INSERT INTO carts (customer_id)
SELECT customer_id FROM customers WHERE email = 'customer@example.local'
UNION ALL
SELECT customer_id FROM customers WHERE email = 'john@example.local'
UNION ALL
SELECT customer_id FROM customers WHERE email = 'maria@example.local';

-- ============================================================================
-- SAMPLE DATA - ORDERS (to populate views)
-- ============================================================================

INSERT INTO orders
(order_number, customer_id, delivery_name, delivery_contact, delivery_address, 
 subtotal, delivery_fee, total, payment_method, payment_status, order_status)
VALUES
('ORD-2024-001', 
 (SELECT customer_id FROM customers WHERE email = 'customer@example.local'),
 'Sample Customer', '09000000003', 'Cagayan de Oro City, Philippines',
 1050.00, 100.00, 1150.00, 'COD', 'Awaiting COD Collection', 'Delivered'),

('ORD-2024-002',
 (SELECT customer_id FROM customers WHERE email = 'john@example.local'),
 'John Dela Cruz', '09123456789', 'Iligan City, Philippines',
 8500.00, 150.00, 8650.00, 'GCash', 'Paid', 'Delivered'),

('ORD-2024-003',
 (SELECT customer_id FROM customers WHERE email = 'maria@example.local'),
 'Maria Santos', '09987654321', 'Butuan City, Philippines',
 3000.00, 200.00, 3200.00, 'PayMaya', 'Paid', 'Processing');

-- ============================================================================
-- SAMPLE DATA - ORDER ITEMS
-- ============================================================================

INSERT INTO order_items
(order_id, product_id, quantity, unit_price, subtotal, fulfillment_status)
VALUES
-- Order 1 items
((SELECT order_id FROM orders WHERE order_number = 'ORD-2024-001'),
 (SELECT product_id FROM products WHERE sku = 'CEM-001'),
 3, 250.00, 750.00, 'Fulfilled'),

((SELECT order_id FROM orders WHERE order_number = 'ORD-2024-001'),
 (SELECT product_id FROM products WHERE sku = 'NAIL-GAL-001'),
 1, 300.00, 300.00, 'Fulfilled'),

-- Order 2 items
((SELECT order_id FROM orders WHERE order_number = 'ORD-2024-002'),
 (SELECT product_id FROM products WHERE sku = 'BOSCH-AG-001'),
 2, 3500.00, 7000.00, 'Fulfilled'),

((SELECT order_id FROM orders WHERE order_number = 'ORD-2024-002'),
 (SELECT product_id FROM products WHERE sku = 'DEWALT-DR-001'),
 1, 1500.00, 1500.00, 'Fulfilled'),

-- Order 3 items
((SELECT order_id FROM orders WHERE order_number = 'ORD-2024-003'),
 (SELECT product_id FROM products WHERE sku = 'PAINT-PRIMER-001'),
 6, 500.00, 3000.00, 'Fulfilled');

-- ============================================================================
-- SAMPLE DATA - POS TRANSACTIONS
-- ============================================================================

INSERT INTO pos_transactions
(transaction_number, cashier_id, customer_name, subtotal, discount, total, 
 payment_method, amount_tendered, change_due, transaction_type)
VALUES
('POS-2024-001',
 (SELECT user_id FROM staff_users WHERE email = 'staff@jemhardware.local'),
 'Walk-in Customer 1', 1500.00, 0, 1500.00, 'Cash', 1500.00, 0, 'POS'),

('POS-2024-002',
 (SELECT user_id FROM staff_users WHERE email = 'staff@jemhardware.local'),
 'Walk-in Customer 2', 2500.00, 250.00, 2250.00, 'GCash', 2250.00, 0, 'POS'),

('POS-2024-003',
 (SELECT user_id FROM staff_users WHERE email = 'staff@jemhardware.local'),
 'Walk-in Customer 3', 3000.00, 0, 3000.00, 'Cash', 5000.00, 2000.00, 'POS');

-- ============================================================================
-- SAMPLE DATA - POS TRANSACTION ITEMS
-- ============================================================================

INSERT INTO pos_transaction_items
(pos_id, product_id, quantity, unit_price, subtotal)
VALUES
((SELECT pos_id FROM pos_transactions WHERE transaction_number = 'POS-2024-001'),
 (SELECT product_id FROM products WHERE sku = 'CEM-001'),
 4, 250.00, 1000.00),

((SELECT pos_id FROM pos_transactions WHERE transaction_number = 'POS-2024-001'),
 (SELECT product_id FROM products WHERE sku = 'NAIL-GAL-001'),
 1, 500.00, 500.00),

((SELECT pos_id FROM pos_transactions WHERE transaction_number = 'POS-2024-002'),
 (SELECT product_id FROM products WHERE sku = 'PAINT-PRIMER-001'),
 5, 500.00, 2500.00),

((SELECT pos_id FROM pos_transactions WHERE transaction_number = 'POS-2024-003'),
 (SELECT product_id FROM products WHERE sku = 'BOSCH-AG-001'),
 1, 3000.00, 3000.00);

-- ============================================================================
-- SAMPLE DATA - PAYMENTS
-- ============================================================================

INSERT INTO payments
(order_id, amount, method, status, reference_number, paid_at)
VALUES
((SELECT order_id FROM orders WHERE order_number = 'ORD-2024-001'),
 1150.00, 'COD', 'Pending', 'ORD-2024-001-COD', NULL),

((SELECT order_id FROM orders WHERE order_number = 'ORD-2024-002'),
 8650.00, 'GCash', 'Paid', 'GCASH-TXN-2024-002', NOW()),

((SELECT order_id FROM orders WHERE order_number = 'ORD-2024-003'),
 3200.00, 'PayMaya', 'Paid', 'PAYMAYA-TXN-2024-003', NOW());

-- ============================================================================
-- RE-ENABLE FOREIGN KEY CHECKS
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'Database created and populated successfully!' AS message;

SHOW TABLES;

SELECT '--- DATA SUMMARY ---' AS info;
SELECT CONCAT('Staff Users: ', COUNT(*)) AS info FROM staff_users;
SELECT CONCAT('Customers: ', COUNT(*)) AS info FROM customers;
SELECT CONCAT('Categories: ', COUNT(*)) AS info FROM categories;
SELECT CONCAT('Brands: ', COUNT(*)) AS info FROM brands;
SELECT CONCAT('Products: ', COUNT(*)) AS info FROM products;
SELECT CONCAT('Product Variants: ', COUNT(*)) AS info FROM product_variants;
SELECT CONCAT('Orders: ', COUNT(*)) AS info FROM orders;
SELECT CONCAT('Order Items: ', COUNT(*)) AS info FROM order_items;
SELECT CONCAT('POS Transactions: ', COUNT(*)) AS info FROM pos_transactions;
SELECT CONCAT('POS Transaction Items: ', COUNT(*)) AS info FROM pos_transaction_items;

SELECT '--- VIEW DATA ---' AS info;
SELECT 'Low Stock Items:' AS view_name;
SELECT * FROM v_low_stock_items;

SELECT 'Top Selling Products:' AS view_name;
SELECT * FROM v_top_selling_products;

SELECT 'Order Summary:' AS view_name;
SELECT * FROM v_order_summary;

SELECT 'Inventory Summary:' AS view_name;
SELECT * FROM v_inventory_summary LIMIT 10;
