import { Plus, type LucideIcon } from "lucide-react";
import styles from "../PetRoom.module.css";

export interface PetItemPreview {
  label: string;
  icon: LucideIcon;
  tone: "peach" | "rose" | "sage" | "lilac";
  category?: string;
}

export default function PetItemGrid({ items }: { items: readonly PetItemPreview[] }) {
  const slots = Array.from({ length: Math.max(6, items.length) }, (_, index) => items[index] ?? null);

  return (
    <div className={styles.itemGrid} aria-label="Espaços para itens">
      {slots.map((item, index) => (
        <div
          className={`${styles.itemSlot} ${item ? styles[`tone${item.tone}`] : styles.emptySlot}`}
          key={item ? item.label : `empty-${index}`}
          aria-label={item ? item.label : "Espaço para um futuro item"}
        >
          <span className={styles.itemIllustration} aria-hidden="true">
            {item ? <item.icon size={31} strokeWidth={1.45} /> : <Plus size={23} strokeWidth={1.2} />}
          </span>
          <span className={styles.itemLabel}>{item?.label ?? "· · ·"}</span>
        </div>
      ))}
    </div>
  );
}
