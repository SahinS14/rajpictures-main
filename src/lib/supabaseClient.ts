// Local storage types (no database)

export type GalleryCategory = "Weddings" | "Cinematic" | "Baby" | "Bridal" | "Pre-Wedding";

export type GalleryItem = {
  id: number | string;
  title: string | null;
  category: GalleryCategory | null;
  image_url: string;
  storage_path: string | null;
  created_at?: string;
};

// Local gallery storage management
const GALLERY_STORAGE_KEY = "raj_pictures_gallery";

// Fetch gallery from JSON file (works on Vercel)
export async function getRemoteGallery(): Promise<GalleryItem[]> {
  try {
    const response = await fetch('/gallery-data.json');
    if (!response.ok) throw new Error('Failed to fetch gallery');
    const data = await response.json();
    return data.gallery || [];
  } catch (error) {
    console.error('Failed to load gallery from JSON:', error);
    return [];
  }
}

export function getLocalGallery(): GalleryItem[] {
  try {
    // Try to get from localStorage first (cached data)
    const stored = localStorage.getItem(GALLERY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // If nothing in localStorage, return empty (will fetch remote instead)
    return [];
  } catch {
    return [];
  }
}

export function saveLocalGallery(items: GalleryItem[]): void {
  try {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    console.error("Failed to save gallery to localStorage");
  }
}
