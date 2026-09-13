interface StoryStats {
  handle: string;
  cityName: string;
  streak: number;
  totalXp: number;
  rank: string;
}

export type StoryCardData = StoryStats & (
  | { kind: 'mission'; quest: string; mode: 'solo' | 'duo' | 'squad' | 'explorer'; xpEarned: number }
  | { kind: 'recap'; friendCount: number }
);

const colors = {
  cream: '#fff8f0', ink: '#292724', orange: '#c44116', muted: '#70685f',
  peach: '#ffecdf', line: '#e8dfd5', white: '#ffffff',
};
const heading = '"Space Grotesk", sans-serif';
const body = 'Inter, sans-serif';

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.fillStyle = colors.muted;
  ctx.font = `600 32px ${body}`;
  ctx.fillText(text, x, y);
}

function fittedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, width: number) {
  ctx.font = `700 ${size}px ${heading}`;
  while (ctx.measureText(text).width > width && size > 32) {
    size -= 2;
    ctx.font = `700 ${size}px ${heading}`;
  }
  // Bound unusually long handles or future rank titles as well.
  while (ctx.measureText(text).width > width && text.length > 1) text = text.slice(0, -2).trimEnd() + '…';
  ctx.fillText(text, x, y);
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color = colors.white) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 36);
  ctx.fill();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    if (line && ctx.measureText(`${line} ${word}`).width > width) {
      lines.push(line);
      line = '';
    }
    // Also wrap long unbroken strings; they must not spill into the margins.
    for (const character of (line ? ' ' : '') + word) {
      if (line && ctx.measureText(line + character).width > width) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function missionText(ctx: CanvasRenderingContext2D, text: string) {
  const width = 864;
  let size = 64;
  let lines: string[];
  do {
    ctx.font = `500 ${size}px ${heading}`;
    lines = wrapLines(ctx, text, width);
    if (lines.length * size * 1.25 <= 530 || size <= 44) break;
    size -= 2;
  } while (true);

  const maxLines = Math.floor(530 / (size * 1.25));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let lastLine = lines[maxLines - 1];
    while (ctx.measureText(lastLine + '…').width > width && lastLine.length) lastLine = lastLine.slice(0, -1);
    lines[maxLines - 1] = lastLine.trimEnd() + '…';
  }
  ctx.fillStyle = colors.ink;
  lines.forEach((line, index) => ctx.fillText(line, 108, 800 + index * size * 1.25));
}

/** Render the same 1080×1920 artwork for the preview and the shared PNG. */
export function drawStoryCard(ctx: CanvasRenderingContext2D, data: StoryCardData) {
  ctx.textAlign = 'left';
  ctx.fillStyle = colors.cream;
  ctx.fillRect(0, 0, 1080, 1920);

  panel(ctx, 80, 112, 80, 80, colors.orange);
  ctx.strokeStyle = colors.white;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(126, 127);
  ctx.lineTo(101, 155);
  ctx.lineTo(118, 155);
  ctx.lineTo(111, 178);
  ctx.lineTo(139, 146);
  ctx.lineTo(122, 146);
  ctx.lineTo(126, 127);
  ctx.stroke();
  ctx.fillStyle = colors.ink;
  fittedText(ctx, 'BREAK THE LOOP.', 188, 168, 48, 820);
  label(ctx, 'LESS SCROLLING. MORE LIVING.', 80, 280);

  const days = `${data.streak} ${data.streak === 1 ? 'day' : 'days'}`;
  if (data.kind === 'mission') {
    ctx.fillStyle = colors.ink;
    fittedText(ctx, 'Loop broken.', 80, 433, 124, 920);
    ctx.font = `500 46px ${body}`;
    ctx.fillStyle = colors.muted;
    ctx.fillText('One small adventure. All yours.', 80, 514);

    panel(ctx, 64, 610, 952, 774);
    const modeLabels = { solo: 'SOLO MISSION', duo: 'DUO MISSION', squad: 'SQUAD MISSION', explorer: 'LOCAL DISCOVERY' };
    label(ctx, modeLabels[data.mode], 108, 692);
    ctx.fillStyle = colors.line;
    ctx.fillRect(108, 726, 864, 2);
    missionText(ctx, data.quest);

    ctx.fillStyle = colors.orange;
    fittedText(ctx, `+${data.xpEarned} XP`, 80, 1538, 120, 530);
    ctx.fillStyle = colors.ink;
    fittedText(ctx, days, 650, 1538, 100, 350);
    label(ctx, 'EARNED THIS MISSION', 80, 1606);
    label(ctx, 'LOOP STREAK', 650, 1606);
    ctx.fillStyle = colors.ink;
    fittedText(ctx, `${data.totalXp} XP total · ${data.rank}`, 80, 1688, 44, 920);
  } else {
    ctx.fillStyle = colors.ink;
    fittedText(ctx, 'Life, actually', 80, 433, 116, 920);
    ctx.fillStyle = colors.orange;
    fittedText(ctx, 'lived.', 80, 550, 116, 920);

    panel(ctx, 64, 638, 952, 392);
    label(ctx, 'YOUR REAL-WORLD XP', 112, 724);
    ctx.fillStyle = colors.orange;
    fittedText(ctx, `${data.totalXp} XP`, 108, 905, 164, 852);
    ctx.font = `500 40px ${body}`;
    ctx.fillStyle = colors.muted;
    ctx.fillText('A little further from the ordinary.', 112, 982);

    panel(ctx, 64, 1070, 456, 300);
    panel(ctx, 560, 1070, 456, 300, colors.peach);
    ctx.fillStyle = colors.ink;
    fittedText(ctx, days, 108, 1220, 100, 368);
    fittedText(ctx, String(data.friendCount), 604, 1220, 112, 368);
    label(ctx, 'LOOP STREAK', 108, 1302);
    label(ctx, data.friendCount === 1 ? 'SQUAD FRIEND' : 'SQUAD FRIENDS', 604, 1302);
    label(ctx, 'YOUR CURRENT RANK', 80, 1490);
    ctx.fillStyle = colors.ink;
    fittedText(ctx, data.rank, 80, 1592, 88, 920);
  }

  ctx.fillStyle = colors.ink;
  fittedText(ctx, `@${data.handle} · ${data.cityName}`, 80, 1772, 44, 920);
  ctx.fillStyle = colors.line;
  ctx.fillRect(80, 1812, 920, 2);
  label(ctx, 'GO MAKE A MEMORY.', 80, 1872);
  ctx.textAlign = 'right';
  label(ctx, 'breaktheloopapp.in', 1000, 1872);
}

export function createStoryCard(data: StoryCardData): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawStoryCard(ctx, data);
  return canvas.toDataURL('image/png');
}
