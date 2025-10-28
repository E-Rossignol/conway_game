import React, { useEffect, useRef, useState, type JSX } from "react";
import playIcon from "./assets/icons/play.png";
import resetIcon from "./assets/icons/reset.png";
import playOnceIcon from "./assets/icons/next.png";
import pauseIcon from "./assets/icons/pause.png";
import playFastIcon from "./assets/icons/fast-forward.png";
import menuIcon from "./assets/icons/menu.png";
import GridManager from "./grid/GridManager";
import { applyPatternToGrid, patterns } from "./figures";

const GRID_COLS = 1000;
const GRID_ROWS = 1000;
const DEFAULT_CELL_SIZE = 10; // valeur de référence (px pour 100%)
const IS_TOAST_ENABLED = true; // activer/désactiver le toast d'info sur double-clic
const DEFAULT_SLOW_SPEED_MS = 60; // intervalle par défaut pour autoplay lent
const DEFAULT_FAST_SPEED_MS = 20; // intervalle par défaut pour autoplay rapide
const DRAG_GHOST_OFFSET = 15; // pixels to the right of cursor for pattern ghost/placement

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

    // fond noir - en device pixels
    ctx.fillStyle = "#000000";
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
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(xDev, yDev, cellDev, cellDev);
        }
      }
    }

    // dessiner les bordures (bleu foncé) en device pixels — lignes nettes avec 0.5 offset
    ctx.strokeStyle = "#7070706e";
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

    // preview dragged pattern (semi-transparent) if any
    if (draggingPattern && dragPosRef.current) {
      const pat = patterns[draggingPattern];
      if (pat && pat.blackCells.length > 0) {
        // determine which grid cell is under the cursor
        const cx = dragPosRef.current.cx;
        const cy = dragPosRef.current.cy;
        const colUnder = Math.floor((container.scrollLeft + cx) / cellSize);
        const rowUnder = Math.floor((container.scrollTop + cy) / cellSize);
        ctx.fillStyle = "rgba(0,200,80,0.55)";
        for (const cell of pat.blackCells) {
          const gx = colUnder + cell.x;
          const gy = rowUnder + cell.y;
          // only draw if visible
          const visC = gx - firstCol;
          const visR = gy - firstRow;
          if (visC < 0 || visR < 0 || visC >= visibleCols || visR >= visibleRows) continue;
          const xCss = offsetXCss + visC * cellSize;
          const yCss = offsetYCss + visR * cellSize;
          const xDev = Math.round(xCss * dpr);
          const yDev = Math.round(yCss * dpr);
          ctx.fillRect(xDev, yDev, Math.max(1, Math.round(cellSize * dpr)), Math.max(1, Math.round(cellSize * dpr)));
        }
      }
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
    // when autoplay is running or user is dragging a pattern, disable manual cell toggling
    if (autoTimerRef.current != null) return;
    if (draggingPattern) return;
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

  // 0 = paused, 1 = slow autoplay, 2 = fast autoplay
  const [timerState, setTimerState] = useState<number>(0);

  // start autoplay: accept a boolean to decide whether to run immediately,
  // then schedule periodic runs every 500ms
  const startAutoPlay = (runFast: boolean = false) => {
    // stop any existing timer first (keeps state consistent)
    if (autoTimerRef.current != null) {
      stopAutoPlay();
    }
    setTimerState(runFast ? 2 : 1);
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
    setTimerState(0);
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

  // top-left expandable triple-line menu
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const toggleMenu = () => setMenuOpen((v) => !v);

  // stable refs for dragging handlers to ensure removeEventListener works
  const draggingPatternRef = useRef<keyof typeof patterns | null>(null);
  const windowHandlersRef = useRef<{ move?: (ev: MouseEvent) => void; up?: (ev: MouseEvent) => void }>({});

  // define stable handlers once
  useEffect(() => {
    // accept both MouseEvent and PointerEvent
    windowHandlersRef.current.move = (ev: MouseEvent | PointerEvent) => {
      if (!draggingPatternRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      // place preview DRAG_GHOST_OFFSET to the right of the cursor
      dragPosRef.current = { cx: ev.clientX - rect.left + DRAG_GHOST_OFFSET, cy: ev.clientY - rect.top };
      const z = lastUserZoomRef.current;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        draw(z);
        rafRef.current = null;
      });
      // update ghost DOM position (client coords)
      // compute offset so the cursor sits at center of pattern's (0,0) cell
      const bounds = getPatternBounds(draggingPatternRef.current!);
      const cellSizeCss = Math.max(1, Math.round((DEFAULT_CELL_SIZE * lastUserZoomRef.current) / 100));
      if (bounds) {
        const offsetX = bounds.relX * cellSizeCss + cellSizeCss / 2;
        const offsetY = bounds.relY * cellSizeCss + cellSizeCss / 2;
        // ghost anchored so the pattern appears DRAG_GHOST_OFFSET to the right of the cursor
        setGhostPos({ x: ev.clientX - offsetX + DRAG_GHOST_OFFSET, y: ev.clientY - offsetY });
      } else {
        setGhostPos({ x: ev.clientX + DRAG_GHOST_OFFSET, y: ev.clientY });
      }
    };

    // accept both MouseEvent and PointerEvent
    windowHandlersRef.current.up = (ev: MouseEvent | PointerEvent) => {
      if (!draggingPatternRef.current) return;
      const container = containerRef.current;
      const grid = gridRef.current;
      if (!container || !grid) {
        // fallback cleanup
        setDraggingPattern(null);
        draggingPatternRef.current = null;
        dragPosRef.current = null;
        setGhostPos(null);
        return;
      }
      const rect = container.getBoundingClientRect();
      const cx = ev.clientX - rect.left;
      const cy = ev.clientY - rect.top;
      const z = lastUserZoomRef.current;
      const cellSize = Math.max(1, Math.round((DEFAULT_CELL_SIZE * z) / 100));
      // account for the DRAG_GHOST_OFFSET right offset when deciding where to place the pattern
      const absoluteX = container.scrollLeft + cx + DRAG_GHOST_OFFSET;
      const absoluteY = container.scrollTop + cy;
      const col = Math.floor(absoluteX / cellSize);
      const row = Math.floor(absoluteY / cellSize);
      applyPatternToGrid(grid, GRID_COLS, GRID_ROWS, draggingPatternRef.current!, col, row, false);
      // cleanup
      setDraggingPattern(null);
      draggingPatternRef.current = null;
      dragPosRef.current = null;
      setGhostPos(null);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        draw(z);
        rafRef.current = null;
      });
      // restore cursor
      document.body.style.cursor = "";
      // remove listeners we added in startPatternDrag (both mouse and pointer variants)
      if (windowHandlersRef.current.move) {
        window.removeEventListener("mousemove", windowHandlersRef.current.move as EventListener);
        window.removeEventListener("pointermove", windowHandlersRef.current.move as EventListener);
      }
      if (windowHandlersRef.current.up) {
        window.removeEventListener("mouseup", windowHandlersRef.current.up as EventListener);
        window.removeEventListener("pointerup", windowHandlersRef.current.up as EventListener);
      }
    };

    return () => {
      // nothing to remove here: listeners are added/removed by start/stop functions
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag & drop pattern state
  const [draggingPattern, setDraggingPattern] = useState<keyof typeof patterns | null>(null);
  const dragPosRef = useRef<{ cx: number; cy: number } | null>(null); // mouse pos relative to container (CSS px)
  // small helper to render a pattern preview icon using figures.ts data
  // If cellPixel is provided, each pattern cell is rendered at that CSS pixel size.
  const renderPatternIcon = (name: keyof typeof patterns, iconSize = 20, color = "#000", cellPixel?: number) => {
     const pat = patterns[name];
     if (!pat || pat.blackCells.length === 0) {
       return <div style={{ width: iconSize, height: iconSize }} />;
     }
     // compute bounding box of the pattern
     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
     for (const cell of pat.blackCells) {
       if (cell.x < minX) minX = cell.x;
       if (cell.y < minY) minY = cell.y;
       if (cell.x > maxX) maxX = cell.x;
       if (cell.y > maxY) maxY = cell.y;
     }
     const w = maxX - minX + 1;
     const h = maxY - minY + 1;
     const cellPx = cellPixel ?? Math.max(4, Math.floor(iconSize / Math.max(w, h)));
     const gridStyle: React.CSSProperties = {
       width: cellPx * w,
       height: cellPx * h,
       display: "grid",
       gridTemplateColumns: `repeat(${w}, ${cellPx}px)`,
       gridTemplateRows: `repeat(${h}, ${cellPx}px)`,
       gap: 1,
     };
     // build set of relative coords
     const set = new Set<string>();
     for (const cell of pat.blackCells) set.add(`${cell.x - minX},${cell.y - minY}`);
     const cells: JSX.Element[] = [];
     for (let yy = 0; yy < h; yy++) {
       for (let xx = 0; xx < w; xx++) {
         const key = `${xx},${yy}`;
         cells.push(
           <div
             key={key}
             style={{
               width: cellPx,
               height: cellPx,
               background: set.has(key) ? color : "transparent",
             }}
           />
         );
       }
     }
     return <div style={gridStyle}>{cells}</div>;
   };
 
   // ghost position state for DOM-following preview
   const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);

  // helper that returns bounding box and the relative coords of the pattern's (0,0) reference
  const getPatternBounds = (name: keyof typeof patterns) => {
    const pat = patterns[name];
    if (!pat || pat.blackCells.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const cell of pat.blackCells) {
      if (cell.x < minX) minX = cell.x;
      if (cell.y < minY) minY = cell.y;
      if (cell.x > maxX) maxX = cell.x;
      if (cell.y > maxY) maxY = cell.y;
    }
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    // relative index of the (0,0) reference inside that bounding box
    const relX = 0 - minX;
    const relY = 0 - minY;
    return { minX, minY, w, h, relX, relY };
  };

  // start dragging a pattern (call from menu item's onMouseDown)
  const startPatternDrag = (name: keyof typeof patterns, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingPattern(name);
    draggingPatternRef.current = name;
    // initialize drag position using current mouse location
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      // initial preview position: DRAG_GHOST_OFFSET to the right of the cursor
      dragPosRef.current = { cx: e.clientX - rect.left + DRAG_GHOST_OFFSET, cy: e.clientY - rect.top };
    } else {
      dragPosRef.current = { cx: DRAG_GHOST_OFFSET, cy: 0 };
    }
    // attach global listeners to track movement and drop (use stable refs)
    // add both mouse and pointer listeners for robustness
    if (windowHandlersRef.current.move) {
      window.addEventListener("mousemove", windowHandlersRef.current.move as EventListener);
      window.addEventListener("pointermove", windowHandlersRef.current.move as EventListener);
    }
    if (windowHandlersRef.current.up) {
      window.addEventListener("mouseup", windowHandlersRef.current.up as EventListener);
      window.addEventListener("pointerup", windowHandlersRef.current.up as EventListener);
    }
    // make the drag visible immediately and show grabbing cursor
    document.body.style.cursor = "grabbing";
    const z = lastUserZoomRef.current;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      draw(z);
      rafRef.current = null;
    });
    // set initial ghost pos (use client coords so DOM ghost follows pointer)
    // position ghost so cursor is at center of the pattern's (0,0) cell
    const bounds = getPatternBounds(name);
    const cellSizeCss = Math.max(1, Math.round((DEFAULT_CELL_SIZE * lastUserZoomRef.current) / 100));
    if (bounds) {
      const offsetX = bounds.relX * cellSizeCss + cellSizeCss / 2;
      const offsetY = bounds.relY * cellSizeCss + cellSizeCss / 2;
      // offset ghost DRAG_GHOST_OFFSET to the right of the cursor
      setGhostPos({ x: e.clientX - offsetX + DRAG_GHOST_OFFSET , y: e.clientY - offsetY});
    } else {
      setGhostPos({ x: e.clientX + DRAG_GHOST_OFFSET, y: e.clientY });
    }
  };


  // toast for cells
  const [ctrlToast, setCtrlToast] = useState<string | null>(null);
  const ctrlTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      // Ctrl+T (case insensitive)
      if ((ev.key === "l" || ev.key === "L")) {
        ev.preventDefault();
        const grid = gridRef.current;
        if (!grid) return;
        const cells_list = GridManager.getBlackKeysOnGrid(grid, GRID_COLS, GRID_ROWS);
        let s = "";
        if (cells_list.length > 0) {
          s = cells_list.join(" ; ");
        } else {
          s = "(no black cells)";
        }
        setCtrlToast(s);
        if (ctrlTimerRef.current != null) {
          clearTimeout(ctrlTimerRef.current);
        }
        ctrlTimerRef.current = window.setTimeout(() => {
          setCtrlToast(null);
          ctrlTimerRef.current = null;
        }, 200000);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (ctrlTimerRef.current != null) {
        clearTimeout(ctrlTimerRef.current);
        ctrlTimerRef.current = null;
      }
    };
  }, []);
  const active_color = "#ff0000ff";

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
      {/* DOM ghost that follows the cursor while dragging — anchored at top-left (cursor = reference) */}
      {draggingPattern && ghostPos && (() => {
        // compute CSS pixels per grid cell according to current zoom
        const z = lastUserZoomRef.current;
        const cellSizeCss = Math.max(1, Math.round((DEFAULT_CELL_SIZE * z) / 100));
        return (
          <div
            style={{
              position: "fixed",
              left: ghostPos.x,
              top: ghostPos.y,
              transform: "translate(0,0)", // anchor top-left to pointer (reference)
              pointerEvents: "none",
              zIndex: 300,
              opacity: 0.98,
              background: "transparent",
              padding: 4,
              borderRadius: 6,
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.35))",
            }}
          >
            {/* render with per-cell size matching current zoom; use white for contrast */}
            {renderPatternIcon(draggingPattern, 48, "#ffffff", cellSizeCss)}
          </div>
        );
      })()}

      {/* top-left triple-line button + expandable panel */}
      <div
        style={{
          position: "absolute",
          left: 16,
          top: 16,
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 8,
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={toggleMenu}
          aria-expanded={menuOpen}
          title={menuOpen ? "Close menu" : "Open menu"}
          style={{
            width: 42,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 6,
            borderRadius: 6,
            border: "none",
            background: "rgba(255, 255, 255, 0.9)",
            cursor: "pointer",
          }}
        >
          <img src={menuIcon} alt="Menu" style={{ width: 30, height: 30, display: "block" }} />
        </button>

        {/* expanded panel: four rectangles */}
        <div
          aria-hidden={!menuOpen}
          style={{
            display: menuOpen ? "flex" : "none",
            flexDirection: "column",
            gap: 8,
            marginTop: 4,
            transition: "opacity 160ms ease, transform 160ms ease",
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? "translateY(0)" : "translateY(-6px)",
          }}
        >
          {/* Block pattern (compact, name above preview) */}
          <div
            role="button"
            tabIndex={0}
            onMouseDown={(e) => { triggerButtonEffect("pattern"); startPatternDrag("block", e); }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: 6,
              borderRadius: 8,
              background: "rgba(255,255,255,0.8)", // 0.8 transparent
              color: "#000",
              cursor: "grab",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              width: "auto",
              height: "auto",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1, color: "#000" }}>Block</div>
            {renderPatternIcon("block", 28, "#000")}
          </div>

          {/* Glider pattern (compact, name above preview) */}
          <div
            role="button"
            tabIndex={0}
            onMouseDown={(e) => { triggerButtonEffect("pattern"); startPatternDrag("glider", e); }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: 6,
              borderRadius: 8,
              background: "rgba(255,255,255,0.8)", // 0.8 transparent
              color: "#000",
              cursor: "grab",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              width: "auto",
              height: "auto",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1, color: "#000" }}>Glider</div>
            {renderPatternIcon("glider", 28, "#000")}
          </div>
        </div>
      </div>

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

      {ctrlToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            left: "50%",
            top: 12,
            transform: "translateX(-50%)",
            zIndex: 400,
            background: "rgba(0,0,0,0.8)",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 13,
            pointerEvents: "none",
          }}
        >
          {ctrlToast}
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
          background: "rgba(255, 255, 255, 0.70)", // semi-transparent wrapper
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
            padding: 6,
            borderRadius: 8,
            background: timerState === 1 ? active_color : "transparent",
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
            padding: 6,
            borderRadius: 8,
            background: timerState === 2 ? active_color : "transparent",
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
            padding: 6,
            borderRadius: 8,
            background: timerState === 0 ? active_color : "transparent",
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

      {/* floating state indicator (bottom-left) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 20,
          bottom: 20,
          zIndex: 200,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: 8,
          background: "rgba(0,0,0,0.55)",
        }}
      >
        <img
          src={timerState === 0 ? pauseIcon : timerState === 1 ? playIcon : playFastIcon}
          alt="State"
          style={{ width: 24, height: 24, display: "block", opacity: 0.98 }}
        />
      </div>
    </div>
  );
}
