-- migrate:up

CREATE TABLE addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  receiver_name VARCHAR(80) NOT NULL,
  receiver_phone_cipher VARBINARY(255) NOT NULL,
  receiver_phone_iv BINARY(16) NOT NULL,
  province VARCHAR(60) NOT NULL,
  city VARCHAR(60) NOT NULL,
  district VARCHAR(60) NOT NULL,
  detail VARCHAR(255) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_addresses_user_default (user_id, is_default, id),
  CONSTRAINT fk_addresses_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_addresses_receiver_name_non_empty CHECK (CHAR_LENGTH(TRIM(receiver_name)) > 0),
  CONSTRAINT chk_addresses_detail_non_empty CHECK (CHAR_LENGTH(TRIM(detail)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cart_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_items_user_product (user_id, product_id),
  KEY idx_cart_items_product (product_id),
  CONSTRAINT fk_cart_items_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_cart_items_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_cart_items_quantity_positive CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE master_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_no VARCHAR(40) NOT NULL,
  buyer_user_id BIGINT UNSIGNED NOT NULL,
  address_id BIGINT UNSIGNED NOT NULL,
  checkout_token CHAR(36) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
  receiver_name VARCHAR(80) NOT NULL,
  receiver_phone_cipher VARBINARY(255) NOT NULL,
  receiver_phone_iv BINARY(16) NOT NULL,
  address_snapshot JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  paid_at DATETIME(3) NULL,
  canceled_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_master_orders_order_no (order_no),
  UNIQUE KEY uq_master_orders_buyer_checkout (buyer_user_id, checkout_token),
  KEY idx_master_orders_buyer_created (buyer_user_id, created_at, id),
  CONSTRAINT fk_master_orders_buyer
    FOREIGN KEY (buyer_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_master_orders_address
    FOREIGN KEY (address_id) REFERENCES addresses (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_master_orders_status CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'CANCELED', 'COMPLETED')),
  CONSTRAINT chk_master_orders_total_non_negative CHECK (total_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE shop_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  master_order_id BIGINT UNSIGNED NOT NULL,
  shop_id BIGINT UNSIGNED NOT NULL,
  shop_order_no VARCHAR(48) NOT NULL,
  subtotal_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  paid_at DATETIME(3) NULL,
  shipped_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  canceled_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_shop_orders_order_no (shop_order_no),
  KEY idx_shop_orders_master (master_order_id),
  KEY idx_shop_orders_shop_status_updated (shop_id, status, updated_at, id),
  CONSTRAINT fk_shop_orders_master
    FOREIGN KEY (master_order_id) REFERENCES master_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_shop_orders_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_shop_orders_status CHECK (status IN ('PENDING_PAYMENT', 'PENDING_SHIPMENT', 'SHIPPED', 'COMPLETED', 'CANCELED', 'REFUNDED')),
  CONSTRAINT chk_shop_orders_subtotal_non_negative CHECK (subtotal_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  product_main_image_path VARCHAR(255) NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  line_amount DECIMAL(12, 2) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_order_items_shop_order (shop_order_id),
  KEY idx_order_items_product_shop_order (product_id, shop_order_id),
  CONSTRAINT fk_order_items_shop_order
    FOREIGN KEY (shop_order_id) REFERENCES shop_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_order_items_unit_price_positive CHECK (unit_price > 0),
  CONSTRAINT chk_order_items_line_amount_positive CHECK (line_amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  master_order_id BIGINT UNSIGNED NOT NULL,
  payment_no VARCHAR(48) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  paid_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_order (master_order_id),
  UNIQUE KEY uq_payments_payment_no (payment_no),
  CONSTRAINT fk_payments_master_order
    FOREIGN KEY (master_order_id) REFERENCES master_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_payments_status CHECK (status IN ('PENDING', 'PAID', 'CANCELED')),
  CONSTRAINT chk_payments_amount_non_negative CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TRIGGER trg_master_orders_audit
AFTER UPDATE ON master_orders
FOR EACH ROW
  INSERT INTO audit_logs (
    actor_user_id,
    request_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data
  )
  SELECT
    CAST(NULLIF(@novamall_actor_user_id, '') AS UNSIGNED),
    NULLIF(CAST(@novamall_request_id AS CHAR(36)), ''),
    'master_orders',
    NEW.id,
    'STATUS_CHANGE',
    JSON_OBJECT('status', OLD.status, 'totalAmount', CAST(OLD.total_amount AS CHAR)),
    JSON_OBJECT('status', NEW.status, 'totalAmount', CAST(NEW.total_amount AS CHAR))
  WHERE OLD.status <> NEW.status;

CREATE TRIGGER trg_shop_orders_audit
AFTER UPDATE ON shop_orders
FOR EACH ROW
  INSERT INTO audit_logs (
    actor_user_id,
    request_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data
  )
  SELECT
    CAST(NULLIF(@novamall_actor_user_id, '') AS UNSIGNED),
    NULLIF(CAST(@novamall_request_id AS CHAR(36)), ''),
    'shop_orders',
    NEW.id,
    'STATUS_CHANGE',
    JSON_OBJECT('status', OLD.status, 'subtotalAmount', CAST(OLD.subtotal_amount AS CHAR)),
    JSON_OBJECT('status', NEW.status, 'subtotalAmount', CAST(NEW.subtotal_amount AS CHAR))
  WHERE OLD.status <> NEW.status;

CREATE TRIGGER trg_user_roles_audit
AFTER INSERT ON user_roles
FOR EACH ROW
  INSERT INTO audit_logs (
    actor_user_id,
    request_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data
  )
  VALUES (
    CAST(NULLIF(@novamall_actor_user_id, '') AS UNSIGNED),
    NULLIF(CAST(@novamall_request_id AS CHAR(36)), ''),
    'user_roles',
    NEW.user_id,
    'INSERT',
    NULL,
    JSON_OBJECT('userId', CAST(NEW.user_id AS CHAR), 'roleId', NEW.role_id)
  );

CREATE VIEW v_member_order_details AS
SELECT
  CAST(mo.buyer_user_id AS CHAR) AS buyer_user_id,
  mo.order_no,
  mo.status AS master_status,
  CAST(mo.total_amount AS CHAR) AS total_amount,
  CAST(so.id AS CHAR) AS shop_order_id,
  so.shop_order_no,
  so.status AS shop_order_status,
  CAST(so.subtotal_amount AS CHAR) AS subtotal_amount,
  CAST(s.id AS CHAR) AS shop_id,
  s.name AS shop_name,
  CAST(oi.product_id AS CHAR) AS product_id,
  oi.product_name,
  oi.product_main_image_path,
  CAST(oi.unit_price AS CHAR) AS unit_price,
  oi.quantity,
  CAST(oi.line_amount AS CHAR) AS line_amount,
  mo.created_at
FROM master_orders mo
JOIN shop_orders so ON so.master_order_id = mo.id
JOIN shops s ON s.id = so.shop_id
JOIN order_items oi ON oi.shop_order_id = so.id;

CREATE VIEW v_effective_product_sales AS
SELECT
  CAST(oi.product_id AS CHAR) AS product_id,
  oi.product_name,
  SUM(oi.quantity) AS sold_quantity,
  CAST(SUM(oi.line_amount) AS CHAR) AS sales_amount
FROM order_items oi
JOIN shop_orders so ON so.id = oi.shop_order_id
WHERE so.status IN ('PENDING_SHIPMENT', 'SHIPPED', 'COMPLETED')
GROUP BY oi.product_id, oi.product_name;

CREATE VIEW v_shop_sales_summary AS
SELECT
  CAST(so.shop_id AS CHAR) AS shop_id,
  DATE(so.created_at) AS sales_date,
  COUNT(DISTINCT so.id) AS order_count,
  COALESCE(SUM(oi.quantity), 0) AS item_quantity,
  CAST(COALESCE(SUM(oi.line_amount), 0) AS CHAR) AS sales_amount
FROM shop_orders so
LEFT JOIN order_items oi ON oi.shop_order_id = so.id
WHERE so.status IN ('PENDING_SHIPMENT', 'SHIPPED', 'COMPLETED')
GROUP BY so.shop_id, DATE(so.created_at);

CREATE PROCEDURE sp_checkout_cart(
  IN p_user_id BIGINT UNSIGNED,
  IN p_address_id BIGINT UNSIGNED,
  IN p_checkout_token CHAR(36),
  OUT p_order_no VARCHAR(40)
)
BEGIN
  DECLARE v_existing_order_no VARCHAR(40);
  DECLARE v_address_count INT DEFAULT 0;
  DECLARE v_item_count INT DEFAULT 0;
  DECLARE v_unavailable_count INT DEFAULT 0;
  DECLARE v_out_of_stock_count INT DEFAULT 0;
  DECLARE v_total_amount DECIMAL(12, 2) DEFAULT 0.00;
  DECLARE v_master_order_id BIGINT UNSIGNED;
  DECLARE v_order_no VARCHAR(40);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    DROP TEMPORARY TABLE IF EXISTS tmp_checkout_items;
    RESIGNAL;
  END;

  SELECT order_no INTO v_existing_order_no
    FROM master_orders
   WHERE buyer_user_id = p_user_id
     AND checkout_token = p_checkout_token
   LIMIT 1;

  IF v_existing_order_no IS NOT NULL THEN
    SET p_order_no = v_existing_order_no;
  ELSE
    START TRANSACTION;

    SELECT COUNT(*) INTO v_address_count
      FROM addresses
     WHERE id = p_address_id
       AND user_id = p_user_id;

    IF v_address_count = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ADDRESS_NOT_OWNED';
    END IF;

    DROP TEMPORARY TABLE IF EXISTS tmp_checkout_items;
    CREATE TEMPORARY TABLE tmp_checkout_items (
      cart_item_id BIGINT UNSIGNED NOT NULL,
      product_id BIGINT UNSIGNED NOT NULL,
      shop_id BIGINT UNSIGNED NOT NULL,
      product_name VARCHAR(120) NOT NULL,
      product_main_image_path VARCHAR(255) NULL,
      price DECIMAL(10, 2) NOT NULL,
      stock INT UNSIGNED NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      product_status VARCHAR(20) NOT NULL,
      category_status VARCHAR(20) NOT NULL,
      shop_status VARCHAR(20) NOT NULL,
      line_amount DECIMAL(12, 2) NOT NULL,
      PRIMARY KEY (product_id)
    ) ENGINE=MEMORY;

    INSERT INTO tmp_checkout_items (
      cart_item_id,
      product_id,
      shop_id,
      product_name,
      product_main_image_path,
      price,
      stock,
      quantity,
      product_status,
      category_status,
      shop_status,
      line_amount
    )
    SELECT
      ci.id,
      p.id,
      p.shop_id,
      p.name,
      p.main_image_path,
      p.price,
      p.stock,
      ci.quantity,
      p.status,
      c.status,
      s.status,
      p.price * ci.quantity
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    JOIN categories c ON c.id = p.category_id
    JOIN shops s ON s.id = p.shop_id
    WHERE ci.user_id = p_user_id
    ORDER BY p.id
    FOR UPDATE;

    SELECT COUNT(*) INTO v_item_count FROM tmp_checkout_items;
    IF v_item_count = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'EMPTY_CART';
    END IF;

    SELECT COUNT(*) INTO v_unavailable_count
      FROM tmp_checkout_items
     WHERE product_status <> 'PUBLISHED'
        OR category_status <> 'ACTIVE'
        OR shop_status <> 'ACTIVE'
        OR product_main_image_path IS NULL;

    IF v_unavailable_count > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PRODUCT_UNAVAILABLE';
    END IF;

    SELECT COUNT(*) INTO v_out_of_stock_count
      FROM tmp_checkout_items
     WHERE stock < quantity;

    IF v_out_of_stock_count > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'OUT_OF_STOCK';
    END IF;

    SELECT COALESCE(SUM(line_amount), 0.00) INTO v_total_amount FROM tmp_checkout_items;
    SET v_order_no = CONCAT('MO', REPLACE(UUID(), '-', ''));

    INSERT INTO master_orders (
      order_no,
      buyer_user_id,
      address_id,
      checkout_token,
      total_amount,
      receiver_name,
      receiver_phone_cipher,
      receiver_phone_iv,
      address_snapshot
    )
    SELECT
      v_order_no,
      p_user_id,
      a.id,
      p_checkout_token,
      v_total_amount,
      a.receiver_name,
      a.receiver_phone_cipher,
      a.receiver_phone_iv,
      JSON_OBJECT(
        'province', a.province,
        'city', a.city,
        'district', a.district,
        'detail', a.detail
      )
    FROM addresses a
    WHERE a.id = p_address_id
      AND a.user_id = p_user_id;

    SET v_master_order_id = LAST_INSERT_ID();

    INSERT INTO shop_orders (
      master_order_id,
      shop_id,
      shop_order_no,
      subtotal_amount
    )
    SELECT
      v_master_order_id,
      shop_id,
      CONCAT('SO', REPLACE(UUID(), '-', '')),
      SUM(line_amount)
    FROM tmp_checkout_items
    GROUP BY shop_id;

    INSERT INTO order_items (
      shop_order_id,
      product_id,
      product_name,
      product_main_image_path,
      unit_price,
      quantity,
      line_amount
    )
    SELECT
      so.id,
      t.product_id,
      t.product_name,
      t.product_main_image_path,
      t.price,
      t.quantity,
      t.line_amount
    FROM tmp_checkout_items t
    JOIN shop_orders so
      ON so.master_order_id = v_master_order_id
     AND so.shop_id = t.shop_id;

    UPDATE products p
    JOIN tmp_checkout_items t ON t.product_id = p.id
       SET p.stock = p.stock - t.quantity,
           p.version = p.version + 1;

    INSERT INTO payments (
      master_order_id,
      payment_no,
      amount
    )
    VALUES (
      v_master_order_id,
      CONCAT('PAY', REPLACE(UUID(), '-', '')),
      v_total_amount
    );

    DELETE ci
      FROM cart_items ci
      JOIN tmp_checkout_items t ON t.cart_item_id = ci.id;

    DROP TEMPORARY TABLE IF EXISTS tmp_checkout_items;
    COMMIT;
    SET p_order_no = v_order_no;
  END IF;
END;

-- migrate:down

DROP PROCEDURE IF EXISTS sp_checkout_cart;
DROP VIEW IF EXISTS v_shop_sales_summary;
DROP VIEW IF EXISTS v_effective_product_sales;
DROP VIEW IF EXISTS v_member_order_details;
DROP TRIGGER IF EXISTS trg_user_roles_audit;
DROP TRIGGER IF EXISTS trg_shop_orders_audit;
DROP TRIGGER IF EXISTS trg_master_orders_audit;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS shop_orders;
DROP TABLE IF EXISTS master_orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS addresses;
