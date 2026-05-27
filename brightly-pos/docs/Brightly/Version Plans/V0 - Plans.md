In reference to [[Brightly-POS - Version Overview]], this aims to break down plans for V0 of Brightly-POS.

```
V0 - Simple add-to-cart and checkout flow with controls to add items that the user wants, set prices for each items, and add categorization. there will also be a way to add a fix charge to the cart for tax, service charge, or any financial purposes. I will be allowing the user to pay with cash or card. Cash payments will be recorded without any reference ID, card payments on the other hand will require a reference ID. reference id will be optional. when a cart is checked-out, the system will automatically record the transaction amount, items ordered, extra fee, and transaction type. these recorded transaction can be exported based on the selected day.
```

# V0 Scope

V0 focuses on a simple and reliable add-to-cart and checkout workflow.

Users will be able to:

- Create categories
    
- Create items and assign prices
    
- Add items to cart
    
- Apply additional charges
    
- Process cash or card payments
    
- Record transactions locally
    
- View transaction history
    
- Export transaction reports
    

---

# Core Features

## Categories

Users can:

- Create categories
    
- Assign default colors
    
- Organize items visually
    

---

## Items

Users can:

- Create items
    
- Assign category
    
- Set default prices
    

Items are considered operational objects and may be safely deleted.

Historical transactions should not depend on live item records.

---

## Cart & Checkout

Users can:

- Add items to cart
    
- Adjust quantities
    
- Remove items from cart
    
- Apply adjustments
    
- Select payment method
    
- Complete checkout
    

Checkout finalizes and records the transaction locally.

---

## Adjustments

The system should support configurable adjustments.

Examples:

- Tax
    
- Service Charge
    
- Delivery Fee
    
- Miscellaneous Charges
    

Adjustment Types:

- Percentage-based
    
- Flat amount
    

Example Structure:

```json
[
  {
    "label": "Service Charge",
    "type": "percentage",
    "value": 10,
    "computedAmount": 52
  }
]
```

---

## Payment Methods

Supported payment methods:

```txt
- cash
- card
```

Users should be able to:

- Enable or disable payment methods
    
- Optionally provide reference IDs for card payments
    

Cash Payments:

- No reference ID required
    

Card Payments:

- Prompt for reference ID
    
- Reference ID remains optional
    

---

# Reporting

Included:

- Transaction table
    
- Date filtering
    
- Daily totals
    
- CSV export
    

Optional:

- XLSX export
    
- PDF export
    

Not Included:

- Forecasting
    
- Advanced analytics
    
- Complex dashboards
    

---

# UI Structure

Maximum of 3 primary views and should heavily reference [[Brightly-POS - UI Direction]] for UI Structure and follow the best practices based on the outlined tech-stack in [[Brightly-POS - Tech Stack]] 

## Order

Primary transaction screen where users:

- Add items to cart
    
- Modify quantities
    
- Apply adjustments
    
- Select payment method
    
- Complete checkout
    

---

## Settings

Configuration screen where users manage:

- Categories
    
- Items
    
- Adjustments
    
- Payment options
    

---

## Report

Reporting screen where users:

- View transactions
    
- Filter by date
    
- Export reports
    

---

# Database Structure

## Categories

```txt
- id
- name
- defaultColor
```

---

## Items

```txt
- id
- name
- price
- categoryId
```

---

## Transactions

```txt
- id
- transactionNumber
- createdAt
- paymentMethod
- referenceId
- subtotal
- adjustments
- paymentAmount
- changeAmount
- totalAmount
```

---

## TransactionItems

```txt
- id
- transactionId
- itemId
- itemNameSnapshot
- itemPriceSnapshot
- quantity
- lineTotal
```

---

# Snapshot Philosophy

Completed transactions should preserve historical accuracy even if live item data changes later.

Example:

- Latte originally sold at ₱150
    
- Latte later changed to ₱180
    
- Historical transactions should still display ₱150
    

For this reason, transaction items store snapshots of:

- Item name
    
- Item price
    
- Quantity
    

instead of depending on live item data.

---

# Data Philosophy

## Operational Data

Live editable system data.

Examples:

- Items
    
- Categories
    
- Settings
    

Operational data should remain lightweight and manageable.

---

## Historical Data

Immutable completed transaction records.

Examples:

- Transactions
    
- Transaction item snapshots
    

Historical data should remain accurate permanently.

---

# Operational Constraints

To preserve simplicity and reliability:

- Completed transactions should not be editable
    
- Transactions are finalized upon checkout
    
- V0 is designed for single-device operation
    
- Internet connection should not be required for daily usage
    
- Complex operational flows should be avoided
    

---

# Architecture Direction

## Frontend

- React
    
- Vite
    
- Tailwind CSS
    

## State Management

- Zustand
    

## Local Storage

- IndexedDB
    
- Dexie
    

## Architecture Style

- Local-first
    
- Tablet-first UI
    
- Responsive cross-platform design
    

---

# Future Versions

## V1

- Bundled orders
    
- Add-ons
    
- Discounts
    
- Dashboard metrics
    
- Out-of-stock handling
    

## V2

- User logins
    
- Employee tracking
    
- Online synchronization
    
- Centralized reporting dashboard