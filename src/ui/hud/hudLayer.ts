import { LAYOUT } from '../../game/world';
import './hud.css';

let box: HTMLDivElement | undefined;

function ensureBox(): HTMLDivElement {
  if (box) return box;
  const layer = document.getElementById('hud-layer');
  if (!layer) throw new Error('Missing #hud-layer element in index.html');

  box = document.createElement('div');
  box.className = 'hud-box';
  box.style.width = `${LAYOUT.gameWidth}px`;
  box.style.height = `${LAYOUT.gameHeight}px`;
  layer.appendChild(box);

  const target = box;
  const fit = (): void => {
    const s = layer.clientWidth / LAYOUT.gameWidth;
    target.style.transform = `scale(${s})`;
  };
  new ResizeObserver(fit).observe(layer);
  fit();
  return box;
}

/** Mount a view into the 1280×720 HUD box. Returns an unmount function. */
export function mountView(view: HTMLElement): () => void {
  ensureBox().appendChild(view);
  return () => view.remove();
}

/** Convenience: mount and auto-unmount when the scene shuts down. */
export function mountForScene(
  scene: { events: { once(event: string, fn: () => void): unknown } },
  view: HTMLElement
): () => void {
  const unmount = mountView(view);
  scene.events.once('shutdown', unmount);
  return unmount;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
