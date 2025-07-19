# Product Management API Documentation

## Overview
This API provides comprehensive product management functionality including CRUD operations, variant management, analytics, and CSV import/export capabilities.

## Base URL
```
http://localhost:3000/api/products
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📋 CRUD Operations

### 1. Get All Products
**GET** `/api/products`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search in name, description, or brand
- `category` (optional): Filter by category
- `brand` (optional): Filter by brand
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): ASC or DESC (default: DESC)

**Example:**
```bash
GET /api/products?page=1&limit=5&search=iphone&category=Electronics&minPrice=500&maxPrice=1000
```

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "iPhone 15 Pro",
      "description": "Latest iPhone with advanced features",
      "category": "Electronics",
      "base_price": "999.99",
      "brand": "Apple",
      "image_url": "https://example.com/iphone15.jpg",
      "variants": [
        {
          "id": 1,
          "sku": "IP15P-BLK-128",
          "color": "Black",
          "size": "128GB",
          "price": "999.99",
          "stock": 50
        }
      ]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10
  }
}
```

### 2. Get Product by ID
**GET** `/api/products/:id`

**Example:**
```bash
GET /api/products/1
```

**Response:**
```json
{
  "id": 1,
  "name": "iPhone 15 Pro",
  "description": "Latest iPhone with advanced features",
  "category": "Electronics",
  "base_price": "999.99",
  "brand": "Apple",
  "image_url": "https://example.com/iphone15.jpg",
  "variants": [...]
}
```

### 3. Create Product
**POST** `/api/products`

**Request Body:**
```json
{
  "name": "iPhone 15 Pro",
  "description": "Latest iPhone with advanced features",
  "category": "Electronics",
  "base_price": 999.99,
  "brand": "Apple",
  "image_url": "https://example.com/iphone15.jpg",
  "variants": [
    {
      "sku": "IP15P-BLK-128",
      "color": "Black",
      "size": "128GB",
      "price": 999.99,
      "discount": 0,
      "stock": 50,
      "image_url": "https://example.com/iphone15-black.jpg"
    }
  ]
}
```

### 4. Update Product
**PUT** `/api/products/:id`

**Request Body:**
```json
{
  "name": "iPhone 15 Pro Max",
  "base_price": 1099.99
}
```

### 5. Delete Product
**DELETE** `/api/products/:id`

---

## 🔄 Product Variants

### 1. Add Variant to Product
**POST** `/api/products/:productId/variants`

**Request Body:**
```json
{
  "sku": "IP15P-WHT-256",
  "color": "White",
  "size": "256GB",
  "price": 1099.99,
  "discount": 50,
  "stock": 30,
  "image_url": "https://example.com/iphone15-white.jpg"
}
```

### 2. Update Variant
**PUT** `/api/products/variants/:variantId`

**Request Body:**
```json
{
  "price": 1049.99,
  "stock": 25
}
```

### 3. Delete Variant
**DELETE** `/api/products/variants/:variantId`

---

## 📊 Analytics & Reports

### 1. Get Product Statistics
**GET** `/api/products/stats/overview`

**Response:**
```json
{
  "totalProducts": 50,
  "totalVariants": 150,
  "categoryStats": [
    {
      "category": "Electronics",
      "count": "25"
    },
    {
      "category": "Footwear",
      "count": "15"
    }
  ],
  "brandStats": [
    {
      "brand": "Apple",
      "count": "10"
    },
    {
      "brand": "Nike",
      "count": "8"
    }
  ],
  "lowStockVariants": 5
}
```

### 2. Get Products by Category
**GET** `/api/products/category/:category`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

### 3. Get Categories List
**GET** `/api/products/categories/list`

**Response:**
```json
["Electronics", "Footwear", "Clothing", "Books"]
```

### 4. Get Brands List
**GET** `/api/products/brands/list`

**Response:**
```json
["Apple", "Samsung", "Nike", "Adidas"]
```

---

## 📁 CSV Operations

### 1. Import Products from CSV
**POST** `/api/products/import/csv`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `csvFile`: CSV file

**CSV Format:**
```csv
Name,Description,Category,Base Price,Brand,Image URL,SKU,Color,Size,Variant Price,Discount,Stock,Variant Image URL
"iPhone 15 Pro","Latest iPhone","Electronics",999.99,"Apple","https://example.com/iphone15.jpg","IP15P-BLK-128","Black","128GB",999.99,0,50,"https://example.com/iphone15-black.jpg"
```

**Response:**
```json
{
  "message": "CSV import completed",
  "summary": {
    "totalRows": 10,
    "successCount": 8,
    "errorCount": 2
  },
  "errors": [
    {
      "row": 3,
      "error": "Missing required fields (name, category, base_price)"
    }
  ]
}
```

### 2. Export Products to CSV
**GET** `/api/products/export/csv`

**Response:** CSV file download

---

## 🔧 Bulk Operations

### 1. Bulk Update Stock
**PUT** `/api/products/bulk/stock`

**Request Body:**
```json
{
  "updates": [
    {
      "variantId": 1,
      "newStock": 100
    },
    {
      "variantId": 2,
      "newStock": 50
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "variantId": 1,
      "success": true
    },
    {
      "variantId": 2,
      "success": true
    }
  ]
}
```

---

## 📝 Error Responses

### 400 Bad Request
```json
{
  "error": "Name, category, and base_price are required fields"
}
```

### 404 Not Found
```json
{
  "error": "Product not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Database connection failed"
}
```

---

## 🚀 Usage Examples

### Using cURL

**Create a product:**
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone 15 Pro",
    "description": "Latest iPhone",
    "category": "Electronics",
    "base_price": 999.99,
    "brand": "Apple"
  }'
```

**Import CSV:**
```bash
curl -X POST http://localhost:3000/api/products/import/csv \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "csvFile=@products.csv"
```

**Search products:**
```bash
curl -X GET "http://localhost:3000/api/products?search=iphone&category=Electronics&minPrice=500" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using JavaScript/Fetch

```javascript
// Get all products
const response = await fetch('/api/products?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();

// Create product
const createResponse = await fetch('/api/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'iPhone 15 Pro',
    category: 'Electronics',
    base_price: 999.99
  })
});
```

---

## 📋 CSV Template

A sample CSV file (`sample_products.csv`) is provided in the project root with the correct format for importing products.

**Required Fields:**
- Name
- Category  
- Base Price

**Optional Fields:**
- Description
- Brand
- Image URL
- SKU (for variants)
- Color (for variants)
- Size (for variants)
- Variant Price (for variants)
- Discount (for variants)
- Stock (for variants)
- Variant Image URL (for variants)

---

## 🔒 Security Notes

1. All endpoints require authentication
2. File uploads are restricted to CSV files only
3. Input validation is performed on all endpoints
4. SQL injection protection via Sequelize ORM
5. File cleanup after CSV processing 