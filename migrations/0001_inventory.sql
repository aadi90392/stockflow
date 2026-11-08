PRAGMA foreign_keys=ON;
CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE auth_links(token TEXT PRIMARY KEY,email TEXT NOT NULL,name TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE local_mail(email TEXT PRIMARY KEY,link TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE organizations(id TEXT PRIMARY KEY,name TEXT NOT NULL,invite TEXT NOT NULL UNIQUE);
CREATE TABLE members(org_id TEXT NOT NULL REFERENCES organizations(id),user_id TEXT NOT NULL REFERENCES users(id),role TEXT NOT NULL CHECK(role IN ('owner','manager','staff')),PRIMARY KEY(org_id,user_id));
CREATE TABLE locations(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),name TEXT NOT NULL,address TEXT NOT NULL,UNIQUE(org_id,name));
CREATE TABLE suppliers(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),name TEXT NOT NULL,email TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '');
CREATE TABLE products(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),sku TEXT NOT NULL,name TEXT NOT NULL,category TEXT NOT NULL DEFAULT '',price INTEGER NOT NULL CHECK(price>=0),reorder INTEGER NOT NULL DEFAULT 5 CHECK(reorder>=0),active INTEGER NOT NULL DEFAULT 1,UNIQUE(org_id,sku));
CREATE TABLE photos(product_id TEXT PRIMARY KEY REFERENCES products(id),data TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE stock(product_id TEXT NOT NULL REFERENCES products(id),location_id TEXT NOT NULL REFERENCES locations(id),quantity INTEGER NOT NULL CHECK(quantity>=0),PRIMARY KEY(product_id,location_id));
CREATE TABLE orders(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),supplier_id TEXT NOT NULL REFERENCES suppliers(id),product_id TEXT NOT NULL REFERENCES products(id),location_id TEXT NOT NULL REFERENCES locations(id),quantity INTEGER NOT NULL CHECK(quantity>0),received INTEGER NOT NULL DEFAULT 0 CHECK(received>=0 AND received<=quantity),reference TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE transfers(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),product_id TEXT NOT NULL REFERENCES products(id),source_id TEXT NOT NULL REFERENCES locations(id),destination_id TEXT NOT NULL REFERENCES locations(id),quantity INTEGER NOT NULL CHECK(quantity>0),status TEXT NOT NULL DEFAULT 'transit' CHECK(status IN ('transit','received')),created_by TEXT NOT NULL REFERENCES users(id),received_by TEXT REFERENCES users(id),created_at INTEGER NOT NULL,received_at INTEGER,CHECK(source_id<>destination_id));
CREATE TABLE movements(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),product_id TEXT NOT NULL REFERENCES products(id),location_id TEXT NOT NULL REFERENCES locations(id),delta INTEGER NOT NULL CHECK(delta<>0),kind TEXT NOT NULL CHECK(kind IN ('adjustment','receipt','sale','return','transfer_out','transfer_in')),reason TEXT NOT NULL,order_id TEXT REFERENCES orders(id),sale_id TEXT REFERENCES movements(id),actor_id TEXT NOT NULL REFERENCES users(id),created_at INTEGER NOT NULL,request_key TEXT NOT NULL,fingerprint TEXT NOT NULL,UNIQUE(org_id,request_key));
CREATE INDEX movement_timeline ON movements(org_id,created_at DESC);
CREATE INDEX products_org ON products(org_id);
CREATE INDEX orders_org ON orders(org_id);
CREATE INDEX transfer_org ON transfers(org_id);
CREATE TRIGGER movement_guard BEFORE INSERT ON movements BEGIN
 SELECT CASE WHEN COALESCE((SELECT quantity FROM stock WHERE product_id=NEW.product_id AND location_id=NEW.location_id),0)+NEW.delta<0 THEN RAISE(ABORT,'Insufficient stock') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM products p JOIN locations l ON l.id=NEW.location_id WHERE p.id=NEW.product_id AND p.org_id=NEW.org_id AND l.org_id=NEW.org_id AND p.active=1) THEN RAISE(ABORT,'Invalid inventory membership') END;
 SELECT CASE WHEN NEW.kind='receipt' AND NOT EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND org_id=NEW.org_id AND product_id=NEW.product_id AND location_id=NEW.location_id AND NEW.delta>0 AND received+NEW.delta<=quantity) THEN RAISE(ABORT,'Receipt exceeds outstanding quantity') END;
 SELECT CASE WHEN NEW.kind='sale' AND NEW.delta>=0 THEN RAISE(ABORT,'Invalid sale') END;
 SELECT CASE WHEN NEW.kind='return' AND NOT EXISTS(SELECT 1 FROM movements s WHERE s.id=NEW.sale_id AND s.kind='sale' AND s.org_id=NEW.org_id AND s.product_id=NEW.product_id AND s.location_id=NEW.location_id AND NEW.delta>0 AND COALESCE((SELECT SUM(delta) FROM movements WHERE sale_id=s.id AND kind='return'),0)+NEW.delta<=-s.delta) THEN RAISE(ABORT,'Return exceeds original sale') END;
END;
CREATE TRIGGER movement_apply AFTER INSERT ON movements BEGIN
 INSERT INTO stock(product_id,location_id,quantity) VALUES(NEW.product_id,NEW.location_id,MAX(0,NEW.delta)) ON CONFLICT(product_id,location_id) DO UPDATE SET quantity=quantity+NEW.delta;
 SELECT CASE WHEN NEW.delta<0 AND NOT EXISTS(SELECT 1 FROM movements WHERE product_id=NEW.product_id AND location_id=NEW.location_id AND id<>NEW.id) THEN RAISE(ABORT,'Insufficient stock') END;
 UPDATE orders SET received=received+NEW.delta WHERE id=NEW.order_id AND NEW.kind='receipt';
END;
CREATE TRIGGER movement_no_update BEFORE UPDATE ON movements BEGIN SELECT RAISE(ABORT,'Inventory ledger is immutable'); END;
CREATE TRIGGER movement_no_delete BEFORE DELETE ON movements BEGIN SELECT RAISE(ABORT,'Inventory ledger is immutable'); END;
CREATE TRIGGER transfer_guard BEFORE INSERT ON transfers BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM locations WHERE id=NEW.destination_id AND org_id=NEW.org_id) THEN RAISE(ABORT,'Invalid destination') END;
END;
CREATE TRIGGER transfer_dispatch AFTER INSERT ON transfers BEGIN
 INSERT INTO movements VALUES(NEW.id||'-out',NEW.org_id,NEW.product_id,NEW.source_id,-NEW.quantity,'transfer_out','Stock dispatched',NULL,NULL,NEW.created_by,NEW.created_at,NEW.id||'-out',NEW.id);
END;
CREATE TRIGGER transfer_receive AFTER UPDATE OF status ON transfers WHEN OLD.status='transit' AND NEW.status='received' BEGIN
 INSERT INTO movements VALUES(NEW.id||'-in',NEW.org_id,NEW.product_id,NEW.destination_id,NEW.quantity,'transfer_in','Stock received',NULL,NULL,NEW.received_by,NEW.received_at,NEW.id||'-in',NEW.id);
END;
