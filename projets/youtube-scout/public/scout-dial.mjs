export function quantizeScoutDialValue(value, { min = 0, max = 1, step = 0.01 } = {}) {
  const lo = Number.isFinite(Number(min)) ? Number(min) : 0;
  const hi = Number.isFinite(Number(max)) ? Number(max) : lo + 1;
  const quantum = Number(step) > 0 ? Number(step) : 0.01;
  const bounded = Math.max(lo, Math.min(hi, Number(value)));
  const snapped = lo + Math.round((bounded - lo) / quantum) * quantum;
  return Number(Math.max(lo, Math.min(hi, snapped)).toFixed(8));
}

function ensureScoutDialCss(doc) {
  if (doc.querySelector('link[data-scout-dial-css]')) return;
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = "/scout-dial.css";
  link.dataset.scoutDialCss = "1";
  doc.head.append(link);
}

export function enhanceScoutDial(input, {
  output = null,
  defaultValue = Number(input?.defaultValue || input?.value || 0),
  format = value => String(value),
  onChange = () => {},
  getContextKey = () => ""
} = {}) {
  if (!input?.ownerDocument) throw new Error("Scout Dial requiert un input range monté.");
  if (input.__scoutDialController) return input.__scoutDialController;

  const doc = input.ownerDocument;
  const root = input.parentElement;
  if (!root) throw new Error("Scout Dial requiert un parent.");
  ensureScoutDialCss(doc);

  root.classList.add("scout-dial-control");
  input.classList.add("scout-dial-range");

  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 80 80");
  svg.setAttribute("class", "scout-dial mix-dial");
  svg.setAttribute("aria-hidden", "true");

  const track = doc.createElementNS(svg.namespaceURI, "path");
  track.setAttribute("d", "M 15.25 64.75 A 35 35 0 1 1 64.75 64.75");
  track.setAttribute("class", "scout-dial-track mix-knob-track");

  const face = doc.createElementNS(svg.namespaceURI, "circle");
  face.setAttribute("cx", "40");
  face.setAttribute("cy", "40");
  face.setAttribute("r", "27");
  face.setAttribute("class", "scout-dial-face mix-knob-face");

  const indicator = doc.createElementNS(svg.namespaceURI, "line");
  for (const [key, value] of Object.entries({
    x1: 40, y1: 20, x2: 40, y2: 31,
    class: "scout-dial-indicator mix-knob-indicator"
  })) indicator.setAttribute(key, String(value));

  svg.append(track, face, indicator);
  root.insertBefore(svg, input);

  const min = Number(input.min || 0);
  const max = Number(input.max || 1);
  const step = Number(input.step || 0.01);
  const normalizedDefault = quantizeScoutDialValue(defaultValue, { min, max, step });

  if (output) {
    output.classList.add("scout-dial-output");
    if (!output.htmlFor && input.id) output.htmlFor = input.id;
  }

  const paint = value => {
    const number = quantizeScoutDialValue(value, { min, max, step });
    const norm = (number - min) / Math.max(Number.EPSILON, max - min);
    if (output) output.textContent = format(number);
    indicator.setAttribute("transform", `rotate(${-135 + 270 * norm} 40 40)`);
    return number;
  };

  const set = value => {
    const number = quantizeScoutDialValue(value, { min, max, step });
    input.value = String(number);
    paint(number);
    return number;
  };

  const change = value => {
    if (input.disabled) return Number(input.value);
    const number = set(value);
    onChange(number);
    return number;
  };

  const onInput = () => change(Number(input.value));
  input.addEventListener("input", onInput);

  let drag = null;
  const onPointerDown = event => {
    if (input.disabled || event.button !== 0) return;
    event.preventDefault();
    input.focus({ preventScroll: true });
    drag = {
      pointerId: event.pointerId,
      y: event.clientY,
      value: Number(input.value),
      contextKey: getContextKey()
    };
    svg.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (getContextKey() !== drag.contextKey) {
      drag = null;
      return;
    }
    const sensitivity = event.shiftKey ? 700 : 140;
    change(drag.value + ((drag.y - event.clientY) / sensitivity) * (max - min));
  };
  const release = event => {
    if (drag?.pointerId === event.pointerId) drag = null;
  };
  const onDoubleClick = () => change(normalizedDefault);
  const onWheel = event => {
    if (input.disabled || doc.activeElement !== input || !event.deltaY) return;
    event.preventDefault();
    change(Number(input.value) - Math.sign(event.deltaY) * step);
  };

  svg.addEventListener("pointerdown", onPointerDown);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);
  svg.addEventListener("lostpointercapture", release);
  svg.addEventListener("dblclick", onDoubleClick);
  svg.addEventListener("wheel", onWheel, { passive: false });

  const controller = {
    input,
    output,
    svg,
    paint,
    set,
    setDisabled(disabled) {
      input.disabled = Boolean(disabled);
      svg.setAttribute("aria-disabled", String(Boolean(disabled)));
    },
    destroy() {
      input.removeEventListener("input", onInput);
      svg.remove();
      delete input.__scoutDialController;
    }
  };

  input.__scoutDialController = controller;
  set(input.value || normalizedDefault);
  return controller;
}
