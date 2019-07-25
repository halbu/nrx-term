# nrx-term

### About

`nrx-term` is a hardware-accelerated, browser-based terminal emulator for game development.

<img src="https://raw.githubusercontent.com/halbu/nrx-term/master/img/nrx1.gif" width="45%"></img> <img src="https://raw.githubusercontent.com/halbu/nrx-term/master/img/nrx2.gif" width="45%"></img> 

### Motivation and goals

`nrx-term` is intended to assist in developing graphically rich roguelike games.

To this end, `nrx-term` offers:

* Hardware-accelerated rendering - render huge terminals at 60+ FPS with plenty of CPU to spare
* Out-of-the-box handling of keyboard and mouse input
* Support for true color and character rotation
* Small API surface, simple to understand and use (hopefully)

`nrx-term` is purely for terminal display and input handling, and is not opinionated about how you build your game.

### Build status

[![Build Status](https://travis-ci.com/halbu/nrx-term.svg?branch=master)](https://travis-ci.com/halbu/nrx-term)

### How to use

`nrx-term` is available via `npm`. Install from the command line with `npm i nrx-term`. Import it for use in your project with `import { NRXTerm } from 'nrx-term';`.

### Todo

- [ ] Better documentation 
- [ ] Revisit user-facing API
