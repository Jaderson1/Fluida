import { useRef } from 'react';

// Demo-only render counter, not part of the published library. Mutating
// and reading a ref during render is normally unsafe, but this exists
// specifically to display how many times a panel re-rendered — there's
// no other way to count that without it.
/* eslint-disable react-hooks/refs */
export function useRenderCount(): number {
  const countRef = useRef(0);
  countRef.current += 1;
  return countRef.current;
}
/* eslint-enable react-hooks/refs */
