"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { PuzzleImageOption } from "@/hooks/usePuzzleImages";

interface ImagePickerProps {
  images: PuzzleImageOption[];
  loading: boolean;
  selected: PuzzleImageOption | null;
  onSelect: (image: PuzzleImageOption) => void;
  readOnly?: boolean;
}

export default function ImagePicker({ images, loading, selected, onSelect, readOnly = false }: ImagePickerProps) {
  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-3 w-3 rounded-full bg-rose"
              animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-ink-soft">
        Nenhuma imagem encontrada em <code>frontend/public/images/puzzle</code>.
      </p>
    );
  }

  const scrollable = images.length > 6;

  return (
    <div className="relative">
      <div
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${
          scrollable ? "max-h-[46vh] overflow-y-auto overscroll-contain pr-1 -mr-1 sm:max-h-[50vh]" : ""
        }`}
      >
        {images.map((img, i) => {
          const isSelected = selected?.file === img.file;
          return (
            <motion.button
              key={img.file}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onSelect(img)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: readOnly && !isSelected ? 0.45 : 1, y: 0 }}
              transition={{ delay: Math.min(i, 11) * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={readOnly ? undefined : { y: -3 }}
              whileTap={readOnly ? undefined : { scale: 0.96 }}
              className={`group relative overflow-hidden rounded-xl2 border-2 text-left transition-colors ${
                readOnly ? "cursor-default" : ""
              } ${isSelected ? "border-rose shadow-glow" : "border-surface/60 hover:border-surface"}`}
            >
              <div className="aspect-square w-full overflow-hidden bg-beige">
                <img
                  src={img.file}
                  alt={img.label}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="glass-panel absolute inset-x-1.5 bottom-1.5 rounded-lg px-2 py-1 text-center text-xs font-medium text-ink">
                {img.label}
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose text-white shadow-soft"
                >
                  <Check size={14} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
      {scrollable && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-xl2 bg-gradient-to-t from-beige/90 to-transparent" />
      )}
    </div>
  );
}
