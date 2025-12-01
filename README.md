# Pathfinding Visualizer

Interactive grid-based visualizer for classic pathfinding algorithms. Click to build mazes, drag start/finish nodes, and watch algorithms explore the grid in real time.

## Features
- Algorithms: A* (Manhattan), Greedy best-first, Dijkstra, BFS, DFS, Bidirectional BFS, Bidirectional Dijkstra, Beam search
- Interactive grid: add/remove walls, drag start/end, resize rows/cols, random wall generator
- Adjustable speed and responsive sizing that fits small screens
- Clear path vs. clear walls controls to restart quickly

### Algorithms at a glance
- **A\***: Optimal with a heuristic; balanced efficiency and path quality.
- **Greedy best-first**: Heuristic-only, fastest but not guaranteed optimal.
- **Dijkstra**: Optimal for unweighted grids; explores widely.
- **BFS**: Optimal on unweighted grids; breadth-first expansion.
- **DFS**: Explores deeply; not optimal but fun to see.
- **Bidirectional BFS/Dijkstra**: Searches from both ends to meet in the middle; faster on large maps.
- **Beam search**: Heuristic-guided with a limited frontier; trades optimality for speed on big grids.

## Run Locally
No build step required.
```bash
# Option 1: open directly
open index.html   # macOS; or double-click the file

# Option 2: lightweight local server (recommended)
python3 -m http.server 8000
# then visit: http://localhost:8000
```

## How to Use
- Choose an algorithm and speed.
- Click cells to toggle walls; drag the green (start) or pink (end) markers to move them.
- Click **Visualize** to animate visits and shortest path; **Clear path** stops an in-progress animation; **Clear walls** resets obstacles; **Random walls** generates a maze.
- Adjust rows/columns and hit **Resize grid** to rebuild the board.

## Notes
- Grid automatically shrinks cell size to stay within the viewport; horizontal scroll is available if needed.
- Algorithms assume uniform edge cost (no weights); diagonals are disabled by design.
