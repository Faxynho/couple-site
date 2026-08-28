"use client";

import { useRef, useState } from "react";
import { Camera, Check, Loader2, LogOut } from "lucide-react";
import AccountAvatar from "./AccountAvatar";
import Button from "@/components/Button";
import { AccountId } from "@/lib/accountSession";
import { resizeImageToDataUrl, updateAccountProfile } from "@/lib/accountApi";
import { PublicAccountProfile } from "@/lib/accountTypes";

interface ProfileTabProps {
  accountId: AccountId;
  profile: PublicAccountProfile;
  onProfileUpdated: (profile: PublicAccountProfile) => void;
  onSwitchAccount: () => void;
}

export default function ProfileTab({ accountId, profile, onProfileUpdated, onSwitchAccount }: ProfileTabProps) {
  const [name, setName] = useState(profile.name);
  const [photo, setPhoto] = useState<string | null>(profile.photo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = name.trim() !== profile.name || photo !== profile.photo;

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setPhoto(dataUrl);
      setSaved(false);
    } catch {
      setError("Não foi possível usar essa imagem. Tente outra.");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("O nome não pode ficar em branco.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAccountProfile(accountId, { name: name.trim(), photo });
      onProfileUpdated({ id: updated.id, name: updated.name, photo: updated.photo });
      setName(updated.name);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar agora.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="relative">
        <AccountAvatar name={name || profile.name} photo={photo} accountId={accountId} size={96} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Trocar foto"
          title="Trocar foto"
          className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-rose text-white shadow-glow transition-colors hover:bg-rose-deep"
        >
          <Camera size={16} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="w-full max-w-xs">
        <label className="mb-1.5 block text-center text-xs font-medium text-ink-soft">Nome exibido</label>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          maxLength={30}
          className="w-full rounded-full border border-surface/80 bg-surface/70 px-4 py-2.5 text-center text-ink outline-none transition-colors focus:border-rose-deep"
        />
      </div>

      {error && <p className="text-center text-sm text-rose-deep">{error}</p>}

      <Button onClick={handleSave} disabled={!dirty || saving} className="w-full max-w-xs">
        {saving && <Loader2 size={16} className="animate-spin" />}
        {!saving && saved && <Check size={16} />}
        {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar alterações"}
      </Button>

      <button
        type="button"
        onClick={onSwitchAccount}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-soft underline decoration-dotted underline-offset-4 transition-colors hover:text-ink"
      >
        <LogOut size={14} />
        Trocar de conta
      </button>
    </div>
  );
}
