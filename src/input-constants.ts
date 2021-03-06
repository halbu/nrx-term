export class InputConstants {
  // tslint:disable-next-line:variable-name
  public static readonly None = -1; // Deprecated?

  // tslint:disable-next-line:variable-name
  public static readonly Keys = {
    Tab: 9,
    Enter: 13,
    Alt: 18,
    Escape: 27,
    Space: 32,
    Numrow0: 48,
    Numrow1: 49,
    Numrow2: 50,
    Numrow3: 51,
    Numrow4: 52,
    Numrow5: 53,
    Numrow6: 54,
    Numrow7: 55,
    Numrow8: 56,
    Numrow9: 57,
    A: 65,
    B: 66,
    C: 67,
    D: 68,
    E: 69,
    F: 70,
    G: 71,
    H: 72,
    I: 73,
    J: 74,
    K: 75,
    L: 76,
    M: 77,
    N: 78,
    O: 79,
    P: 80,
    Q: 81,
    R: 82,
    S: 83,
    T: 84,
    U: 85,
    V: 86,
    W: 87,
    X: 88,
    Y: 89,
    Z: 90,
    Numpad0: 96,
    Numpad1: 97,
    Numpad2: 98,
    Numpad3: 99,
    Numpad4: 100,
    Numpad5: 101,
    Numpad6: 102,
    Numpad7: 103,
    Numpad8: 104,
    Numpad9: 105,
    NumpadMultiply: 106,
    NumpadAdd: 107,
  };

  // tslint:disable-next-line:variable-name
  public static readonly Mouse = {
    Left: {
      Down: 1000,
      Up: 2000
    },
    Right: {
      Down: 1001,
      Up: 2001
    },
    DragStatus: {
      None: 3000,
      Active: 3001,
      Finished: 3002
    }
  };
}
