import { z } from 'zod';
import { ListingCategory, UserRole } from './domain.js';

export const userRoleSchema = z.enum(UserRole);
export const listingCategorySchema = z.enum(ListingCategory);
