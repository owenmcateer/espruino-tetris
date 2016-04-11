/**
 * @file
 * Tetris on Espruino.
 *
 * Tetris written in JavaScript for the Espruino microcontroller.
 *
 * @see http://www.espruino.com
 * @see https://www.youtube.com/watch?v=q_Ut3KzdzRU
 */

/**
 * Hardware settings.
 */
var PIN_CONTROLLER = 0,
    PIN_MATRIX = B15,
    MATRIX_WIDTH = 16,
    MATRIX_HEIGHT = 8,
    MATRIX_ROTATE = 1,


// Set up matrix.
SPI2.setup({baud:3200000, mosi:PIN_MATRIX});
var m = Graphics.createArrayBuffer(MATRIX_WIDTH, MATRIX_HEIGHT, 24, {zigzag:true});
m.flip = function(){
  SPI2.send4bit(m.buffer, 0b0001, 0b0011);
};
m.setRotation(MATRIX_ROTATE);

// Set board buffer.
var boardBuffer = Graphics.createArrayBuffer(MATRIX_WIDTH, MATRIX_HEIGHT, 24, {zigzag:true});
boardBuffer.setRotation(MATRIX_ROTATE);


/**
 * Game settings.
 */
var game = {
  // Move block every x ticks.
  speed: 15,
  // 1 = 100%.
  brightness: 0.02,
  // Frames per second.
  fps: 30,
  // Current frame.
  frame: 1,
};

/**
 * Block types, their rotations and colours.
 *
 * @see http://vignette1.wikia.nocookie.net/tetrisconcept/images/3/3d/SRS-pieces.png/revision/latest?cb=20060626173148
 * The last array is the RGB colour values.
 */
var blockTypes = {
  'I': [[0,0], [-1,0], [-2,0], [1,0],
      [0,0], [0,-1], [0,1], [0,2],
      [0,1], [1,1], [-1,1], [-2,1],
      [-1,0], [-1,-1], [-1,1], [-1,2],
      [0,1,1]],
  'J': [[0,0], [-1,0], [1,0], [-1,-1],
      [0,0], [0,-1], [1,-1], [0,1],
      [0,0], [-1,0], [1,0], [1,1],
      [0,0], [0,-1], [0,1], [-1,1],
      [0,0,1]],
  'L': [[0,0], [-1,0], [1,0], [1,-1],
      [0,0], [0,-1], [0,1], [1,1],
      [0,0], [-1,0], [-1,1], [1,0],
      [0,0], [0,-1], [-1,-1], [0,1],
      [1,0.66,0]],
  'O': [[0,0], [-1,0], [-1,1], [0,1],
      [0,0], [-1,0], [-1,1], [0,1],
      [0,0], [-1,0], [-1,1], [0,1],
      [0,0], [-1,0], [-1,1], [0,1],
      [1,1,0]],
  'S': [[0,0], [-1,0], [0,-1], [1,-1],
      [0,0], [0,-1], [1,0], [1,1],
      [0,0], [1,0], [0,1], [-1,1],
      [0,0], [-1,0], [-1,-1], [0,1],
      [0,1,0]],
  'T': [[0,0], [0,-1], [-1,0], [1,0],
      [0,0], [0,-1], [0,1], [1,0],
      [0,0], [-1,0], [1,0], [0,1],
      [0,0], [-1,0], [0,-1], [0,1],
      [0.6,0,1]],
  '2': [[0,0], [0,-1], [-1,-1], [1,0],
      [0,0], [0,1], [1,0], [1,-1],
      [0,0], [-1,0], [0,1], [1,1],
      [0,0], [0,-1], [-1,0], [-1,1],
      [1,0,0]],
};


/**
 * Block class.
 */
var block = {

  // Current moving block data.
  block: [],


  /**
   * Draw the block onto the matrix.
   */
  draw: function() {
    // Rotate offset.
    offset = this.block.rotate * 4;

    // Set color.
    m.setColor(blockTypes[this.block.type][16][2] * game.brightness,
               blockTypes[this.block.type][16][0] * game.brightness,
               blockTypes[this.block.type][16][1] * game.brightness);

    m.setPixel(this.block.x + blockTypes[this.block.type][0 + offset][0], this.block.y + blockTypes[this.block.type][0 + offset][1]);
    m.setPixel(this.block.x + blockTypes[this.block.type][1 + offset][0], this.block.y + blockTypes[this.block.type][1 + offset][1]);
    m.setPixel(this.block.x + blockTypes[this.block.type][2 + offset][0], this.block.y + blockTypes[this.block.type][2 + offset][1]);
    m.setPixel(this.block.x + blockTypes[this.block.type][3 + offset][0], this.block.y + blockTypes[this.block.type][3 + offset][1]);

  },


  /**
   * Check this block is in bounds.
   */
  checkBounds: function() {

    // Rotate offset.
    offset = this.block.rotate * 4;
    var x,y;

    for (var i = 0; i < 4; i++) {
      x = this.block.x + blockTypes[this.block.type][i + offset][0];
      y = this.block.y + blockTypes[this.block.type][i + offset][1];

      // Check if pixel if occupied?
      if (boardBuffer.getPixel(x,y) > 0) {
        // HIT! move back.
        switch (block.block.movingDir) {
          case 'down':
            if (y === 0) {
              screen.gameover();
              return false;
            }
            block.block.y--;
            board.update();
            break;

          case 'left':
              block.block.x++;
            break;

          case 'right':
              block.block.x--;
            break;

          case 'rotating':
            block.block.rotate--;
            if (block.block.rotate < 0) {
              block.block.rotate = 3;
            }
            break;
        }
        board.checkRows();
        return false;
      }
      // Board right bounds.
      else if (x >= m.getWidth()) {
        block.block.x--;
        return false;
      }
      // Board left bounds.
      else if (x < 0) {
        block.block.x++;
        return false;
      }
      // Board floor.
      else if (y >= m.getHeight() - 1) {
        board.update();
        board.checkRows();
        return false;
      }
    }

  },


  /**
   * Add new random block.
   */
  newBlock: function() {
    this.add(Object.keys(blockTypes)[Math.floor(Math.random() * Object.keys(blockTypes).length)]);
  },


  /**
   * Add the new block.
   */
  add: function(type) {
    this.block = {
      'type': type,
      'x': Math.round(m.getWidth() / 2),
      'y': -2,
      'rotate': 0,
      'movingDir': 'down',
    };
  },


  /**
   * Block movement.
   */
  move: {
    left: function() {
      block.block.x--;
      block.block.movingDir = 'left';
    },
    right: function() {
      block.block.x++;
      block.block.movingDir = 'right';
    },
    down: function() {
      block.block.y++;
      block.block.movingDir = 'down';
    },
    rotate: function() {
      block.block.rotate++;
      if (block.block.rotate > 3) {
        block.block.rotate = 0;
      }
      block.block.movingDir = 'rotating';
    }
  },
};

