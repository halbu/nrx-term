# nrx-term

### About

`nrx-term` is a hardware-accelerated, browser-based terminal emulator and input handler.

### Goals

`nrx-term` is intended to assist in developing graphically rich roguelike games.

To this end, `nrx-term` offers:

* Hardware-accelerated rendering - render huge terminals at 60FPS with plenty of CPU to spare
* Out-of-the-box handling of keyboard and mouse input
* Support for true color and character rotation
* Small API surface, simple to use

`nrx-term` is purely for terminal display and input handling, and is not opinionated about how you build your game.

### How to use

`nrx-term` is available via `npm`. Install from the command line with `npm i nrx-term`. Import it for use in your project with `import { NRXTerm } from 'nrx-term';`.

### Todo

- [ ] Better documentation 
- [ ] Revisit user-facing API