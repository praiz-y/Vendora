Vendora
# Multi-Vendor E-Commerce Marketplace
# Master Product & Technical Project Brief

## 1. Project Overview

Vendora is a full-stack, multi-vendor e-commerce marketplace being developed as a portfolio project.

The platform allows multiple independent sellers to create stores and sell products to buyers through one centralized marketplace.

Unlike a simple single-store e-commerce website, Vendora is designed around a multi-vendor marketplace model, where:

A buyer creates one account.
A buyer can browse products from multiple sellers.
A buyer can add products from different sellers to one cart.
A buyer completes one checkout.
The system processes one payment for the checkout.
The system creates one parent order.
The parent order is internally split into separate seller-specific orders.
Each seller manages only their portion of the order.
The buyer sees the overall order as one purchase while the platform maintains seller-level fulfillment internally.

Vendora supports both physical and digital products in V1, while keeping the initial product system intentionally simple.

The project is designed to demonstrate the architecture and engineering challenges involved in building a realistic marketplace rather than simply creating a basic CRUD e-commerce application.

2. Primary Objective

The primary objective of Vendora is to build a realistic, production-style multi-vendor marketplace that demonstrates strong full-stack engineering skills.

The project should demonstrate competence in:

Modern frontend architecture
Backend API design
Relational database modeling
Authentication and authorization
Multi-vendor marketplace architecture
Product management
Seller onboarding
Product moderation
Shopping cart systems
Multi-vendor checkout
Payment processing
Order management
Digital product delivery
File/image management
Reviews and moderation
Admin management
Security
Testing
Performance
SEO
Deployment

The goal is not to build every possible marketplace feature immediately.

Instead, the goal is to create a strong, coherent V1 that feels like a real marketplace and has an architecture that can be extended later.

3. Product Vision

The long-term vision for Vendora is:

A centralized online marketplace where buyers can discover products from multiple independent sellers, purchase from multiple stores through one seamless checkout, and manage their entire shopping experience from one account.

For sellers, Vendora provides the infrastructure needed to:

Create a store
List products
Manage inventory
Receive orders
Process orders
Track performance
Build a reputation through reviews

For buyers, Vendora provides:

A unified marketplace
Product discovery
Multi-vendor shopping
One checkout
Order tracking
Digital product access
Reviews
Wishlist functionality

For administrators, Vendora provides:

Marketplace oversight
Seller verification
Product moderation
Category management
User management
Report management
Refund management
Platform monitoring
4. The Core Marketplace Model

Vendora has three primary types of platform participants.

                    VENDORA
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
      BUYERS         SELLERS         ADMINS
        │              │              │
        │              │              │
        ▼              ▼              ▼
     Purchase       Manage         Manage
     Products       Stores         Platform
     Products       Products       Users
     Orders         Orders         Sellers
     Reviews        Analytics      Products
     Wishlist       Reviews        Reports

These are not necessarily mutually exclusive identities.

A user can be:

Buyer
+
Approved Seller

and potentially:

Buyer
+
Approved Seller
+
Admin privilege

The important distinction is that seller access is a capability, not a replacement for the user's buyer identity.

5. User Types
5.1 Buyer

Every registered user begins as a buyer.

A buyer can:

Create an account
Log in
Manage their profile
Manage addresses
Browse products
Search products
Filter products
View stores
Add products to cart
Add products to wishlist
Checkout
Make payments
View orders
Track order progress
Download purchased digital products
Leave reviews after completing purchases
Report products
Request basic refunds where applicable

A buyer can later become a seller through the Become a Seller process.

5.2 Seller

A seller is a normal user who has successfully completed the seller onboarding process and has an approved, active store.

A seller can:

Create/manage their store
Upload products
Edit products
Submit products for review
View product approval status
Manage inventory
Manage seller orders
Update fulfillment status
View reviews
View analytics
Manage their seller profile

A seller is still also a buyer.

For example:

User A
├── Can buy products
├── Can manage personal orders
└── Can manage Store A
      ├── Products
      ├── Seller Orders
      └── Analytics

If the seller's store is suspended, they lose seller functionality but should still retain normal buyer functionality.

5.3 Admin

Admins manage the platform.

Admins can:

Review seller applications
Approve sellers
Reject sellers
Manage seller status
Review products
Approve products
Reject products
Manage categories
Manage users
Suspend users
Manage stores
Suspend sellers/stores
Review product reports
Manage refunds
View audit logs
Monitor platform activity

Admin permissions are distinct from seller capabilities.

