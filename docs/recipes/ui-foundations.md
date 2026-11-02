# UI foundations

The small pieces that make an app feel native, and that all three projects ended up building. Add them as they're needed. The UI standards in `CLAUDE.md` say how they should behave.

**Use it when** the app has real UI beyond a page or two.

## Theme tokens

Put colours and animations in `@theme` in `client/src/index.css`, and give shared classes names in `@layer components`, such as `.card`, `.page-title`, `.btn-primary`, `.btn-secondary` and `.input`. A UI change then happens in one place.

**Source:** `nomp/client/src/index.css`.

## Tap animation

Anything tappable dips while pressed and springs back on release. Add `.tap` to icon buttons and links:

```css
@layer components {
  .btn-primary,
  .btn-secondary,
  .tap {
    transition:
      color 150ms,
      background-color 150ms,
      border-color 150ms,
      scale 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .btn-primary:active:not(:disabled),
  .btn-secondary:active:not(:disabled),
  .tap:active:not(:disabled) {
    scale: 0.96;
    transition-duration: 150ms, 150ms, 150ms, 60ms;
    transition-timing-function: ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .btn-primary,
    .btn-secondary,
    .tap {
      scale: none !important;
    }
  }
}
```

## Closing popups

`client/src/hooks/useDismiss.ts` closes a popup on Escape, or on a press outside it. Put `ref` on the popup. Mark the button that toggles it with `data-dismiss-ignore`, so its press doesn't count as outside.

**Source:** `nomp/client/src/hooks/useDismiss.ts`.

## Exit animations

`client/src/hooks/useExitAnimation.ts` keeps something on screen until its closing animation ends:

```ts
import { useRef, useState } from 'preact/hooks';

/**
 * Keep something on screen after it's closed, until its closing animation
 * ends. `isMounted`: render it; `isClosing`: play the closing animation; put
 * `onAnimationEnd` on the element whose own animation that is.
 */
export function useExitAnimation(isOpen: boolean) {
  const isMounted = useRef(isOpen);
  const [, rerender] = useState(0);
  if (isOpen) isMounted.current = true;
  const isClosing = isMounted.current && !isOpen;

  const onAnimationEnd = (e: AnimationEvent) => {
    // Not one bubbling up from inside it
    if (e.target !== e.currentTarget || !isClosing) return;
    isMounted.current = false;
    rerender((n) => n + 1);
  };

  return { isMounted: isMounted.current, isClosing, onAnimationEnd };
}
```

## Modals and viewers

Use a modal on wide screens and a full-viewport viewer on narrow screens, both with exit animations.

**Source:** `GuideModal` in `rummy-dummy/client/src/components/guide.tsx`, and the `dialog-*` animations in `rummy-dummy/client/src/index.css`.

## Spinner

```tsx
export function Spinner({ class: className = '' }: { class?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      class={`inline-block size-6 animate-spin rounded-full border-2 border-line border-t-accent ${className}`}
    />
  );
}
```

`border-line` and `border-t-accent` are theme tokens, so define them or swap them.

## Layout

Each app's header and navigation differ, so write `client/src/components/Layout/index.tsx` for the app. It should pad for safe areas and scroll to the top on navigation.

**Source:** `nomp/client/src/components/Layout/index.tsx`.

## Haptics

A light tap on phones. Android has `navigator.vibrate`. On iOS 18 and later, flipping a hidden native switch plays the selection tick. It only plays during a tap, so call `tick()` from a click, change or pointer handler.

**Source:** copy `percolatus/client/src/lib/haptics.ts` as it is.

## Share

Open the share sheet on phones and tablets, and copy on computers. Change the button's text to "Copied!" for a moment.

```ts
const useShareSheet = () => typeof navigator.share === 'function' && matchMedia('(pointer: coarse)').matches;

export async function share(title: string, text: string, url: string) {
  if (useShareSheet()) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      throw e;
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
```

Browsers only share or copy straight after a tap, so call it directly from the click handler. If the link has to be fetched first, see `percolatus/client/src/lib/share.ts`.

## Check it works

- Check at phone width as well as desktop, with touch emulation for tap animations and hover.
- Popups close on Escape, on a click outside, and with an animation.
- Nothing shifts when a button's text changes.
