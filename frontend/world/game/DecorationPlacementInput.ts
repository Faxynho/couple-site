export type DecorationPointerSource = "phaser" | "dom-touch";

export type DecorationPointerSession = {
  source: DecorationPointerSource;
  id: number;
};

/**
 * Mantém uma única sessão de posicionamento ativa. A separação entre a fonte
 * DOM touch e a fonte do Phaser evita que o mesmo gesto confirme duas vezes.
 */
export class DecorationPlacementInput {
  private current: DecorationPointerSession | null = null;

  get active() {
    return this.current;
  }

  start(source: DecorationPointerSource, id: number) {
    if (this.current) return this.owns(source, id);
    this.current = { source, id };
    return true;
  }

  owns(source: DecorationPointerSource, id: number) {
    return this.current?.source === source && this.current.id === id;
  }

  finish(source: DecorationPointerSource, id: number, blocked: boolean) {
    if (!this.owns(source, id)) return false;
    this.current = null;
    return !blocked;
  }

  cancel(source?: DecorationPointerSource, id?: number) {
    if (!this.current) return false;
    if (source !== undefined && this.current.source !== source) return false;
    if (id !== undefined && this.current.id !== id) return false;
    this.current = null;
    return true;
  }

  reset() {
    const previous = this.current;
    this.current = null;
    return previous;
  }
}
