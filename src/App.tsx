import React, { useEffect, useRef, useState } from "react";
import GridManager from "./grid/GridManager";
import Controller from "./logic/Controller";

const CELL_COUNT = 100;
const VISIBLE = 100;
const GRID_MIN = -Math.floor(CELL_COUNT / 2);
const MIN_CELL_SIZE = 8; // taille minimale pour agrandir visuellement la grille

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const managerRef = useRef<GridManager | null>(null);
  const controllerRef = useRef<Controller | null>(null);
  const offsetRef = useRef({ x: 0, y: 0, cellSize: 0 });
  const [menuOpen, setMenuOpen] = useState(false);

  if (!managerRef.current) {
    managerRef.current = new GridManager(CELL_COUNT, VISIBLE);
    controllerRef.current = new Controller(managerRef.current);
  }

  function draw() {
    const canvas = canvasRef.current;
    const manager = managerRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const widthCss = window.innerWidth;
    const heightCss = window.innerHeight;
    canvas.style.width = `${widthCss}px`;
    canvas.style.height = `${heightCss}px`;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(widthCss * dpr);
    canvas.height = Math.round(heightCss * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // cell size avec minimum
    const calculated = Math.floor(Math.min(widthCss / VISIBLE, heightCss / VISIBLE));
    const cellSize = Math.max(MIN_CELL_SIZE, calculated);
    const gridPixelWidth = cellSize * VISIBLE;
    const gridPixelHeight = cellSize * VISIBLE;
    const offsetX = Math.floor((widthCss - gridPixelWidth) / 2);
    const offsetY = Math.floor((heightCss - gridPixelHeight) / 2);
    offsetRef.current = { x: offsetX, y: offsetY, cellSize };

    // background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, widthCss, heightCss);

    // draw blacks via manager
    manager.forEach((sq) => {
      if (sq.isBlack()) {
        const col = sq.x - GRID_MIN;
        const row = sq.y - GRID_MIN;
        ctx.fillStyle = "#000000";
        ctx.fillRect(offsetX + col * cellSize, offsetY + row * cellSize, cellSize, cellSize);
      }
    });

    // grid lines
    // bleu foncé pour bien contraster avec les cases blanches/noires
    ctx.strokeStyle = "#0b3d91";
    ctx.lineWidth = 1;
    for (let i = 0; i <= VISIBLE; i++) {
      const pX = offsetX + i * cellSize + 0.5;
      const pY = offsetY + i * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(pX, offsetY + 0.5);
      ctx.lineTo(pX, offsetY + gridPixelHeight + 0.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(offsetX + 0.5, pY);
      ctx.lineTo(offsetX + gridPixelWidth + 0.5, pY);
      ctx.stroke();
    }
  }

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const controller = controllerRef.current!;
    if (!canvas || !controller) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const { x: offsetX, y: offsetY, cellSize } = offsetRef.current;
    if (cellSize <= 0) return;

    const col = Math.floor((cx - offsetX) / cellSize);
    const row = Math.floor((cy - offsetY) / cellSize);
    if (col < 0 || col >= VISIBLE || row < 0 || row >= VISIBLE) return;

    const gx = GRID_MIN + col;
    const gy = GRID_MIN + row;
    controller.toggleAt(gx, gy);
    draw();
  };

  // actions via controller
  const setEvenEven = () => {
    controllerRef.current!.setEvenEven();
    draw();
  };
  const setOddOdd = () => {
    controllerRef.current!.setOddOdd();
    draw();
  };
  const invertAll = () => {
    controllerRef.current!.invertAll();
    draw();
  };
  const resetAll = () => {
    controllerRef.current!.resetAll();
    draw();
  };
  const simpleAlgo = () => {
    controllerRef.current!.simpleAlgo();
    draw();
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        onClick={onCanvasClick}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          display: "block",
          cursor: "pointer",
        }}
      />

      {/* menu flottant en haut à gauche */}
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 30,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Paramètres"
          aria-expanded={menuOpen}
          style={{
            background: "#5c5c5cff",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: 8,
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 9999,
            cursor: "pointer",
            fontSize: 18,
          }}
        >
          {/* icône rouage */}
          ⚙
        </button>

        {menuOpen && (
          <div
            style={{
              marginTop: 8,
              background: "#5c5c5cff",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minWidth: 180,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setEvenEven();
                setMenuOpen(false);
              }}
              style={{
                background: "#000000ff",
                border: "none",
                padding: "8px",
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              even
            </button>

            <button
              onClick={() => {
                setOddOdd();
                setMenuOpen(false);
              }}
              style={{
                background: "#000000ff",
                border: "none",
                padding: "8px",
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              odd
            </button>

            <button
              onClick={() => {
                invertAll();
                setMenuOpen(false);
              }}
              style={{
                background: "#000000ff",
                border: "none",
                padding: "8px",
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              revert
            </button>

            <button
              onClick={() => {
                resetAll();
                setMenuOpen(false);
              }}
              style={{
                background: "#000000ff",
                border: "none",
                padding: "8px",
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              default
            </button>
            <button
              onClick={() => {
                simpleAlgo();
              }}
              style={{
                background: "#000000ff",
                border: "none",
                padding: "8px",
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              simple algo
            </button>
          </div>
        )}
      </div>
    </>
  );
}
