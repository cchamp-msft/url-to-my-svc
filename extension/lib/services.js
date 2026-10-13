// Registry of supported services. A source knows which links to intercept and
// how to describe what they point to; a target turns that description into a
// link on the user's service.

import { spotify } from './sources/spotify.js';
import { appleMusic } from './targets/apple-music.js';

export const sources = { [spotify.id]: spotify };
export const targets = { [appleMusic.id]: appleMusic };

export const DEFAULT_TARGET = appleMusic.id;
