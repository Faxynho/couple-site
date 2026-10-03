import type {
  SharedDrawingPoint,
  SharedDrawingStroke,
} from "@/lib/sharedDrawingBoard";

/** Renderização dos traços do Nosso Quadro, compartilhada entre o quadro ao vivo e a galeria. */

function hexToRgba(hex: string): [number, number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
    255,
  ];
}

export function rgbaToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function floodFill(
  context: CanvasRenderingContext2D,
  point: SharedDrawingPoint,
  color: string,
  width: number,
  height: number
) {
  const pixelWidth = context.canvas.width;
  const pixelHeight = context.canvas.height;
  if (pixelWidth <= 0 || pixelHeight <= 0) return;

  const scaleX = pixelWidth / width;
  const scaleY = pixelHeight / height;
  const startX = Math.max(0, Math.min(pixelWidth - 1, Math.floor(point.x * width * scaleX)));
  const startY = Math.max(0, Math.min(pixelHeight - 1, Math.floor(point.y * height * scaleY)));
  const image = context.getImageData(0, 0, pixelWidth, pixelHeight);
  const data = image.data;
  const startIndex = (startY * pixelWidth + startX) * 4;
  const target = [
    data[startIndex],
    data[startIndex + 1],
    data[startIndex + 2],
    data[startIndex + 3],
  ];
  const replacement = hexToRgba(color);
  if (target.every((value, index) => value === replacement[index])) return;

  const matches = (index: number) =>
    data[index] === target[0]
    && data[index + 1] === target[1]
    && data[index + 2] === target[2]
    && data[index + 3] === target[3];

  const stack: Array<[number, number]> = [[startX, startY]];
  const visited = new Uint8Array(pixelWidth * pixelHeight);

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const pixelIndex = y * pixelWidth + x;
    if (visited[pixelIndex]) continue;
    visited[pixelIndex] = 1;
    const index = pixelIndex * 4;
    if (!matches(index)) continue;

    data[index] = replacement[0];
    data[index + 1] = replacement[1];
    data[index + 2] = replacement[2];
    data[index + 3] = replacement[3];

    if (x > 0) stack.push([x - 1, y]);
    if (x + 1 < pixelWidth) stack.push([x + 1, y]);
    if (y > 0) stack.push([x, y - 1]);
    if (y + 1 < pixelHeight) stack.push([x, y + 1]);
  }

  context.putImageData(image, 0, 0);
}

function shapeBounds(start: SharedDrawingPoint, end: SharedDrawingPoint, width: number, height: number) {
  return {
    x1: start.x * width,
    y1: start.y * height,
    x2: end.x * width,
    y2: end.y * height,
  };
}

function drawShape(
  context: CanvasRenderingContext2D,
  stroke: SharedDrawingStroke,
  width: number,
  height: number
) {
  if (!stroke.shape || stroke.points.length < 2) return;
  const { x1, y1, x2, y2 } = shapeBounds(stroke.points[0], stroke.points[1], width, height);
  context.beginPath();

  if (stroke.shape === "line") {
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
  } else if (stroke.shape === "rectangle") {
    context.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  } else if (stroke.shape === "square") {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    context.rect(x1, y1, Math.sign(dx || 1) * side, Math.sign(dy || 1) * side);
  } else if (stroke.shape === "circle") {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    context.ellipse(cx, cy, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
  } else if (stroke.shape === "triangle") {
    context.moveTo((x1 + x2) / 2, y1);
    context.lineTo(x2, y2);
    context.lineTo(x1, y2);
    context.closePath();
  } else if (stroke.shape === "diamond") {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    context.moveTo(cx, y1);
    context.lineTo(x2, cy);
    context.lineTo(cx, y2);
    context.lineTo(x1, cy);
    context.closePath();
  } else if (stroke.shape === "star") {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const outer = Math.max(2, Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2);
    const inner = outer * 0.45;
    for (let index = 0; index < 10; index += 1) {
      const radius = index % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
  } else if (stroke.shape === "arrow") {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = Math.max(10, context.lineWidth * 3);
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.moveTo(x2, y2);
    context.lineTo(x2 - Math.cos(angle - Math.PI / 6) * head, y2 - Math.sin(angle - Math.PI / 6) * head);
    context.moveTo(x2, y2);
    context.lineTo(x2 - Math.cos(angle + Math.PI / 6) * head, y2 - Math.sin(angle + Math.PI / 6) * head);
  }

  context.stroke();
}

export function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: SharedDrawingStroke,
  width: number,
  height: number,
  fromPoint = 0
) {
  const points = stroke.points;
  if (points.length === 0) return;

  context.save();
  context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = Math.max(1, stroke.size * width * (stroke.tool === "eraser" ? 1.8 : 1));

  if (stroke.tool === "fill") {
    floodFill(context, points[0], stroke.color, width, height);
  } else if (stroke.tool === "shape") {
    drawShape(context, stroke, width, height);
  } else if (points.length === 1) {
    context.beginPath();
    context.arc(points[0].x * width, points[0].y * height, context.lineWidth / 2, 0, Math.PI * 2);
    context.fill();
  } else {
    const start = Math.max(0, Math.min(fromPoint, points.length - 2));
    context.beginPath();
    context.moveTo(points[start].x * width, points[start].y * height);
    for (let index = start + 1; index < points.length; index += 1) {
      context.lineTo(points[index].x * width, points[index].y * height);
    }
    context.stroke();
  }

  context.restore();
}
