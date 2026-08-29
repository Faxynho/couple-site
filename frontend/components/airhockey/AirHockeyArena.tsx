"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";
import { AirHockeyState } from "@/lib/airHockeyTypes";

const WIDTH = 1.6;
const HEIGHT = 1;
const PADDLE_RADIUS = 0.075;
const PUCK_RADIUS = 0.034;
const LOCAL_PADDLE_SPEED = 3.45;
type Effect = "wall" | "hit" | "goal" | "countdown";
type Props = { stateRef: React.MutableRefObject<AirHockeyState | null>; selfId: string; onMove: (x: number, y: number) => void; onEffect: (effect: Effect) => void };

export default function AirHockeyArena({ stateRef, selfId, onMove, onEffect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [portrait, setPortrait] = useState(false);
  const dragging = useRef(false);
  const localPaddle = useRef<{ x: number; y: number } | null>(null);
  const paddleVisuals = useRef<Record<string, { x: number; y: number }>>({});
  const fieldRef = useRef({ x: 0, y: 0, width: 1, height: 1 });
  const puckVisual = useRef<{ x: number; y: number; vx: number; vy: number; initialized: boolean }>({ x: 0, y: 0, vx: 0, vy: 0, initialized: false });
  const lastFrameAt = useRef(0);
  const lastVisualPhase = useRef<string | null>(null);
  const goalFx = useRef<{ serial: number; startedAt: number; x: number; y: number; color: string; final: boolean } | null>(null);
  const sentAt = useRef(0);
  const events = useRef({ impact: -1, goal: -1, countdown: -1 });
  const localContacts = useRef<Record<string, boolean>>({});
  const predictionGraceUntil = useRef(0);
  const lastPredictedImpactAt = useRef(0);

  useEffect(() => {
    const update = () => setPortrait(window.innerHeight > window.innerWidth || window.innerWidth < 640);
    update(); window.addEventListener("resize", update); return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let frame = 0;
    let width = 1; let height = 1;
    const resize = () => {
      const box = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, box.width); height = Math.max(1, box.height);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const roundRect = (x: number, y: number, w: number, h: number, radius: number) => { context.beginPath(); context.roundRect(x, y, w, h, radius); };
    const map = (x: number, y: number, selfIsLeft: boolean) => {
      const field = fieldRef.current;
      if (!portrait) return { x: field.x + x / WIDTH * field.width, y: field.y + y * field.height };
      return selfIsLeft
        ? { x: field.x + y * field.width, y: field.y + (1 - x / WIDTH) * field.height }
        : { x: field.x + (1 - y) * field.width, y: field.y + x / WIDTH * field.height };
    };
    // A raquete local segue a intenção do ponteiro, mas nunca é desenhada
    // atravessando o disco entre dois snapshots. É a mesma geometria circular
    // do servidor e apenas impede uma previsão visual impossível; o impulso e
    // a posição final do disco continuam vindo da física autoritativa.
    const advanceLocalPaddle = (from: { x: number; y: number }, target: { x: number; y: number }, puck: { x: number; y: number }, dt: number) => {
      const targetX = target.x - from.x;
      const targetY = target.y - from.y;
      const targetDistance = Math.hypot(targetX, targetY);
      const maxDistance = LOCAL_PADDLE_SPEED * dt;
      let nextX = targetDistance > maxDistance && targetDistance > 0 ? from.x + targetX / targetDistance * maxDistance : target.x;
      let nextY = targetDistance > maxDistance && targetDistance > 0 ? from.y + targetY / targetDistance * maxDistance : target.y;
      const startX = from.x - puck.x;
      const startY = from.y - puck.y;
      const moveX = nextX - from.x;
      const moveY = nextY - from.y;
      const radius = PADDLE_RADIUS + PUCK_RADIUS + 0.001;
      const startDistanceSq = startX * startX + startY * startY;
      const moveLengthSq = moveX * moveX + moveY * moveY;
      const c = startDistanceSq - radius * radius;
      let hitT: number | null = c <= 0 ? 0 : null;
      if (hitT === null && moveLengthSq > 0.0000001) {
        const b = 2 * (startX * moveX + startY * moveY);
        const discriminant = b * b - 4 * moveLengthSq * c;
        if (discriminant >= 0) {
          const first = (-b - Math.sqrt(discriminant)) / (2 * moveLengthSq);
          if (first >= 0 && first <= 1) hitT = first;
        }
      }
      if (hitT === null) return { x: nextX, y: nextY };
      const contactX = startX + moveX * hitT;
      const contactY = startY + moveY * hitT;
      const contactDistance = Math.hypot(contactX, contactY);
      const nx = contactDistance > 0.000001 ? contactX / contactDistance : (startDistanceSq > 0.000001 ? startX / Math.sqrt(startDistanceSq) : -1);
      const ny = contactDistance > 0.000001 ? contactY / contactDistance : (startDistanceSq > 0.000001 ? startY / Math.sqrt(startDistanceSq) : 0);
      nextX = puck.x + nx * radius;
      nextY = puck.y + ny * radius;
      return { x: nextX, y: nextY };
    };
    const predictPaddleImpact = (
      paddleId: string,
      previousPaddle: { x: number; y: number },
      paddle: { x: number; y: number },
      previousPuck: { x: number; y: number },
      puck: { x: number; y: number; vx: number; vy: number },
      dt: number
    ) => {
      const radius = PADDLE_RADIUS + PUCK_RADIUS;
      const startX = previousPuck.x - previousPaddle.x;
      const startY = previousPuck.y - previousPaddle.y;
      const endX = puck.x - paddle.x;
      const endY = puck.y - paddle.y;
      const moveX = endX - startX;
      const moveY = endY - startY;
      const currentDistance = Math.hypot(endX, endY);
      if (localContacts.current[paddleId]) {
        if (Math.hypot(startX, startY) > radius + .014 && currentDistance > radius + .014) localContacts.current[paddleId] = false;
        else return false;
      }
      const a = moveX * moveX + moveY * moveY;
      const b = 2 * (startX * moveX + startY * moveY);
      const c = startX * startX + startY * startY - radius * radius;
      let impactT: number | null = c <= 0 ? 0 : null;
      if (impactT === null && a > .000000001) {
        const discriminant = b * b - 4 * a * c;
        if (discriminant >= 0) {
          const first = (-b - Math.sqrt(discriminant)) / (2 * a);
          if (first >= 0 && first <= 1) impactT = first;
        }
      }
      if (impactT === null) return false;
      const hitX = startX + moveX * impactT;
      const hitY = startY + moveY * impactT;
      const hitLength = Math.hypot(hitX, hitY) || 1;
      const nx = hitX / hitLength;
      const ny = hitY / hitLength;
      const paddleX = previousPaddle.x + (paddle.x - previousPaddle.x) * impactT;
      const paddleY = previousPaddle.y + (paddle.y - previousPaddle.y) * impactT;
      const paddleVx = (paddle.x - previousPaddle.x) / Math.max(dt, .001);
      const paddleVy = (paddle.y - previousPaddle.y) / Math.max(dt, .001);
      puck.x = paddleX + nx * (radius + .001);
      puck.y = paddleY + ny * (radius + .001);
      const approach = (puck.vx - paddleVx) * nx + (puck.vy - paddleVy) * ny;
      if (approach < 0) { puck.vx -= 1.88 * approach * nx; puck.vy -= 1.88 * approach * ny; }
      puck.vx += paddleVx * .39 + nx * .11;
      puck.vy += paddleVy * .39 + ny * .11;
      const speed = Math.hypot(puck.vx, puck.vy);
      if (speed > 2.45) { puck.vx = puck.vx / speed * 2.45; puck.vy = puck.vy / speed * 2.45; }
      else if (speed < .5) { puck.vx += nx * .42; puck.vy += ny * .42; }
      localContacts.current[paddleId] = true;
      predictionGraceUntil.current = performance.now() + 420;
      if (performance.now() - lastPredictedImpactAt.current > 75) {
        lastPredictedImpactAt.current = performance.now();
        onEffect("hit");
      }
      return true;
    };
    const predictPuckBounds = (puck: { x: number; y: number; vx: number; vy: number }) => {
      let bounced = false;
      if (puck.y - PUCK_RADIUS < 0) { puck.y = PUCK_RADIUS; puck.vy = Math.abs(puck.vy); bounced = true; }
      if (puck.y + PUCK_RADIUS > HEIGHT) { puck.y = HEIGHT - PUCK_RADIUS; puck.vy = -Math.abs(puck.vy); bounced = true; }
      const inGoal = puck.y > .34 && puck.y < .66;
      if (puck.x - PUCK_RADIUS < 0) {
        if (inGoal) { puck.x = PUCK_RADIUS; puck.vx = 0; }
        else { puck.x = PUCK_RADIUS; puck.vx = Math.abs(puck.vx); bounced = true; }
      }
      if (puck.x + PUCK_RADIUS > WIDTH) {
        if (inGoal) { puck.x = WIDTH - PUCK_RADIUS; puck.vx = 0; }
        else { puck.x = WIDTH - PUCK_RADIUS; puck.vx = -Math.abs(puck.vx); bounced = true; }
      }
      if (bounced) {
        predictionGraceUntil.current = performance.now() + 260;
        if (performance.now() - lastPredictedImpactAt.current > 75) {
          lastPredictedImpactAt.current = performance.now();
          onEffect("wall");
        }
      }
    };

    const drawGoal = (side: "left" | "right" | "top" | "bottom", color: string, dark: boolean, playX: number, playY: number, playW: number, playH: number, shortest: number, middleX: number, middleY: number) => {
      const vertical = side === "left" || side === "right";
      const length = vertical ? playH * .34 : playW * .34;
      const depth = shortest * .052;
      const x = vertical ? (side === "left" ? playX - depth * .45 : playX + playW - depth * .55) : middleX - length / 2;
      const y = vertical ? middleY - length / 2 : (side === "top" ? playY - depth * .45 : playY + playH - depth * .55);
      const w = vertical ? depth : length; const h = vertical ? length : depth;
      context.save(); context.shadowColor = `${color}88`; context.shadowBlur = shortest * .025;
      const fill = context.createLinearGradient(x, y, x + w, y + h);
      fill.addColorStop(0, "#211524"); fill.addColorStop(.75, color); fill.addColorStop(1, dark ? "#120b14" : "#38213a");
      context.fillStyle = fill; roundRect(x, y, w, h, length * .34); context.fill(); context.restore();
      context.strokeStyle = "rgba(255,243,239,.72)"; context.lineWidth = Math.max(1.3, shortest * .005); roundRect(x, y, w, h, length * .34); context.stroke();
    };
    const drawRail = (side: "left" | "right" | "top" | "bottom", color: string, dark: boolean, boardX: number, boardY: number, boardW: number, boardH: number, shortest: number, middleX: number, middleY: number) => {
      const vertical = side === "left" || side === "right";
      const length = vertical ? boardH * .47 : boardW * .47; const thickness = shortest * .045;
      const x = vertical ? (side === "left" ? boardX - thickness * .72 : boardX + boardW - thickness * .28) : middleX - length / 2;
      const y = vertical ? middleY - length / 2 : (side === "top" ? boardY - thickness * .72 : boardY + boardH - thickness * .28);
      const w = vertical ? thickness : length; const h = vertical ? length : thickness;
      context.save(); context.shadowColor = `${color}77`; context.shadowBlur = shortest * .018;
      const fill = context.createLinearGradient(x, y, x + w, y + h);
      fill.addColorStop(0, "#f7a1ae"); fill.addColorStop(.42, color); fill.addColorStop(1, dark ? "#563d62" : "#8c639b");
      context.fillStyle = fill; roundRect(x, y, w, h, thickness * .28); context.fill(); context.restore();
      context.strokeStyle = "rgba(255,238,244,.48)"; context.lineWidth = Math.max(1, shortest * .003); roundRect(x, y, w, h, thickness * .28); context.stroke();
      context.fillStyle = "rgba(255,255,255,.68)";
      context.beginPath(); context.arc(x + w * .5, y + h * .12, Math.max(1.4, shortest * .007), 0, Math.PI * 2); context.fill();
      context.beginPath(); context.arc(x + w * .5, y + h * .88, Math.max(1.4, shortest * .007), 0, Math.PI * 2); context.fill();
    };
    const drawPlate = (x: number, y: number, w: number, h: number, color: string, shortest: number) => {
      context.save(); context.strokeStyle = color; context.lineWidth = Math.max(1, shortest * .004); context.globalAlpha = .76;
      context.beginPath(); context.moveTo(x, y + h); context.lineTo(x + w * .12, y); context.lineTo(x + w * .88, y); context.lineTo(x + w, y + h); context.closePath(); context.stroke();
      for (let i = .24; i < .9; i += .22) { context.beginPath(); context.moveTo(x + w * i, y); context.lineTo(x + w * (i - .16), y + h); context.stroke(); }
      context.restore();
    };

    const draw = () => {
      const state = stateRef.current;
      if (!state) { frame = requestAnimationFrame(draw); return; }
      const now = Date.now(); const frameNow = performance.now(); const renderDt = lastFrameAt.current ? Math.min((frameNow - lastFrameAt.current) / 1000, .025) : 0; lastFrameAt.current = frameNow;
      const shortest = Math.min(width, height); const dark = document.documentElement.classList.contains("dark");
      const blush = "#e8567d"; const violet = "#7657cf";
      const ivory = dark ? "#e8d7d0" : "#fff0e9"; const pinkLine = dark ? "#c87582" : "#efaeb5";
      // A moldura é fina: o campo claro começa próximo à borda do Canvas e
      // continua sendo a mesma geometria usada pelo mapeamento físico.
      const inset = Math.max(5, shortest * .018); const boardX = inset; const boardY = inset; const boardW = width - inset * 2; const boardH = height - inset * 2; const tableRadius = shortest * .055;
      context.clearRect(0, 0, width, height);
      const glass = context.createLinearGradient(0, boardY, 0, boardY + boardH); glass.addColorStop(0, dark ? "#b58d9e" : "#d4aaba"); glass.addColorStop(.16, dark ? "#5b3a53" : "#8e627d"); glass.addColorStop(.84, dark ? "#3b2538" : "#664354"); glass.addColorStop(1, dark ? "#241722" : "#422b3d");
      context.save(); context.shadowColor = "rgba(20,8,18,.38)"; context.shadowBlur = shortest * .022; context.shadowOffsetY = shortest * .009; context.fillStyle = glass; roundRect(boardX, boardY, boardW, boardH, tableRadius); context.fill(); context.restore();
      context.strokeStyle = "rgba(255,224,235,.5)"; context.lineWidth = Math.max(1, shortest*.004); roundRect(boardX+shortest*.004,boardY+shortest*.004,boardW-shortest*.008,boardH-shortest*.008,tableRadius*.92); context.stroke();
      const playInset = Math.max(4, shortest * .022); const playX = boardX + playInset; const playY = boardY + playInset; const playW = boardW - playInset * 2; const playH = boardH - playInset * 2;
      fieldRef.current = { x: playX, y: playY, width: playW, height: playH };
      context.save(); context.shadowColor = "rgba(45,16,31,.46)"; context.shadowBlur = shortest*.019; context.shadowOffsetY = shortest*.009;
      const surface = context.createLinearGradient(playX, playY, playX + playW, playY + playH); surface.addColorStop(0, dark ? "#ecd8d2" : "#fff6f0"); surface.addColorStop(.5, ivory); surface.addColorStop(1, dark ? "#d7c1c1" : "#fee6df"); context.fillStyle = surface; roundRect(playX, playY, playW, playH, tableRadius*.46); context.fill(); context.restore();
      context.strokeStyle = dark ? "#a7757a" : "#e3a6a9"; context.lineWidth = Math.max(1.4, shortest*.006); roundRect(playX+shortest*.01,playY+shortest*.01,playW-shortest*.02,playH-shortest*.02,tableRadius*.39); context.stroke();
      context.strokeStyle = "rgba(255,255,255,.7)"; context.lineWidth = Math.max(1, shortest*.0025); roundRect(playX+shortest*.017,playY+shortest*.017,playW-shortest*.034,playH-shortest*.034,tableRadius*.35); context.stroke();
      context.fillStyle = dark ? "rgba(142,83,98,.18)" : "rgba(213,128,145,.23)"; const spacing = Math.max(13, shortest*.043);
      for (let x = playX + spacing; x < playX + playW - spacing; x += spacing) for (let y = playY + spacing; y < playY + playH - spacing; y += spacing) { context.beginPath(); context.arc(x, y, Math.max(.7, shortest*.003), 0, Math.PI*2); context.fill(); }
      const selfIsLeft = state.playerIds[0] === selfId; const middleX = width / 2; const middleY = height / 2;
      context.save(); context.strokeStyle = pinkLine; context.globalAlpha = .83; context.lineWidth = Math.max(1.5, shortest*.006);
      if (portrait) { context.beginPath(); context.moveTo(playX, middleY); context.lineTo(playX+playW, middleY); context.stroke(); context.beginPath(); context.arc(middleX,middleY,playW*.18,0,Math.PI*2);context.stroke(); }
      else { context.beginPath(); context.moveTo(middleX, playY); context.lineTo(middleX, playY+playH); context.stroke(); context.beginPath(); context.arc(middleX,middleY,playH*.2,0,Math.PI*2);context.stroke(); } context.restore();
      const heart = Math.max(7, shortest*.025); context.save(); context.translate(middleX,middleY); context.strokeStyle=pinkLine; context.lineWidth=Math.max(1.4,shortest*.005); context.beginPath(); context.moveTo(0,heart*.92); context.bezierCurveTo(-heart*1.7,-heart*.18,-heart*.92,-heart*1.7,0,-heart*.72); context.bezierCurveTo(heart*.92,-heart*1.7,heart*1.7,-heart*.18,0,heart*.92); context.stroke(); context.restore();
      if (portrait) { drawGoal("top",violet,dark,playX,playY,playW,playH,shortest,middleX,middleY); drawGoal("bottom",blush,dark,playX,playY,playW,playH,shortest,middleX,middleY); } else { drawGoal("left",blush,dark,playX,playY,playW,playH,shortest,middleX,middleY); drawGoal("right",violet,dark,playX,playY,playW,playH,shortest,middleX,middleY); }
      context.save(); context.strokeStyle=pinkLine; context.globalAlpha=.84; context.lineWidth=Math.max(1.4,shortest*.006);
      if (portrait) for (const y of [playY,playY+playH]) { context.beginPath();context.arc(middleX,y,playW*.33,y===playY?0:Math.PI,y===playY?Math.PI:Math.PI*2);context.stroke(); }
      else for (const x of [playX,playX+playW]) { context.beginPath();context.arc(x,middleY,playH*.33,x===playX?-Math.PI/2:Math.PI/2,x===playX?Math.PI/2:Math.PI*1.5);context.stroke(); } context.restore();
      if(portrait){drawPlate(playX+playW*.08,playY+shortest*.012,playW*.22,shortest*.035,pinkLine,shortest);drawPlate(playX+playW*.7,playY+playH-shortest*.047,playW*.22,shortest*.035,pinkLine,shortest);} else {drawPlate(playX+playW*.08,playY+shortest*.012,playW*.13,shortest*.035,pinkLine,shortest);drawPlate(playX+playW*.79,playY+playH-shortest*.047,playW*.13,shortest*.035,pinkLine,shortest);}
      // A física e os gols continuam autoritativos no servidor. Para não
      // renderizar a posição já envelhecida pelo RTT, o Canvas extrapola cada
      // snapshot até o relógio atual e só então o reconcilia suavemente.
      const visual = puckVisual.current;
      const previousPuck = { x: visual.x, y: visual.y };
      const snapshotAge = state.phase === "playing" ? Math.max(0, Math.min(.55, ((Date.now() + (state.clockOffsetMs ?? 0)) - state.lastTickAt) / 1000)) : 0;
      const snapshotPuck = { x: state.puck.x + state.puck.vx * snapshotAge, y: state.puck.y + state.puck.vy * snapshotAge };
      if (!visual.initialized || lastVisualPhase.current !== state.phase) { visual.x=snapshotPuck.x; visual.y=snapshotPuck.y; visual.vx=state.puck.vx; visual.vy=state.puck.vy; visual.initialized=true; }
      else { visual.x += visual.vx * renderDt; visual.y += visual.vy * renderDt; const correction = Math.min(1, renderDt * (performance.now() < predictionGraceUntil.current ? 3.2 : 9)); visual.x += (snapshotPuck.x - visual.x) * correction; visual.y += (snapshotPuck.y - visual.y) * correction; visual.vx += (state.puck.vx - visual.vx) * correction; visual.vy += (state.puck.vy - visual.vy) * correction; }
      lastVisualPhase.current = state.phase;
      const unit = portrait ? playW : playH;
      for (const id of state.playerIds) {
        const paddle = state.paddles[id]; if (!paddle) continue;
        const previous = paddleVisuals.current[id] ?? { x: paddle.x, y: paddle.y };
        const projectedX = Math.max(PADDLE_RADIUS, Math.min(WIDTH - PADDLE_RADIUS, paddle.x + paddle.vx * snapshotAge));
        const projectedY = Math.max(PADDLE_RADIUS, Math.min(HEIGHT - PADDLE_RADIUS, paddle.y + paddle.vy * snapshotAge));
        const display = id === selfId && localPaddle.current
          ? advanceLocalPaddle(previous, localPaddle.current, visual, renderDt)
          : id === "BOT" && state.mode === "solo"
            ? (() => { const speed = state.difficulty === "easy" ? .62 : state.difficulty === "hard" ? 1.22 : .95; const dx=paddle.targetX-previous.x; const dy=paddle.targetY-previous.y; const distance=Math.hypot(dx,dy); const step=Math.min(distance,speed*renderDt); return distance ? { x: previous.x+dx/distance*step, y: previous.y+dy/distance*step } : previous; })()
            : { x: previous.x + (projectedX - previous.x) * Math.min(1, renderDt * 17), y: previous.y + (projectedY - previous.y) * Math.min(1, renderDt * 17) };
        paddleVisuals.current[id] = display;
        if (renderDt > 0 && (id === selfId || (state.mode === "solo" && id === "BOT"))) predictPaddleImpact(id, previous, display, previousPuck, visual, renderDt);
        const point=map(display.x,display.y,selfIsLeft);const radius=unit*PADDLE_RADIUS;const local=id===selfId;const color=local?blush:(id==="BOT"?violet:"#7657cf");context.save();context.shadowColor="rgba(44,16,31,.52)";context.shadowBlur=radius*.38;context.shadowOffsetY=radius*.24;const base=context.createRadialGradient(point.x-radius*.28,point.y-radius*.35,radius*.05,point.x,point.y,radius);base.addColorStop(0,"#ffe0e6");base.addColorStop(.32,local?"#fb7696":"#ad95ff");base.addColorStop(.76,color);base.addColorStop(1,dark?"#371929":"#8d2a51");context.fillStyle=base;context.beginPath();context.arc(point.x,point.y,radius,0,Math.PI*2);context.fill();context.restore();context.strokeStyle="rgba(255,231,233,.88)";context.lineWidth=Math.max(1.4,radius*.08);context.beginPath();context.arc(point.x,point.y,radius*.7,0,Math.PI*2);context.stroke();const cap=context.createRadialGradient(point.x-radius*.14,point.y-radius*.2,radius*.04,point.x,point.y,radius*.47);cap.addColorStop(0,"#fff0f1");cap.addColorStop(.42,local?"#ff6d91":"#9d80f3");cap.addColorStop(1,local?"#b92751":"#49338a");context.fillStyle=cap;context.beginPath();context.arc(point.x,point.y,radius*.47,0,Math.PI*2);context.fill();
      }
      if (renderDt > 0 && state.phase === "playing") predictPuckBounds(visual);
      const puckPoint = map(visual.x, visual.y, selfIsLeft);
      const puckR=unit*PUCK_RADIUS;context.save();context.shadowColor="rgba(65,25,43,.45)";context.shadowBlur=puckR*.75;context.shadowOffsetY=puckR*.26;context.fillStyle="#fdf6f0";context.beginPath();context.arc(puckPoint.x,puckPoint.y,puckR,0,Math.PI*2);context.fill();context.restore();context.strokeStyle="#d5aaa8";context.lineWidth=Math.max(1,puckR*.11);context.beginPath();context.arc(puckPoint.x,puckPoint.y,puckR*.75,0,Math.PI*2);context.stroke();context.fillStyle="rgba(255,255,255,.95)";context.beginPath();context.arc(puckPoint.x-puckR*.22,puckPoint.y-puckR*.25,puckR*.24,0,Math.PI*2);context.fill();
      if (events.current.impact !== state.impactSerial) { events.current.impact=state.impactSerial; if(state.impactKind && performance.now()-lastPredictedImpactAt.current>260) onEffect(state.impactKind==="paddle"?"hit":"wall"); }
      if (events.current.goal !== state.goalSerial) {
        events.current.goal=state.goalSerial;
        if(state.goalSerial) {
          onEffect("goal");
          const scorer = state.lastGoalBy;
          const goalPoint = map(scorer === state.playerIds[0] ? WIDTH : 0, .5, selfIsLeft);
          goalFx.current = { serial: state.goalSerial, startedAt: performance.now(), x: goalPoint.x, y: goalPoint.y, color: scorer === state.playerIds[0] ? blush : violet, final: Boolean(scorer && state.scores[scorer] >= 7) };
        }
      }
      const goalEffect = goalFx.current;
      if (goalEffect) {
        const elapsed = performance.now() - goalEffect.startedAt;
        const duration = goalEffect.final ? 2100 : 820;
        if (elapsed < duration) {
          const progress = elapsed / duration;
          context.save(); context.globalAlpha = Math.max(0, 1 - progress) * .7; context.strokeStyle = goalEffect.color; context.lineWidth = Math.max(2, shortest * .008);
          context.beginPath(); context.arc(goalEffect.x, goalEffect.y, shortest * (.035 + progress * (goalEffect.final ? .48 : .27)), 0, Math.PI * 2); context.stroke();
          for (let index = 0; index < (goalEffect.final ? 20 : 10); index += 1) {
            const angle = index / (goalEffect.final ? 20 : 10) * Math.PI * 2 + .3;
            const distance = shortest * (.04 + progress * (goalEffect.final ? .42 : .22));
            const px = goalEffect.x + Math.cos(angle) * distance;
            const py = goalEffect.y + Math.sin(angle) * distance;
            context.fillStyle = index % 3 === 0 ? "#fff6f2" : goalEffect.color;
            context.globalAlpha = Math.max(0, 1 - progress * .86);
            context.beginPath(); context.arc(px, py, Math.max(1.5, shortest * (goalEffect.final ? .012 : .008)), 0, Math.PI * 2); context.fill();
          }
          context.globalAlpha = Math.max(0, 1 - progress * 1.3); context.fillStyle = goalEffect.final ? "#fff6ee" : goalEffect.color;
          context.font = `700 ${shortest * (goalEffect.final ? .1 : .075)}px system-ui`; context.textAlign = "center"; context.textBaseline = "middle";
          context.fillText(goalEffect.final ? "VITÓRIA!" : "GOL!", middleX, middleY);
          context.restore();
        }
      }
      if (state.phase === "countdown" && state.phaseEndsAt) { const number=Math.max(1,Math.ceil((state.phaseEndsAt-now)/800));if(events.current.countdown!==number){events.current.countdown=number;onEffect("countdown");}context.fillStyle="rgba(76,39,54,.88)";context.font=`700 ${shortest*.17}px system-ui`;context.textAlign="center";context.textBaseline="middle";context.fillText(String(number),middleX,middleY); }
      if (state.phase === "goal") {context.fillStyle="rgba(95,34,55,.14)";context.fillRect(0,0,width,height);context.fillStyle="#81334f";context.font=`700 ${shortest*.11}px system-ui`;context.textAlign="center";context.textBaseline="middle";context.fillText("GOOOL!",middleX,middleY);}
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw); return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [onEffect, portrait, selfId, stateRef]);

  const toWorld = (event: PointerEvent<HTMLCanvasElement>) => {
    const box=event.currentTarget.getBoundingClientRect();const pointX=event.clientX-box.left;const pointY=event.clientY-box.top;const field=fieldRef.current;const selfIsLeft=stateRef.current?.playerIds[0]===selfId;
    if(!portrait) return {x:(pointX-field.x)/field.width*WIDTH,y:(pointY-field.y)/field.height};
    return selfIsLeft ? {x:(1-(pointY-field.y)/field.height)*WIDTH,y:(pointX-field.x)/field.width}:{x:(pointY-field.y)/field.height*WIDTH,y:1-(pointX-field.x)/field.width};
  };
  const movePointer = (event: PointerEvent<HTMLCanvasElement>) => {
    if(!dragging.current)return;event.preventDefault();const state=stateRef.current;if(!state||state.phase!=="playing")return;const raw=toWorld(event);const left=state.playerIds[0]===selfId;const minX=left?PADDLE_RADIUS:.8+PADDLE_RADIUS*.25;const maxX=left ? .8-PADDLE_RADIUS*.25 : WIDTH-PADDLE_RADIUS;const x=Math.max(minX,Math.min(maxX,raw.x));const y=Math.max(PADDLE_RADIUS,Math.min(HEIGHT-PADDLE_RADIUS,raw.y));localPaddle.current={x,y};const now=performance.now();if(now-sentAt.current>30){sentAt.current=now;onMove(x,y);}
  };
  return <canvas ref={canvasRef} onPointerDown={(event)=>{dragging.current=true;event.currentTarget.setPointerCapture(event.pointerId);movePointer(event);}} onPointerMove={movePointer} onPointerUp={(event)=>{dragging.current=false;localPaddle.current=null;event.currentTarget.releasePointerCapture(event.pointerId);}} onPointerCancel={()=>{dragging.current=false;localPaddle.current=null;}} className="block h-full w-full touch-none select-none" aria-label="Mesa de Air Hockey" />;
}
