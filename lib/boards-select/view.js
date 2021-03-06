'use babel';

/**
 * Copyright (C) 2016 Ivan Kravets. All rights reserved.
 *
 * This source file is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License version 2
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

import fs from 'fs';
import path from 'path';
import {clone, removeChildrenOf} from '../utils';

export class BoardsSelectView {

  constructor(boards) {
    // Parse template and retrieve its root element
    const templateString = fs.readFileSync(
      path.resolve(__dirname, 'template.html'), {encoding: 'utf-8'});
    const parser = new DOMParser();
    const doc = parser.parseFromString(templateString, 'text/html');
    this.element = doc.querySelector('.pio-template-root').cloneNode(true);

    // Find important nodes
    this.boardsSelect = this.element.querySelector('.boards-select');
    this.selectedBoardsUl = this.element.querySelector('.selected-boards');
    this.placeholder = this.element.querySelector('.selected-placeholder');

    // Set handlers
    this.boardsSelect.onchange = (event) => {
      this.selectedBoards.add(event.target.value);
      this.filterBoardsChoices();
      this.renderSelectedBoards();
      this.handleSelectBoard();
    };

    this.allBoards = {};
    this.selectedBoards = new Set();

    this.setBoards(boards);
  }

  getDirectory() {
    return this.directorySelect.value;
  }

  setBoards(boards) {
    this.allBoards = clone(boards);
    this.filterBoardsChoices();
  }

  getSelectedBoards() {
    return this.selectedBoards;
  }

  filterBoardsChoices() {
    var defaultOption = document.createElement('option');
    defaultOption.textContent = '-- choose a board (one at a time) --';
    defaultOption.selected = true;
    defaultOption.disabled = true;

    // Sort boards by name
    const sortedKeys = Object.keys(this.allBoards).sort((a, b) => {
      if (this.allBoards[a].name > this.allBoards[b].name) {
        return 1;
      } else if (this.allBoards[a].name < this.allBoards[b].name) {
        return -1;
      } else {
        return 0;
      }
    });

    let groups = {}, option, board;
    for (let boardId of sortedKeys) {
      board = this.allBoards[boardId];

      // Hide already selected boards
      if (this.selectedBoards.has(boardId)) continue;

      if (!groups.hasOwnProperty(board.vendor)) {
        groups[board.vendor] = document.createElement('optgroup');
        groups[board.vendor].label = board.vendor;
      }

      option = document.createElement('option');
      option.value = boardId;
      option.textContent = board.name;
      groups[board.vendor].appendChild(option);
    }

    removeChildrenOf(this.boardsSelect);
    this.boardsSelect.appendChild(defaultOption);
    const vendorNames = Object.keys(groups).sort();
    for (let i = 0; i < vendorNames.length; i++) {
      this.boardsSelect.appendChild(groups[vendorNames[i]]);
    }
  }

  handleSelectBoard() {}

  renderSelectedBoards() {
    this.checkPlaceholderAndUlVisibility();
    removeChildrenOf(this.selectedBoardsUl);
    this.selectedBoards.forEach((boardId) => {
      this.selectedBoardsUl.appendChild(this.createSelected(boardId));
    });
  }

  createSelected(boardId) {
    var li = document.createElement('li'),
        name = document.createElement('span'),
        icon = document.createElement('span'),
        unselect = document.createElement('a');

    li['data-board-id'] = boardId;

    name.textContent = this.allBoards[boardId].name;

    icon.classList.add('icon');
    icon.classList.add('icon-x');

    unselect.href = '#';
    unselect.classList.add('unselect');
    unselect.onclick = (e) => this.handleRemove(e);
    unselect.appendChild(icon);

    li.appendChild(name);
    li.appendChild(unselect);

    return li;
  }

  handleRemove(event) {
    this.selectedBoards.delete(event.target.parentNode.parentNode['data-board-id']);
    event.target.parentNode.parentNode.remove();
    this.checkPlaceholderAndUlVisibility();
    this.handleSelectBoard();
  }

  checkPlaceholderAndUlVisibility() {
    if (this.selectedBoards.length < 1) {
      this.placeholder.style.display = 'block';
      this.selectedBoardsUl.style.display = 'none';
    } else {
      this.placeholder.style.display = 'none';
      this.selectedBoardsUl.style.display = 'block';
    }
  }

  getElement() {
    return this.element;
  }

  destroy() {
    this.element.remove();
  }
}
