"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Check, Crown, Loader2, LogOut, Pencil, Swords, X } from "lucide-react";
import AccountAvatar from "./AccountAvatar";
import { AvatarCloud, SparkDashes } from "./ProfileCardDecor";
import ProfileBorderPicker from "./ProfileBorderPicker";
import ProfileLevelBadge from "./ProfileLevelBadge";
import Button from "@/components/Button";
import { AccountId } from "@/lib/accountSession";
import { resizeImageToDataUrl, updateAccountProfile } from "@/lib/accountApi";
import { applyAccountProfileUpdate } from "@/lib/accountProfilesStore";
import { AccountsOverview, PublicAccountProfile } from "@/lib/accountTypes";
import { duoCompetitiveTitle } from "@/lib/accountFormat";
import { getPlayerLevel } from "@/lib/profileLevel";
import "./profile-card.css";

/** Diâmetro da foto no perfil, em px. */
const PROFILE_AVATAR_SIZE = 156;

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
  const [draftBorder, setDraftBorder] = useState<string | null>(profile.border ?? null);
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
      setDraftBorder(profile.border ?? null);
    }
  }, [profile, editing, readOnly]);

  const currentBorder = profile.border ?? null;
  const borderChanged = draftBorder !== currentBorder;
  const dirty = name.trim() !== profile.name || photo !== profile.photo || borderChanged;

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
      const updated = await updateAccountProfile(accountId, {
        name: name.trim(),
        photo,
        ...(borderChanged ? { border: draftBorder } : {}),
      });
      const next: PublicAccountProfile = {
        id: updated.id,
        name: updated.name,
        photo: updated.photo,
        border: updated.border ?? (borderChanged ? draftBorder : currentBorder),
      };
      onProfileUpdated?.(next);
      // Atualiza já o cache compartilhado: a borda nova aparece em todos os avatares abertos.
      applyAccountProfileUpdate(next);
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
    setDraftBorder(currentBorder);
    setError(null);
    setSaved(false);
    setEditing(false);
  };

  const startEditing = () => {
    setSaved(false);
    setError(null);
    setEditing(true);
  };

  const title = duoCompetitiveTitle(accountId, overview);
  const duelWins = overview?.duoPerAccount?.[accountId]?.duelWins;
  const level = getPlayerLevel(accountId);

  // Na edição a foto mostra a borda ainda não salva (rascunho); fora dela, a
  // borda do perfil (ou, se o perfil não informar, a que o avatar resolve sozinho).
  const shownBorder = editing ? draftBorder : profile.border;
  const hasBorder = Boolean(shownBorder);
  const shownName = editing ? name || profile.name : profile.name;

  return (
    <div className="relative z-[1] flex flex-col items-center gap-5 pb-1">
      <div className="relative z-0 flex w-full justify-center pb-3 pt-4">
        <span className="profile-avatar-halo" aria-hidden="true" />
        {!editing && <AvatarCloud />}
        <div className="relative z-[1]">
          {hasBorder ? (
            <AccountAvatar name={shownName} photo={photo} accountId={accountId} size={PROFILE_AVATAR_SIZE} border={shownBorder} />
          ) : (
            <div className="profile-avatar-ring">
              <div className="profile-avatar-gap">
                <AccountAvatar
                  name={shownName}
                  photo={photo}
                  accountId={accountId}
                  size={PROFILE_AVATAR_SIZE}
                  border={null}
                  className="!ring-0"
                />
              </div>
            </div>
          )}

          {!readOnly && !editing && (
            <button
              type="button"
              onClick={startEditing}
              aria-label="Editar perfil"
              title="Editar perfil"
              className="profile-edit-fab absolute -bottom-1 -right-1 z-[3]"
            >
              <Pencil size={17} />
            </button>
          )}
          {editing && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Trocar foto"
              title="Trocar foto"
              className="profile-edit-fab absolute -bottom-1 -right-1 z-[3]"
            >
              <Camera size={17} />
            </button>
          )}
          {editing && (
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
          )}
        </div>
      </div>

      {editing ? (
        <div className="relative z-[1] flex w-full flex-col items-center gap-5">
          <div className="w-full max-w-xs">
            <label htmlFor="profile-name-input" className="mb-1.5 block text-center text-xs font-semibold text-[color:var(--pc-text-soft)]">
              Nome exibido
            </label>
            <input
              id="profile-name-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              maxLength={30}
              className="w-full rounded-full border border-[color:var(--pc-panel-border)] bg-[color:var(--pc-panel-bg)] px-4 py-2.5 text-center font-semibold text-[color:var(--pc-text)] outline-none transition-colors focus:border-[color:var(--pc-accent)]"
            />
          </div>

          <ProfileBorderPicker
            accountId={accountId}
            name={shownName}
            photo={photo}
            selected={draftBorder}
            onSelect={(id) => {
              setDraftBorder(id);
              setSaved(false);
            }}
          />

          {error && <p className="text-center text-sm font-medium text-rose-deep" role="alert">{error}</p>}

          <div className="flex w-full max-w-sm gap-2">
            <Button onClick={cancelEditing} variant="secondary" disabled={saving} className="w-full">
              <X size={16} /> Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!dirty || saving} className="w-full">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {!saving && saved && <Check size={16} />}
              {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar alterações"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative z-[1] flex w-full flex-col items-center gap-5">
          <motion.h2
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-full truncate px-2 text-center font-display text-4xl font-bold text-[color:var(--pc-text)]"
            style={{ textShadow: "0 0 18px var(--pc-glow)" }}
          >
            {profile.name}
          </motion.h2>

          {title ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="-mt-1 flex items-center gap-1.5">
              <SparkDashes side="left" />
              <div className="profile-title-pill text-sm sm:text-base">
                <Crown size={18} style={{ color: "var(--pc-accent)" }} /> {title}
              </div>
              <SparkDashes side="right" />
            </motion.div>
          ) : (
            <div className="profile-title-pill profile-title-pill-muted -mt-1 text-xs">Título ainda não conquistado</div>
          )}

          {saved && <p className="-mt-2 text-xs font-semibold text-[color:var(--pc-text-soft)]" role="status">Perfil atualizado!</p>}

          <div className="profile-stat" data-testid="profile-duel-wins">
            <span className="profile-stat-icon" aria-hidden="true">
              <Swords size={26} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[color:var(--pc-text-soft)]">Vitórias em duelo</p>
              <p className="profile-stat-number" data-testid="profile-duel-wins-value">
                {duelWins === undefined ? "—" : duelWins.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>

          <ProfileLevelBadge info={level} />

          {!readOnly && onSwitchAccount && (
            <button
              type="button"
              onClick={onSwitchAccount}
              className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[color:var(--pc-text-soft)] underline decoration-dotted underline-offset-4 transition-colors hover:text-[color:var(--pc-text)]"
            >
              <LogOut size={14} />
              Trocar de conta
            </button>
          )}
        </div>
      )}
    </div>
  );
}
