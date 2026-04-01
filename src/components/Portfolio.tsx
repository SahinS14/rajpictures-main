import { useMemo, useState } from "react";
import { motion } from "framer-motion";

const CATEGORY_TABS = [
  "All",
  "Wedding",
  "Pre-wedding",
  "Bridal",
  "Baby",
  "Ring Ceremony",
  "Albums",
  "Conceptual",
] as const;

type CategoryTab = (typeof CATEGORY_TABS)[number];

type PortfolioItemRow = {
  id: number;
  category: string | null;
  src: string;
  title: string | null;
  type: string | null;
  created_at?: string;
  sort_order?: number | null;
};

// Generate portfolio items from public/portfolio folder
function generatePortfolioItems(): PortfolioItemRow[] {
  const items: PortfolioItemRow[] = [];
  let id = 1;

  const categoryMap: Record<string, { folder: string; category: string }> = {
    wedding: { folder: "wedding", category: "Wedding" },
    bridal: { folder: "bridal", category: "Bridal" },
    "pre-wedding": { folder: "pre-wedding", category: "Pre-wedding" },
    baby: { folder: "baby", category: "Baby" },
  };

  // Wedding images
  const weddingImages = ["w-1.png", "w-2.png"];
  weddingImages.forEach((img, idx) => {
    items.push({
      id: id++,
      category: "Wedding",
      src: `/portfolio/wedding/${img}`,
      title: null,
      type: null,
      sort_order: idx,
    });
  });

  // Bridal images
  const bridalImages = ["br1.png", "br2.png", "br3.png", "br4.png", "br5.png", "br6.png", "br7.png"];
  bridalImages.forEach((img, idx) => {
    items.push({
      id: id++,
      category: "Bridal",
      src: `/portfolio/bridal/${img}`,
      title: null,
      type: null,
      sort_order: idx,
    });
  });

  // Pre-wedding images
  const preWeddingImages = ["prw-1.png", "prw-2.png", "prw-3.png", "prw-4.png", "prw-5.png", "prw-6.png"];
  preWeddingImages.forEach((img, idx) => {
    items.push({
      id: id++,
      category: "Pre-wedding",
      src: `/portfolio/pre-wedding/${img}`,
      title: null,
      type: null,
      sort_order: idx,
    });
  });

  // Baby images
  const babyImages = ["b1.png", "b2.png"];
  babyImages.forEach((img, idx) => {
    items.push({
      id: id++,
      category: "Baby",
      src: `/portfolio/baby/${img}`,
      title: null,
      type: null,
      sort_order: idx,
    });
  });

  return items;
}

export default function Portfolio() {
  const [activeCategory, setActiveCategory] = useState<CategoryTab>("All");
  const [items] = useState<PortfolioItemRow[]>(generatePortfolioItems());
  const [isLoading] = useState(false);

  const filteredData = useMemo(() => {
    if (activeCategory === "All") {
      // Only show top 12 for "All" (newest first)
      return items.slice(0, 12);
    }

    // Show everything for categories, ordered by sort_order (then newest)
    return items
      .filter((it) => {
        const c = (it.category || "").trim();
        if (!c) return false;
        if (c === activeCategory) return true;
        return c.startsWith(`${activeCategory}/`);
      })
      .slice()
      .sort((a, b) => {
        const ao = typeof a.sort_order === "number" ? a.sort_order : 0;
        const bo = typeof b.sort_order === "number" ? b.sort_order : 0;
        if (ao !== bo) return ao - bo;

        const ad = a.created_at ? Date.parse(a.created_at) : 0;
        const bd = b.created_at ? Date.parse(b.created_at) : 0;
        if (ad !== bd) return bd - ad;

        return b.id - a.id;
      });
  }, [activeCategory, items]);

  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-[1920px] px-6 md:px-12 lg:px-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-wide font-display text-zinc-200">
            PORTFOLIO
          </h2>
          <div className="mt-4 text-sm md:text-base text-muted-foreground font-body tracking-widest">
            CATEGORIES
          </div>
        </motion.div>

        {/* Category tabs */}
        <div className="mb-10 overflow-x-auto">
          <div className="min-w-max flex items-center gap-6 border-b border-white/5">
            {CATEGORY_TABS.map((cat) => {
              const active = cat === activeCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={
                    "pb-3 text-xs md:text-sm uppercase tracking-[0.25em] transition-colors whitespace-nowrap " +
                    (active
                      ? "text-amber-500 border-b-2 border-amber-500"
                      : "text-zinc-400 hover:text-white border-b-2 border-transparent")
                  }
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="text-center py-16 text-zinc-500 text-sm tracking-widest">
            Loading highlights...
          </div>
        ) : filteredData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredData.map((item) => (
              <div
                key={item.id}
                className="group text-left rounded-xl border border-zinc-800 overflow-hidden bg-transparent hover:border-amber-500/40 transition-colors"
              >
                <div className="relative aspect-[4/3] bg-transparent overflow-hidden">
                  <img
                    src={item.src}
                    alt={item.category || "Portfolio image"}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="absolute left-0 right-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="text-amber-500 text-[10px] tracking-[0.3em] uppercase font-bold">
                      {item.category || "Uncategorized"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-zinc-500 text-sm tracking-widest italic">
            No images in this collection yet.
          </div>
        )}

        {/* Full-archive CTA removed */}
      </div>
    </section>
  );
}
