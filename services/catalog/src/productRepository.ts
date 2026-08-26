import { pool } from '@commerce-ai/database';
import { generateProductEmbedding } from '@commerce-ai/ai';
import { 
  Product, 
  ProductSearchResult, 
  SearchFilters, 
  PaginatedResult,
  logger
} from '@commerce-ai/shared';

export class ProductRepository {
  /** Create a new product and initialize its stock in inventory */
  static async create(
    merchantId: string,
    name: string,
    description: string,
    price: number,
    category: string,
    specifications: Record<string, any>,
    initialStock: number
  ): Promise<Product> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Generate embedding based on product attributes
      let embeddingVector: number[] = [];
      try {
        embeddingVector = await generateProductEmbedding({ name, description, category, specifications });
      } catch (err) {
        logger.warn('Failed to generate product embedding during creation', { err });
      }
      const vectorLiteral = embeddingVector.length > 0 ? '[' + embeddingVector.join(',') + ']' : null;

      const productResult = await client.query(
        `INSERT INTO products (merchant_id, name, description, price, category, specifications, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, merchant_id, name, description, price, category, specifications, created_at`,
        [merchantId, name, description, price, category, JSON.stringify(specifications), vectorLiteral]
      );

      const product = productResult.rows[0];

      await client.query(
        `INSERT INTO inventory (product_id, stock_count)
         VALUES ($1, $2)`,
        [product.id, initialStock]
      );

      await client.query('COMMIT');

