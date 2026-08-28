import { Router } from "express";
import { accountStore } from "./AccountStore";
import { isAccountId } from "./types";

/** Payload de foto em base64 — o navegador já redimensiona/comprime para
 *  ~256px antes de enviar (ver frontend/lib/accountApi.ts), então esse teto
 *  é só uma segunda trava de segurança contra um payload gigante malformado. */
const MAX_PHOTO_LENGTH = 400_000; // ~300KB de imagem, folgado para um avatar
const MAX_NAME_LENGTH = 30;

export const accountsRouter = Router();

/** As rotas de reset (aba Configurações) só existem visualmente para a conta
 *  André no front — mas como o site não tem autenticação de verdade (é o
 *  mesmo modelo das salas por código), o backend também confere quem está
 *  pedindo, como uma segunda trava. `by` vem no corpo da requisição com o ID
 *  da conta ativa no navegador de quem clicou. */
function isRequestFromAndre(req: { body?: unknown }): boolean {
  const body = req.body as { by?: unknown } | undefined;
  return body?.by === "andre";
}

function requireAndre(req: { body?: unknown }, res: import("express").Response): boolean {
  if (!isRequestFromAndre(req)) {
    res.status(403).json({ error: "Só a conta André pode resetar estatísticas ou recordes." });
    return false;
  }
  return true;
}

/** Lista pública das duas contas (nome + foto) — usada pela tela de seleção
 *  de conta e pelo botão/pill que mostra quem está logado. Nunca inclui
 *  estatísticas. */
accountsRouter.get("/", (_req, res) => {
  res.json({ accounts: accountStore.getPublicProfiles() });
});

/** Estatísticas e recordes completos das duas contas — usado pelas abas
 *  Estatísticas e Recordes dentro do painel de conta. */
accountsRouter.get("/overview", (_req, res) => {
  res.json(accountStore.getOverview());
});

/** Atualiza nome e/ou foto de uma conta fixa. */
accountsRouter.put("/:id/profile", (req, res) => {
  const { id } = req.params;
  if (!isAccountId(id)) {
    res.status(404).json({ error: "Conta não encontrada." });
    return;
  }

  const body = req.body as { name?: unknown; photo?: unknown };
  const patch: { name?: string; photo?: string | null } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      res.status(400).json({ error: "Nome inválido." });
      return;
    }
    patch.name = body.name.trim().slice(0, MAX_NAME_LENGTH);
  }

  if (body.photo !== undefined) {
    if (body.photo === null) {
      patch.photo = null;
    } else if (typeof body.photo === "string" && body.photo.startsWith("data:image/")) {
      if (body.photo.length > MAX_PHOTO_LENGTH) {
        res.status(400).json({ error: "Imagem muito grande." });
        return;
      }
      patch.photo = body.photo;
    } else {
      res.status(400).json({ error: "Foto inválida." });
      return;
    }
  }

  const profile = accountStore.updateProfile(id, patch);
  res.json({ profile });
});

// --- Reset de estatísticas/recordes (aba Configurações, só a conta André) --

accountsRouter.delete("/:id/solo-stats", (req, res) => {
  const { id } = req.params;
  if (!isAccountId(id)) {
    res.status(404).json({ error: "Conta não encontrada." });
    return;
  }
  if (!requireAndre(req, res)) return;
  accountStore.resetSoloStats(id);
  res.json({ ok: true });
});

accountsRouter.delete("/duo-shared-stats", (req, res) => {
  if (!requireAndre(req, res)) return;
  accountStore.resetDuoSharedStats();
  res.json({ ok: true });
});

accountsRouter.delete("/:id/duo-stats", (req, res) => {
  const { id } = req.params;
  if (!isAccountId(id)) {
    res.status(404).json({ error: "Conta não encontrada." });
    return;
  }
  if (!requireAndre(req, res)) return;
  accountStore.resetDuoParticipation(id);
  res.json({ ok: true });
});

accountsRouter.delete("/:id/records/:mode", (req, res) => {
  const { id, mode } = req.params;
  if (!isAccountId(id)) {
    res.status(404).json({ error: "Conta não encontrada." });
    return;
  }
  if (mode !== "solo" && mode !== "duo") {
    res.status(400).json({ error: "Modo de recorde inválido." });
    return;
  }
  if (!requireAndre(req, res)) return;
  accountStore.resetRecords(id, mode);
  res.json({ ok: true });
});

/** Recorde "Juntos" é da dupla, não de uma conta — sem :id na rota. */
accountsRouter.delete("/records/together", (req, res) => {
  if (!requireAndre(req, res)) return;
  accountStore.resetTogetherRecords();
  res.json({ ok: true });
});
