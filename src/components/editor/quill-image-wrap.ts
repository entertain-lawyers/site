/**
 * Image float for Quill 2.
 *
 * Wrapping is stored on the image's line: class="el-wrap-left|right|center"
 * on the block (a paragraph in Quill). A block class is used rather than an
 * inline one because Quill wraps an inline-formatted embed in an extra
 * <span>, which would leave the float off the image. The article CSS floats
 * the image inside the marked block, and the class survives getSemanticHTML,
 * sanitization and reload. Imported inside the editor's browser-only loader
 * so the attributor is registered before the Quill instance is created.
 */
import { Quill } from 'react-quill-new';
import type { Attributor } from 'parchment';

type Parchment = {
  ClassAttributor: new (
    attrName: string,
    keyName: string,
    options: { scope: number; whitelist: string[] }
  ) => Attributor;
  Scope: { BLOCK: number };
};

const parchment = Quill.import('parchment') as unknown as Parchment;

Quill.register(
  new parchment.ClassAttributor('wrap', 'el-wrap', {
    scope: parchment.Scope.BLOCK,
    whitelist: ['left', 'right', 'center'],
  }),
  true
);
