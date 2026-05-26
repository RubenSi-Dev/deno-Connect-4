import { square } from "../state/types.mts";
// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

const ESC = "\x1b[";

/** ANSI foreground color / style escape codes. */
const fg = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  white: `${ESC}97m`,
  black: `${ESC}90m`,
  yellow: `${ESC}93m`,
  cyan: `${ESC}96m`,
  magenta: `${ESC}95m`,
  blue: `${ESC}94m`,
  gray: `${ESC}37m`,
} as const;

/** ANSI background color escape codes (currently unused in rendering). */
const _bg = {
  reset: `${ESC}0m`,
  white: `${ESC}47m`,
  black: `${ESC}40m`,
  blue: `${ESC}44m`,
} as const;

/**
 * Wraps `text` with the provided ANSI escape `codes` and appends a reset
 * sequence so that styling does not leak to adjacent output.
 *
 * @param text - The string to style.
 * @param codes - One or more ANSI escape sequences to prepend.
 * @returns The styled string with a trailing reset escape.
 */
function styled(text: string, ...codes: string[]): string {
  return codes.join("") + text + fg.reset;
}

// ---------------------------------------------------------------------------
// Box-drawing characters
// ---------------------------------------------------------------------------

/** Unicode box-drawing character constants used to render the board border. */
const BOX = {
  topLeft: "╔",
  topRight: "╗",
  bottomLeft: "╚",
  bottomRight: "╝",
  top: "╦",
  bottom: "╩",
  left: "╠",
  right: "╣",
  cross: "╬",
  horiz: "═",
  vert: "║",
  horizSingle: "─",
  innerLeft: "╟",
  innerRight: "╢",
  innerCross: "┼",
  innerTop: "╤",
  innerBottom: "╧",
} as const;

/** Width of each cell in characters (must be odd so the disc glyph is centered). */
const CELL_W = 3;

// ---------------------------------------------------------------------------
// Disc rendering
// ---------------------------------------------------------------------------

/**
 * Returns the ANSI-styled glyph for a single board cell.
 * Filled cells render a bold `●`; empty cells render a dim `○`.
 *
 * @param color - The {@link square} value of the cell (a player color or `null`).
 * @returns An ANSI-styled 3-character string for the disc.
 */
function disc(color: square): string {
  switch (color) {
    case "white":
      return styled(" ● ", fg.white, fg.bold);
    case "black":
      return styled(" ● ", fg.black, fg.bold);
    default:
      return styled(" ○ ", fg.gray, fg.dim);
  }
}

// ---------------------------------------------------------------------------
// Border row builders
// ---------------------------------------------------------------------------

/**
 * Builds the top border row of the board grid.
 *
 * @param cols - The number of columns in the board.
 * @returns An ANSI-styled top-border string.
 */
function topBorder(cols: number): string {
  const seg = BOX.horiz.repeat(CELL_W);
  const inner = Array.from({ length: cols }, () => seg).join(BOX.top);
  return styled(BOX.topLeft + inner + BOX.topRight, fg.blue, fg.bold);
}

/**
 * Builds a middle separator row between two rows of the board grid.
 *
 * @param cols - The number of columns in the board.
 * @returns An ANSI-styled mid-border string.
 */
function midBorder(cols: number): string {
  const seg = BOX.horiz.repeat(CELL_W);
  const inner = Array.from({ length: cols }, () => seg).join(BOX.cross);
  return styled(BOX.left + inner + BOX.right, fg.blue, fg.bold);
}

/**
 * Builds the bottom border row of the board grid.
 *
 * @param cols - The number of columns in the board.
 * @returns An ANSI-styled bottom-border string.
 */
function bottomBorder(cols: number): string {
  const seg = BOX.horiz.repeat(CELL_W);
  const inner = Array.from({ length: cols }, () => seg).join(BOX.bottom);
  return styled(BOX.bottomLeft + inner + BOX.bottomRight, fg.blue, fg.bold);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a multi-line string that renders the board in a modern TUI style.
 *
 * `board` is column-major: board[col][row], where row 0 is the top.
 * `status` is an optional line printed beneath the board (e.g. whose turn it is).
 *
 * @param board - Column-major 2-D array of {@link square} values representing
 *   the current board state.
 * @param status - Optional status line displayed below the board (e.g.
 *   `"Turn: 3  Move: black"`).
 * @returns A complete, ANSI-styled multi-line board string.
 */
export function getBoardString(
  board: square[][],
  status?: string,
): string {
  const COLS = board.length;
  const ROWS = board[0].length;
  const vert = styled(BOX.vert, fg.blue, fg.bold);

  const lines: string[] = [];

  // ── Title ────────────────────────────────────────────────────────────────
  const title = styled(" CONNECT FOUR ", fg.yellow, fg.bold);
  const titlePad = Math.floor((COLS * (CELL_W + 1) + 1 - 14) / 2);
  lines.push(" ".repeat(Math.max(0, titlePad)) + title);
  lines.push("");

  // ── Top border ───────────────────────────────────────────────────────────
  lines.push(topBorder(COLS));

  // ── Rows (top = row 0 = visually top of board) ───────────────────────────
  for (let row = 0; row < ROWS; row++) {
    const cells = board.map((col) => disc(col[row])).join(vert);
    lines.push(vert + cells + vert);
    if (row < ROWS - 1) lines.push(midBorder(COLS));
  }

  // ── Bottom border ─────────────────────────────────────────────────────────
  lines.push(bottomBorder(COLS));

  // ── Column numbers ────────────────────────────────────────────────────────
  const colNums = Array.from(
    { length: COLS },
    (_, i) => styled(` ${i + 1} `, fg.cyan, fg.bold),
  ).join(styled(BOX.vert, fg.blue));
  lines.push(styled(BOX.vert, fg.blue) + colNums + styled(BOX.vert, fg.blue));
  lines.push(bottomBorder(COLS));

  // ── Status line ───────────────────────────────────────────────────────────
  if (status) {
    lines.push("");
    lines.push("  " + styled(status, fg.yellow, fg.bold));
  }

  return lines.join("\n");
}
