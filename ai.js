'use strict';

window.DEBUG = false;//{onclick: 0, clicking: 0, flagging: 0, processing: 0, dead: 0, empty: 0, full: 0, subset: 1};
window.ai = {};
ai.init = function(rows, cols) {
    ai.tbody = document.getElementsByTagName('tbody')[0];

    ai.toProcess = [];
    // ai.boundaries = [];
    ai.cells = [];
    ai.rows = rows;
    ai.cols = cols;

    var padRow = []; // surround all cells with a border of null cells
    for (var i = 0; i < cols + 2; i++) padRow.push(null);
    ai.cells.push(padRow);

    for (var i = 0; i < rows; i++) {
        ai.cells.push([null]);
        ai.cells[i + 1][cols + 1] = null;
    }

    ai.cells.push(padRow.slice());
};

ai.neighbourPos = [
    [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]
];

ai.hash = function(row, col) {
    return (ai.cols+1)*row + col;
};

ai.unhash = function(id) {
    return [Math.floor(id/(ai.cols+1)), id%(ai.cols+1)];
}

ai.process = function(cell) {
    var id = ai.hash(cell.row, cell.col);
    if (ai.process.queue.indexOf(id) === -1) {
        ai.process.queue.push(id);
        if (typeof ai.process.timeoutID !== 'number') {
            ai.process.timeoutID = setTimeout(function process() {
                var pos = ai.unhash(ai.process.queue.shift());
                ai.cells[pos[0]][pos[1]].process();
                if (ai.process.queue.length) {
                    ai.process.timeoutID = setTimeout(process, 1);
                } else {
                    ai.process.timeoutID = null;
                    document.getElementById('message').innerHTML += '<br>' + (new Date).getHours() + ':' +  (new Date).getMinutes() + ':' + (new Date).getSeconds() + ' AI is stuck, click a cell to continue';
                }
            }, 1);
        }
    }
}
ai.process.queue = [];

ai.getDOMcell = function(cell, index) {
    var pos = index === undefined ? [0,0] : ai.neighbourPos[index];
    return ai.tbody.children[cell.row+pos[0]-1].children[cell.col+pos[1]-1];
}

ai.click = function(cell, index) {
    var c = ai.getDOMcell(cell, index);
    if (!c.className) {
        if (DEBUG && DEBUG.clicking) console.log('clicking', c);
        c.click();
    }
}

ai.flag = function(cell, index) {
    var c = ai.getDOMcell(cell, index);
    if (!c.className) {
        if (DEBUG && DEBUG.flagging) console.log('flagging', c);
        ai.tbody.oncontextmenu({target: c});
    }
};

ai.onclick = function(DOMrow, DOMcol) {
    if (DEBUG && DEBUG.onclick) console.log('clicked', DOMrow, DOMcol);
    var row = DOMrow + 1;
    var col = DOMcol + 1; // account for ai table padding

    var DOMcell = ai.tbody.children[DOMrow].children[DOMcol];
    var cell;
    if (DOMcell.className === 'flagged') {
        cell = new ai.mine(row, col);
    } else if (DOMcell.textContent) {
        cell = new ai.cell(row, col, parseInt(DOMcell.textContent));
        cell.neighbours.forEach(function(cell) {
            if (cell instanceof ai.cell) ai.process(cell);
        });
    } else {
        ai.cells[row][col] = null;
        ai.neighbourPos.forEach(function(pos) {
            if (ai.cells[row + pos[0]][col + pos[1]] === undefined) {
                ai.onclick(DOMrow + pos[0], DOMcol + pos[1]);
            }
        });
    }
};
ai.mine = function(row, col) {
    this.row = row;
    this.col = col;
    this.id = ai.hash(row, col);
    ai.cells[row][col] = this;

    ai.neighbourPos.forEach(function(pos) {
        var cell = ai.cells[this.row + pos[0]][this.col + pos[1]];

        if (cell instanceof ai.cell) {
            ai.process(cell);
        }
    }, this);
}

