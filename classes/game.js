const Screen = require("./screen");
const Cursor = require("./cursor");
const Gem = require("./gem")

class Game {
  static BOARD_SIZE = 8;
  static DELAY_DEFAULT = 3000;
  static DELAY_AFTER_STARS_APPEAR = 1000;
  static MIN_MATCH_LENGTH = 3;
  static MATCH_SYMBOL = '⭐️';
  static DIRECTIONS = ['up', 'down', 'left', 'right']; 
  static MESSAGE_MATCH_FOUND = '⭐️⭐️⭐️ Nice! You found a match!';
  static MESSAGE_INVALID_SWAP = "❌ That swap doesn't result in a match, please try again.";
  static MESSAGE_WELCOME = `
  Welcome to Tropical!
  🥥 Your goal is to match 3 or more of the same item
  🍉 Make matches by swapping 2 items
  🥝 Select items to swap by using the 's' key
  🍓 Use the arrow keys to move around the board
  `;

  constructor() {
    this.grid = [];
    this.selectedGems = [];
    this.score = 0;
    this.scoreString = '';
    this.gameStarted = true;
    this.setupBoard();
    this.setupCursor();
    this.setupCommands();
    this.setupScreen();
    this.playGame();
  }

  
  // ----------------------
  // PLAY GAME
  // ----------------------
  playGame() {
    this.matches = this.findMatches();

    while (this.matches.length > 0) {
      this.starMatches();
      this.clearMatches();
      this.matches = this.findMatches.call(this);
    }

    Screen.updateScreen(this.grid);
    Screen.render();
    console.log(`SCORE: ${this.score}`);
    console.log(`GEMS COLLECTED: ${this.scoreString}\n`);
  }


  // ----------------------
  // USER ACTIONS 
  // ----------------------
  selectGem() {
    let gem = this.grid[this.cursor.row][this.cursor.col];

    if (this.selectedGems.length < Game.MIN_MATCH_LENGTH - 1) this.selectedGems.push(gem);

    if (this.selectedGems.length === Game.MIN_MATCH_LENGTH - 1) {
      let gem1 = this.selectedGems[0];
      let gem2 = this.selectedGems[1];

      this.swapGems();
      let matches = this.findMatches();

      if (matches.length > 0) {
        console.log(Game.MESSAGE_MATCH_FOUND);
        setTimeout(this.starMatches.bind(this), Game.DELAY_AFTER_STARS_APPEAR);
        setTimeout(this.playGame.bind(this), Game.DELAY_DEFAULT);
      } else {
        console.log(Game.MESSAGE_INVALID_SWAP);
        this.selectedGems = [gem1, gem2];
        setTimeout(this.swapGems.bind(this), Game.DELAY_DEFAULT);
      }
    }
  }
  
  swapGems() {
    let gem1 = this.selectedGems[0];
    let gem2 = this.selectedGems[1];
    let gem1Type = gem1.type;
    let gem2Type = gem2.type;

    this.grid[gem1.row][gem1.col].type = gem2Type;
    this.grid[gem2.row][gem2.col].type = gem1Type;

    Screen.updateScreen(this.grid);
    this.selectedGems = [];
  }


  // ----------------------
  // MATCH HELPERS 
  // ---------------------
  findMatches() {
    let rowsAndCols = this.getRowsAndCols();
    let matches = [];

    rowsAndCols.forEach(rowOrCol => {
      let matchesInArray = Game.findMatchesInArray(rowOrCol);
      matchesInArray.forEach(match => matches.push(match));
    });
    return matches;
  }

  static findMatchesInArray(array) {
    let matchType = array[0].type;
    let matches = [];
    let match = [];

    for (let i = 0; i < array.length; i++) {
      let el = array[i];
      if (el.type === matchType) {
        match.push(el);
      } else {
        matchType = el.type;
        if (match.length >= Game.MIN_MATCH_LENGTH) matches.push(match);
        match = [el];
      }
    }

    if (match.length >= Game.MIN_MATCH_LENGTH) matches.push(match);
    return matches;
  }

