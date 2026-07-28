import * as SecureStore from 'expo-secure-store';

const CATEGORIES_KEY = 'kryptix_categories';

export type Category = string;

export const loadCategories = async (): Promise<Category[]> => {
  try {
    const json = await SecureStore.getItemAsync(CATEGORIES_KEY);
    if (!json) return [];
    return JSON.parse(json) as Category[];
  } catch {
    return [];
  }
};

export const saveCategories = async (categories: Category[]): Promise<void> => {
  await SecureStore.setItemAsync(CATEGORIES_KEY, JSON.stringify(categories));
};

export const addCategory = async (name: string): Promise<Category[]> => {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name cannot be empty');

  const categories = await loadCategories();
  const exists = categories.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  if (exists) throw new Error('Category already exists');

  // Append — keep user order (no alphabetical sort)
  const updated = [...categories, trimmed];
  await saveCategories(updated);
  return updated;
};

export const deleteCategory = async (name: string): Promise<Category[]> => {
  const categories = await loadCategories();
  const updated = categories.filter((c) => c !== name);
  await saveCategories(updated);
  return updated;
};

export const reorderCategories = async (ordered: Category[]): Promise<Category[]> => {
  await saveCategories(ordered);
  return ordered;
};
