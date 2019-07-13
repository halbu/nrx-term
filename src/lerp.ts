import { Color } from './color';

export class Lerp {
  public static lerpColor(a: Color, b: Color, amount: number): Color {
    const rr = a.r + amount * (b.r - a.r);
    const rg = a.g + amount * (b.g - a.g);
    const rb = a.b + amount * (b.b - a.b);

    return new Color(rr, rg, rb);
  }

  public static lerp(ar: number, ag: number, ab: number, br: number, bg: number, bb: number, amount: number): Color {
    const rr = ar + amount * (br - ar);
    const rg = ag + amount * (bg - ag);
    const rb = ab + amount * (bb - ab);
    
    return new Color(rr, rg, rb);
  }
}
