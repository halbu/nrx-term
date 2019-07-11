import { Color } from './color';

export class Lerp {
  public static lerpColor(a: Color, b: Color, amount: number): Color {
      let rr = a.r + amount * (b.r - a.r);
      let rg = a.g + amount * (b.g - a.g);
      let rb = a.b + amount * (b.b - a.b);

    return new Color(rr, rg, rb);
  }

  public static lerp(ar: number, ag: number, ab: number, br: number, bg: number, bb: number, amount: number): Color {
    let rr = ar + amount * (br - ar);
    let rg = ag + amount * (bg - ag);
    let rb = ab + amount * (bb - ab);
    
    return new Color(rr, rg, rb);
  }
}
