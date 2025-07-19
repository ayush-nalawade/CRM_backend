# CRM API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require authentication. Include the JWT token in cookies (automatically handled by the browser) or use the Authorization header.

---

## 🔐 Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "role": "Admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Admin"
  }
}
```

### 2. Login User
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Admin"
    }
  }
}
```

### 3. Refresh Token
**POST** `/auth/refresh-token`

**Request Body:** (No body required, uses refresh token from cookies)

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully"
}
```

---

## 👥 Customer Management Endpoints

### 1. Get All Customers
**GET** `/customers`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search by name, phone, or email
- `customerType` (optional): Filter by type (Regular, VIP, Wholesale)
- `sortBy` (optional): Sort field (id, name, phone, email, customerType, totalSpent, totalPurchases, createdAt, updatedAt)
- `sortOrder` (optional): Sort order (ASC, DESC)

**Example:**
```
GET /customers?page=1&limit=10&search=john&customerType=VIP&sortBy=name&sortOrder=ASC
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": 1,
        "name": "John Doe",
        "phone": "+1234567890",
        "email": "john@example.com",
        "address": "123 Main St",
        "birthday": "1990-01-01",
        "customerType": "VIP",
        "notes": "Important customer",
        "totalPurchases": 15,
        "totalSpent": 2500.00,
        "lastPurchaseDate": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  },
  "meta": {
    "requestId": "req_1234567890_abc123",
    "responseTime": "45ms",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get Customer by ID
**GET** `/customers/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 1,
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com",
      "address": "123 Main St",
      "birthday": "1990-01-01",
      "customerType": "VIP",
      "notes": "Important customer",
      "totalPurchases": 15,
      "totalSpent": 2500.00,
      "lastPurchaseDate": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 3. Create Customer
**POST** `/customers`

**Request Body:**
```json
{
  "name": "Jane Smith",
  "phone": "+1987654321",
  "email": "jane@example.com",
  "address": "456 Oak Ave",
  "birthday": "1985-05-15",
  "customerType": "Regular",
  "notes": "New customer"
}
```

**Required Fields:**
- `name` (string, 1-255 characters)
- `phone` (string, unique, valid phone format)

**Optional Fields:**
- `email` (string, unique, valid email format)
- `address` (string, max 1000 characters)
- `birthday` (date, must be in the past)
- `customerType` (enum: Regular, VIP, Wholesale)
- `notes` (string, max 2000 characters)

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 2,
      "name": "Jane Smith",
      "phone": "+1987654321",
      "email": "jane@example.com",
      "address": "456 Oak Ave",
      "birthday": "1985-05-15",
      "customerType": "Regular",
      "notes": "New customer",
      "totalPurchases": 0,
      "totalSpent": 0.00,
      "lastPurchaseDate": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "Customer created successfully"
}
```

### 4. Update Customer
**PUT** `/customers/:id`

**Request Body:**
```json
{
  "name": "Jane Smith Updated",
  "phone": "+1987654321",
  "email": "jane.updated@example.com",
  "address": "789 Pine St",
  "birthday": "1985-05-15",
  "customerType": "VIP",
  "notes": "Updated customer information"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 2,
      "name": "Jane Smith Updated",
      "phone": "+1987654321",
      "email": "jane.updated@example.com",
      "address": "789 Pine St",
      "birthday": "1985-05-15",
      "customerType": "VIP",
      "notes": "Updated customer information",
      "totalPurchases": 0,
      "totalSpent": 0.00,
      "lastPurchaseDate": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    }
  },
  "message": "Customer updated successfully"
}
```

### 5. Delete Customer (Soft Delete)
**DELETE** `/customers/:id`

**Response:**
```json
{
  "success": true,
  "message": "Customer deleted successfully"
}
```

### 6. Get Customer Purchase History
**GET** `/customers/:customerId/purchases`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 1,
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com"
    },
    "purchases": [
      {
        "id": 1,
        "purchaseDate": "2024-01-15T10:30:00.000Z",
        "totalAmount": 150.00,
        "paymentMethod": "Credit Card",
        "status": "Completed",
        "items": [
          {
            "id": 1,
            "productName": "iPhone 15",
            "variantName": "128GB Black",
            "quantity": 1,
            "unitPrice": 150.00,
            "subtotal": 150.00
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 10
    }
  }
}
```

### 7. Get Customer Statistics
**GET** `/customers/stats/overview`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCustomers": 150,
    "activeCustomers": 145,
    "inactiveCustomers": 5,
    "customerTypes": [
      {
        "customerType": "Regular",
        "count": 100,
        "totalSpent": 15000.00,
        "averageSpent": 150.00
      },
      {
        "customerType": "VIP",
        "count": 35,
        "totalSpent": 25000.00,
        "averageSpent": 714.29
      },
      {
        "customerType": "Wholesale",
        "count": 15,
        "totalSpent": 50000.00,
        "averageSpent": 3333.33
      }
    ],
    "recentActivity": {
      "newCustomersThisMonth": 25,
      "customersWithPurchasesThisMonth": 80
    }
  }
}
```

### 8. Get Customer Types
**GET** `/customers/types/list`

**Response:**
```json
{
  "success": true,
  "data": {
    "customerTypes": ["Regular", "VIP", "Wholesale"]
  }
}
```

### 9. Export Customers to CSV
**GET** `/customers/export/csv`

**Query Parameters:**
- `customerType` (optional): Filter by customer type
- `includeInactive` (optional): Include inactive customers (true/false)

**Response:** CSV file download

---

## 📦 Product Management Endpoints

### 1. Get All Products
**GET** `/products`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search by name, description, or brand
- `category` (optional): Filter by category
- `brand` (optional): Filter by brand
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `sortBy` (optional): Sort field (id, name, category, base_price, brand, createdAt, updatedAt)
- `sortOrder` (optional): Sort order (ASC, DESC)

**Example:**
```
GET /products?page=1&limit=10&search=iphone&category=Electronics&minPrice=100&maxPrice=1000&sortBy=base_price&sortOrder=ASC
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "iPhone 15",
        "description": "Latest iPhone model",
        "category": "Electronics",
        "brand": "Apple",
        "base_price": 799.00,
        "sku": "IPH15-001",
        "image_url": "https://example.com/iphone15.jpg",
        "isActive": true,
        "variants": [
          {
            "id": 1,
            "name": "128GB Black",
            "price": 799.00,
            "stock": 50,
            "sku": "IPH15-001-BLK-128"
          }
        ],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

### 2. Get Product by ID
**GET** `/products/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "iPhone 15",
      "description": "Latest iPhone model",
      "category": "Electronics",
      "brand": "Apple",
      "base_price": 799.00,
      "sku": "IPH15-001",
      "image_url": "https://example.com/iphone15.jpg",
      "isActive": true,
      "variants": [
        {
          "id": 1,
          "name": "128GB Black",
          "price": 799.00,
          "stock": 50,
          "sku": "IPH15-001-BLK-128"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 3. Create Product
**POST** `/products`

**Request Body:**
```json
{
  "name": "MacBook Pro",
  "description": "Professional laptop for developers",
  "category": "Electronics",
  "brand": "Apple",
  "base_price": 1999.00,
  "sku": "MBP-001",
  "image_url": "https://example.com/macbook.jpg",
  "variants": [
    {
      "name": "14-inch M3 Pro",
      "price": 1999.00,
      "stock": 25,
      "sku": "MBP-001-14-M3"
    },
    {
      "name": "16-inch M3 Max",
      "price": 3499.00,
      "stock": 15,
      "sku": "MBP-001-16-M3"
    }
  ]
}
```

**Required Fields:**
- `name` (string, 1-255 characters)
- `category` (string, 1-100 characters)
- `brand` (string, 1-100 characters)
- `base_price` (number, positive)
- `sku` (string, unique, 1-50 characters)

**Optional Fields:**
- `description` (string, max 1000 characters)
- `image_url` (string, valid URL)
- `variants` (array of variant objects)

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 2,
      "name": "MacBook Pro",
      "description": "Professional laptop for developers",
      "category": "Electronics",
      "brand": "Apple",
      "base_price": 1999.00,
      "sku": "MBP-001",
      "image_url": "https://example.com/macbook.jpg",
      "isActive": true,
      "variants": [
        {
          "id": 2,
          "name": "14-inch M3 Pro",
          "price": 1999.00,
          "stock": 25,
          "sku": "MBP-001-14-M3"
        },
        {
          "id": 3,
          "name": "16-inch M3 Max",
          "price": 3499.00,
          "stock": 15,
          "sku": "MBP-001-16-M3"
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "Product created successfully"
}
```

### 4. Update Product
**PUT** `/products/:id`

**Request Body:**
```json
{
  "name": "MacBook Pro Updated",
  "description": "Updated description",
  "category": "Electronics",
  "brand": "Apple",
  "base_price": 2099.00,
  "sku": "MBP-001",
  "image_url": "https://example.com/macbook-updated.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 2,
      "name": "MacBook Pro Updated",
      "description": "Updated description",
      "category": "Electronics",
      "brand": "Apple",
      "base_price": 2099.00,
      "sku": "MBP-001",
      "image_url": "https://example.com/macbook-updated.jpg",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    }
  },
  "message": "Product updated successfully"
}
```

### 5. Delete Product
**DELETE** `/products/:id`

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

### 6. Add Product Variant
**POST** `/products/:productId/variants`

**Request Body:**
```json
{
  "name": "512GB Silver",
  "price": 899.00,
  "stock": 30,
  "sku": "IPH15-001-SLV-512"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "variant": {
      "id": 3,
      "name": "512GB Silver",
      "price": 899.00,
      "stock": 30,
      "sku": "IPH15-001-SLV-512",
      "productId": 1,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "Variant added successfully"
}
```

### 7. Update Product Variant
**PUT** `/products/variants/:variantId`

**Request Body:**
```json
{
  "name": "512GB Silver Updated",
  "price": 949.00,
  "stock": 25,
  "sku": "IPH15-001-SLV-512"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "variant": {
      "id": 3,
      "name": "512GB Silver Updated",
      "price": 949.00,
      "stock": 25,
      "sku": "IPH15-001-SLV-512",
      "productId": 1,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    }
  },
  "message": "Variant updated successfully"
}
```

### 8. Delete Product Variant
**DELETE** `/products/variants/:variantId`

**Response:**
```json
{
  "success": true,
  "message": "Variant deleted successfully"
}
```

### 9. Get Product Statistics
**GET** `/products/stats/overview`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProducts": 100,
    "activeProducts": 95,
    "inactiveProducts": 5,
    "totalVariants": 250,
    "lowStockProducts": 15,
    "outOfStockProducts": 3,
    "categories": [
      {
        "category": "Electronics",
        "count": 40,
        "averagePrice": 599.50
      },
      {
        "category": "Clothing",
        "count": 35,
        "averagePrice": 49.99
      }
    ],
    "brands": [
      {
        "brand": "Apple",
        "count": 15,
        "averagePrice": 899.99
      },
      {
        "brand": "Samsung",
        "count": 12,
        "averagePrice": 449.99
      }
    ]
  }
}
```

### 10. Get Products by Category
**GET** `/products/category/:category`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "category": "Electronics",
    "products": [
      {
        "id": 1,
        "name": "iPhone 15",
        "description": "Latest iPhone model",
        "brand": "Apple",
        "base_price": 799.00,
        "sku": "IPH15-001",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 15,
      "itemsPerPage": 10
    }
  }
}
```

### 11. Get Categories List
**GET** `/products/categories/list`

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": ["Electronics", "Clothing", "Books", "Home & Garden"]
  }
}
```

### 12. Get Brands List
**GET** `/products/brands/list`

**Response:**
```json
{
  "success": true,
  "data": {
    "brands": ["Apple", "Samsung", "Nike", "Adidas"]
  }
}
```

### 13. Import Products from CSV
**POST** `/products/import/csv`

**Request Body:** Multipart form data with CSV file

**Form Data:**
- `csvFile`: CSV file containing product data

**CSV Format:**
```csv
name,description,category,brand,base_price,sku,image_url
iPhone 15,Latest iPhone model,Electronics,Apple,799.00,IPH15-001,https://example.com/iphone15.jpg
MacBook Pro,Professional laptop,Electronics,Apple,1999.00,MBP-001,https://example.com/macbook.jpg
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 25,
    "failed": 2,
    "errors": [
      {
        "row": 3,
        "error": "Invalid price format"
      }
    ]
  },
  "message": "CSV import completed"
}
```

### 14. Export Products to CSV
**GET** `/products/export/csv`

**Query Parameters:**
- `category` (optional): Filter by category
- `brand` (optional): Filter by brand
- `includeInactive` (optional): Include inactive products (true/false)

**Response:** CSV file download

### 15. Bulk Update Stock
**PUT** `/products/bulk/stock`

**Request Body:**
```json
{
  "updates": [
    {
      "variantId": 1,
      "stock": 100
    },
    {
      "variantId": 2,
      "stock": 50
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated": 2,
    "failed": 0,
    "errors": []
  },
  "message": "Stock updated successfully"
}
```

---

## 🏥 Health Check

### Health Check
**GET** `/health`

**Response:**
```json
{
  "success": true,
  "message": "Service is healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

---

## 📝 Error Responses

All endpoints return consistent error responses:

### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["Field 'name' is required", "Invalid email format"]
  },
  "requestId": "req_1234567890_abc123"
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Not authenticated"
  },
  "requestId": "req_1234567890_abc123"
}
```

### Authorization Error (403)
```json
{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Access denied: Admins only"
  },
  "requestId": "req_1234567890_abc123"
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Customer not found"
  },
  "requestId": "req_1234567890_abc123"
}
```

### Database Error (500)
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Unable to retrieve customers at this time"
  },
  "requestId": "req_1234567890_abc123"
}
```

### Internal Server Error (500)
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  },
  "requestId": "req_1234567890_abc123"
}
```

---

## 🔧 Testing the APIs

You can test these APIs using tools like:
- **Postman**
- **cURL**
- **Insomnia**
- **Thunder Client (VS Code extension)**

### Example cURL commands:

**Register a user:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "Admin"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

**Create a customer (with authentication):**
```bash
curl -X POST http://localhost:5000/api/customers \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "customerType": "VIP"
  }'
```

**Get all customers:**
```bash
curl -X GET "http://localhost:5000/api/customers?page=1&limit=10" \
  -b cookies.txt
```

---

## 📊 Rate Limiting

- **Rate Limit:** 100 requests per 15 minutes per IP
- **Headers:** Rate limit information is included in response headers
- **Exceeded Response:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests from this IP, please try again later."
  }
}
```

---

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **CORS Protection** with configurable origins
- **Helmet Security Headers**
- **Input Validation** and sanitization
- **SQL Injection Protection** via Sequelize ORM
- **Rate Limiting** to prevent abuse
- **Request Logging** for monitoring
- **Error Handling** with detailed logging 