var board = {

  update: function() {
    // Add fallen block into buffer.
    block.draw();
    // Update board buffer.
    new Uint8Array(boardBuffer.buffer).set(m.buffer);
    // Add a new block.
    block.newBlock();
  },

  output: function() {
    new Uint8Array(m.buffer).set(boardBuffer.buffer);
  },

  checkRows: function() {
    var rowCount = 0;
    for (var r = 0; r < m.getHeight(); r++) {
      rowCount = 0;
      for (var c = 0; c < m.getWidth(); c++) {
        if (boardBuffer.getPixel(c, r) > 0) {
          rowCount++;
        }
      }

      // Line filled?
      if (rowCount === m.getWidth()) {
        this.removeRow(r);
      }
    }
  },


  removeRow: function(row) {

    // Pause game.
    clearInterval(game.tick);

    // Flash row and remove.
    this.rowToRemove = row;
    this.flashRow(row);

  },


  /**
   * Flash row.
   */
  rowToRemove: -1,
  flashRowTick: 0,
  flashRow: function() {

    setInterval(function() {
      m.setColor(board.flashRowTick * game.brightness,
                 board.flashRowTick * game.brightness,
                 board.flashRowTick * game.brightness);
      board.flashRowTick += 0.3;
      m.drawLine(0, board.rowToRemove, m.getWidth() - 1, board.rowToRemove);
      m.flip();

      if (board.flashRowTick > 1) {
        board.flashRowTick = 0;

        // Clear row.
        m.setColor(0, 0, 0);
        m.drawLine(0, board.rowToRemove, m.getWidth() - 1, board.rowToRemove);

        // Stop flash and remove.
        clearInterval();
        board.deleteRowData();
      }
    }, 1000 / game.fps);
  },


  /**
   * Delete row and shift others down.
   */
  deleteRowData: function() {

    // Loop all rows above and shift pixels up.
    for (var r = this.rowToRemove - 1; r > 0; r--) {
      for (var c = 0; c < m.getWidth(); c++) {
        m.setPixel(c, r + 1, m.getPixel(c, r));
      }
    }
    m.flip();
    this.update();

    // Reset row to remove.
    this.rowToRemove = -1;

    // Resume game.
    game.tick = setInterval(tick, 1000 / game.fps);

    // Check for any other rows to remove.
    this.checkRows();
  }

};

var screen = {
  gameover: function() {
    m.clear();
    boardBuffer.clear();
    m.flip();

    this.start();
  },

  // Start the game.
  start: function() {
    m.clear();
    m.flip();
    boardBuffer.clear();

    block.newBlock();
  }
};

var controls = {

  held: 0,

  action: function() {
    var btns = analogRead(PIN_CONTROLLER);
    if (btns < 0.02) {
      if (this.held === 0 || this.held > 6) {
        block.move.right();
      }
      this.held++;
    }
    else if (btns < 0.2) {
      if (this.held === 0) {
        block.move.rotate();
      }
      this.held++;
    }
    else if (btns < 0.5) {
      if (this.held === 0 || this.held > 6) {
        block.move.down();
      }
      this.held++;
    }
    else if (btns < 0.7) {
      if (this.held === 0 || this.held > 6) {
        block.move.left();
      }
      this.held++;
    }
    else {
      this.held = 0;
    }

    return this.held;
  }
};

function tick() {
  // Clear matrix.
  m.clear();

  // Draw board onto matrix.
  board.output();

  if (controls.action() <= 0) {
    // Move block down?
    if (game.frame % game.speed === 0) {
      block.move.down();
    }
  }

  // Draw block.
  if (block.checkBounds() === false) {
    // Auto release controls.
    controls.held = -9999;
  }
  block.draw();

  // Send to matrix.
  m.flip();

  game.frame++;
  if (game.frame > game.fps) {
    game.frame = 1;
  }
}

screen.start();
game.tick = setInterval(tick, 1000 / game.fps);
