// global settings

// size of a piece in pixels
const pieceSize = 64;

// how close a piece should be to its correct position before it snaps into place
const snapMargin = pieceSize / 2;

// create a mask around 0, 0
function pieceMask(size, a, b, c, d) {
  const elem = new PIXI.Graphics();
  var size = size / 2;
  elem.beginFill(1, 1.0);
  elem.moveTo(-size, -size);
  connector(elem, a, -size, -size,  size, -size);
  connector(elem, b,  size, -size,  size,  size);
  connector(elem, c,  size,  size, -size,  size);
  connector(elem, d, -size,  size, -size, -size);
  elem.endFill();
  return elem;
}

// calculate the shape of a puzzle piece connector
function connector(elem, direction, x1, y1, x2, y2) {
  if (direction == 0) {
    elem.lineTo(x2, y2);
    return
  }
  const notchFactor = 1 / 3;
  const notchSize = 7 / 4;
  const sideFactor = 1 / 4;
  if (x1 == x2) {
    const deltaX = x1 * notchFactor * direction;
    const deltaY = (y2 - y1) * notchFactor;
    const sideSize = x1 * sideFactor * direction * -1;
    elem.bezierCurveTo(x1 + sideSize / 4, y1 + deltaY / notchSize, x1 + sideSize, 0, x1 + deltaX, y1 + deltaY);
    elem.bezierCurveTo(x1 + deltaX * notchSize, y1 + deltaY, x1 + deltaX * notchSize, y2 - deltaY, x1 + deltaX, y2 - deltaY);
    elem.bezierCurveTo(x1 + sideSize, 0, x1 + sideSize / 4, y2 - deltaY / notchSize, x1, y2);
  } else {
    const deltaX = (x2 - x1) * notchFactor;
    const deltaY = y1 * notchFactor * direction;
    const sideSize = y1 * sideFactor * direction * -1;
    elem.bezierCurveTo(x1 + deltaX / notchSize, y1 + sideSize / 4, 0, y1 + sideSize, x1 + deltaX, y1 + deltaY);
    elem.bezierCurveTo(x1 + deltaX, y1 + deltaY * notchSize, x2 - deltaX, y1 + deltaY * notchSize, x2 - deltaX, y1 + deltaY);
    elem.bezierCurveTo(0, y1 + sideSize, x2 - deltaX / notchSize, y1 + sideSize / 4, x2, y1);
  }
}

// choose a random in/out notch
function chooseNotch() {
  return Math.random() > 0.5 ? 1 : -1;
}

// when dragging a piece
// makes sure the cursor stays on the same part of the piece
// otherwise it suddenly jerks to the top left corner
function onDragStart(event) {
  if (!this.puzzleData.locked) {
    this.data = event.data;
    this.dragging = true;
    this.mouseX = this.data.getLocalPosition(this.parent).x - this.position.x;
    this.mouseY = this.data.getLocalPosition(this.parent).y - this.position.y;

    // this moves the current piece to the top
    this.parent.addChild(this);
  }
}

// when releasing the piece, check whether it's in the right place
function onDragEnd() {
  this.dragging = false;
  this.data = null;

  let deltaX = Math.abs(this.position.x - this.puzzleData.originalX);
  let deltaY = Math.abs(this.position.y - this.puzzleData.originalY);

  // check whether the piece is roughly in the right place
  // and if so, "snap" it so you cannot move it anymore
  if (deltaX < snapMargin && deltaY < snapMargin) {
    this.interactive = false;
    this.puzzleData.locked = true;
    this.position.x = this.puzzleData.originalX;
    this.position.y = this.puzzleData.originalY;
  }
}

// keeps the piece relative to the cursor position
function onDragMove() {
    if (this.dragging) {
        var position = this.data.getLocalPosition(this.parent);
        this.position.x = position.x - this.mouseX;
        this.position.y = position.y - this.mouseY;
    }
}