6. Seller Onboarding Model

Vendora will not use separate buyer and seller registration.

Instead:

User registers
       ↓
Buyer account created
       ↓
User uses Vendora normally
       ↓
User selects "Become a Seller"
       ↓
Seller application submitted
       ↓
Admin reviews application
       ↓
Approved
       ↓
Seller Store becomes active

This model provides a smoother user experience because users do not need to maintain separate accounts.

It also makes the platform architecture cleaner because one account can support both buying and selling.

7. Seller Store

Each approved seller has a store.

The store contains:

Store name
Store description
Store logo
Store banner
Business category
Phone number
Email
Location
Optional business information

The store becomes the seller's public identity on Vendora.

A store can contain:

Store
├── Store Information
├── Products
├── Reviews
└── Seller Rating

The store's overall rating can be calculated from product reviews associated with the seller.

8. Seller Application Process

The seller application workflow is:

User
  ↓
Become a Seller
  ↓
Submit Application
  ↓
Pending
  │
  ├── Approved → Store becomes active
  │
  └── Rejected → User can edit and resubmit

Seller applications are reviewed manually by administrators.

If an application is rejected:

The user can edit the application.
The user can resubmit the same application.
The rejection should retain an appropriate reason for transparency.

If a seller is later suspended:

Their store becomes unavailable.
Their products become unavailable to new buyers.
Historical order data remains intact.
Existing buyer purchases remain intact.
9. Product Model

V1 supports simple products only.

This means a product does not currently have variants such as:

Size
Color
Storage
Material

For example:

T-Shirt

is one product with one price and one inventory count.

Variants are intentionally deferred to V2.

Future V2 could support:

T-Shirt
├── Small / Red
├── Medium / Red
├── Large / Red
├── Small / Blue
└── ...

This keeps V1 significantly simpler while allowing the architecture to evolve later.

10. Product Types

Vendora supports two primary product types in V1.

Physical Products

Examples:

Clothing
Electronics
Accessories
Food products
Household items

Physical products have:

Price
Stock
Shipping information
Seller
Category
Images
Digital Products

Examples:

E-books
Templates
Digital assets
Design resources
Software files
Other downloadable products

Digital products do not require physical shipping.

They instead provide buyers with a digital entitlement after successful purchase.

11. Product Lifecycle

Products follow a moderation lifecycle.

Draft
  ↓
Pending Review
  ↓
Approved
  ↓
Public

If rejected:

Pending Review
  ↓
Rejected
  ↓
Seller edits
  ↓
Pending Review

Products can eventually be:

Archived

The product statuses are:

Draft
Pending Review
Approved
Rejected
Archived

Only approved products should be publicly available for purchase.

12. Product Moderation

Sellers cannot immediately publish products.

The flow is:

Seller creates product
        ↓
Draft
        ↓
Seller submits product
        ↓
Pending Review
        ↓
Admin reviews
        │
        ├── Approve → Public
        │
        └── Reject → Seller edits/resubmits

This ensures that Vendora maintains marketplace quality and allows administrators to control what appears publicly.

13. Product Inventory

Physical products have inventory.

When stock reaches zero, the product automatically displays:

Out of Stock

The product should remain visible unless its status or availability requires otherwise.

The buyer should not be able to purchase unavailable inventory.

Inventory must be validated:

When adding to cart where appropriate
During checkout
Immediately before order creation/payment
During stock reservation

The entire cart must be validated again at checkout.

14. Shipping

Vendora's V1 uses simple seller-defined shipping rules.

Each seller can choose:

Free Shipping

or:

Fixed Shipping Fee

Shipping is handled at the seller level.

This is important because one checkout may contain products from multiple sellers.

Example:

Seller A
Products: ₦20,000
Shipping: Free

Seller B
Products: ₦15,000
Shipping: ₦2,000

Seller C
Products: ₦10,000
Shipping: ₦1,500

The buyer still completes one checkout.

The system calculates the appropriate total while maintaining seller-level shipping information internally.

More advanced shipping systems are deferred.

15. One Checkout Architecture

Vendora uses one checkout for multi-vendor purchases.

A buyer can add products from multiple sellers:

Cart
├── Product A → Seller A
├── Product B → Seller B
└── Product C → Seller C

The buyer completes:

One Checkout
       ↓
One Payment
       ↓
One Parent Order

Internally, the system creates:

Order #1001
│
├── SellerOrder #A
│     ├── Product A
│     └── Product C
│
└── SellerOrder #B
      └── Product B

