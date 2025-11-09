import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { parse } from 'csv-parse/sync';
import Category from '../models/Category';
import { asyncHandler } from '../middleware/error.middleware';

export const validateCreateCategory = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 120 })
    .withMessage('Category name cannot exceed 120 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
];

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { name, description } = req.body;

  const existingCategory = await Category.findOne({ name: name.trim() });
  if (existingCategory) {
    return res.status(400).json({
      success: false,
      message: 'Category with this name already exists',
    });
  }

  const category = await Category.create({
    name: name.trim(),
    description: description?.trim() || undefined,
  });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    category,
  });
});

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Categories retrieved successfully',
    categories,
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

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const exportCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find().sort({ createdAt: -1 });

  const headers = ['name', 'description', 'imageUrl', 'createdAt'];
  const rows = categories.map((category) => [
    escapeCsvValue(category.name),
    escapeCsvValue(category.description ?? ''),
    escapeCsvValue(category.imageUrl ?? ''),
    escapeCsvValue(category.createdAt.toISOString()),
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const utf8WithBom = `\uFEFF${csvContent}`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="categories-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  res.status(200).send(utf8WithBom);
});

export const importCategories = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'CSV file is required',
    });
  }

  const fileContent = file.buffer.toString('utf-8');

  let records: Array<Record<string, string>>;
  try {
    const sanitizedContent = fileContent.replace(/^\uFEFF/, '');
    records = parse(sanitizedContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid CSV format',
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
        typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
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
    const name = getValue(row, 'name', 'category', 'category name', 'اسم الفئة', 'categoryname').trim();

    if (!name) {
      errors.push({ row: index + 1, message: 'Name is required' });
      continue;
    }

    const description = getValue(row, 'description', 'details', 'desc', 'وصف').trim();
    const imageUrl = getValue(row, 'imageurl', 'image url', 'image', 'صورة').trim();

    let existing = await Category.findOne({ name });
    if (!existing) {
      existing = await Category.findOne({
        name: {
          $regex: new RegExp(`^${escapeRegex(name)}$`, 'i'),
        },
      });
    }

    if (existing) {
      existing.name = name;
      if (description) {
        existing.description = description;
      }
      if (imageUrl) {
        existing.imageUrl = imageUrl;
      }
      await existing.save();
      updated += 1;
    } else {
      await Category.create({
        name,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
      });
      created += 1;
    }
  }

  const categories = await Category.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Categories imported successfully',
    summary: {
      created,
      updated,
      failed: errors.length,
    },
    errors,
    categories,
  });
});

