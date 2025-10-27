import React, { useEffect, useRef, useState } from "react";
import playIcon from "./assets/icons/play.png";
import resetIcon from "./assets/icons/reset.png";
import playOnceIcon from "./assets/icons/next.png";
import pauseIcon from "./assets/icons/pause.png";
import playFastIcon from "./assets/icons/fast-forward.png";
import GridManager from "./grid/GridManager";
import { applyPatternToGrid, patterns } from "./figures";

const GRID_COLS = 1000;
const GRID_ROWS = 1000;
const DEFAULT_CELL_SIZE = 10; // valeur de référence (px pour 100%)
const IS_TOAST_ENABLED = true; // activer/désactiver le toast d'info sur double-clic
const DEFAULT_SLOW_SPEED_MS = 60; // intervalle par défaut pour autoplay lent
const DEFAULT_FAST_SPEED_MS = 20; // intervalle par défaut pour autoplay rapide

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const gridRef = useRef<Uint8Array | null>(null); // 0 = white, 1 = black
  const autoTimerRef = useRef<number | null>(null); // interval id for autoplay
  const flashTimerRef = useRef<number | null>(null); // timeout id for per-button effect
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const controllerRef = useRef<{ reset: () => void }>({
    reset: () => {
      const grid = gridRef.current;
      if (!grid) return;
      grid.fill(0);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        draw();
        rafRef.current = null;
      });
    },
  });

  // zoom en pourcentage (10..300), initial 100%
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // persist the user's chosen zoom so timers/effects won't overwrite it
  const lastUserZoomRef = useRef<number>(100);

  // initialise toute la grille en mémoire au démarrage
  useEffect(() => {
    if (!gridRef.current) {
      gridRef.current = new Uint8Array(GRID_COLS * GRID_ROWS); // initialisé à 0
    }
  }, []);

  // dessine la portion visible en fonction du scroll, lit dans gridRef
  function draw(zoom = zoomPercent) {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const grid = gridRef.current;
    if (!container || !canvas || !grid) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const widthCss = container.clientWidth;
    const heightCss = container.clientHeight;

    // taille effective de cellule en px CSS selon le zoom
    const cellSize = Math.max(1, Math.round((DEFAULT_CELL_SIZE * zoom) / 100));

    // HiDPI : backing store en device pixels
    const dpr = window.devicePixelRatio || 1;
    const widthDev = Math.round(widthCss * dpr);
    const heightDev = Math.round(heightCss * dpr);
    canvas.style.width = `${widthCss}px`;
    canvas.style.height = `${heightCss}px`;
    canvas.width = widthDev;
    canvas.height = heightDev;

    // important : travailler en device pixels (pas de scale/transform)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // fond blanc - en device pixels
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, widthDev, heightDev);

    // positions de la fenêtre logique (CSS pixels)
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    // première cellule visible (indices)
    const firstCol = Math.floor(scrollLeft / cellSize);
    const firstRow = Math.floor(scrollTop / cellSize);

    // nombre de colonnes/rows visibles (+1 marge)
    const visibleCols = Math.min(GRID_COLS - firstCol, Math.ceil(widthCss / cellSize) + 1);
    const visibleRows = Math.min(GRID_ROWS - firstRow, Math.ceil(heightCss / cellSize) + 1);

    // offset pixel pour dessiner la première cellule (CSS pixels)
    const offsetXCss = -(scrollLeft - firstCol * cellSize);
    const offsetYCss = -(scrollTop - firstRow * cellSize);

    // convertir taille cellule en device pixels
    const cellDev = Math.max(1, Math.round(cellSize * dpr));

    // dessiner les cellules visibles d'après la grille en mémoire (en device pixels)
    for (let r = 0; r < visibleRows; r++) {
      const rowIndex = firstRow + r;
      for (let c = 0; c < visibleCols; c++) {
        const colIndex = firstCol + c;
        const idx = rowIndex * GRID_COLS + colIndex;
        if (grid[idx]) {
          const xCss = offsetXCss + c * cellSize;
          const yCss = offsetYCss + r * cellSize;
          const xDev = Math.round(xCss * dpr);
          const yDev = Math.round(yCss * dpr);
          ctx.fillStyle = "#000000";
          ctx.fillRect(xDev, yDev, cellDev, cellDev);
        }
      }
    }

    // dessiner les bordures (bleu foncé) en device pixels — lignes nettes avec 0.5 offset
    ctx.strokeStyle = "#0b3d91";
    ctx.lineWidth = 1;

    // verticales : i from 0..visibleCols
    for (let i = 0; i <= visibleCols; i++) {
      const xCss = offsetXCss + i * cellSize;
      const xDev = xCss * dpr;
      const xPos = Math.round(xDev) + 0.5;
      ctx.beginPath();
      ctx.moveTo(xPos, Math.round(offsetYCss * dpr) + 0.5);
      ctx.lineTo(xPos, Math.round((offsetYCss + visibleRows * cellSize) * dpr) + 0.5);
      ctx.stroke();
    }

    // horizontales : j from 0..visibleRows
    for (let j = 0; j <= visibleRows; j++) {
      const yCss = offsetYCss + j * cellSize;
      const yDev = yCss * dpr;
      const yPos = Math.round(yDev) + 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.round(offsetXCss * dpr) + 0.5, yPos);
      ctx.lineTo(Math.round((offsetXCss + visibleCols * cellSize) * dpr) + 0.5, yPos);
      ctx.stroke();
    }
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // dessiner initialement using the user's current zoom
    draw(lastUserZoomRef.current);

    const onScroll = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      const z = lastUserZoomRef.current;
      rafRef.current = requestAnimationFrame(() => {
        draw(z);
        rafRef.current = null;
      });
    };
    const onResize = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      const z = lastUserZoomRef.current;
      rafRef.current = requestAnimationFrame(() => {
        draw(z);
        rafRef.current = null;
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomPercent]);

  // toggle d'une cellule (click) : met à jour toute la grille en mémoire puis redraw
  const onContainerClick = (e: React.MouseEvent) => {
    // when autoplay is running, disable manual cell toggling
    if (autoTimerRef.current != null) return;
    const container = containerRef.current;
    const grid = gridRef.current;
    if (!container || !grid) return;
    const rect = container.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // position absolue dans la grille logique (utilise la taille actuelle des cellules)
    const cellSize = Math.max(1, Math.round((DEFAULT_CELL_SIZE * zoomPercent) / 100));
    const absoluteX = container.scrollLeft + cx;
    const absoluteY = container.scrollTop + cy;
    const col = Math.floor(absoluteX / cellSize);
    const row = Math.floor(absoluteY / cellSize);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

    const idx = row * GRID_COLS + col;
    grid[idx] = grid[idx] ? 0 : 1;
    // redraw (raf)
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const z = lastUserZoomRef.current;
    rafRef.current = requestAnimationFrame(() => {
      draw(z);
      rafRef.current = null;
    });
  };

  // slider handlers
  const onZoomChange = (val: number) => {
    setZoomPercent(val);
    lastUserZoomRef.current = val;
    // updating spacer size implicitly; redraw triggered by useEffect dependency
  };

  const spacerWidth = GRID_COLS * Math.max(1, Math.round((DEFAULT_CELL_SIZE * zoomPercent) / 100));
  const spacerHeight = GRID_ROWS * Math.max(1, Math.round((DEFAULT_CELL_SIZE * zoomPercent) / 100));

  // helper to get a cell's attributes (derive x,y,state from grid)
  const getCellAttributes = (col: number, row: number) => {
    const grid = gridRef.current;
    const inside =
      col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS && !!grid;
    const state = inside ? !!grid![row * GRID_COLS + col] : false;
    return { x: col, y: row, state };
  };

  // info toast state and timer ref
  const [infoToast, setInfoToast] = useState<
    | {
        visible: true;
        left: number;
        top: number;
        col: number;
        row: number;
        state: boolean;
      }
    | null
  >(null);
  const infoTimerRef = useRef<number | null>(null);

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (infoTimerRef.current != null) {
        clearTimeout(infoTimerRef.current);
        infoTimerRef.current = null;
      }
      if (flashTimerRef.current != null) {
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
    };
  }, []);

  // double-click handler to show attributes toast
  const onContainerDoubleClick = (e: React.MouseEvent) => {
    if (!IS_TOAST_ENABLED) return;
    const container = containerRef.current;
    const grid = gridRef.current;
    if (!container || !grid) return;
    const rect = container.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const cellSize = Math.max(1, Math.round((DEFAULT_CELL_SIZE * zoomPercent) / 100));
    const absoluteX = container.scrollLeft + cx;
    const absoluteY = container.scrollTop + cy;
    const col = Math.floor(absoluteX / cellSize);
    const row = Math.floor(absoluteY / cellSize);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

    const attrs = getCellAttributes(col, row);

    // compute position inside the parent (pixels relative to the main fixed div)
    // place the toast above the cell if possible
    const left = col * cellSize - container.scrollLeft;
    let top = row * cellSize - container.scrollTop - 28; // put above cell
    if (top < 4) top = row * cellSize - container.scrollTop + cellSize + 4; // fallback below cell

    // show toast for 2 seconds
    setInfoToast({ visible: true, left, top, col: attrs.x, row: attrs.y, state: attrs.state });
    if (infoTimerRef.current != null) {
      clearTimeout(infoTimerRef.current);
    }
    infoTimerRef.current = window.setTimeout(() => {
      setInfoToast(null);
      infoTimerRef.current = null;
    }, 2000);
  };

  // run the "simpleAlgo" directly on the Uint8Array gridRef
  const runConwayStep = () => {
    const grid = gridRef.current;
    if (!grid) return;
    // delegate to GridManager's static implementation
    GridManager.conwayStepOnGrid(grid, GRID_COLS, GRID_ROWS);
    // request redraw
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const z = lastUserZoomRef.current;
    rafRef.current = requestAnimationFrame(() => {
      draw(z);
      rafRef.current = null;
    });
  }

  // start autoplay: accept a boolean to decide whether to run immediately,
  // then schedule periodic runs every 500ms
  const startAutoPlay = (runFast: boolean = false) => {
    if (autoTimerRef.current != null) 
    {
      stopAutoPlay();
    }
    // schedule periodic runs
    autoTimerRef.current = window.setInterval(() => {
      runConwayStep();
    }, runFast ? DEFAULT_FAST_SPEED_MS : DEFAULT_SLOW_SPEED_MS);
  };

  // stop autoplay
  const stopAutoPlay = () => {
    if (autoTimerRef.current != null) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  // cleanup autoplay on unmount
  useEffect(() => {
    return () => {
      if (autoTimerRef.current != null) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, []);

  // trigger a quick per-button visual effect then revert
  const triggerButtonEffect = (id: string, duration = 100) => {
    // clear any running effect
    if (flashTimerRef.current != null) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    setActiveButton(id);
    flashTimerRef.current = window.setTimeout(() => {
      setActiveButton(null);
      flashTimerRef.current = null;
    }, duration);
  };

  // apply named pattern from figures.ts onto the current Uint8Array grid
  const applyPattern = (name: keyof typeof patterns) => {
    const grid = gridRef.current;
    if (!grid) return;
    applyPatternToGrid(grid, GRID_COLS, GRID_ROWS, name);
    // redraw using user's zoom
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const z = lastUserZoomRef.current;
    rafRef.current = requestAnimationFrame(() => {
      draw(z);
      rafRef.current = null;
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 5,
        left: 5,
        right: 5,
        bottom: 5,
        background: "#ffffff",
        border: "2px solid black",
        boxSizing: "border-box",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        msUserSelect: "none",
      }}
    >
      {/* conteneur scrollable qui montre une surface logique (taille du spacer dépend du zoom) */}
      <div
        ref={containerRef}
        onClick={onContainerClick}
        onDoubleClick={onContainerDoubleClick}
        style={{
          width: "100%",
          height: "100%",
          margin: "0px",
          overflow: "auto",
          position: "relative",
          background: "transparent",
        }}
      >
        {/* spacer crée l'étendue de scroll (la grille "dépassant" le div) */}
        <div
          style={{
            width: spacerWidth,
            height: spacerHeight,
          }}
        />
      </div>

      {/* info toast shown on double-click (position relative to the main fixed div) */}
      {infoToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            left: infoToast.left,
            top: infoToast.top,
            zIndex: 120,
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: "6px 8px",
            borderRadius: 6,
            fontSize: 12,
            pointerEvents: "none",
            transform: "translate(-50%, 0)",
            whiteSpace: "nowrap",
          }}
        >
          x: {infoToast.col} • y: {infoToast.row} • state: {infoToast.state ? 1 : 0}
        </div>
      )}

      {/* canvas overlay placé à l'intérieur du même parent et couvrant exactement la zone intérieure */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      {/* barre de zoom (bottom-right, 20px du bas du div principal) - rendu plus compact, step 10% */}
      <div
        style={{
          position: "absolute",
          right: 20,
          bottom: 20,
          display: "flex",
          flexDirection: "row",      // horizontal layout
          alignItems: "center",
          gap: 8,
          zIndex: 50,
          background: "rgba(0,0,0,0.45)",
          padding: 6,
          borderRadius: 6,
        }}
      >
        {/* left: percent + slider (vertical) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ color: "#fff", fontSize: 11 }}>{zoomPercent}%</div>
          <input
            type="range"
            min={50}
            max={200}
            step={10} // move by 10% steps
            value={zoomPercent}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            style={{ width: 120}} // smaller slider
            aria-label="Zoom"
          />
        </div>

        {/* compact reset button on the right of the zoom control */}
        <button
          onClick={() => { setZoomPercent(100); lastUserZoomRef.current = 100; }}
          title="Reset zoom"
          aria-label="Reset zoom"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "none",
            color: "#fff",
            padding: 4,
            borderRadius: 6,
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {/* small SVG reset icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M21 12a9 9 0 10-3.2 6.6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 3v6h-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
       {/* apply "block" pattern (example) */}
       <button
         onClick={() => { triggerButtonEffect("pattern"); applyPattern("gosperglidergun"); }}
         title="Apply block pattern"
         aria-label="Apply block pattern"
         style={{
           background: "rgba(255,255,255,0.06)",
           border: "none",
           color: "#fff",
           padding: 4,
           borderRadius: 6,
           width: 28,
           height: 28,
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           cursor: "pointer",
           transform: activeButton === "pattern" ? "scale(1.12)" : "none",
           transition: "transform 140ms ease",
         }}
       >
         {/* tiny indicator (could be replaced by an icon) */}
         <div style={{ width: 10, height: 10, background: "#fff", borderRadius: 2 }} />
       </button>
      </div>

      {/* floating play triangle - no background, only the triangle */}
      <div
        style={{
          position: "absolute",
          right: 20,
          top: 20,
          zIndex: 90,
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: 6,
          borderRadius: 6,
          background: "rgba(0,0,0,0.12)", // semi-transparent wrapper
          pointerEvents: "auto",
        }}
        aria-hidden={false}
      >
        <img
          src={playOnceIcon}
          alt="Play Once"
          onClick={() => { triggerButtonEffect("playOnce"); runConwayStep(); }}
          role="button"
          aria-label="Run single step"
          style={{
            width: 20,
            height: 20,
            cursor: "pointer",
            display: "block",
            transform: activeButton === "playOnce" ? "scale(1.2)" : "none",
            transition: "transform 140ms ease",
          }}
        />
        <img
          src={playIcon}
          alt="Play"
          onClick={() => { triggerButtonEffect("play"); startAutoPlay(); }}
          role="button"
          aria-label="Start autoplay"
          style={{
            width: 20,
            height: 20,
            cursor: "pointer",
            display: "block",
            transform: activeButton === "play" ? "scale(1.2)" : "none",
            transition: "transform 140ms ease",
          }}
        />
        <img
          src={playFastIcon}
          alt="Play Fast"
          onClick={() => { triggerButtonEffect("playFast"); startAutoPlay(true); }}
          role="button"
          aria-label="Start autoplay fast"
          style={{
            width: 20,
            height: 20,
            cursor: "pointer",
            display: "block",
            transform: activeButton === "playFast" ? "scale(1.2)" : "none",
            transition: "transform 140ms ease",
          }}
        />
        <img
          src={pauseIcon}
          alt="Pause"
          onClick={() => { triggerButtonEffect("pause"); stopAutoPlay(); }}
          role="button"
          aria-label="Stop autoplay"
          style={{
            width: 20,
            height: 20,
            cursor: "pointer",
            display: "block",
            transform: activeButton === "pause" ? "scale(1.2)" : "none",
            transition: "transform 140ms ease",
          }}
        />

        {/* reset image inside a button to keep click area consistent */}
        <button
          onClick={() => { triggerButtonEffect("reset"); controllerRef.current.reset(); }}
          title="Reset grid"
          aria-label="Reset grid"
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            border: "none",
            background: "rgba(255,255,255,0.06)",
            cursor: "pointer",
            padding: 4,
            transform: activeButton === "reset" ? "scale(1.12)" : "none",
            transition: "transform 140ms ease",
          }}
        >
          <img src={resetIcon} alt="Reset" style={{ width: 20, height: 20, display: "block" }} />
        </button>
      </div>
    </div>
  );
}