ai.cell = function(row, col, mines) {
    this.row = row;
    this.col = col;
    this.id = ai.hash(row, col);
    ai.cells[row][col] = this;

    this.mines = mines;

    this.neighbours.forEach(function(cell) {
        if (cell instanceof ai.cell) ai.process(cell);
    }, this);

    ai.process(this);
};
ai.cell.prototype.process = function() {
    if (DEBUG && DEBUG.processing) {
        console.log('processing', this.row, this.col, ai.getDOMcell(this));
    }

    if (this.dead) {
        if (DEBUG && DEBUG.dead) console.log(DEBUG.processing ? '' : ai.getDOMcell(this), 'cell is dead');
        return;
    }

    this.exhausted = false;

    if (!this.unflagged) {
        if (DEBUG && DEBUG.empty) console.log(DEBUG.processing ? '' : ai.getDOMcell(this), 'neighbours are empty');
        this.dead = this.exhausted = true;
        this.neighbours.forEach(function(cell, index) {
            if (cell === undefined) {
                ai.click(this, index);
            }
        }, this);
        return;
    } else if (this.neighbours.filter(cell => cell === undefined).length ===
            this.unflagged) {
        if (DEBUG && DEBUG.full) console.log(DEBUG.processing ? '' : ai.getDOMcell(this), 'neighbours are all mines');
        this.dead = this.exhausted = true;
        this.neighbours.forEach(function(cell, index) {
            if (cell === undefined) ai.flag(this, index);
        }, this);
        return;
    }

    this.neighbours.forEach((cell) => {
        if (cell instanceof ai.cell) {
            if (cell.dead) return;
            if (cell.unflagged < this.unflagged) {
                var notshared = this.neighbours.map((neighbour, i) =>
                    neighbour === undefined &&
                        cell.neighbourids.indexOf(this.neighbourids[i]) === -1
                );

                if (notshared.filter(x => x).length ===
                        this.unflagged - cell.unflagged) {
                    if (DEBUG && DEBUG.subset) console.log(DEBUG.processing ? '' : ai.getDOMcell(this), 'subset flagged');
                    notshared.forEach((notshared, index) => {
                        if (notshared) ai.flag(this, index);
                    });
                }
            } else if (cell.unflagged === this.unflagged) {
                var shared = [];
                for (var pos, i = 0; i < cell.neighbours.length; i++) {
                    if (cell.neighbours[i] === undefined) {
                        pos = this.neighbourids.indexOf(cell.neighbourids[i]);
                        if (pos === -1) return;
                        else shared.push(pos);
                    }
                }
                if (DEBUG && DEBUG.subset) console.log(DEBUG.processing ? '' : ai.getDOMcell(this), 'subset clicked');
                this.neighbours.forEach((neighbour, i) => {
                    if (neighbour === undefined && shared.indexOf(i) === -1) {
                        ai.click(this, i);
                    }
                });
            }
        }
    });
};

Object.defineProperty(ai.cell.prototype, 'neighbourids', {
    get: function(start) { // neighbours labelled clockwise from top-left
        var cells = ai.neighbourPos.map(pos => ai.hash(
            this.row + pos[0], this.col + pos[1]
        ));
        if (start) return cells.splice(start).concat(cells.splice(0, start));
        else return cells;
    }
});

Object.defineProperty(ai.cell.prototype, 'unflagged', {
    get: function() {
        return this.mines -
            this.neighbours.filter(cell => cell instanceof ai.mine).length;
    }
});

Object.defineProperty(ai.cell.prototype, 'neighbours', {
    get: function(start) { // neighbours labelled clockwise from top-left
        var cells = ai.neighbourPos.map(pos => ai.cells[this.row + pos[0]][
            this.col + pos[1]
        ]);
        if (start) return cells.splice(start).concat(cells.splice(0, start));
        else return cells;
    }
});
/*Object.defineProperty(ai.cell.prototype, 'isBoundary', {
    get: function() {
        if (this.neighbours.indexOf(undefined) === -1) {
            return this.isBoundary = false; // freeze
        }
        return true;
    }
});*/