This gives buyers a simple experience while allowing sellers to independently fulfill their own portions.

16. Multi-Vendor Order Architecture

The core relationship is:

Order
  │
  ├── SellerOrder
  │      ├── OrderItem
  │      └── OrderItem
  │
  └── SellerOrder
         └── OrderItem

The parent Order represents the buyer's complete checkout.

Each SellerOrder represents one seller's portion of that checkout.

This allows:

Seller A → Shipped
Seller B → Processing
Seller C → Delivered

while the buyer still sees these as part of one overall purchase.

The system maintains separate status enums for:

Parent Order
Seller Order

This allows partial fulfillment.

17. Order Status

The order lifecycle includes:

Pending Payment
Paid
Processing
Shipped
Delivered
Cancelled

Seller-specific fulfillment may progress independently.

The parent order status is derived from the state of its seller orders where appropriate.

The exact status-transition rules will be implemented during order management.

18. Payment System

Vendora intends to support real payments in V1.

The initial approach is:

Real Payment Integration

If a real payment provider cannot be integrated during development, a simulated payment system can temporarily be used for development and demonstration.

The architecture should still be designed around:

Payment
├── Payment Attempts
├── Payment Status
└── Order Relationship

The system must verify payment before considering an order successfully paid.

The payment architecture should eventually support:

Successful payment
Failed payment
Pending payment
Payment verification
Payment attempts
Payment callbacks/webhooks where applicable
Refunds
19. Cart

Vendora has a persistent buyer cart.

A cart can contain products from multiple sellers.

Example:

Cart
├── Seller A
│     ├── Product 1
│     └── Product 2
│
├── Seller B
│     └── Product 3
│
└── Seller C
      └── Product 4

Before checkout, the system revalidates the entire cart.

Validation includes:

Product still exists
Product is approved
Product is available
Product is not archived
Product is not suspended
Price is current
Stock is sufficient
Seller/store is active

The backend is always the final authority.

20. Wishlist

Buyers can save products to a wishlist.

Features include:

Add product
Remove product
View wishlist
Move product to cart

The wishlist should respect product availability.

21. Digital Products

Digital products are handled differently from physical products.

After a successful purchase:

Payment Successful
       ↓
Digital Entitlement Created
       ↓
Buyer Gains Access
       ↓
Buyer Can Download Product

The system must ensure that only authorized buyers can access purchased digital products.

Digital products support versioning.

If a seller uploads a new version:

Version 1
    ↓
Version 2
    ↓
Version 3

Existing buyers automatically receive access to the latest version.

This means digital entitlements resolve dynamically to the latest available version rather than permanently locking buyers to the version they purchased.

Basic digital products are supported in V1.

More advanced licensing systems are deferred.

22. Product Images & File Storage

Vendora uses Cloudinary for image storage.

Product images are stored externally rather than directly inside PostgreSQL.

Cloudinary is intended for:

Product images
Store logos
Store banners
User avatars where applicable

The database stores metadata and URLs/references rather than raw image files.

Digital product files require more careful access control and should not simply be exposed as publicly accessible files.

23. Reviews

Buyers can review products they have purchased.

Reviews are allowed only after the order is delivered/completed.

The basic review model includes:

Rating
Review content
Product
Buyer
Purchase relationship

The product rating is calculated from its reviews.

Store ratings can be calculated from the average ratings of products associated with the seller.

The platform should prevent users from falsely reviewing products they have not purchased.

24. Product Reports

Users can report products.

A user can have:

One active report per user per product.

This prevents users from creating duplicate active reports against the same product.

Reports can be reviewed by administrators.

Potential report lifecycle:

Submitted
   ↓
Under Review
   ↓
Resolved

The exact report-resolution system will be implemented later.

25. Refunds

Vendora supports basic refunds in V1.

Refunds are managed manually by administrators initially.

The general flow is:

Buyer
   ↓
Refund Request
   ↓
Admin Review
   ↓
Approve / Reject
   ↓
Payment Refund

More advanced automated refund workflows can be introduced later.

26. Seller Dashboard

Every approved seller receives a seller dashboard.

The dashboard contains:

Dashboard
Products
Orders
Analytics
Reviews
Profile
Dashboard

Provides an overview of seller activity.

Products

Allows sellers to:

View products
Create products
Edit products
View product statuses
Submit products for review
Archive products
Orders

Allows sellers to manage their own seller-specific orders.

Analytics

Initial analytics include:

Product views
Sales
Revenue
Reviews

Allows sellers to monitor reviews associated with their products.

