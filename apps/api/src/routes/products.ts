import { Router, Response, NextFunction } from 'express';
import { ProductService } from '@commerce-ai/catalog';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { ValidationError, uuidSchema } from '@commerce-ai/shared';

export const productsRouter = Router();

/** GET /api/products â€” List/browse products with filters & pagination */
productsRouter.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const category = req.query.category as string;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    const inStockOnly = req.query.inStock === 'true';
    const sortBy = req.query.sortBy as string || 'created_at';
    const sortOrder = (req.query.sortOrder as string || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    if (isNaN(page) || page <= 0) throw new ValidationError('Invalid page number');
    if (isNaN(limit) || limit <= 0 || limit > 100) throw new ValidationError('Invalid limit');

    const result = await ProductService.listProducts(
      page,
      limit,
      category,
      minPrice,
      maxPrice,
      inStockOnly,
      sortBy,
      sortOrder
    );

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/products/search â€” Search products */
productsRouter.get('/search', async (req, res, next) => {
  try {
    const query = req.query.q as string;
    const category = req.query.category as string;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    if (!query) {
      throw new ValidationError('Search query parameter q is required');
    }

    const results = await ProductService.searchProducts(query, {
      category,
      minPrice,
      maxPrice,
      limit,
    });

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/products/compare â€” Compare products */
productsRouter.get('/compare', async (req, res, next) => {
  try {
    const idsParam = req.query.ids as string;
    if (!idsParam) {
      throw new ValidationError('Query parameter ids (comma separated) is required');
    }

    const ids = idsParam.split(',').map(id => id.trim());
    for (const id of ids) {
      const parseResult = uuidSchema.safeParse(id);
      if (!parseResult.success) {
        throw new ValidationError(`Invalid product ID format: ${id}`);
      }
    }

    const products = await ProductService.compareProducts(ids);
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/products/:id â€” Fetch single product detail */
productsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const parseResult = uuidSchema.safeParse(id);
    if (!parseResult.success) {
      throw new ValidationError('Invalid product ID format');
    }

    const product = await ProductService.getProductById(id);
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/products â€” Create product (Merchants/Admins) */
productsRouter.post('/', authenticate, authorize('MERCHANT', 'ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user!;
    const { name, description, price, category, specifications, initialStock, merchantId } = req.body;

    if (!name || !description || price === undefined || !category || initialStock === undefined) {
      throw new ValidationError('Missing required fields');
    }

    const product = await ProductService.createProduct(user, {
      name,
      description,
      price: parseFloat(price),
      category,
      specifications,
      initialStock: parseInt(initialStock, 10),
      merchantId,
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/products/:id â€” Update product or inventory (Merchants/Admins) */
productsRouter.patch('/:id', authenticate, authorize('MERCHANT', 'ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const { name, description, price, category, specifications, stockCount, merchantId } = req.body;

    const parseIdResult = uuidSchema.safeParse(id);
    if (!parseIdResult.success) {
      throw new ValidationError('Invalid product ID format');
    }

    const product = await ProductService.updateProduct(user, id, {
      name,
      description,
      price: price !== undefined ? parseFloat(price) : undefined,
      category,
      specifications,
      inventoryCount: stockCount !== undefined ? parseInt(stockCount, 10) : undefined,
      merchantId,
    });

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/products/:id â€” Delete product (Merchants/Admins) */
productsRouter.delete('/:id', authenticate, authorize('MERCHANT', 'ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const { merchantId } = req.body; // optionally specify linked merchant ID context

    const parseResult = uuidSchema.safeParse(id);
    if (!parseResult.success) {
      throw new ValidationError('Invalid product ID format');
    }

    await ProductService.deleteProduct(user, id, merchantId);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (err) {
    next(err);
  }
});
