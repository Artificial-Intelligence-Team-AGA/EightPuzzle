import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * 8-Puzzle (3x3) — Client-only React component (plain JS/JSX)
 * - Upload an image, auto-slices into 3x3 tiles (CSS background positioning)
 * - Click/tap to move a tile if adjacent to the blank
 * - Shuffle to a guaranteed-solvable state
 * - Solve optimally with A* (Manhattan heuristic)
 * - Step through the solution or autoplay
 */

export default function EightPuzzle() {
  // ----------- UI state -----------
  const [imageUrl, setImageUrl] = useState(null);
  const [board, setBoard] = useState([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  const [solving, setSolving] = useState(false);
  const [solution, setSolution] = useState([]); // sequence of states
  const [stepIndex, setStepIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [speedMs, setSpeedMs] = useState(500);
  const playRef = useRef(null);

  // Derived flags
  const isSolved = useMemo(() => arraysEqual(board, GOAL), [board]);
  const canStepForward = stepIndex < Math.max(0, solution.length - 1);
  const canStepBack = stepIndex > 0;

  // Stop autoplay when solution ends
  useEffect(() => {
    if (!autoplay) return;
    if (!canStepForward) {
      setAutoplay(false);
      return;
    }
    playRef.current = window.setTimeout(() => {
      setStepIndex((i) => Math.min(solution.length - 1, i + 1));
    }, speedMs);
    return () => {
      if (playRef.current) window.clearTimeout(playRef.current);
    };
  }, [autoplay, stepIndex, solution, speedMs, canStepForward]);

  // Whenever stepIndex changes, apply that state to the board for preview
 useEffect(() => {
  if (solution.length > 0) {
    setBoard(solution[stepIndex]);
  }
}, [stepIndex, solution]);



  // ----------- Handlers -----------
  function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }

  function shuffle() {
    let arr = [...GOAL];
    // Fisher-Yates shuffle until solvable and not already solved
    do {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    } while (!isSolvable(arr) || arraysEqual(arr, GOAL));
    setBoard(arr);
    setSolution([]);
    setStepIndex(0);
    setAutoplay(false);
  }

  function tryMoveTile(tileIndex) {
    // Move tile if it’s orthogonally adjacent to blank
      const blankIndex = board.indexOf(0);
  if (!areNeighbors(tileIndex, blankIndex)) return;
  const newBoard = [...board];
  [newBoard[tileIndex], newBoard[blankIndex]] = [newBoard[blankIndex], newBoard[tileIndex]];
  setBoard(newBoard);

  // ✅ User made a manual move: discard any existing solution/playback
  setSolution([]);
  setStepIndex(0);
  setAutoplay(false);
  }

  async function solve() {
    if (solving) return;
    setSolving(true);
    try {
      const path = aStar(board, GOAL);
      setSolution(path);
      setStepIndex(0);
    } catch (e) {
      console.error(e);
      alert("No solution found (shouldn’t happen for solvable 8-puzzles).");
    } finally {
      setSolving(false);
    }
  }

  function resetToStartOfSolution() {
    if (solution.length > 0) setStepIndex(0);
  }

  // ----------- Rendering helpers -----------
  const tiles = board.map((tile, pos) => {
    const isBlank = tile === 0;
    const goalPos = indexOfValue(GOAL, tile); // where this tile ‘belongs’ in the goal board
    const [gx, gy] = [goalPos % 3, Math.floor(goalPos / 3)];
    const [px, py] = [pos % 3, Math.floor(pos / 3)];
    const canClick = areNeighbors(pos, board.indexOf(0));

    return (
      <button
        key={pos + ":" + tile}
        aria-label={isBlank ? "blank" : `tile ${tile}`}
        onClick={() => !isBlank && tryMoveTile(pos)}
        className={`relative aspect-square w-full select-none rounded-2xl shadow-sm outline-none transition-transform ${
          isBlank ? "bg-gray-100" : canClick ? "hover:scale-[1.02] active:scale-[0.98]" : ""
        }`}
        style={{
          cursor: isBlank ? "default" : canClick ? "pointer" : "default",
          backgroundImage: isBlank || !imageUrl ? undefined : `url(${imageUrl})`,
          backgroundSize: "300% 300%", // 3x3 grid
          backgroundPosition: `${gx * 50}% ${gy * 50}%`,
          // Fallback color tiles if no image yet
          backgroundColor: isBlank
            ? "#f3f4f6"
            : imageUrl
            ? undefined
            : ["#fecaca", "#fde68a", "#bbf7d0", "#bae6fd", "#e9d5ff"][tile % 5],
        }}
        disabled={isBlank}
      >
        {!imageUrl && !isBlank && (
          <span className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white">
            {tile}
          </span>
        )}
        {/* Optional subtle coordinates for debugging */}
        <span className="pointer-events-none absolute bottom-1 right-2 text-[10px] text-gray-400">
          {px},{py}
        </span>
      </button>
    );
  });

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-2 text-2xl font-semibold">8-Puzzle from Image (A* Solver)</h1>
      <p className="mb-4 text-sm text-gray-600">
        Upload any picture, shuffle to a solvable configuration, click tiles to play, or let the A* solver
        show the optimal steps.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm">
          <span>Upload image</span>
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
        <button
          className="rounded-xl bg-black px-4 py-2 text-sm text-white shadow-sm disabled:opacity-50"
          onClick={shuffle}
          disabled={!imageUrl}
        >
          Shuffle (solvable)
        </button>
        <button
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm disabled:opacity-50"
          onClick={solve}
          disabled={solving || isSolved}
        >
          {solving ? "Solving…" : "Solve with A*"}
        </button>
        <button
          className="rounded-xl border px-3 py-2 text-sm shadow-sm disabled:opacity-50"
          onClick={() => setBoard(GOAL)}
          disabled={arraysEqual(board, GOAL)}
        >
          Reset to goal
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,280px)_1fr]">
        {/* Board */}
        <div>
          <div className="grid aspect-square grid-cols-3 gap-2 rounded-2xl bg-gray-200 p-2">{tiles}</div>
        </div>

        {/* Controls & Solution playback */}
        <div className="flex flex-col gap-3">
          <fieldset className="rounded-2xl border p-3">
            <legend className="px-1 text-sm font-medium">Solve playback</legend>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-lg border px-3 py-1 text-sm shadow-sm disabled:opacity-50"
                onClick={resetToStartOfSolution}
                disabled={solution.length === 0}
              >
                ⏮ Start
              </button>
              <button
                className="rounded-lg border px-3 py-1 text-sm shadow-sm disabled:opacity-50"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={!canStepBack}
              >
                ◀ Prev
              </button>
              <button
                className="rounded-lg border px-3 py-1 text-sm shadow-sm disabled:opacity-50"
                onClick={() => setStepIndex((i) => Math.min(solution.length - 1, i + 1))}
                disabled={!canStepForward}
              >
                Next ▶
              </button>
              <button
                className={`${autoplay ? "bg-rose-600 text-white" : "border"} rounded-lg px-3 py-1 text-sm shadow-sm`}
                onClick={() => setAutoplay((p) => !p)}
                disabled={solution.length === 0}
              >
                {autoplay ? "Pause" : "Autoplay"}
              </button>
              <label className="ml-2 flex items-center gap-2 text-sm text-gray-600">
                Speed
                <input
                  type="range"
                  min={100}
                  max={1500}
                  step={50}
                  value={speedMs}
                  onChange={(e) => setSpeedMs(parseInt(e.target.value))}
                />
                <span className="tabular-nums">{speedMs}ms</span>
              </label>
            </div>
            {solution.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                Optimal steps: <b>{solution.length - 1}</b> · Viewing step {stepIndex + 1} / {solution.length}
              </p>
            )}
          </fieldset>

          <fieldset className="rounded-2xl border p-3">
            <legend className="px-1 text-sm font-medium">Status</legend>
            <ul className="text-sm text-gray-700">
              <li>
                Current configuration is <b>{isSolvable(board) ? "Solvable" : "Unsolvable"}</b>
              </li>
              <li>
                {isSolved ? (
                  <span className="text-emerald-700">🎉 Solved!</span>
                ) : (
                  <span>Tiles out of place: {tilesOutOfPlace(board)}</span>
                )}
              </li>
            </ul>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