  starMatches() {
    let matches = this.findMatches();
    matches.forEach(match => {
      match.forEach(el => {
        let gemType = el.type;
        el.type = Game.MATCH_SYMBOL;
        if (this.gameStarted && gemType !== Game.MATCH_SYMBOL) {
          this.score++;
          this.scoreString += gemType;
        }
      });
    });

    Screen.updateScreen(this.grid);
    Screen.render()
  }

  clearMatches() {
    let columns = this.getColumns();

    columns.forEach(column => {
      Game.makeAllGemsFall(column);
      Game.addRandomGemsAtTop(column);
    });
  }


  // ----------------------
  // FALLING GEMS HELPERS 
  // i.e. refilling gems on the board once a match is made
  // ---------------------
  static addRandomGemsAtTop(column) {
    for (let row = 0; row < column.length - 1; row++) {
      let el = column[row];
      if (el.type === Game.MATCH_SYMBOL) el.type = Gem.getRandomGemType();
      else break;
      }
      return column;
  }
  
  static makeAllGemsFall(column) {
      let lowestStar = Game.findLowestStar(column);
      let lowestGemAboveStar = Game.findLowestGemAboveStar(column, lowestStar);
  
      while (lowestStar && lowestGemAboveStar) {
        column = Game.makeOneGemFall(column, lowestStar, lowestGemAboveStar);
        lowestStar = Game.findLowestStar(column);
        lowestGemAboveStar = Game.findLowestGemAboveStar(column, lowestStar);
      }
      return column;
  }
  
  static makeOneGemFall(column, star, gem) {
      column[star.row].type = gem.type;
      column[gem.row].type = Game.MATCH_SYMBOL;
      return column;
  }
  
  static findLowestStar(column) {
      let top = 0;
      let bottom = column.length - 1;
  
      for (let i = bottom; i >= top; i--) {
        if (column[i].type === Game.MATCH_SYMBOL && i !== top) return column[i];
      }
      return null;
  }
  
  static findLowestGemAboveStar(column, star) {
      if (star === null) return null;
      let top = 0
      let bottom = star.row - 1;
  
      for (let i = bottom; i >= top; i--) {
        if (column[i].type !== Game.MATCH_SYMBOL) return column[i];
      }
      return null;
  }

  // ----------------------
  // SETUP HELPERS
  // ---------------------
  setupBoard(){
    for (let r = 0; r < Game.BOARD_SIZE; r++) {
      let row = [];
      for (let c = 0; c < Game.BOARD_SIZE; c++) {
        let gemType = Gem.getRandomGemType();
        row.push(new Gem(r, c, gemType));
      }
      this.grid.push(row);
    }
  }

  setupCommands() {
    Game.DIRECTIONS.forEach(dir => Screen.addDirectionCommand(dir, this.cursor[dir], this.cursor) );
    Screen.addCommand('s', 'to select a gem', this.selectGem.bind(this));
    Screen.addCommand('h', 'to see a list of the commands', Screen.printCommands);
    console.log(Game.MESSAGE_WELCOME)
    Screen.printCommands();
  }

  setupCursor(){
    this.cursor = new Cursor(Game.BOARD_SIZE, Game.BOARD_SIZE);
    this.cursor.setBackgroundColor();
  }

  setupScreen(){
    Screen.initialize(Game.BOARD_SIZE, Game.BOARD_SIZE);
    Screen.setGridlines(false);
  }


  // ----------------------
  // GRID HELPERS 
  // ---------------------
  getColumns() {
    let numRows = this.grid.length;
    let numCols = this.grid[0].length;
    let columns = [];

    for (let col = 0; col < numCols; col++) {
      let column = [];

      for (let row = 0; row < numRows; row++) {
        column.push(this.grid[row][col]);
      }
      columns.push(column);
    }
    return columns;
  }

  getRowsAndCols() {
    let rows = this.grid;
    let cols = [];

    for (let col = 0; col < Game.BOARD_SIZE; col++) {
      let column = [];
      rows.forEach(row => column.push(row[col]));
      cols.push(column);
    }

    let rowsAndCols = [...rows, ...cols];
    return rowsAndCols;
  }
}
  
  module.exports = Game;  