Profile

Allows sellers to manage store information.

Payouts

Payouts are future scope and are not required for V1.

27. Admin System

The admin system is responsible for maintaining marketplace quality.

Admin capabilities include:

Seller Management
Review seller applications
Approve sellers
Reject sellers
Manage seller status
Product Management
Review submitted products
Approve products
Reject products
Manage product lifecycle
Category Management

Categories are manually managed by admins.

Categories are inserted and managed through the database/admin functionality rather than allowing arbitrary sellers to create marketplace-wide categories.

User Management

Admins can:

View users
Manage account status
Suspend accounts where necessary
Reports

Admins can:

View reports
Investigate reports
Resolve reports
Refunds

Admins can manually manage refund requests.

Audit Logs

Important administrative actions should be recorded for accountability.

28. Categories

Vendora uses an admin-controlled category system.

Categories are managed by administrators.

Sellers select from existing categories when creating products.

Sellers do not freely create public marketplace categories.

This prevents category fragmentation and inconsistent marketplace organization.

29. Authentication

Vendora uses:

JWT access tokens
Database-backed refresh tokens
HttpOnly refresh cookies

The authentication architecture is designed around:

Short-lived Access Token
+
Long-lived Refresh Session

The refresh token should be stored securely and revocable.

Authentication supports:

Registration
Login
Logout
Session refresh
Session invalidation
Forgot password
Reset password
Change password
30. Authorization

Vendora separates:

Authentication

from:

Authorization

Authentication answers:

Who are you?

Authorization answers:

What are you allowed to do?

The system needs to support:

isAuthenticated()
isAdmin()
hasActiveSellerCapability()
ownsResource()

Seller access is determined by an approved/active seller capability.

Admin access is determined by administrative privileges.

Resource ownership is always checked server-side.

31. User Profile

Users have:

First name
Last name
Unique username/display name
Email
Phone
Profile information
Addresses

Users can manage their own profile.

They cannot modify protected fields such as:

User ID
Admin privileges
Seller approval status
Account status
32. Address Management

Users can manage their addresses.

Features include:

Add address
Edit address
Delete/archive address
Set default address

Users can only access their own addresses.

Addresses are used during physical-product checkout.

33. Notifications

Vendora has a notification system.

Notifications may eventually cover:

Seller application updates
Product approval
Product rejection
Order updates
Payment status
Shipping updates
Delivery
Refund updates
Reviews

The initial notification architecture exists in the database and will be expanded as features are implemented.

34. Audit Logs

Important actions should be auditable.

Examples:

Admin approved seller
Admin rejected seller
Admin approved product
Admin rejected product
Admin suspended user
Admin suspended store
Admin processed refund

Audit logs help maintain accountability and provide a history of important administrative actions.

35. MVP Definition

Vendora's MVP should be considered the smallest version that demonstrates a complete marketplace lifecycle.

The MVP includes:

User
Registration
Login
Authentication
Profile
Addresses
Seller
Become a Seller
Seller application
Admin approval
Store creation
Store management
Products
Product creation
Product editing
Product images
Physical products
Digital products
Categories
Product moderation
Product lifecycle
Inventory
Marketplace
Homepage
Product browsing
Search
Filtering
Product detail pages
Store pages
Shopping
Cart
Wishlist
Multi-vendor cart
Checkout
One checkout
Multi-vendor order splitting
Shipping calculation
Payment
Order creation
Orders
Buyer order history
Seller order management
Order status
Multi-vendor fulfillment
Digital
Digital entitlements
Secure downloads
Version updates
Trust
Reviews
Product reports
Administration
Seller approval
Product moderation
Categories
User management
Reports
Basic refunds

This is the core V1 marketplace experience.

36. Features Explicitly Deferred

The following are not required for the initial V1.

Product Variants

Deferred to V2.

Examples:

Sizes
Colors
Multiple configurations
Seller Payouts

Deferred.

The marketplace may track seller revenue in V1 without implementing a complete automated payout system.

Advanced Shipping

Deferred.

V1 uses:

Free shipping
Fixed shipping fee

Future versions could support:

Location-based shipping
Weight-based shipping
Delivery zones
Multiple shipping providers
Real-time shipping rates
Advanced Refund Automation

V1 uses a basic/manual refund workflow.

Advanced Digital Licensing

Deferred.

V1 focuses on:

Secure access
Download authorization
Latest-version access
Advanced Seller Verification

V1 uses manual admin approval.

Advanced Notifications

Email and push notifications can be expanded later.

37. Technology Stack

