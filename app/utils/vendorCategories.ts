export const CUSTOMER_HOME_CATEGORIES = ['Snacks', 'Sweets', 'Beverages', 'Meals'] as const;

export type CustomerHomeCategory = (typeof CUSTOMER_HOME_CATEGORIES)[number];
