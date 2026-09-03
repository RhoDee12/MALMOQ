-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "canManageProducts" BOOLEAN NOT NULL DEFAULT false,
    "canManageInventory" BOOLEAN NOT NULL DEFAULT true,
    "canManageOrders" BOOLEAN NOT NULL DEFAULT true,
    "canRegisterSales" BOOLEAN NOT NULL DEFAULT true,
    "canViewCustomers" BOOLEAN NOT NULL DEFAULT false,
    "canEditConfirmedOrders" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("canManageInventory", "canManageOrders", "canManageProducts", "canRegisterSales", "canViewCustomers", "createdAt", "firstName", "id", "lastName", "phone", "userId") SELECT "canManageInventory", "canManageOrders", "canManageProducts", "canRegisterSales", "canViewCustomers", "createdAt", "firstName", "id", "lastName", "phone", "userId" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNumber" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "deliveryMode" TEXT NOT NULL,
    "address" TEXT,
    "reference" TEXT,
    "deliveryCost" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" DATETIME,
    "lockedById" INTEGER,
    "paymentMethodId" INTEGER NOT NULL,
    "subtotal" REAL NOT NULL,
    "discountTotal" REAL NOT NULL DEFAULT 0,
    "taxableBase" REAL NOT NULL,
    "igvPercent" REAL NOT NULL,
    "igvAmount" REAL NOT NULL,
    "commissionPercent" REAL NOT NULL DEFAULT 0,
    "commissionAmount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("address", "commissionAmount", "commissionPercent", "createdAt", "deliveryCost", "deliveryMode", "discountTotal", "id", "igvAmount", "igvPercent", "orderNumber", "paymentMethodId", "reference", "status", "subtotal", "taxableBase", "total", "updatedAt", "userId") SELECT "address", "commissionAmount", "commissionPercent", "createdAt", "deliveryCost", "deliveryMode", "discountTotal", "id", "igvAmount", "igvPercent", "orderNumber", "paymentMethodId", "reference", "status", "subtotal", "taxableBase", "total", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
