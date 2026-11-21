import { PALETTE } from "../config/gameConfig";
import type { PlatformDefinition, ThemeStyle } from "../types/LevelTypes";
import type { Camera } from "./Camera";
import type { Renderer } from "./Renderer";

/** Numero pseudo-casuale ripetibile (0..999) a partire da un intero. */
function hashNumber(value: number): number {
  let hashed = Math.imul(value + 7919, 2654435761) >>> 0;
  hashed ^= hashed >>> 15;
  return hashed % 1000;
}

/**
 * Disegna il terreno in stile 16 bit: piattaforme solide con la tessitura dell'ambientazione
 * (erba e terra, piastrelle di pietra, mattoni del dungeon), piattaforme sospese, porta
 * d'uscita e cancello dell'arena del boss.
 * Tutti i motivi sono ancorati alle coordinate del MONDO (non dello schermo): scorrono con la
 * camera senza "tremare". Si disegna solo la parte visibile di ogni piattaforma.
 */
export class TerrainRenderer {
  public renderPlatform(renderer: Renderer, platform: PlatformDefinition, camera: Camera, style: ThemeStyle): void {
    const visibleStart = Math.max(platform.x, camera.x - 4);
    const visibleEnd = Math.min(platform.x + platform.width, camera.x + renderer.width + 4);
    if (visibleEnd <= visibleStart) {
      return;
    }
    if (platform.oneWay === true) {
      this.renderLedge(renderer, platform, camera, style, visibleStart, visibleEnd);
      return;
    }
    const screenY = platform.y - camera.y;
    renderer.fillRect(visibleStart - camera.x, screenY, visibleEnd - visibleStart, platform.height, style.fillColors[1]);
    switch (style.terrainTexture) {
      case "grassAndEarth":
        this.renderEarth(renderer, platform, camera, style, visibleStart, visibleEnd);
        break;
      case "stoneTiles":
        this.renderMasonry(renderer, platform, camera, style, visibleStart, visibleEnd, 16, 8, false);
        break;
      case "dungeonBricks":
        this.renderMasonry(renderer, platform, camera, style, visibleStart, visibleEnd, 24, 10, true);
        break;
    }
    // bordi verticali in ombra (pareti degli abissi e dei blocchi)
    if (platform.x >= visibleStart) {
      renderer.fillRect(platform.x - camera.x, screenY, 1, platform.height, style.fillColors[3]);
    }
    if (platform.x + platform.width <= visibleEnd) {
      renderer.fillRect(platform.x + platform.width - 1 - camera.x, screenY, 1, platform.height, style.fillColors[3]);
      renderer.fillRect(platform.x + platform.width - 2 - camera.x, screenY + 3, 1, platform.height - 3, style.fillColors[2]);
    }
  }

  /** Erba a tre toni con fili d'erba sopra e radici sotto, terra con sassi e strati più scuri. */
  private renderEarth(
    renderer: Renderer,
    platform: PlatformDefinition,
    camera: Camera,
    style: ThemeStyle,
    visibleStart: number,
    visibleEnd: number
  ): void {
    const screenY = platform.y - camera.y;
    const visibleWidth = visibleEnd - visibleStart;
    const screenStart = visibleStart - camera.x;
    // strati di terra sempre più scuri verso il basso (a retino)
    renderer.fillDitheredOverlay(screenStart, screenY + 14, visibleWidth, platform.height - 14, style.fillColors[2], 6);
    renderer.fillDitheredOverlay(screenStart, screenY + 26, visibleWidth, platform.height - 26, style.fillColors[2], 12);
    // sassi e venature, in celle 8x6 del mondo
    for (let cellY = platform.y + 6; cellY < platform.y + platform.height - 2; cellY += 6) {
      for (let cellX = Math.floor(visibleStart / 8) * 8; cellX < visibleEnd; cellX += 8) {
        const randomValue = hashNumber(cellX * 7 + cellY * 131);
        if (randomValue % 5 === 0) {
          renderer.fillRect(cellX + (randomValue % 5) - camera.x, cellY - camera.y + 2, 3, 2, style.detailColors[0]);
          renderer.fillRect(cellX + (randomValue % 5) - camera.x, cellY - camera.y + 2, 1, 1, style.detailColors[1]);
        } else if (randomValue % 7 === 0) {
          renderer.fillRect(cellX + (randomValue % 6) - camera.x, cellY - camera.y + 3, 2, 1, style.fillColors[0]);
        }
      }
    }
    // superficie erbosa: luce, colore, ombra
    renderer.fillRect(screenStart, screenY, visibleWidth, 4, style.surfaceColors[1]);
    renderer.fillRect(screenStart, screenY, visibleWidth, 1, style.surfaceColors[0]);
    renderer.fillRect(screenStart, screenY + 4, visibleWidth, 1, style.surfaceColors[2]);
    for (let columnX = Math.floor(visibleStart / 2) * 2; columnX < visibleEnd; columnX += 2) {
      const randomValue = hashNumber(columnX * 3 + 11);
      // radici ed erba che pende sotto la superficie
      const hangLength = randomValue % 4;
      if (hangLength > 0) {
        renderer.fillRect(columnX - camera.x, screenY + 5, 1, hangLength, style.surfaceColors[2]);
      }
      // fili d'erba sopra la superficie (solo decorazione, fuori dall'hitbox)
      if (randomValue % 3 === 0) {
        const bladeHeight = 1 + (randomValue % 3);
        renderer.fillRect(columnX - camera.x, screenY - bladeHeight, 1, bladeHeight, randomValue % 2 === 0 ? style.surfaceColors[0] : style.surfaceColors[1]);
      }
    }
  }

