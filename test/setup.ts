import '@testing-library/jest-dom/vitest';
import { vi, beforeEach, afterEach } from 'vitest';

// jsdom doesn't implement layout/paint APIs the app touches incidentally
// (scrolling the chat view, canvas share-card generation). Stub them so
// those code paths run without crashing instead of mocking them away.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 800;
  height = 600;
  private _src = '';
  set src(value: string) {
    this._src = value;
    // Simulate async image decoding.
    setTimeout(() => this.onload?.(), 0);
  }
  get src() {
    return this._src;
  }
}
// @ts-expect-error - test stub, not a full Image implementation
window.Image = FakeImage;

const fake2dContext = {
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  roundRect: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  set fillStyle(_v: unknown) {},
  set strokeStyle(_v: unknown) {},
  set lineWidth(_v: unknown) {},
  set font(_v: unknown) {},
  set textAlign(_v: unknown) {}
};

// @ts-expect-error - jsdom has no real canvas backend; stub just enough
// for compressImage()/generateShareCard() to run their own logic.
HTMLCanvasElement.prototype.getContext = vi.fn(() => fake2dContext);
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,fake');
// @ts-expect-error - jsdom omits toBlob entirely
HTMLCanvasElement.prototype.toBlob = vi.fn(function (callback: BlobCallback) {
  callback(new Blob(['fake-image-bytes'], { type: 'image/jpeg' }));
});

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

beforeEach(() => {
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockImplementation(() => true);
  vi.spyOn(window, 'prompt').mockImplementation(() => 'Not appropriate for this app');
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}'))));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
