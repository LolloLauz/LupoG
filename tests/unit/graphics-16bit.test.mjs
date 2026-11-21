// Strumenti grafici a 16 bit: retino, gradienti a fasce, rampe, ciclo dei colori, ondulazione, font, contorni

export const description = "Grafica 16 bit: retino, gradienti, rampe, ciclo dei colori, ondulazione, font proporzionale, contorni degli sprite";

export default async function (t, load) {
  const effects = await load("rendering/PaletteEffects");
  const { PALETTE, PALETTE_RAMPS } = await load("config/gameConfig");
  const font = await load("rendering/BitmapFont");
  const { addOutline, remapSpriteKeys } = await load("rendering/sprites/spriteTools");
  const { Renderer } = await load("rendering/Renderer");

  // ---------- retino ordinato (Bayer 4x4) ----------
  const bayerValues = effects.BAYER_MATRIX_4X4.flat().sort((a, b) => a - b);
  t("la matrice di Bayer contiene ogni valore da 0 a 15 una volta", bayerValues.every((value, index) => value === index));
  const countOn = (level) => {
    let on = 0;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (effects.isDitherPixelOn(x, y, level)) on++;
    return on;
  };
  t("livello n del retino = n pixel accesi su 16 (0, 4, 8, 12, 16)", [0, 4, 8, 12, 16].every((level) => countOn(level) === level));
  t("livello 8 = scacchiera perfetta", [0, 1, 2, 3].every((y) => [0, 1, 2, 3].every((x) => effects.isDitherPixelOn(x, y, 8) === ((x + y) % 2 === 0))));
  t("il retino si ripete ogni 4 pixel anche con coordinate negative", [-8, -5, -1].every((x) => effects.isDitherPixelOn(x, 3, 6) === effects.isDitherPixelOn(x + 4, 3, 6)));
  const tile = effects.buildDitherTile(PALETTE.black, PALETTE.navy, 8);
  t("la tessera del retino usa solo i due colori richiesti", tile.flat().every((c) => c === PALETTE.black || c === PALETTE.navy) && tile.flat().filter((c) => c === PALETTE.navy).length === 8);
  t("livelli fuori intervallo ricondotti a 0-16", effects.clampDitherLevel(-3) === 0 && effects.clampDitherLevel(40) === 16 && effects.clampDitherLevel(7.6) === 8);

  // ---------- gradienti a fasce ----------
  const colors = [PALETTE.black, PALETTE.darkBlue, PALETTE.navy];
  const bands = effects.computeGradientBands(10, 100, colors, 4);
  const totalHeight = bands.reduce((sum, band) => sum + band.height, 0);
  t("le fasce del gradiente coprono esattamente l'altezza richiesta, senza buchi né sovrapposizioni", totalHeight === 100 && bands.every((band, i) => i === 0 ? band.top === 10 : band.top === bands[i - 1].top + bands[i - 1].height));
  t("il gradiente parte dal primo colore pieno", bands[0].colorA === PALETTE.black && bands[0].level === 0);
  t("il gradiente usa solo i colori indicati", bands.every((band) => colors.includes(band.colorA) && colors.includes(band.colorB)));
  t("con 4 gradini i livelli del retino sono 0, 4, 8, 12", bands.every((band) => [0, 4, 8, 12].includes(band.level)));
  t("le fasce adiacenti uguali sono unite (2 segmenti x 4 gradini = 8 fasce)", bands.length === 8, String(bands.length));
  t("gradiente con un solo colore = una fascia piena; altezza zero = nessuna fascia", effects.computeGradientBands(0, 50, [PALETTE.red]).length === 1 && effects.computeGradientBands(0, 0, colors).length === 0);

  // ---------- rampe e ombreggiatura ----------
  t("shadeColor scurisce e schiarisce lungo la rampa", effects.shadeColor(PALETTE.gray, -1) === PALETTE.slate && effects.shadeColor(PALETTE.gray, 1) === PALETTE.lightGray);
  t("shadeColor si ferma agli estremi della rampa", effects.shadeColor(PALETTE.black, -5) === PALETTE.black && effects.shadeColor(PALETTE.white, 9) === PALETTE.white);
  t("shadeColor lascia invariato un colore che non è in nessuna rampa", effects.shadeColor("#123456", 2) === "#123456");

  // ---------- ciclo dei colori ----------
  const ramp = PALETTE_RAMPS.fire;
  t("ciclo 'loop': avanza di un colore per passo e ricomincia", effects.cycleRampColor(ramp, 0, 10) === ramp[0] && effects.cycleRampColor(ramp, 0.1, 10) === ramp[1] && effects.cycleRampColor(ramp, ramp.length / 10, 10) === ramp[0]);
  const pingPong = Array.from({ length: 12 }, (_, step) => ramp.indexOf(effects.cycleRampColor(ramp, step / 10, 10, 0, "pingPong")));
  t("ciclo 'pingPong': 0,1,...,5,4,...,1,0,...", pingPong.join(",") === "0,1,2,3,4,5,4,3,2,1,0,1", pingPong.join(","));
  t("lo sfasamento (offset) sposta il ciclo", effects.cycleRampColor(ramp, 0, 10, 2) === ramp[2]);
  t("il ciclo restituisce sempre colori della rampa (tempi casuali)", Array.from({ length: 200 }, () => effects.cycleRampColor(ramp, Math.random() * 100, 7.3, Math.floor(Math.random() * 9) - 4, Math.random() < 0.5 ? "loop" : "pingPong")).every((c) => ramp.includes(c)));

  // ---------- ondulazione ----------
  const offsets = Array.from({ length: 64 }, (_, row) => effects.computeLineWaveOffset(row, 3, 16, 0.7));
  t("ondulazione: spostamenti interi entro l'ampiezza", offsets.every((o) => Number.isInteger(o) && Math.abs(o) <= 3) && offsets.some((o) => o !== 0));
  t("ondulazione: lunghezza d'onda zero = nessuno spostamento", effects.computeLineWaveOffset(5, 3, 0, 1) === 0);

  // ---------- Renderer: retino, gradiente, ondulazione su un finto canvas ----------
  const calls = [];
  const patterns = [];
  const makeContext = (log) => ({
    imageSmoothingEnabled: true,
    fillStyle: "",
    fillRect(...args) { log.push({ kind: "fillRect", args, style: this.fillStyle }); },
    drawImage(...args) { log.push({ kind: "drawImage", args }); },
    createPattern(source) { const pattern = { pattern: patterns.length, source }; patterns.push(pattern); return pattern; },
  });
  const tileLog = [];
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => makeContext(tileLog) }) };
  globalThis.window = { innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, addEventListener() {} };
  const fakeCanvas = { width: 0, height: 0, style: {}, getContext: () => makeContext(calls) };
  const renderer = new Renderer(fakeCanvas);

  calls.length = 0;
  renderer.fillDithered(3.4, 5.6, 20.2, 10, PALETTE.black, PALETTE.navy, 0);
  t("retino livello 0 = rettangolo pieno del primo colore", calls.length === 1 && calls[0].style === PALETTE.black);
  calls.length = 0;
  renderer.fillDithered(0, 0, 20, 10, PALETTE.black, PALETTE.navy, 16);
  t("retino livello 16 = rettangolo pieno del secondo colore", calls.length === 1 && calls[0].style === PALETTE.navy);
  calls.length = 0;
  tileLog.length = 0;
  renderer.fillDithered(1.3, 2.7, 30.4, 10.2, PALETTE.black, PALETTE.navy, 8);
  renderer.fillDithered(50, 2, 10, 10, PALETTE.black, PALETTE.navy, 8);
  t("retino intermedio: un solo rettangolo a coordinate intere riempito col motivo", calls.length === 2 && calls.every((c) => c.args.every(Number.isInteger) && typeof c.style === "object"));
  t("il motivo del retino si crea una volta sola per coppia di colori e livello", patterns.length === 1);
  t("il motivo è disegnato pixel per pixel con i soli due colori", tileLog.length === 16 && tileLog.every((c) => (c.style === PALETTE.black || c.style === PALETTE.navy) && c.args[2] === 1 && c.args[3] === 1));

  calls.length = 0;
  renderer.fillVerticalGradient(0, 0, 320, 120, colors);
  t("il gradiente disegna fasce a coordinate intere che coprono tutta l'altezza", calls.every((c) => c.args.every(Number.isInteger)) && calls.reduce((sum, c) => sum + c.args[3], 0) === 120);

  calls.length = 0;
  renderer.applyLineWave(100, 40, 2, 10, 0);
  const lineCopies = calls.filter((c) => c.kind === "drawImage");
  t("ondulazione: ogni riga spostata è copiata a una posizione intera, alta 1 pixel, dentro la fascia", lineCopies.length > 0 && lineCopies.every((c) => Number.isInteger(c.args[5]) && c.args[4] === 1 && c.args[8] === 1 && c.args[6] >= 100 && c.args[6] < 140));
  calls.length = 0;
  renderer.applyLineWave(100, 40, 0, 10, 0);
  t("ondulazione con ampiezza zero non disegna nulla", calls.length === 0);

  calls.length = 0;
  renderer.drawText("Ab", 10, 10, PALETTE.white, { shadowColor: PALETTE.black });
  const shadowPixels = calls.filter((c) => c.style === PALETTE.black);
  const textPixels = calls.filter((c) => c.style === PALETTE.white);
  t("testo con ombra: l'ombra ha gli stessi pixel spostati di 1 in basso a destra", shadowPixels.length === textPixels.length && shadowPixels.length > 0 && shadowPixels.every((s, i) => s.args[0] === textPixels[i].args[0] + 1 && s.args[1] === textPixels[i].args[1] + 1));

  // ---------- font ----------
  const allLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789àèéìòù.,:;!?-+=/()'\"&%_<>^*";
  const fallback = font.getGlyphRows("~");
  t("il font ha un glifo per ogni lettera maiuscola e minuscola, cifra, accentata e simbolo comune", [...allLetters].every((c) => c === "?" || font.getGlyphRows(c) !== fallback), [...allLetters].filter((c) => c !== "?" && font.getGlyphRows(c) === fallback).join(""));
  t(`ogni glifo ha ${font.GLYPH_HEIGHT} righe da ${font.GLYPH_WIDTH} colonne fatte solo di '#' e '.'`, [...allLetters].every((c) => { const rows = font.getGlyphRows(c); return rows.length === font.GLYPH_HEIGHT && rows.every((r) => r.length === font.GLYPH_WIDTH && /^[#.]+$/.test(r)); }));
  t("maiuscole e cifre stanno nelle righe 0-6 (le righe dei discendenti sono vuote)", [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"].every((c) => font.getGlyphRows(c).slice(font.GLYPH_CAP_HEIGHT).every((r) => r === ".....")));
  t("le minuscole con discendenti (g, j, p, q, y) usano le righe 7-8", [..."gjpqy"].every((c) => font.getGlyphRows(c).slice(7).some((r) => r.includes("#"))));
  t("minuscole e maiuscole sono glifi diversi", font.getGlyphRows("a") !== font.getGlyphRows("A"));
  t("spaziatura proporzionale: 'i' è più stretta di 'm'", font.measureTextWidth("i", 1) < font.measureTextWidth("m", 1));
  t("le cifre hanno tutte la stessa larghezza (i numeri non ballano)", new Set([..."0123456789"].map((c) => font.measureTextWidth(c, 1))).size === 1 && font.measureTextWidth("111111", 1) === font.measureTextWidth("888888", 1));
  t("la larghezza del testo scala con il moltiplicatore", font.measureTextWidth("Punti 120", 3) === font.measureTextWidth("Punti 120", 1) * 3);
  t("maiuscole accentate diventano la lettera semplice", font.getGlyphRows("È") === font.getGlyphRows("E"));

  // ---------- contorni e varianti degli sprite ----------
  const outlined = addOutline([".....", "..a..", ".aba.", "..a..", "....."], "k");
  t("addOutline: contorno sui 4 lati dei pixel colorati, interno invariato, dimensioni invariate", outlined.join("|") === "..k..|.kak.|kabak|.kak.|..k..", outlined.join("|"));
  t("addOutline non tocca i pixel già colorati", addOutline(["ab", "cd"], "k").join("|") === "ab|cd");
  t("remapSpriteKeys sostituisce solo i caratteri indicati", remapSpriteKeys(["aab.", ".ba."], { a: "r" }).join("|") === "rrb.|.br.");
}
