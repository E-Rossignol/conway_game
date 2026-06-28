import React, { useEffect, useRef, useState, type JSX } from "react";
import playIcon from "./assets/icons/play.png";
import resetIcon from "./assets/icons/reset.png";
import playOnceIcon from "./assets/icons/next.png";
import pauseIcon from "./assets/icons/pause.png";
import playFastIcon from "./assets/icons/fast-forward.png";
import menuIcon from "./assets/icons/menu.png";
import soupIcon from "./assets/icons/soup.png";
import GridManager from "./grid/GridManager";
import { applyPatternToGrid, patterns } from "./figures";

const GRID_COLS = 1000;
const GRID_ROWS = 1000;
const DEFAULT_CELL_SIZE = 10;
const IS_TOAST_ENABLED = true;
const DEFAULT_SLOW_SPEED_MS = 150;
const DEFAULT_FAST_SPEED_MS = 50;
const DRAG_GHOST_OFFSET = 15;

/**
 * Top-level App component that renders a large, scrollable canvas-backed
 * Conway Game of Life grid with pattern-dragging, autoplay and export helpers.
 */
export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const gridRef = useRef<Uint8Array | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
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

  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const lastUserZoomRef = useRef<number>(100);

  useEffect(() => {
    if (!gridRef.current) {
      gridRef.current = new Uint8Array(GRID_COLS * GRID_ROWS);
    }
  }, []);

  function draw(zoom = zoomPercent) {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const grid = gridRef.current;
    if (!container || !canvas || !grid) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const widthCss = container.clientWidth;
    const heightCss = container.clientHeight;

    const cellSize = Math.max(1, Math.round((DEFAULT_CELL_SIZE * zoom) / 100));
    const dpr = window.devicePixelRatio || 1;
    const widthDev = Math.round(widthCss * dpr);
    const heightDev = Math.round(heightCss * dpr);
    canvas.style.width = `${widthCss}px`;
    canvas.style.height = `${heightCss}px`;
    canvas.width = widthDev;
    canvas.height = heightDev;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, widthDev, heightDev);

    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const firstCol = Math.floor(scrollLeft / cellSize);
    const firstRow = Math.floor(scrollTop / cellSize);

    const visibleCols = Math.min(GRID_COLS - firstCol, Math.ceil(widthCss / cellSize) + 1);
    const visibleRows = Math.min(GRID_ROWS - firstRow, Math.ceil(heightCss / cellSize) + 1);

    const offsetXCss = -(scrollLeft - firstCol * cellSize);
    const offsetYCss = -(scrollTop - firstRow * cellSize);

    const cellDev = Math.max(1, Math.round(cellSize * dpr));

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

    ctx.strokeStyle = "#7070706e";
    ctx.lineWidth = 1;

    for (let i = 0; i <= visibleCols; i++) {
      const xCss = offsetXCss + i * cellSize;
      const xDev = xCss * dpr;
      const xPos = Math.round(xDev) + 0.5;
      ctx.beginPath();
      ctx.moveTo(xPos, Math.round(offsetYCss * dpr) + 0.5);
      ctx.lineTo(xPos, Math.round((offsetYCss + visibleRows * cellSize) * dpr) + 0.5);
      ctx.stroke();
    }

    for (let j = 0; j <= visibleRows; j++) {
      const yCss = offsetYCss + j * cellSize;
      const yDev = yCss * dpr;
      const yPos = Math.round(yDev) + 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.round(offsetXCss * dpr) + 0.5, yPos);
      ctx.lineTo(Math.round((offsetXCss + visibleCols * cellSize) * dpr) + 0.5, yPos);
      ctx.stroke();
    }

    if (draggingPattern && dragPosRef.current) {
      const pat = patterns[draggingPattern];
      if (pat && pat.blackCells.length > 0) {
        const cx = dragPosRef.current.cx;
        const cy = dragPosRef.current.cy;
        const colUnder = Math.floor((container.scrollLeft + cx) / cellSize);
        const rowUnder = Math.floor((container.scrollTop + cy) / cellSize);
        ctx.fillStyle = "rgba(0,200,80,0.55)";
        for (const cell of pat.blackCells) {
          const gx = colUnder + cell.x;
          const gy = rowUnder + cell.y;
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
  }, [zoomPercent]);

  const onContainerClick = (e: React.MouseEvent) => {
    if (autoTimerRef.current != null) return;
    if (draggingPattern) return;
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

    const idx = row * GRID_COLS + col;
    grid[idx] = grid[idx] ? 0 : 1;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const z = lastUserZoomRef.current;
    rafRef.current = requestAnimationFrame(() => {
      draw(z);
      rafRef.current = null;
    });
  };

  const onZoomChange = (val: number) => {
    setZoomPercent(val);
    lastUserZoomRef.current = val;
  };

  const spacerWidth = GRID_COLS * Math.max(1, Math.round((DEFAULT_CELL_SIZE * zoomPercent) / 100));
  const spacerHeight = GRID_ROWS * Math.max(1, Math.round((DEFAULT_CELL_SIZE * zoomPercent) / 100));

  const getCellAttributes = (col: number, row: number) => {
    const grid = gridRef.current;
    const inside = col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS && !!grid;
    const state = inside ? !!grid![row * GRID_COLS + col] : false;
    return { x: col, y: row, state };
  };

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

    const left = col * cellSize - container.scrollLeft;
    let top = row * cellSize - container.scrollTop - 28;
    if (top < 4) top = row * cellSize - container.scrollTop + cellSize + 4;

    setInfoToast({ visible: true, left, top, col: attrs.x, row: attrs.y, state: attrs.state });
    if (infoTimerRef.current != null) {
      clearTimeout(infoTimerRef.current);
    }
    infoTimerRef.current = window.setTimeout(() => {
      setInfoToast(null);
      infoTimerRef.current = null;
    }, 2000);
  };

  const runConwayStep = () => {
    const grid = gridRef.current;
    if (!grid) return;
    GridManager.conwayStepOnGrid(grid, GRID_COLS, GRID_ROWS);
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const z = lastUserZoomRef.current;
    rafRef.current = requestAnimationFrame(() => {
      draw(z);
      rafRef.current = null;
    });
  };

  const applySoupPattern = () => {
    const grid = gridRef.current;
    if (!grid) return;
    const fillSoup = GridManager.generateSoup();
    fillSoup(grid, GRID_COLS, GRID_ROWS);
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const z = lastUserZoomRef.current;
    rafRef.current = requestAnimationFrame(() => {
      draw(z);
      rafRef.current = null;
    });
  };

  const [timerState, setTimerState] = useState<number>(0);

  const startAutoPlay = (runFast: boolean = false) => {
    if (autoTimerRef.current != null) {
      stopAutoPlay();
    }
    setTimerState(runFast ? 2 : 1);
    autoTimerRef.current = window.setInterval(() => {
      runConwayStep();
    }, runFast ? DEFAULT_FAST_SPEED_MS : DEFAULT_SLOW_SPEED_MS);
  };

  const stopAutoPlay = () => {
    if (autoTimerRef.current != null) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setTimerState(0);
  };

  useEffect(() => {
    return () => {
      if (autoTimerRef.current != null) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, []);

  const triggerButtonEffect = (id: string, duration = 100) => {
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
  
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const draggingPatternRef = useRef<keyof typeof patterns | null>(null);
  const windowHandlersRef = useRef<{ move?: (ev: MouseEvent) => void; up?: (ev: MouseEvent) => void }>({});

  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 16, y: 16 });
  const menuDraggingRef = useRef<boolean>(false);
  const menuDragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const menuMoveHandlerRef = useRef<((ev: PointerEvent) => void) | null>(null);
  const menuUpHandlerRef = useRef<((ev: PointerEvent) => void) | null>(null);
  const isMenuMovedRef = useRef<boolean>(false);

  const onMenuPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    menuDraggingRef.current = true;
    isMenuMovedRef.current = false;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    menuDragOffsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };

    menuMoveHandlerRef.current = (ev: PointerEvent) => {
      if (!menuDraggingRef.current || !menuDragOffsetRef.current) return;
      const x = ev.clientX - menuDragOffsetRef.current.dx;
      const y = ev.clientY - menuDragOffsetRef.current.dy;
      if (Math.abs(ev.clientX - (rect.left + menuDragOffsetRef.current.dx)) > 2 || Math.abs(ev.clientY - (rect.top + menuDragOffsetRef.current.dy)) > 2) {
        isMenuMovedRef.current = true;
      }
      const btnW = rect.width || 42;
      const btnH = rect.height || 34;
      const clampX = Math.min(Math.max(x, 5), window.innerWidth - btnW - 5);
      const clampY = Math.min(Math.max(y, 5), window.innerHeight - btnH - 5);
      setMenuPos({ x: clampX, y: clampY });
    };

    menuUpHandlerRef.current = (_ev: PointerEvent) => {
      console.log(_ev);
      menuDraggingRef.current = false;
      menuDragOffsetRef.current = null;
      if (menuMoveHandlerRef.current) {
        window.removeEventListener("pointermove", menuMoveHandlerRef.current);
      }
      if (menuUpHandlerRef.current) {
        window.removeEventListener("pointerup", menuUpHandlerRef.current);
      }
      if (!isMenuMovedRef.current) {
        setMenuOpen((v) => !v);
      }
      document.body.style.cursor = "";
    };

    if (menuMoveHandlerRef.current) window.addEventListener("pointermove", menuMoveHandlerRef.current);
    if (menuUpHandlerRef.current) window.addEventListener("pointerup", menuUpHandlerRef.current);
    document.body.style.cursor = "grabbing";
  };

  useEffect(() => {
    windowHandlersRef.current.move = (ev: MouseEvent | PointerEvent) => {
      if (!draggingPatternRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      dragPosRef.current = { cx: ev.clientX - rect.left + DRAG_GHOST_OFFSET, cy: ev.clientY - rect.top };
      const z = lastUserZoomRef.current;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        draw(z);
        rafRef.current = null;
      });
      const bounds = getPatternBounds(draggingPatternRef.current!);
      const cellSizeCss = Math.max(1, Math.round((DEFAULT_CELL_SIZE * lastUserZoomRef.current) / 100));
      if (bounds) {
        const offsetX = bounds.relX * cellSizeCss + cellSizeCss / 2;
        const offsetY = bounds.relY * cellSizeCss + cellSizeCss / 2;
        setGhostPos({ x: ev.clientX - offsetX + DRAG_GHOST_OFFSET, y: ev.clientY - offsetY });
      } else {
        setGhostPos({ x: ev.clientX + DRAG_GHOST_OFFSET, y: ev.clientY });
      }
    };

    windowHandlersRef.current.up = (ev: MouseEvent | PointerEvent) => {
      if (!draggingPatternRef.current) return;
      const container = containerRef.current;
      const grid = gridRef.current;
      if (!container || !grid) {
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
      const absoluteX = container.scrollLeft + cx + DRAG_GHOST_OFFSET;
      const absoluteY = container.scrollTop + cy;
      const col = Math.floor(absoluteX / cellSize);
      const row = Math.floor(absoluteY / cellSize);
      applyPatternToGrid(grid, GRID_COLS, GRID_ROWS, draggingPatternRef.current!, col, row, false);
      setDraggingPattern(null);
      draggingPatternRef.current = null;
      dragPosRef.current = null;
      setGhostPos(null);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        draw(z);
        rafRef.current = null;
      });
      document.body.style.cursor = "";
      if (windowHandlersRef.current.move) {
        window.removeEventListener("mousemove", windowHandlersRef.current.move as EventListener);
        window.removeEventListener("pointermove", windowHandlersRef.current.move as EventListener);
      }
      if (windowHandlersRef.current.up) {
        window.removeEventListener("mouseup", windowHandlersRef.current.up as EventListener);
        window.removeEventListener("pointerup", windowHandlersRef.current.up as EventListener);
      }
    };

    return () => {};
  }, []);

  const [draggingPattern, setDraggingPattern] = useState<keyof typeof patterns | null>(null);
  const dragPosRef = useRef<{ cx: number; cy: number } | null>(null);

  /**
   * Render a compact visual preview of a named pattern.
   */
  const renderPatternIcon = (name: keyof typeof patterns, iconSize = 20, color = "#000", cellPixel?: number) => {
     const pat = patterns[name];
     if (!pat || pat.blackCells.length === 0) {
       return <div style={{ width: iconSize, height: iconSize }} />;
     }
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
      {draggingPattern && ghostPos && (() => {
        const z = lastUserZoomRef.current;
        const cellSizeCss = Math.max(1, Math.round((DEFAULT_CELL_SIZE * z) / 100));
        return (
          <div
            style={{
              position: "fixed",
              left: ghostPos.x,
              top: ghostPos.y,
              transform: "translate(0,0)",
              pointerEvents: "none",
              zIndex: 300,
              opacity: 0.98,
              background: "transparent",
              padding: 4,
              borderRadius: 6,
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.35))",
            }}
          >
            
            {renderPatternIcon(draggingPattern, 48, "#ffffff", cellSizeCss)}
          </div>
        );
      })()}

      <div
        style={{
          position: "absolute",
          left: menuPos.x,
          top: menuPos.y,
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 8,
          pointerEvents: "auto",
          touchAction: "none",
        }}
      >
        <button
          aria-expanded={menuOpen}
          title={menuOpen ? "Close menu" : "Open menu"}
          onPointerDown={onMenuPointerDown}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMenuOpen((v) => !v);
            }
          }}
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
            cursor: "grab",
          }}
        >
          <img src={menuIcon} alt="Menu" style={{ width: 30, height: 30, display: "block", pointerEvents: "none" }} />
        </button>

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
          
          <div
            role="button"
            tabIndex={0}
            onClick={
              applySoupPattern}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: 6,
              borderRadius: 8,
              background: "rgba(255,255,255,0.8)",
              color: "#000",
              cursor: "grab",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              width: "auto",
              height: "auto",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1, color: "#000" }}>Soup</div>
            <img src={soupIcon} alt="Soup pattern" style={{ width: 28, height: 28, display: "block" }} />
          </div>

          
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
              background: "rgba(255,255,255,0.8)",
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

          <div
            role="button"
            tabIndex={0}
            onMouseDown={(e) => { triggerButtonEffect("pattern"); startPatternDrag("pentadecathlon", e); }}
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
            <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1, color: "#000" }}>Pentadecathlon</div>
            {renderPatternIcon("pentadecathlon", 28, "#000")}
          </div>
                    
          <div
            role="button"
            tabIndex={0}
            onMouseDown={(e) => { triggerButtonEffect("pattern"); startPatternDrag("queenbeeshuttle", e); }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: 6,
              borderRadius: 8,
              background: "rgba(255,255,255,0.8)",
              color: "#000",
              cursor: "grab",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              width: "auto",
              height: "auto",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1, color: "#000" }}>Queen Bee Shuttle</div>
            {renderPatternIcon("queenbeeshuttle", 28, "#000")}
          </div>
        </div>
      </div>

      

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
        
        <div
          style={{
            width: spacerWidth,
            height: spacerHeight,
          }}
        />
      </div>

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
      <div
        style={{
          position: "absolute",
          right: 20,
          bottom: 20,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          zIndex: 50,
          background: "rgba(0,0,0,0.45)",
          padding: 6,
          borderRadius: 6,
        }}
      >
        
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ color: "#fff", fontSize: 11 }}>{zoomPercent}%</div>
          <input
            type="range"
            min={50}
            max={200}
            step={10}
            value={zoomPercent}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            style={{ width: 120}}
            aria-label="Zoom"
          />
        </div>
        
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
          
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M21 12a9 9 0 10-3.2 6.6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 3v6h-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      
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
          background: "rgba(255, 255, 255, 0.70)",
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
            background: "transparent",
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
            background: "transparent",
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
            background: "transparent",
          }}
        />

        
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
          background: timerState === 0 ? "#ff4a4aff": "#13d501ff",
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
