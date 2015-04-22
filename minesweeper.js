'use strict';

window.minesweeper = {};

minesweeper.init = function() {
    if (minesweeper.init.called) return;
    else minesweeper.init.called = true;

    var started = false;

    var tbody = document.getElementsByTagName('tbody')[0];
    var mineSpan = document.getElementById('mines');
    var message = document.getElementById('message');

    document.getElementsByTagName('button')[0].onclick = function(event) {
        started = false;
        var rows, cols, mines;
        switch (event.target.previousElementSibling.selectedIndex) {
            case 0:
                rows = 9;
                cols = 9;
                mines = 1;
                break;
            case 1:
                rows = 9;
                cols = 9;
                mines = 10;
                break;
            case 2:
                rows = 16;
                cols = 16;
                mines = 40;
                break;
            case 3:
                rows = 16;
                cols = 30;
                mines = 99;
                break;
            default: break;
        }
        mineSpan.textContent = mines;

        var board = document.createDocumentFragment();
        for (var row, i = 0; i < rows; i++) {
            row = document.createElement('tr');
            for (var j = 0; j < cols; j++) {
                row.appendChild(document.createElement('td'));
            }
            board.appendChild(row);
        }

        tbody.innerHTML = '';
        tbody.appendChild(board);

        tbody.onclick = function(event) {
            started = true;
            var rows = tbody.children.length;
            var cols = tbody.firstChild.children.length;
            var mines = parseInt(mineSpan.textContent);

            var startCell = event.target;
            var startCol = Array.prototype.indexOf.call(
                startCell.parentNode.children, startCell
            );
            var startRow = Array.prototype.indexOf.call(
                tbody.children, startCell.parentNode
            );
            var startMines = !startCol ? [0, 1] : (startCol === cols - 1 ?
                [cols - 2, cols - 1] : [startCol - 1, startCol, startCol + 1]
            );
            var startMineNo = rows*cols;
            var mineCells = [];
            for (var j, i = 0; i < rows; i++) {
                if (Math.abs(i - startRow) <= 1) {
                    mineCells.push(startMines.slice());
                    startMineNo -= startMines.length;
                }
                else mineCells.push([]);
            }

            var mine, row, j;
            for (i = 0; i < mines; i++) {
                mine = Math.floor(Math.random()*(startMineNo - i));
                for (row = 0; (mine-=cols-mineCells[row].length) >= 0; row++) {}
                mine += cols - mineCells[row].length;
                for (j = 0; mineCells[row][j] <= mine; j++) mine++;
                mineCells[row].splice(j, 0, mine);
            }

            for (i = startRow + (startRow < rows - 1);
                    i >= 0 && i > startRow - 2; i--) {
                startMines.forEach(function(n) {
                    mineCells[i].splice(mineCells[i].indexOf(n), 1);
                });
            }

            var board = [];
            for (i = 0; i < rows; i++) {
                row = [];
                for (j = 0; j < cols; j++) row.push(0);
                board.push(row);
            }
            var col, k;
            for (row = 0; row < rows; row++) {
                for (i = 0; i < mineCells[row].length; i++) {
                    col = mineCells[row][i];
                    board[row][col] = -1;
                    for (j = row + (row < rows - 1); j >= 0 && j > row-2; j--) {
                        for (k = col + (col<cols-1); k >= 0 && k > col-2; k--) {
                            board[j][k] += (board[j][k] !== -1);
                        }
                    }
                }
            }

            tbody.onclick = function(event) {
                var clickCell = event.target;
                if (clickCell.className) return;

                var clickCol = Array.prototype.indexOf.call(
                    clickCell.parentNode.children, clickCell
                );
                var clickRow = Array.prototype.indexOf.call(
                    tbody.children, clickCell.parentNode
                );

                if (board[clickRow][clickCol] === -1) {
                    for (var j, row, i = 0; i < rows; i++) {
                        row = tbody.children[i];
                        for (var j = 0; j < cols; j++) {
                            if (board[i][j] === -1) {
                                row.children[j].className = 'mine';
                            }
                        }
                    }
                    message.textContent = 'You lose; press start to go again';
                    return;
                }

                (function uncover(row, col) {
                    var cell = tbody.children[row].children[col];
                    cell.className = 'uncovered';
                    if (board[row][col] === 0) {
                        for (var j, i = row + (row < rows - 1);
                                i >= 0 && i > row - 2; i--) {
                            for (j = col + (col < cols - 1);
                                    j >= 0 && j > col - 2; j--) {
                                if (!tbody.children[i].children[j].className) {
                                    uncover(i, j);
                                }
                            }
                        }
                    } else {
                        cell.textContent = board[row][col];
                    }
                })(clickRow, clickCol);

                ai.onclick(clickRow, clickCol);
            };

            startCell.click();
        };

        ai.init(rows, cols);
        document.getElementById('message').textContent = 'Click any cell to begin';
    }

    tbody.oncontextmenu = function(event) {
        if (!started) return true;

        var cell = event.target;
        if (cell.className === 'flagged') {
            cell.className = '';
            mineSpan.textContent++;
        } else if (!cell.className) {
            cell.className = 'flagged';
            mineSpan.textContent--;
        }

        if (mineSpan.textContent === '0') {
            message.textContent = 'You win; click start to go again';
            return false;
        }

        ai.onclick(
            Array.prototype.indexOf.call(tbody.children, cell.parentNode),
            Array.prototype.indexOf.call(cell.parentNode.children, cell)
        );

        return false;
    };
}

if (document.readystate === 'loading') {
    document.addEventListener('DOMContentLoaded', minesweeper.init);
} else {
    minesweeper.init();
}