  /**
   * Muratura a blocchi smussati (luce in alto a sinistra, ombra in basso a destra) con fughe scure.
   * "isStaggered" sfalsa le file (mattoni); "mossy" aggiunge muschio a retino su alcuni blocchi.
   */
  private renderMasonry(
    renderer: Renderer,
    platform: PlatformDefinition,
    camera: Camera,
    style: ThemeStyle,
    visibleStart: number,
    visibleEnd: number,
    blockWidth: number,
    blockHeight: number,
    isStaggered: boolean
  ): void {
    const screenY = platform.y - camera.y;
    const [light, face, shadow, mortar] = style.fillColors;
    const surfaceHeight = 3;
    for (let rowIndex = 0; surfaceHeight + rowIndex * blockHeight < platform.height; rowIndex++) {
      const rowTop = platform.y + surfaceHeight + rowIndex * blockHeight;
      const rowHeight = Math.min(blockHeight, platform.y + platform.height - rowTop);
      const rowOffset = isStaggered ? (rowIndex % 2) * (blockWidth / 2) : 0;
      const firstBlockX = Math.floor((visibleStart - rowOffset) / blockWidth) * blockWidth + rowOffset;
      for (let blockX = firstBlockX; blockX < visibleEnd; blockX += blockWidth) {
        const left = Math.max(blockX, visibleStart);
        const right = Math.min(blockX + blockWidth, visibleEnd);
        const screenLeft = left - camera.x;
        const screenTop = rowTop - camera.y;
        const randomValue = hashNumber(blockX * 13 + rowIndex * 977);
        const blockFace = randomValue % 6 === 0 ? shadow : face;
        renderer.fillRect(screenLeft, screenTop, right - left, rowHeight, mortar);
        renderer.fillRect(screenLeft, screenTop + 1, right - left, rowHeight - 1, blockFace);
        renderer.fillRect(screenLeft, screenTop + 1, right - left, 1, light);
        if (blockX >= visibleStart) {
          renderer.fillRect(screenLeft, screenTop, 1, rowHeight, mortar);
          renderer.fillRect(screenLeft + 1, screenTop + 1, 1, rowHeight - 1, light);
        }
        renderer.fillRect(screenLeft, screenTop + rowHeight - 1, right - left, 1, shadow);
        if (randomValue % 9 === 0) {
          renderer.fillDitheredOverlay(screenLeft, screenTop + rowHeight - 4, right - left, 3, style.detailColors[0], 8);
          renderer.fillDitheredOverlay(screenLeft, screenTop + rowHeight - 3, right - left, 2, style.detailColors[1], 4);
        }
      }
    }
    // superficie calpestabile
    const screenStart = visibleStart - camera.x;
    const visibleWidth = visibleEnd - visibleStart;
    renderer.fillRect(screenStart, screenY, visibleWidth, surfaceHeight, style.surfaceColors[1]);
    renderer.fillRect(screenStart, screenY, visibleWidth, 1, style.surfaceColors[0]);
    renderer.fillRect(screenStart, screenY + surfaceHeight - 1, visibleWidth, 1, style.surfaceColors[2]);
  }

