import { ProductRepository } from './productRepository';
import { 
  NotFoundError, 
  ForbiddenError, 
  ValidationError, 
  SearchFilters, 
  PaginatedResult, 
  UserRole, 
  Product 
} from '@commerce-ai/shared';
import { CacheManager } from '@commerce-ai/database';

export class ProductService {
  /** Create a product (Merchants/Admins only) */
  static async createProduct(
    user: { userId: string; role: UserRole },
    productData: {
      name: string;
      description: string;
      price: number;
      category: string;
      specifications: Record<string, any>;
      initialStock: number;
      merchantId?: string; // Admin can specify merchantId
    }
  ): Promise<Product> {
    const uppercaseRole = user.role.toUpperCase() as UserRole;
    if (uppercaseRole === 'CUSTOMER') {
      throw new ForbiddenError('Access denied: Customers cannot create products');
    }

    let merchantId = user.userId;
    
    // If admin is creating, they can optionally specify a target merchant
    if (uppercaseRole === 'ADMIN' && productData.merchantId) {
      merchantId = productData.merchantId;
    }

    if (productData.price < 0) {
      throw new ValidationError('Price cannot be negative');
    }
    if (productData.initialStock < 0) {
      throw new ValidationError('Initial stock cannot be negative');
    }

    const createdProduct = await ProductRepository.create(
      merchantId,
      productData.name,
      productData.description,
      productData.price,
      productData.category,
      productData.specifications || {},
      productData.initialStock
    );

    // Invalidate all catalog lists and search results
    await CacheManager.delPattern('catalog:*');

    return createdProduct;
  }

  /** Get a single product by ID (Check cache -> hit -> return; miss -> fetch -> cache -> return) */
  static async getProductById(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;
    const cachedProduct = await CacheManager.get<Product>(cacheKey);
    if (cachedProduct) {
      return cachedProduct;
    }

    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Cache product detail for 1 hour (3600 seconds)
    await CacheManager.set(cacheKey, product, 3600);

    return product;
  }

  /** Browse products list with pagination and filtering (Cached for 5 minutes) */
  static async listProducts(
    page: number,
    limit: number,
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    inStockOnly: boolean = false,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResult<Product>> {
    const cacheKey = `catalog:list:page:${page}:limit:${limit}:cat:${category || ''}:min:${minPrice || ''}:max:${maxPrice || ''}:stock:${inStockOnly}:sort:${sortBy}:${sortOrder}`;
    const cachedResult = await CacheManager.get<PaginatedResult<Product>>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const result = await ProductRepository.list(
      page,
      limit,
      category,
      minPrice,
      maxPrice,
      inStockOnly,
      sortBy,
      sortOrder
    );

    // Cache catalog listing for 5 minutes (300 seconds)
    await CacheManager.set(cacheKey, result, 300);

    return result;
  }

  /** Search products (Cached for 5 minutes) */
  static async searchProducts(
    query: string,
    filters: SearchFilters
  ): Promise<Product[]> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Search query cannot be empty');
    }

    const cacheKey = `catalog:search:q:${query}:cat:${filters.category || ''}:min:${filters.minPrice || ''}:max:${filters.maxPrice || ''}:limit:${filters.limit || ''}`;
    const cachedResult = await CacheManager.get<Product[]>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const results = await ProductRepository.search(query, filters);

    // Cache search results for 5 minutes (300 seconds)
    await CacheManager.set(cacheKey, results, 300);

    return results;
  }

  /** Update a product (Merchants own/Admins only) with proper cache invalidation */
  static async updateProduct(
    user: { userId: string; role: UserRole },
    productId: string,
    updateData: {
      name?: string;
      description?: string;
      price?: number;
      category?: string;
      specifications?: Record<string, any>;
      inventoryCount?: number;
      merchantId?: string; // passed in case merchant user is linked to another model
    }
  ): Promise<Product> {
    const uppercaseRole = user.role.toUpperCase() as UserRole;
    if (uppercaseRole === 'CUSTOMER') {
      throw new ForbiddenError('Access denied: Customers cannot update products');
    }

    const product = await ProductRepository.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Ownership check: Merchant can only update their own products. Admin can update any.
    if (uppercaseRole === 'MERCHANT') {
      const activeMerchantId = updateData.merchantId || user.userId;
      if (product.merchantId !== activeMerchantId) {
        throw new ForbiddenError('Access denied: You do not own this product');
      }
    }

    if (updateData.price !== undefined && updateData.price < 0) {
      throw new ValidationError('Price cannot be negative');
    }

    // Update product details if supplied
    const updatedProduct = await ProductRepository.update(
      productId,
      updateData.name,
      updateData.description,
      updateData.price,
      updateData.category,
      updateData.specifications
    );

    // Update inventory if stock count supplied
    if (updateData.inventoryCount !== undefined) {
      if (updateData.inventoryCount < 0) {
        throw new ValidationError('Stock count cannot be negative');
      }
      await ProductRepository.updateInventory(productId, updateData.inventoryCount);
      updatedProduct.inventoryCount = updateData.inventoryCount;
    }

    // Invalidate product details cache & catalog caches (since details/stock changed)
    await CacheManager.del(`product:${productId}`);
    await CacheManager.delPattern('catalog:*');

    return updatedProduct;
  }

  /** Delete a product (Merchants own/Admins only) with proper cache invalidation */
  static async deleteProduct(
    user: { userId: string; role: UserRole },
    productId: string,
    merchantId?: string
  ): Promise<boolean> {
    const uppercaseRole = user.role.toUpperCase() as UserRole;
    if (uppercaseRole === 'CUSTOMER') {
      throw new ForbiddenError('Access denied: Customers cannot delete products');
    }

    const product = await ProductRepository.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Ownership check
    if (uppercaseRole === 'MERCHANT') {
      const activeMerchantId = merchantId || user.userId;
      if (product.merchantId !== activeMerchantId) {
        throw new ForbiddenError('Access denied: You do not own this product');
      }
    }

    const deleted = await ProductRepository.delete(productId);

    if (deleted) {
      // Invalidate caches
      await CacheManager.del(`product:${productId}`);
      await CacheManager.delPattern('catalog:*');
    }

    return deleted;
  }

  /** Compare multiple products */
  static async compareProducts(productIds: string[]): Promise<Product[]> {
    if (productIds.length < 2 || productIds.length > 4) {
      throw new ValidationError('Comparison requires between 2 and 4 product IDs');
    }

    const products: Product[] = [];
    for (const id of productIds) {
      const p = await this.getProductById(id); // Use getProductById to benefit from cache!
      if (p) products.push(p);
    }

    return products;
  }
}