      return {
        id: product.id,
        merchantId: product.merchant_id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price),
        category: product.category,
        specifications: product.specifications,
        createdAt: product.created_at,
        inventoryCount: initialStock
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Find a product by ID with its inventory details */
  static async findById(id: string): Promise<Product | null> {
    const query = `
      SELECT p.id, p.merchant_id, p.name, p.description, p.price, p.category, p.specifications, p.created_at,
             COALESCE(i.stock_count, 0) as stock_count
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);
    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      merchantId: row.merchant_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      specifications: row.specifications,
      createdAt: row.created_at,
      inventoryCount: parseInt(row.stock_count, 10)
    };
  }

  /** List products with pagination, filtering, and sorting */
  static async list(
    page: number,
    limit: number,
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    inStockOnly: boolean = false,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResult<Product>> {
    const offset = (page - 1) * limit;
    const params: any[] = [];
    const conditions: string[] = [];

    if (category) {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }

    if (minPrice !== undefined) {
      params.push(minPrice);
      conditions.push(`p.price >= $${params.length}`);
    }

    if (maxPrice !== undefined) {
      params.push(maxPrice);
      conditions.push(`p.price <= $${params.length}`);
    }

    if (inStockOnly) {
      conditions.push(`i.stock_count > 0`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort column to avoid SQL injection
    const allowedSortColumns = ['name', 'price', 'created_at', 'stock_count'];
    const safeSortBy = allowedSortColumns.includes(sortBy) 
      ? (sortBy === 'stock_count' ? 'i.stock_count' : `p.${sortBy}`) 
      : 'p.created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Query for data
    const queryParams = [...params];
    queryParams.push(limit);
    const limitPlaceholder = `$${queryParams.length}`;
    queryParams.push(offset);
    const offsetPlaceholder = `$${queryParams.length}`;

    const dataQuery = `
      SELECT p.id, p.merchant_id, p.name, p.description, p.price, p.category, p.specifications, p.created_at,
             COALESCE(i.stock_count, 0) as stock_count
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const dataResult = await pool.query(dataQuery, queryParams);

    // Query for total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const items: Product[] = dataResult.rows.map(row => ({
      id: row.id,
      merchantId: row.merchant_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      specifications: row.specifications,
      createdAt: row.created_at,
      inventoryCount: parseInt(row.stock_count, 10)
    }));

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /** Search products using safe parameterized query */
  static async search(
    searchQuery: string,
    filters: SearchFilters
  ): Promise<Product[]> {
    const searchPattern = `%${searchQuery}%`;
    const params: any[] = [searchPattern];
    const conditions: string[] = [
      `(p.name ILIKE $1 OR p.description ILIKE $1)`
    ];

    if (filters.category) {
      params.push(filters.category);
      conditions.push(`p.category = $${params.length}`);
    }

    if (filters.minPrice !== undefined) {
      params.push(filters.minPrice);
      conditions.push(`p.price >= $${params.length}`);
    }

    if (filters.maxPrice !== undefined) {
      params.push(filters.maxPrice);
      conditions.push(`p.price <= $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const limit = filters.limit || 10;
    params.push(limit);
    const limitPlaceholder = `$${params.length}`;

    const query = `
      SELECT p.id, p.merchant_id, p.name, p.description, p.price, p.category, p.specifications, p.created_at,
             COALESCE(i.stock_count, 0) as stock_count
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      ${whereClause}
      ORDER BY p.name ASC
      LIMIT ${limitPlaceholder}
    `;

    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      merchantId: row.merchant_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      specifications: row.specifications,
      createdAt: row.created_at,
      inventoryCount: parseInt(row.stock_count, 10)
    }));
  }

  /** Update product details */
  static async update(
    id: string,
    name?: string,
    description?: string,
    price?: number,
    category?: string,
    specifications?: Record<string, any>
  ): Promise<Product> {
    const fields: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      params.push(name);
      fields.push(`name = $${params.length}`);
    }
    if (description !== undefined) {
      params.push(description);
      fields.push(`description = $${params.length}`);
    }
    if (price !== undefined) {
      params.push(price);
      fields.push(`price = $${params.length}`);
    }
    if (category !== undefined) {
      params.push(category);
      fields.push(`category = $${params.length}`);
    }
    if (specifications !== undefined) {
      params.push(JSON.stringify(specifications));
      fields.push(`specifications = $${params.length}`);
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Product not found');
      return existing;
    }

    params.push(id);
    const idPlaceholder = `$${params.length}`;

    const query = `
      UPDATE products
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = ${idPlaceholder}
      RETURNING id, merchant_id, name, description, price, category, specifications, created_at
    `;

    const result = await pool.query(query, params);
    const product = result.rows[0];
    if (!product) throw new Error('Product not found');

    const stockRes = await pool.query('SELECT stock_count FROM inventory WHERE product_id = $1', [id]);
    const inventoryCount = stockRes.rows[0] ? parseInt(stockRes.rows[0].stock_count, 10) : 0;

    return {
      id: product.id,
      merchantId: product.merchant_id,
      name: product.name,
      description: product.description,
      price: parseFloat(product.price),
      category: product.category,
      specifications: product.specifications,
      createdAt: product.created_at,
      inventoryCount
    };
  }

  /** Update inventory count for a product */

  /** Semantic search products using vector similarity + structured filters */
  static async semanticSearch(
    queryEmbedding: number[],
    filters: SearchFilters
  ): Promise<Product[]> {
    const vectorLiteral = '[' + queryEmbedding.join(',') + ']';
    const params: any[] = [vectorLiteral];
    const conditions: string[] = [];

    if (filters.category) {
      params.push(filters.category);
      conditions.push(`p.category = ${params.length}`);
    }

    if (filters.minPrice !== undefined) {
      params.push(filters.minPrice);
      conditions.push(`p.price >= ${params.length}`);
    }

    if (filters.maxPrice !== undefined) {
      params.push(filters.maxPrice);
      conditions.push(`p.price <= ${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 10;
    params.push(limit);
    const limitPlaceholder = `${params.length}`;

    const query = `
      SELECT p.id, p.merchant_id, p.name, p.description, p.price, p.category, p.specifications, p.created_at,
             COALESCE(i.stock_count, 0) as stock_count
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      ${whereClause}
      ORDER BY p.embedding <=> $1
      LIMIT ${limitPlaceholder}
    `;

    const result = await pool.query(query, params);
    return result.rows.map((row: any) => ({
      id: row.id,
      merchantId: row.merchant_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      specifications: row.specifications,
      createdAt: row.created_at,
      inventoryCount: parseInt(row.stock_count, 10)
    }));
  }
  static async updateInventory(productId: string, inventoryCount: number): Promise<void> {
    await pool.query(
      `UPDATE inventory
       SET stock_count = $1, updated_at = NOW()
       WHERE product_id = $2`,
      [inventoryCount, productId]
    );
  }

  /** Delete a product from database */
  static async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