The finalized primary stack is:

Frontend

Next.js

Using:

App Router
TypeScript
Tailwind CSS

Next.js was selected over a standalone React/Vite frontend because Vendora benefits from:

Server-side rendering capabilities
SEO
Routing
Server components where appropriate
Better production architecture
Integrated full-stack frontend experience
Backend

Express.js

Using:

TypeScript
REST API architecture
Zod validation
Centralized error handling

The backend remains separate from the Next.js application.

Architecture:

Next.js Frontend
       │
       │ HTTP / REST
       ▼
Express API
       │
       ▼
Prisma ORM
       │
       ▼
PostgreSQL
Database

PostgreSQL

PostgreSQL was selected because Vendora has complex relational requirements:

Users
Stores
Products
Orders
SellerOrders
OrderItems
Payments
Reviews
Reports
Digital Entitlements

A relational database is well suited to enforcing these relationships and maintaining transactional integrity.

ORM

Prisma 6.x

Prisma provides:

Type-safe database access
Migrations
Schema management
Relational queries

The project is staying on the currently verified Prisma 6.x version during development.

Authentication

JWT

The authentication system uses:

Short-lived JWT access tokens
Database-backed refresh tokens
HttpOnly cookies
Image Storage

Cloudinary

Used for:

Product images
Store logos
Store banners
Other appropriate public media
Payment

Real payment integration is planned.

If real integration cannot be completed initially, payment simulation can be used during development.

The architecture should still model real payment workflows.

38. High-Level Architecture

Vendora follows a layered architecture.

                    CLIENT
                       │
                       ▼
              Next.js Frontend
                       │
                       │ REST API
                       ▼
                Express Backend
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
       Routes      Middleware    Services
                       │
                       ▼
                   Prisma ORM
                       │
                       ▼
                  PostgreSQL

External integrations:

                    Express API
                   /     |      \
                  /      |       \
                 ▼       ▼        ▼
           Cloudinary  Payment   Email
39. Database Architecture

The database is already designed around the core marketplace domain.

Major entities include:

User
SellerApplication
Store
Category
Product
ProductImage
DigitalProductVersion
ProductView
Cart
CartItem
Wishlist
WishlistItem
Order
SellerOrder
OrderItem
Payment
PaymentAttempt
StockReservation
Refund
DigitalEntitlement
Review
ProductReport
Notification
AuditLog

The central marketplace relationship is:

User
 │
 ├── Cart
 ├── Wishlist
 ├── Orders
 ├── Reviews
 └── Seller Application
       │
       ▼
     Store
       │
       ▼
    Products

And:

Order
 │
 ├── SellerOrder
 │      └── OrderItems
 │
 └── SellerOrder
        └── OrderItems

This architecture supports multi-vendor checkout while preserving seller-level order management.

40. Product Lifecycle

The product lifecycle is:

Create
  ↓
Draft
  ↓
Submit
  ↓
Pending Review
  ↓
Admin Review
  │
  ├── Approved → Public
  │
  └── Rejected
          ↓
       Edit
          ↓
    Resubmit
          ↓
   Pending Review

Eventually:

Approved
   ↓
Archived
41. Marketplace Lifecycle

The overall user journey is:

User Registers
      ↓
Browses Marketplace
      ↓
Views Products
      ↓
Adds Products From Multiple Sellers
      ↓
One Cart
      ↓
One Checkout
      ↓
One Payment
      ↓
One Parent Order
      ↓
Multiple Seller Orders
      ↓
Each Seller Fulfills Their Order
      ↓
Buyer Receives Products
      ↓
Buyer Reviews Products

For digital products:

Payment Confirmed
      ↓
Digital Entitlement
      ↓
Secure Access
      ↓
Latest Version Available
42. Development Roadmap

The project is being developed incrementally.

Phase 0
Project Foundation
       ↓
Phase 1
Database + Core Backend
       ↓
Phase 2
Authentication + User Accounts
       ↓
Phase 3
Seller Onboarding + Stores
       ↓
Phase 4
Categories + Products
       ↓
Phase 5
Marketplace + Discovery
       ↓
Phase 6
Cart + Wishlist
       ↓
Phase 7
Multi-Vendor Checkout + Payments
       ↓
Phase 8
Orders + Fulfillment
       ↓
Phase 9
Digital Products
       ↓
Phase 10
Reviews + Reports
       ↓
Phase 11
Seller Dashboard + Analytics
       ↓
Phase 12
Admin Dashboard
       ↓
