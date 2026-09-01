"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Check, Loader2, LogOut, Pencil, X, Crown } from "lucide-react";
import AccountAvatar from "./AccountAvatar";
import Button from "@/components/Button";
import { AccountId } from "@/lib/accountSession";
import { resizeImageToDataUrl, updateAccountProfile } from "@/lib/accountApi";
import { AccountsOverview, PublicAccountProfile } from "@/lib/accountTypes";
import { duoCompetitiveTitle } from "@/lib/accountFormat";

interface ProfileTabProps {
  accountId: AccountId;
  profile: PublicAccountProfile;
  overview: AccountsOverview | null;
  onProfileUpdated?: (profile: PublicAccountProfile) => void;
  onSwitchAccount?: () => void;
  readOnly?: boolean;
}

export default function ProfileTab({ accountId, profile, overview, onProfileUpdated, onSwitchAccount, readOnly = false }: ProfileTabProps) {
  const [name, setName] = useState(profile.name);
  const [photo, setPhoto] = useState<string | null>(profile.photo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (readOnly) setEditing(false);
    if (!editing) {
      setName(profile.name);
      setPhoto(profile.photo);
    }
  }, [profile, editing, readOnly]);

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
      onProfileUpdated?.({ id: updated.id, name: updated.name, photo: updated.photo });
      setName(updated.name);
      setSaved(true);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar agora.");
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setName(profile.name);
    setPhoto(profile.photo);
    setError(null);
    setSaved(false);
    setEditing(false);
  };

  const title = duoCompetitiveTitle(accountId, overview);

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="flex w-full max-w-md items-start justify-between gap-4">
        <div className="flex-1" />
        {!readOnly && !editing && <button type="button" onClick={() => { setSaved(false); setError(null); setEditing(true); }} aria-label="Editar perfil" title="Editar perfil" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface/70 hover:text-ink focus:outline-none focus:ring-2 focus:ring-rose/40"><Pencil size={16} /></button>}
      </div>
      {title ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="-mt-3 flex items-center gap-2 rounded-full border border-rose/30 bg-gradient-to-r from-rose/15 via-surface/70 to-sky-200/20 px-4 py-2 text-sm font-semibold text-ink shadow-sm">
          <Crown size={16} className="text-rose-deep" /> {title}
        </motion.div>
      ) : <p className="-mt-3 text-xs text-ink-soft">Título ainda não conquistado</p>}
      <div className="relative">
        <AccountAvatar name={name || profile.name} photo={photo} accountId={accountId} size={96} />
        {editing && <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Trocar foto"
          title="Trocar foto"
          className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-rose text-white shadow-glow transition-colors hover:bg-rose-deep"
        >
          <Camera size={16} />
        </button>}
        {editing && <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />}
      </div>

      {editing ? <div className="w-full max-w-xs">
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
      </div> : <div className="text-center"><p className="font-display text-xl font-semibold text-ink">{profile.name}</p><p className="mt-1 text-xs text-ink-soft">Perfil do casal</p></div>}

      {error && <p className="text-center text-sm text-rose-deep">{error}</p>}

      {editing && <div className="flex w-full max-w-xs gap-2"><Button onClick={cancelEditing} variant="secondary" disabled={saving} className="w-full"><X size={16} /> Cancelar</Button><Button onClick={handleSave} disabled={!dirty || saving} className="w-full">
        {saving && <Loader2 size={16} className="animate-spin" />}
        {!saving && saved && <Check size={16} />}
        {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar alterações"}
      </Button></div>}

      {!readOnly && onSwitchAccount && <button
          type="button"
          onClick={onSwitchAccount}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-soft underline decoration-dotted underline-offset-4 transition-colors hover:text-ink"
        >
          <LogOut size={14} />
          Trocar de conta
        </button>}
    </div>
  );
}
