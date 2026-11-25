import type { AmmoRegenerationDefinition } from "../types/EntityTypes";
import type { Inventory } from "./Inventory";

/**
 * Passiva di ricarica delle munizioni (il Ranger con le frecce): ogni intervalMs aggiunge una munizione all'arma
 * indicata, se è nella borsa (in mano o no). Il tempo scorre solo quando manca almeno una munizione, così dopo un
 * tiro la prima freccia arriva sempre dopo un intervallo intero.
 */
export class AmmoRegeneration {
  private elapsedMs = 0;

  /** Fa passare il tempo; true se in questo passo è stata aggiunta una munizione. */
  public update(deltaTimeMs: number, definition: AmmoRegenerationDefinition | undefined, inventory: Inventory): boolean {
    if (definition === undefined || !inventory.isMissingAmmo(definition.weaponId)) {
      this.reset();
      return false;
    }
    this.elapsedMs += deltaTimeMs;
    if (this.elapsedMs < definition.intervalMs) {
      return false;
    }
    this.elapsedMs -= definition.intervalMs;
    return inventory.addAmmo(definition.weaponId, 1);
  }

  public reset(): void {
    this.elapsedMs = 0;
  }
}