  /** Piattaforma sospesa (attraversabile dal basso): asse o lastra con giunti, chiodi e ombra sotto. */
  private renderLedge(
    renderer: Renderer,
    platform: PlatformDefinition,
    camera: Camera,
    style: ThemeStyle,
    visibleStart: number,
    visibleEnd: number
  ): void {
    const [top, body, bottom] = style.ledgeColors;
    const screenStart = visibleStart - camera.x;
    const screenY = platform.y - camera.y;
    const visibleWidth = visibleEnd - visibleStart;
    renderer.fillRect(screenStart, screenY, visibleWidth, platform.height, body);
    renderer.fillRect(screenStart, screenY, visibleWidth, 1, top);
    renderer.fillRect(screenStart, screenY + platform.height - 2, visibleWidth, 1, bottom);
    renderer.fillRect(screenStart, screenY + platform.height - 1, visibleWidth, 1, PALETTE.black);
    // venature o giunti ogni 12 pixel del mondo, con chiodi
    for (let jointX = Math.ceil(visibleStart / 12) * 12; jointX < visibleEnd; jointX += 12) {
      renderer.fillRect(jointX - camera.x, screenY + 1, 1, platform.height - 3, bottom);
      renderer.fillRect(jointX - camera.x + 2, screenY + 2, 1, 1, top);
    }
    renderer.fillRect(screenStart, screenY + 3, visibleWidth, 1, bottom);
    // estremità
    if (platform.x >= visibleStart) {
      renderer.fillRect(platform.x - camera.x, screenY, 1, platform.height, PALETTE.black);
    }
    if (platform.x + platform.width <= visibleEnd) {
      renderer.fillRect(platform.x + platform.width - 1 - camera.x, screenY, 1, platform.height, PALETTE.black);
    }
    // ombra a retino sotto la piattaforma
    renderer.fillDitheredOverlay(screenStart + 2, screenY + platform.height, visibleWidth - 4, 3, PALETTE.black, 8);
  }

  /** Porta di uscita: arco di pietra, battenti di legno con bande di ferro, luce calda all'interno. */
  public renderExitDoor(renderer: Renderer, exitX: number, camera: Camera): void {
    const doorX = exitX - 4 - camera.x;
    if (doorX < -40 || doorX > renderer.width + 8) {
      return;
    }
    const doorY = 200 - 38 - camera.y;
    // arco di conci
    renderer.fillRect(doorX - 6, doorY - 6, 36, 44, PALETTE.stoneDark);
    renderer.fillRect(doorX - 5, doorY - 5, 34, 43, PALETTE.stone);
    renderer.fillRect(doorX - 5, doorY - 5, 34, 1, PALETTE.stonePale);
    renderer.fillRect(doorX - 5, doorY - 5, 1, 43, PALETTE.stoneLight);
    renderer.fillRect(doorX + 28, doorY - 4, 1, 42, PALETTE.stoneShadow);
    for (let stoneY = doorY + 2; stoneY < doorY + 38; stoneY += 8) {
      renderer.fillRect(doorX - 5, stoneY, 5, 1, PALETTE.stoneShadow);
      renderer.fillRect(doorX + 24, stoneY + 4, 5, 1, PALETTE.stoneShadow);
    }
    renderer.fillRect(doorX + 10, doorY - 6, 4, 5, PALETTE.stonePale);
    // apertura con luce calda (gradiente a fasce)
    renderer.fillRect(doorX - 1, doorY - 1, 26, 39, PALETTE.black);
    renderer.fillVerticalGradient(doorX, doorY, 24, 38, [PALETTE.cream, PALETTE.yellow, PALETTE.orange]);
    // battenti aperti
    for (const [leafX, leafWidth] of [[doorX, 6], [doorX + 18, 6]] as const) {
      renderer.fillRect(leafX, doorY, leafWidth, 38, PALETTE.wood);
      renderer.fillRect(leafX, doorY, 1, 38, PALETTE.woodLight);
      renderer.fillRect(leafX + leafWidth - 1, doorY, 1, 38, PALETTE.earth);
      renderer.fillRect(leafX, doorY + 8, leafWidth, 2, PALETTE.slate);
      renderer.fillRect(leafX, doorY + 28, leafWidth, 2, PALETTE.slate);
    }
  }

  /** Cancello a saracinesca che chiude l'arena del boss: sbarre di ferro ombreggiate e punte. */
  public renderArenaGate(renderer: Renderer, gate: PlatformDefinition, camera: Camera): void {
    const gateX = gate.x - camera.x;
    renderer.fillRect(gateX, 0, gate.width, gate.height, PALETTE.black);
    for (let barX = gateX + 1; barX < gateX + gate.width - 1; barX += 5) {
      renderer.fillRect(barX, 0, 3, gate.height, PALETTE.slate);
      renderer.fillRect(barX, 0, 1, gate.height, PALETTE.lightGray);
      renderer.fillRect(barX + 2, 0, 1, gate.height, PALETTE.darkBlue);
      renderer.fillRect(barX, gate.height - 4, 3, 4, PALETTE.gray);
      renderer.fillRect(barX + 1, gate.height - 1, 1, 1, PALETTE.white);
    }
    for (let barY = 12; barY < gate.height; barY += 40) {
      renderer.fillRect(gateX, barY, gate.width, 3, PALETTE.slate);
      renderer.fillRect(gateX, barY, gate.width, 1, PALETTE.lightGray);
      for (let rivetX = gateX + 2; rivetX < gateX + gate.width; rivetX += 5) {
        renderer.fillRect(rivetX, barY + 1, 1, 1, PALETTE.white);
      }
    }
  }
}
