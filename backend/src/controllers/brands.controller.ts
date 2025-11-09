import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { parse } from 'csv-parse/sync';
import Brand from '../models/Brand';
import { asyncHandler } from '../middleware/error.middleware';

export const validateCreateBrand = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Brand name is required')
    .isLength({ max: 120 })
    .withMessage('Brand name cannot exceed 120 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

export const createBrand = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { name, description } = req.body;
  const trimmedName = name.trim();

  const existingBrand = await Brand.findOne({ name: trimmedName });
  if (existingBrand) {
    return res.status(400).json({
      success: false,
      message: 'Brand with this name already exists'
    });
  }

  const brand = await Brand.create({
    name: trimmedName,
    description: description?.trim() || undefined
  });

  res.status(201).json({
    success: true,
    message: 'Brand created successfully',
    brand
  });
});

export const getBrands = asyncHandler(async (_req: Request, res: Response) => {
  const brands = await Brand.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Brands retrieved successfully',
    brands
  });
});

const escapeCsvValue = (value: string): string => {
  const stringValue = value ?? '';
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const normalizeHeaderKey = (key: string): string =>
  key.replace(/^\uFEFF/, '').trim().toLowerCase();

export const exportBrands = asyncHandler(async (_req: Request, res: Response) => {
  const brands = await Brand.find().sort({ createdAt: -1 });

  const headers = ['name', 'description', 'createdAt'];
  const rows = brands.map((brand) => [
    escapeCsvValue(brand.name),
    escapeCsvValue(brand.description ?? ''),
    escapeCsvValue(brand.createdAt.toISOString())
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const utf8WithBom = `\uFEFF${csvContent}`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="brands-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  res.status(200).send(utf8WithBom);
});

export const importBrands = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'CSV file is required'
    });
  }

  const fileContent = file.buffer.toString('utf-8').replace(/^\uFEFF/, '');

  let records: Array<Record<string, string>>;
  try {
    records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid CSV format'
    });
  }

  let created = 0;
  let updated = 0;
  const errors: Array<{ row: number; message: string }> = [];

  const normalizedRecords = records.map((record) => {
    const normalized: Record<string, string> = {};
    Object.entries(record).forEach(([key, value]) => {
      const normalizedKey = normalizeHeaderKey(key);
      if (!normalizedKey) {
        return;
      }
      normalized[normalizedKey] =
        typeof value === 'string'
          ? value
          : value === undefined || value === null
          ? ''
          : String(value);
    });
    return normalized;
  });

  const getValue = (row: Record<string, string>, ...keys: string[]): string => {
    for (const key of keys) {
      const normalizedKey = normalizeHeaderKey(key);
      if (row[normalizedKey]) {
        return row[normalizedKey];
      }
    }
    return '';
  };

  for (let index = 0; index < normalizedRecords.length; index += 1) {
    const row = normalizedRecords[index];
    const rawName = getValue(row, 'name', 'brand', 'brand name', 'اسم العلامة');
    const name = rawName.trim();

    if (!name) {
      errors.push({ row: index + 1, message: 'Name is required' });
      continue;
    }

    const description = getValue(row, 'description', 'details', 'desc', 'وصف').trim();

    const existingBrand = await Brand.findOne({ name });

    if (existingBrand) {
      existingBrand.description = description || existingBrand.description;
      await existingBrand.save();
      updated += 1;
    } else {
      await Brand.create({
        name,
        description: description || undefined
      });
      created += 1;
    }
  }

  const brands = await Brand.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Brands imported successfully',
    summary: {
      created,
      updated,
      failed: errors.length
    },
    errors,
    brands
  });
});

