import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { getLocalGallery, saveLocalGallery, type GalleryItem } from "@/lib/supabaseClient";

type PendingUpload = {
  id: string;
  file: File;
  previewUrl?: string;
  title: string;
  category: "Weddings" | "Cinematic";
};

function createObjectUrlSafe(file: File): string | null {
  try {
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

function revokeObjectUrlSafe(url?: string | null) {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

function extractMediaFilesFromClipboard(data: DataTransfer | null | undefined): File[] {
  if (!data) return [];

  const isMedia = (file: File | null | undefined) =>
    !!file && (file.type.startsWith("image/") || file.type.startsWith("video/"));

  const mediaFiles: File[] = [];

  const items = data.items;
  if (items && items.length > 0) {
    for (const item of Array.from(items)) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (isMedia(file)) mediaFiles.push(file);
    }
  }

  if (mediaFiles.length === 0 && data.files && data.files.length > 0) {
    for (const file of Array.from(data.files)) {
      if (isMedia(file)) mediaFiles.push(file);
    }
  }

  return mediaFiles;
}

export default function Admin() {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pendingCount = pending.length;
  const hasPending = pendingCount > 0;

  const accept = useMemo(() => "image/*,video/*", []);

  useEffect(() => {
    // Load gallery from localStorage
    const items = getLocalGallery();
    setGalleryItems(items);
  }, []);

  const addFiles = (files: File[]) => {
    const mediaFiles = files.filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (mediaFiles.length === 0) {
      toast({
        title: "No media found",
        description: "Please add image/video files (JPG/PNG/WebP/MP4/WebM/MOV).",
        variant: "destructive",
      });
      return;
    }

    const newPending: PendingUpload[] = mediaFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: createObjectUrlSafe(file) || undefined,
      title: file.name.replace(/\.[^/.]+$/, ""),
      category: file.type.startsWith("video/") ? "Cinematic" : "Weddings",
    }));

    setPending((prev) => [...prev, ...newPending]);
    toast({ title: "Files Added", description: `${newPending.length} file(s) queued.` });
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    e.target.value = "";
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) setIsDragActive(false);
  };

  const removeImage = (id: string) => {
    setPending((prev) => {
      const removing = prev.find((img) => img.id === id);
      revokeObjectUrlSafe(removing?.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
    toast({ title: "Image Removed" });
  };

  const uploadAll = async () => {
    if (!hasPending) return;
    setIsUploading(true);

    try {
      // Convert files to base64 and store with metadata
      const newItems: GalleryItem[] = [];

      for (const item of pending) {
        const reader = new FileReader();
        
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
              resolve(result);
            } else {
              reject(new Error('Invalid file read result'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(item.file);
        });

        const imageDataUrl = await base64Promise;

        const galleryItem: GalleryItem = {
          id: crypto.randomUUID(),
          title: item.title || null,
          category: item.category as "Weddings" | "Cinematic",
          image_url: imageDataUrl,
          storage_path: null,
          created_at: new Date().toISOString(),
        };

        newItems.push(galleryItem);
      }

      // Save to localStorage
      const currentItems = getLocalGallery();
      const updatedItems = [...newItems, ...currentItems];
      saveLocalGallery(updatedItems);
      setGalleryItems(updatedItems);

      toast({
        title: "Upload complete",
        description: `${pendingCount} file(s) saved to gallery.`,
      });
      
      pending.forEach((p) => revokeObjectUrlSafe(p.previewUrl));
      setPending([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteGalleryItem = (itemId: string | number) => {
    try {
      const updated = galleryItems.filter((item) => item.id !== itemId);
      saveLocalGallery(updated);
      setGalleryItems(updated);
      toast({ title: "Deleted", description: "Removed from gallery." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    }
  };

  const updateGalleryItem = (itemId: string | number, updates: Partial<GalleryItem>) => {
    try {
      const updated = galleryItems.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      saveLocalGallery(updated);
      setGalleryItems(updated);
      toast({ title: "Updated", description: "Gallery item updated." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Update failed";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display">GALLERY ADMIN</h1>
          <p className="text-sm text-muted-foreground">No authentication required</p>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onClick={openFilePicker}
          tabIndex={0}
          role="button"
          aria-label="Upload images or videos. Drag and drop, click to select, or paste images with Ctrl+V."
          className={
            "glass-card border-2 border-dashed transition-all p-12 text-center cursor-pointer mb-8 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 " +
            (isDragActive
              ? "border-primary/60 bg-primary/5"
              : "border-border hover:border-primary/50")
          }
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-display mb-2">DROP FILES HERE</p>
          <p className="text-sm text-muted-foreground">
            Drag & drop images/videos to queue them • Or paste images (Ctrl+V)
          </p>

          <div className="mt-6 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <motion.button
              type="button"
              onClick={openFilePicker}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-secondary text-muted-foreground rounded-lg hover:text-foreground transition-all"
            >
              <span className="text-sm">Choose files</span>
            </motion.button>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple
              className="hidden"
              onChange={handleFilePick}
            />
          </div>
        </div>

        {/* Pending Uploads */}
        {hasPending && (
          <div className="glass-card p-6 mb-8">
            <h2 className="text-xl font-display mb-4">PENDING UPLOADS ({pendingCount})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {pending.map((item) => (
                <div
                  key={item.id}
                  className="relative border border-border/40 rounded-lg overflow-hidden bg-secondary/20"
                >
                  {item.previewUrl && (
                    <img
                      src={item.previewUrl}
                      alt={item.title}
                      className="w-full aspect-square object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(item.id)}
                    className="absolute top-2 right-2 p-2 bg-background/80 rounded hover:bg-destructive transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="p-3 bg-background/50">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        setPending((prev) =>
                          prev.map((p) =>
                            p.id === item.id ? { ...p, title: e.target.value } : p
                          )
                        );
                      }}
                      placeholder="Title"
                      className="w-full text-xs mb-1 px-2 py-1 bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <select
                      value={item.category}
                      onChange={(e) => {
                        setPending((prev) =>
                          prev.map((p) =>
                            p.id === item.id
                              ? { ...p, category: e.target.value as "Weddings" | "Cinematic" }
                              : p
                          )
                        );
                      }}
                      className="w-full text-xs px-2 py-1 bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option>Weddings</option>
                      <option>Cinematic</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <motion.button
              type="button"
              onClick={uploadAll}
              disabled={isUploading}
              whileHover={!isUploading ? { scale: 1.02 } : {}}
              whileTap={!isUploading ? { scale: 0.98 } : {}}
              className="w-full py-3 bg-primary text-primary-foreground font-display tracking-wider rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "UPLOADING..." : "UPLOAD ALL"}
            </motion.button>
          </div>
        )}

        {/* Gallery Items */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-display mb-4">LIVE GALLERY ({galleryItems.length})</h2>
          {galleryItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon size={48} className="text-zinc-700 mb-4" />
              <p className="text-zinc-600 text-sm">No images uploaded yet. Start by adding some!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {galleryItems.map((item) => (
                <div
                  key={item.id}
                  className="relative border border-border/40 rounded-lg overflow-hidden bg-secondary/20 group"
                >
                  <img
                    src={item.image_url}
                    alt={item.title || "Gallery item"}
                    className="w-full aspect-square object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => deleteGalleryItem(item.id)}
                    className="absolute top-2 right-2 p-2 bg-background/80 rounded hover:bg-destructive transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="p-3 bg-background/50 space-y-2">
                    <input
                      type="text"
                      value={item.title || ""}
                      onChange={(e) => updateGalleryItem(item.id, { title: e.target.value || null })}
                      placeholder="Title"
                      className="w-full text-xs px-2 py-1 bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <select
                      value={item.category || "Weddings"}
                      onChange={(e) =>
                        updateGalleryItem(item.id, { category: e.target.value as "Weddings" | "Cinematic" })
                      }
                      className="w-full text-xs px-2 py-1 bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option>Weddings</option>
                      <option>Cinematic</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
