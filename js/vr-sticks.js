// VR controllers, thumbsticks only: LEFT stick walks, RIGHT stick turns the view.
//   walk   +1 forward / -1 back      (left stick up/down)
//   strafe +1 right   / -1 left      (left stick left/right)
//   turn   +1 left    / -1 right     (right stick left/right, smooth)
// Trigger and squeeze are left alone for the actions in main.js (take the key, say it again).
//   import { readSticks } from './vr-sticks.js';
//   const { walk, strafe, turn } = readSticks(renderer.xr.getSession());

// The first 5% of the stick is ignored, and the rest starts again from 0 so walking is smooth.
export const STICK_DEADZONE = 0.05;

export function stickAxis(value) {
  const magnitude = Math.abs(value || 0);
  if (magnitude <= STICK_DEADZONE) return 0;
  return Math.sign(value) * (magnitude - STICK_DEADZONE) / (1 - STICK_DEADZONE);
}

// A controller with a touchpad keeps the thumbstick at axes[2] and axes[3];
// one with a thumbstick only keeps it at axes[0] and axes[1]. A four-axis
// controller whose last two axes never move is the second kind too.
function stickAxes(gamepad) {
  const axes = gamepad && gamepad.axes;
  if (!axes || axes.length < 2) return null;
  if (axes.length >= 4 && (axes[2] || axes[3])) return { x: axes[2], y: axes[3] };
  if (axes.length >= 4 && !(axes[0] || axes[1])) return { x: axes[2], y: axes[3] };
  return { x: axes[0], y: axes[1] };
}

// Which controller is which hand. If the browser does not say, the first
// controller counts as the left hand and the next one as the right hand.
function pickHand(sources, hand) {
  const named = sources.find((s) => s.handedness === hand && s.gamepad);
  if (named) return named;
  const handsKnown = sources.some((s) => s.handedness === 'left' || s.handedness === 'right');
  if (handsKnown) return null;
  const withPad = sources.filter((s) => s.gamepad);
  return hand === 'left' ? withPad[0] : withPad[1];
}

// Read both sticks once per frame. No session (flat screen) or no controllers: all zeros.
export function readSticks(session) {
  const out = { walk: 0, strafe: 0, turn: 0 };
  const sources = (session && session.inputSources) || [];
  const left = pickHand(sources, 'left');
  const right = pickHand(sources, 'right');
  const leftAxes = left ? stickAxes(left.gamepad) : null;
  const rightAxes = right ? stickAxes(right.gamepad) : null;
  if (leftAxes) {
    out.walk = -stickAxis(leftAxes.y);      // the stick reports -1 when pushed away from you
    out.strafe = stickAxis(leftAxes.x);
  }
  if (rightAxes) {
    out.turn = -stickAxis(rightAxes.x);     // push right, look right
  }
  return out;
}
