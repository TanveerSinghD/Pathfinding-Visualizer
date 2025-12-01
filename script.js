(() => {
  const gridEl = document.getElementById("grid");
  const algorithmSelect = document.getElementById("algorithm");
  const visualizeBtn = document.getElementById("visualize");
  const clearPathBtn = document.getElementById("clearPath");
  const clearWallsBtn = document.getElementById("clearWalls");
  const randomizeBtn = document.getElementById("randomize");
  const resizeBtn = document.getElementById("resize");
  const speedSlider = document.getElementById("speed");
  const speedLabel = document.getElementById("speedLabel");
  const rowsInput = document.getElementById("rows");
  const colsInput = document.getElementById("cols");
  const statusEl = document.getElementById("status");
  const gridShell = document.querySelector(".grid-shell");

  const speedConfig = {
    1: { label: "Lightning", delay: 12 },
    2: { label: "Fast", delay: 22 },
    3: { label: "Medium", delay: 38 },
    4: { label: "Steady", delay: 58 },
    5: { label: "Chill", delay: 85 },
  };

  const state = {
    rows: Number(rowsInput.value) || 20,
    cols: Number(colsInput.value) || 35,
    grid: [],
    start: null,
    end: null,
    mouseDown: false,
    movingStart: false,
    movingEnd: false,
    wallDrawing: false,
    animating: false,
    cancelAnimation: false,
  };

  init();

  function init() {
    buildGrid(state.rows, state.cols);
    attachEvents();
    updateSpeedLabel();
    window.addEventListener("resize", () => setGridSizing());
  }

  function attachEvents() {
    visualizeBtn.addEventListener("click", visualize);
    clearPathBtn.addEventListener("click", () => clearPath(true));
    clearWallsBtn.addEventListener("click", () => clearWalls());
    randomizeBtn.addEventListener("click", () => randomizeWalls());
    resizeBtn.addEventListener("click", () => handleResize());
    speedSlider.addEventListener("input", updateSpeedLabel);

    gridEl.addEventListener("mousedown", handleMouseDown);
    gridEl.addEventListener("mouseover", handleMouseEnter);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function buildGrid(rows, cols) {
    state.rows = clamp(rows, 6, 40);
    state.cols = clamp(cols, 8, 60);
    rowsInput.value = state.rows;
    colsInput.value = state.cols;

    const startPos = { row: Math.floor(state.rows / 2), col: Math.floor(state.cols / 5) };
    const endPos = { row: Math.floor(state.rows / 2), col: state.cols - Math.floor(state.cols / 5) - 1 };

    state.grid = [];
    for (let r = 0; r < state.rows; r += 1) {
      const row = [];
      for (let c = 0; c < state.cols; c += 1) {
        row.push(createNode(r, c));
      }
      state.grid.push(row);
    }

    state.start = state.grid[startPos.row][startPos.col];
    state.start.isStart = true;
    state.end = state.grid[endPos.row][endPos.col];
    state.end.isEnd = true;

    renderGrid();
    setGridSizing();
    setStatus("Ready to build a maze.");
  }

  function createNode(row, col) {
    return {
      row,
      col,
      isStart: false,
      isEnd: false,
      isWall: false,
      visited: false,
      inPath: false,
      distance: Infinity,
      score: Infinity,
      previous: null,
      el: null,
    };
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    gridEl.style.gridTemplateColumns = `repeat(${state.cols}, var(--cell-size))`;

    for (let r = 0; r < state.rows; r += 1) {
      for (let c = 0; c < state.cols; c += 1) {
        const node = state.grid[r][c];
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        node.el = cell;
        paintNode(node);
        gridEl.appendChild(cell);
      }
    }
  }

  function handleMouseDown(event) {
    if (!(event.target instanceof HTMLElement)) return;
    if (!event.target.classList.contains("cell") || state.animating) return;
    event.preventDefault();

    const node = getNodeFromTarget(event.target);
    state.mouseDown = true;
    state.wallDrawing = false;

    if (node.isStart) {
      state.movingStart = true;
    } else if (node.isEnd) {
      state.movingEnd = true;
    } else {
      node.isWall = !node.isWall;
      state.wallDrawing = node.isWall;
      paintNode(node);
      clearPath(true);
    }
  }

  function handleMouseEnter(event) {
    if (!(event.target instanceof HTMLElement)) return;
    if (!event.target.classList.contains("cell") || !state.mouseDown || state.animating) return;
    const node = getNodeFromTarget(event.target);

    if (state.movingStart) {
      moveStart(node);
    } else if (state.movingEnd) {
      moveEnd(node);
    } else {
      drawWall(node, state.wallDrawing);
    }
  }

  function handleMouseUp() {
    state.mouseDown = false;
    state.movingStart = false;
    state.movingEnd = false;
  }

  function moveStart(target) {
    if (target === state.end) return;
    clearPath(true);
    state.start.isStart = false;
    paintNode(state.start);
    target.isWall = false;
    target.isStart = true;
    state.start = target;
    paintNode(target);
  }

  function moveEnd(target) {
    if (target === state.start) return;
    clearPath(true);
    state.end.isEnd = false;
    paintNode(state.end);
    target.isWall = false;
    target.isEnd = true;
    state.end = target;
    paintNode(target);
  }

  function drawWall(node, makeWall) {
    if (node.isStart || node.isEnd) return;
    if (node.isWall === makeWall) return;
    node.isWall = makeWall;
    paintNode(node);
    clearPath(true);
  }

  async function visualize() {
    if (state.animating) return;
    clearPath(true);
    primeGrid();

    const choice = algorithmSelect.value;
    let result;
    switch (choice) {
      case "astar":
        result = runAStar();
        setStatus("Running A* search...");
        break;
      case "greedy":
        result = runGreedyBestFirst();
        setStatus("Running greedy best-first search...");
        break;
      case "dijkstra":
        result = runDijkstra();
        setStatus("Running Dijkstra...");
        break;
      case "bfs":
        result = runBfs();
        setStatus("Running breadth-first search...");
        break;
      case "dfs":
        result = runDfs();
        setStatus("Running depth-first search...");
        break;
      case "bidirectional":
        result = runBidirectionalBfs();
        setStatus("Running bidirectional BFS...");
        break;
      case "bidijkstra":
        result = runBidirectionalDijkstra();
        setStatus("Running bidirectional Dijkstra...");
        break;
      case "beam":
        result = runBeamSearch();
        setStatus("Running beam search...");
        break;
      default:
        result = runAStar();
        setStatus("Running A* search...");
    }

    const { visitedOrder, path } = result;
    await animateTraversal(visitedOrder, path);
  }

  function primeGrid() {
    state.cancelAnimation = true;
    for (let r = 0; r < state.rows; r += 1) {
      for (let c = 0; c < state.cols; c += 1) {
        const node = state.grid[r][c];
        node.visited = false;
        node.inPath = false;
        node.distance = Infinity;
        node.score = Infinity;
        node.previous = null;
        if (!node.isStart && !node.isEnd) {
          node.el.classList.remove("visited", "path");
        }
      }
    }
    state.cancelAnimation = false;
  }

  async function animateTraversal(visitedOrder, path) {
    const delay = speedConfig[speedSlider.value]?.delay || 35;
    state.animating = true;
    state.cancelAnimation = false;
    toggleControls(true);

    for (const node of visitedOrder) {
      if (state.cancelAnimation) break;
      if (!node.isStart && !node.isEnd && !node.isWall) {
        node.el.classList.add("visited");
      }
      await wait(delay);
    }

    if (!state.cancelAnimation) {
      for (const node of path) {
        if (state.cancelAnimation) break;
        if (!node.isStart && !node.isEnd) {
          node.inPath = true;
          node.el.classList.add("path");
        }
        await wait(Math.max(12, delay * 1.1));
      }
    }

    state.animating = false;
    toggleControls(false);
    const foundPath = path.length > 1;
    if (state.cancelAnimation) {
      setStatus("Animation stopped.");
    } else if (foundPath) {
      setStatus(`Shortest path length: ${path.length - 1} steps.`);
    } else {
      setStatus("No path found.");
    }
    state.cancelAnimation = false;
  }

  function runBfs() {
    const visitedOrder = [];
    const queue = [state.start];
    state.start.visited = true;

    while (queue.length) {
      const node = queue.shift();
      visitedOrder.push(node);
      if (node === state.end) break;
      for (const neighbor of getNeighbors(node)) {
        if (neighbor.visited || neighbor.isWall) continue;
        neighbor.visited = true;
        neighbor.previous = node;
        queue.push(neighbor);
      }
    }

    return { visitedOrder, path: buildPath(state.end) };
  }

  function runGreedyBestFirst() {
    const visitedOrder = [];
    const open = [];
    state.start.score = heuristic(state.start, state.end);
    open.push(state.start);

    while (open.length) {
      open.sort((a, b) => a.score - b.score);
      const node = open.shift();
      if (node.visited) continue;
      node.visited = true;
      visitedOrder.push(node);
      if (node === state.end) break;

      for (const neighbor of getNeighbors(node)) {
        if (neighbor.isWall || neighbor.visited) continue;
        neighbor.previous = node;
        neighbor.score = heuristic(neighbor, state.end);
        open.push(neighbor);
      }
    }

    return { visitedOrder, path: buildPath(state.end) };
  }

  function runBidirectionalBfs() {
    const visitedOrder = [];
    const queueStart = [state.start];
    const queueEnd = [state.end];
    const visitedFromStart = new Set([state.start]);
    const visitedFromEnd = new Set([state.end]);
    const prevFromStart = new Map();
    const prevFromEnd = new Map();
    let meeting = null;

    while (queueStart.length && queueEnd.length && !meeting) {
      const currentStart = queueStart.shift();
      visitedOrder.push(currentStart);
      for (const neighbor of getNeighbors(currentStart)) {
        if (neighbor.isWall || visitedFromStart.has(neighbor)) continue;
        visitedFromStart.add(neighbor);
        prevFromStart.set(neighbor, currentStart);
        if (visitedFromEnd.has(neighbor)) {
          meeting = neighbor;
          visitedOrder.push(neighbor);
          break;
        }
        queueStart.push(neighbor);
      }
      if (meeting) break;

      const currentEnd = queueEnd.shift();
      visitedOrder.push(currentEnd);
      for (const neighbor of getNeighbors(currentEnd)) {
        if (neighbor.isWall || visitedFromEnd.has(neighbor)) continue;
        visitedFromEnd.add(neighbor);
        prevFromEnd.set(neighbor, currentEnd);
        if (visitedFromStart.has(neighbor)) {
          meeting = neighbor;
          visitedOrder.push(neighbor);
          break;
        }
        queueEnd.push(neighbor);
      }
    }

    const path = buildBidirectionalPath(meeting, prevFromStart, prevFromEnd);
    return { visitedOrder, path };
  }

  function runBidirectionalDijkstra() {
    const visitedOrder = [];
    const pqStart = [state.start];
    const pqEnd = [state.end];
    const distFromStart = new Map([[state.start, 0]]);
    const distFromEnd = new Map([[state.end, 0]]);
    const prevFromStart = new Map();
    const prevFromEnd = new Map();
    const visitedFromStart = new Set();
    const visitedFromEnd = new Set();
    let meeting = null;

    const popSmallest = (arr, distMap) => {
      arr.sort((a, b) => (distMap.get(a) || Infinity) - (distMap.get(b) || Infinity));
      return arr.shift();
    };

    while (pqStart.length && pqEnd.length) {
      const currentStart = popSmallest(pqStart, distFromStart);
      if (visitedFromStart.has(currentStart)) continue;
      visitedFromStart.add(currentStart);
      visitedOrder.push(currentStart);
      if (visitedFromEnd.has(currentStart)) {
        meeting = currentStart;
        break;
      }
      for (const neighbor of getNeighbors(currentStart)) {
        if (neighbor.isWall) continue;
        const alt = (distFromStart.get(currentStart) || Infinity) + 1;
        if (alt < (distFromStart.get(neighbor) || Infinity)) {
          distFromStart.set(neighbor, alt);
          prevFromStart.set(neighbor, currentStart);
          pqStart.push(neighbor);
        }
      }

      const currentEnd = popSmallest(pqEnd, distFromEnd);
      if (visitedFromEnd.has(currentEnd)) continue;
      visitedFromEnd.add(currentEnd);
      visitedOrder.push(currentEnd);
      if (visitedFromStart.has(currentEnd)) {
        meeting = currentEnd;
        break;
      }
      for (const neighbor of getNeighbors(currentEnd)) {
        if (neighbor.isWall) continue;
        const alt = (distFromEnd.get(currentEnd) || Infinity) + 1;
        if (alt < (distFromEnd.get(neighbor) || Infinity)) {
          distFromEnd.set(neighbor, alt);
          prevFromEnd.set(neighbor, currentEnd);
          pqEnd.push(neighbor);
        }
      }
    }

    const path = buildBidirectionalPath(meeting, prevFromStart, prevFromEnd);
    return { visitedOrder, path };
  }

  function runBeamSearch() {
    const visitedOrder = [];
    const beamWidth = Math.max(3, Math.floor(state.cols / 8));
    let frontier = [state.start];
    const seen = new Set();

    while (frontier.length) {
      frontier.sort((a, b) => heuristic(a, state.end) - heuristic(b, state.end));
      frontier = frontier.slice(0, beamWidth);

      const next = [];
      for (const node of frontier) {
        if (seen.has(node) || node.isWall) continue;
        seen.add(node);
        visitedOrder.push(node);
        if (node === state.end) {
          return { visitedOrder, path: buildPath(node) };
        }
        for (const neighbor of getNeighbors(node)) {
          if (neighbor.isWall || seen.has(neighbor)) continue;
          neighbor.previous = node;
          next.push(neighbor);
        }
      }
      frontier = next;
    }

    return { visitedOrder, path: [] };
  }

  function runDfs() {
    const visitedOrder = [];
    const stack = [state.start];
    state.start.visited = true;

    while (stack.length) {
      const node = stack.pop();
      visitedOrder.push(node);
      if (node === state.end) break;
      const neighbors = getNeighbors(node);
      for (const neighbor of neighbors) {
        if (neighbor.visited || neighbor.isWall) continue;
        neighbor.visited = true;
        neighbor.previous = node;
        stack.push(neighbor);
      }
    }

    return { visitedOrder, path: buildPath(state.end) };
  }

  function runDijkstra() {
    const visitedOrder = [];
    const queue = [];
    state.start.distance = 0;
    queue.push(state.start);

    while (queue.length) {
      queue.sort((a, b) => a.distance - b.distance);
      const node = queue.shift();
      if (node.visited) continue;
      node.visited = true;
      visitedOrder.push(node);
      if (node === state.end) break;

      for (const neighbor of getNeighbors(node)) {
        if (neighbor.isWall || neighbor.visited) continue;
        const alt = node.distance + 1;
        if (alt < neighbor.distance) {
          neighbor.distance = alt;
          neighbor.previous = node;
          queue.push(neighbor);
        }
      }
    }

    return { visitedOrder, path: buildPath(state.end) };
  }

  function runAStar() {
    const visitedOrder = [];
    const open = [];
    state.start.distance = 0;
    state.start.score = heuristic(state.start, state.end);
    open.push(state.start);

    while (open.length) {
      open.sort((a, b) => a.score - b.score);
      const node = open.shift();
      if (node.visited) continue;
      node.visited = true;
      visitedOrder.push(node);
      if (node === state.end) break;

      for (const neighbor of getNeighbors(node)) {
        if (neighbor.isWall || neighbor.visited) continue;
        const tentative = node.distance + 1;
        if (tentative < neighbor.distance) {
          neighbor.distance = tentative;
          neighbor.previous = node;
          neighbor.score = tentative + heuristic(neighbor, state.end);
          open.push(neighbor);
        }
      }
    }

    return { visitedOrder, path: buildPath(state.end) };
  }

  function buildPath(target) {
    const path = [];
    let current = target;
    while (current) {
      path.unshift(current);
      current = current.previous;
    }
    if (path[0] !== state.start) return [];
    return path;
  }

  function buildBidirectionalPath(meeting, prevFromStart, prevFromEnd) {
    if (!meeting) return [];
    const fromStart = [];
    let current = meeting;
    while (current) {
      fromStart.unshift(current);
      current = prevFromStart.get(current);
    }
    const fromEnd = [];
    current = prevFromEnd.get(meeting);
    while (current) {
      fromEnd.push(current);
      current = prevFromEnd.get(current);
    }
    return fromStart.concat(fromEnd);
  }

  function getNeighbors(node) {
    const neighbors = [];
    const deltas = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dr, dc] of deltas) {
      const r = node.row + dr;
      const c = node.col + dc;
      if (r >= 0 && r < state.rows && c >= 0 && c < state.cols) {
        neighbors.push(state.grid[r][c]);
      }
    }
    return neighbors;
  }

  function clearPath(keepWalls = true) {
    const wasAnimating = state.animating;
    state.cancelAnimation = true;
    for (let r = 0; r < state.rows; r += 1) {
      for (let c = 0; c < state.cols; c += 1) {
        const node = state.grid[r][c];
        node.visited = false;
        node.inPath = false;
        node.distance = Infinity;
        node.score = Infinity;
        node.previous = null;
        if (!node.isStart && !node.isEnd) {
          node.el.classList.remove("visited", "path");
          if (!keepWalls) {
            node.isWall = false;
            node.el.classList.remove("wall");
          }
        }
      }
    }
    if (!wasAnimating) {
      toggleControls(false);
      setStatus(keepWalls ? "Path cleared." : "Walls cleared.");
      state.cancelAnimation = false;
    } else {
      setStatus("Stopping animation...");
    }
  }

  function clearWalls() {
    clearPath(false);
  }

  function randomizeWalls() {
    if (state.animating) return;
    clearPath(false);
    const density = 0.24 + Math.random() * 0.14;
    for (let r = 0; r < state.rows; r += 1) {
      for (let c = 0; c < state.cols; c += 1) {
        const node = state.grid[r][c];
        if (node.isStart || node.isEnd) continue;
        node.isWall = Math.random() < density;
        paintNode(node);
      }
    }
    setStatus("Random walls generated.");
  }

  function handleResize() {
    const newRows = Number(rowsInput.value) || state.rows;
    const newCols = Number(colsInput.value) || state.cols;
    buildGrid(newRows, newCols);
  }

  function setGridSizing() {
    const available = (gridShell?.clientWidth || 900) - 32;
    const gap = window.innerWidth < 640 ? 2 : 4;
    gridEl.style.gap = `${gap}px`;
    const size = Math.max(
      10,
      Math.min(36, Math.floor((available - gap * (state.cols - 1)) / state.cols))
    );
    gridEl.style.setProperty("--cell-size", `${size}px`);
    gridEl.style.gridTemplateColumns = `repeat(${state.cols}, var(--cell-size))`;
  }

  function paintNode(node) {
    const el = node.el;
    if (!el) return;
    el.className = "cell";

    if (node.isStart) {
      el.classList.add("start");
      return;
    }
    if (node.isEnd) {
      el.classList.add("end");
      return;
    }
    if (node.isWall) {
      el.classList.add("wall");
    }
    if (node.visited) {
      el.classList.add("visited");
    }
    if (node.inPath) {
      el.classList.add("path");
    }
  }

  function getNodeFromTarget(target) {
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    return state.grid[row][col];
  }

  function toggleControls(disabled) {
    const controls = [
      visualizeBtn,
      clearWallsBtn,
      randomizeBtn,
      resizeBtn,
      algorithmSelect,
      rowsInput,
      colsInput,
    ];
    controls.forEach((el) => {
      el.disabled = disabled;
    });
  }

  function updateSpeedLabel() {
    const { label } = speedConfig[speedSlider.value] || speedConfig[3];
    speedLabel.textContent = label;
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function heuristic(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
})();
