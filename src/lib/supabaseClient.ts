// Local storage types (no database)

export type GalleryCategory = "Weddings" | "Cinematic";

export type GalleryItem = {
  id: number | string;
  title: string | null;
  category: GalleryCategory | null;
  image_url: string;
  storage_path: string | null;
  created_at: string;
};

// Local gallery storage management
const GALLERY_STORAGE_KEY = "raj_pictures_gallery";

export function getLocalGallery(): GalleryItem[] {
  try {
    const stored = localStorage.getItem(GALLERY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
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
