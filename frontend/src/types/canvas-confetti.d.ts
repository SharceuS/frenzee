declare module "canvas-confetti" {
  function confetti(options?: {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
    angle?: number;
    colors?: string[];
  }): Promise<null> | null;
  export default confetti;
}