// makes a piece that fits with previous pieces
// assumes puzzle pieces are generated
// left-to-right, top-to-bottom
function generatePieceMask(puzzleSpace, pieceSize, x, y) {
  const sizeX = puzzleSpace.length - 1;
  const sizeY = puzzleSpace[0].length - 1;
  var top = 0;
  var right = 0;
  var bottom = 0;
  var left = 0;

  if (x < sizeX) {
    right = chooseNotch();
  }
  if (x > 0) {
    left = puzzleSpace[x - 1][y][0] * -1;
  }
  if (y < sizeY) {
    bottom = chooseNotch();
  }
  if (y > 0) {
    top = puzzleSpace[x][y - 1][1] * -1;
  }

  puzzleSpace[x][y] = [right, bottom];
  return pieceMask(pieceSize, top, right, bottom, left);
}

// create an empty 2d array
function initializeSpace(x, y) {
  var space = new Array(y);
  for (i=0; i < y; i++) {
    space[i] = new Array(x);
  }
  return space;
}

// create the frame where the puzzle is supposed to end up
function createPuzzleFrame(sizeX, sizeY) {
  const foo = new PIXI.Graphics();
  foo.beginFill(0x555555);
  foo.drawRect(0, 0, sizeX, sizeY);
  return foo;
}

// create the random space that defines how the pieces are shuffled
function createRandomSpace(size) {
  var a = new Array(size);

  for (let i = 0; i < a.length; i++) {
    a[i] = i;
  }

  for (let i = 0; i < a.length; i++) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// creates the piece and setup its handlers
function createPuzzlePiece(puzzleTexture, x, y, pieceSize) {
  const origX = x * pieceSize;
  const origY = y * pieceSize;
  const rect = new PIXI.Rectangle(origX, origY, pieceSize, pieceSize);
  const texture = new PIXI.Texture(puzzleTexture, rect);
  const piece = new PIXI.Sprite(texture);

  // locked is when the piece is "snapped" in the right position
  piece.puzzleData = {
    locked: false,
    originalX: origX,
    originalY: origY
  };

  // PIXI attributes
  piece.interactive = true;
  piece.buttonMode = true;

  piece
    .on('mousedown', onDragStart)
    .on('touchstart', onDragStart)
    .on('mouseup', onDragEnd)
    .on('mouseupoutside', onDragEnd)
    .on('touchend', onDragEnd)
    .on('touchendoutside', onDragEnd)
    .on('mousemove', onDragMove)
    .on('touchmove', onDragMove);

  return piece;
}

// the pixi application that does the heavy lifting
const app = new PIXI.Application({
  resizeTo: window,
  antialias: false
});

// pixi creates a canvas element
document.body.appendChild(app.view);

// make sure we can use the mouse etc.
app.stage.interactive = true;

// load the puzzle picture
app.loader.add('puzzle', 'puzzle.jpg').load((loader, resources) => {
  const puzzle = resources.puzzle;
  const puzzleTexture = puzzle.texture;

  const sizeX = parseInt(puzzle.data.width / pieceSize);
  const sizeY = parseInt(puzzle.data.height / pieceSize);
  const puzzleSpace = initializeSpace(sizeX, sizeY);
  const randomSpace = createRandomSpace(sizeX * sizeY);

  const frameSizeX = sizeX * pieceSize;
  const frameSizeY = sizeY * pieceSize;

  const puzzleFrame = createPuzzleFrame(frameSizeX, frameSizeY);
  app.stage.addChild(puzzleFrame);

  for (y=0; y < sizeY; y++) {
    for (x=0; x < sizeX; x++) {
      // x, y for graphics position of piece within texture
      const piece = createPuzzlePiece(puzzleTexture, x, y, pieceSize);

      // setup the position of the piece
      let index = randomSpace[sizeX * y + x];
      let randomPosX = pieceSize * (index % sizeX);
      let randomPosY = pieceSize * Math.trunc(index / sizeX);
      piece.position.set(randomPosX + frameSizeX, randomPosY);

      // add the piece to the puzzle space
      app.stage.addChild(piece);
    }
  }
});