Phase 13
Notifications
       ↓
Phase 14
Refunds
       ↓
Phase 15
Security + Testing
       ↓
Phase 16
UI/UX + Performance
       ↓
Phase 17
SEO + Production Readiness
       ↓
Phase 18
Deployment + Launch

Current status:

Phase 0  ✅ Complete
Phase 1  ✅ Complete
Phase 2  🔜 Next
43. Current Project Foundation

The foundation has already been established and verified.

Phase 0 completed:

Monorepo
Next.js frontend
Express backend
TypeScript
Tailwind
API response envelope
Centralized errors
CORS
Health endpoint
PostgreSQL connectivity
Prisma connectivity
Development scripts
Type checks
Lint
Production builds

Phase 1 completed:

Full domain schema
Seller/store architecture
Product architecture
Cart/wishlist
Multi-vendor order architecture
Payment models
Refund models
Digital entitlement architecture
Reviews
Reports
Notifications
Audit logs
Seed data
Database integrity testing

The project has already passed 28 relationship and integrity checks against seeded data.

44. Important Architectural Decisions

Several decisions are considered finalized.

One Account

Users do not have separate buyer and seller accounts.

One User
    ↓
Buyer
    +
Seller Capability
Seller as Capability

Seller status is not treated as a replacement for buyer identity.

One Checkout

Products from multiple sellers can be purchased in one checkout.

Parent + Seller Orders

One checkout creates one parent order with separate seller orders.

Simple Products

V1 does not support product variants.

Seller Shipping

Sellers choose:

Free shipping
Fixed shipping fee
Manual Seller Approval

Admins approve seller applications.

Manual Product Approval

Admins approve products before public visibility.

Digital Versioning

Existing digital buyers automatically access the latest version.

NGN

The marketplace uses:

Nigerian Naira (₦ / NGN)

as the primary currency.

Admin Categories

Marketplace categories are managed by administrators.

Basic Refunds

Refunds are supported but kept simple in V1.

Payouts Deferred

Automated seller payouts are deferred.

45. What Makes Vendora a Strong Portfolio Project

Vendora is intentionally more complex than a typical portfolio CRUD project.

The project demonstrates understanding of:

Relational Modeling

The system contains deeply connected entities with transactional relationships.

Multi-Tenancy Concepts

Sellers must only access their own marketplace data.

Authorization

Different users have different capabilities.

Marketplace Architecture

Multiple sellers share one platform.

Multi-Vendor Checkout

One payment creates multiple seller-specific fulfillment units.

Transactional Integrity

Orders, payments, inventory, and stock reservations must remain consistent.

Authentication

Secure session management is required.

Product Moderation

Products cannot automatically become public.

Digital Commerce

Digital products require entitlement and access-control logic.

Real-World Order Management

Orders may be partially fulfilled across multiple sellers.

Payment Systems

The system must handle payment success, failure, verification, and refunds.

Security

The platform handles:

User accounts
Payments
Private digital products
Seller data
Administrative actions
Scalability

The architecture is designed to support future features without requiring a complete rewrite.

46. The End Goal

When Vendora is complete, the experience should look roughly like this:

                    VENDORA
                       │
                       ▼
                 Marketplace
                       │
          ┌────────────┼────────────┐
          │            │            │
       Seller A      Seller B     Seller C
          │            │            │
       Products      Products     Products
          │            │            │
          └────────────┼────────────┘
                       │
                       ▼
                     Buyer
                       │
                       ▼
                     Cart
                       │
                       ▼
                   One Checkout
                       │
                       ▼
                    Payment
                       │
                       ▼
                  Parent Order
                  /     |     \
                 /      |      \
                ▼       ▼       ▼
          SellerOrder A B       C
                │       │       │
                ▼       ▼       ▼
             Fulfill Fulfill Fulfill
                │       │       │
                └───────┼───────┘
                        ▼
                    Completed
                        │
                        ▼
                      Review

The finished Vendora project should feel like a real, coherent marketplace product, not a collection of disconnected features.

The most important characteristic of the project is the relationship between all the systems:

Authentication enables accounts. Accounts enable seller onboarding. Seller onboarding enables stores. Stores contain products. Products enter the marketplace through moderation. Buyers discover products and add items from multiple sellers to one cart. One checkout creates one payment and one parent order, which is split into seller-specific orders. Sellers fulfill their individual orders while buyers maintain a unified purchase experience. Completed purchases unlock reviews and digital entitlements, while admins oversee the marketplace and maintain platform integrity.

That is the core of Vendora.