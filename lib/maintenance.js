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
import child_process from 'child_process';
import {command as installPlatformIO} from './install/command';
import {getPythonExecutable, getIDEVersion, useBuiltinPlatformIO} from './utils';
import {ENV_BIN_DIR, WIN32, BASE_DIR} from './config';
import {command as donateCommand} from './donate/command';
import {runInTerminal} from './terminal';

export function onActivate() {
  updateOSEnviron();
  installPlatformIO()
    .then(checkIfPlatformIOCanBeExecuted)
    .then(() => donateCommand(true));
}

export function updateOSEnviron() {
  if (useBuiltinPlatformIO()) {  // Insert bin directory into PATH
    if (process.env.PATH.indexOf(ENV_BIN_DIR) < 0) {
      process.env.PATH = ENV_BIN_DIR + path.delimiter + process.env.PATH;
    }
  } else {  // Remove bin directory from PATH
    process.env.PATH = process.env.PATH.replace(ENV_BIN_DIR + path.delimiter, "");
    process.env.PATH = process.env.PATH.replace(path.delimiter + ENV_BIN_DIR, "");
  }

  handleCustomPATH(atom.config.get('platformio-ide.customPATH'));

  process.env.PLATFORMIO_CALLER = "atom";
  process.env.PLATFORMIO_IDE = getIDEVersion();
}

export function installCommands() {
  if (WIN32) {
    const winCheckResult = child_process.spawnSync('platformio', ['--version']);
    if (0 !== winCheckResult.status) {
      const addResult = child_process.spawnSync(
        getPythonExecutable(),
        [path.join(BASE_DIR, 'misc', 'add_path_to_envpath.py'), ENV_BIN_DIR]);
      if (0 !== addResult.status) {
        atom.notifications.addError('Failed to install PlatformIO commands!', {
          detail: addResult.stderr,
          dismissable: true,
        });
        console.error('' + addResult.stderr);
      } else {
        atom.notifications.addSuccess(
          'PlatformIO commands have been successfully installed',
          {dismissable: true}
        );
      }
    }
  } else {
    const args = ['-c', 'command -v platformio --version'];
    // Passing empty env, because "process.env" may contain a path to the
    // "penv/bin", which makes the check always pass.
    const options = {env: {}};
    const checkResult = child_process.spawnSync('/bin/sh', args, options);
    if (0 !== checkResult.status) {
      const map = [
        [path.join(ENV_BIN_DIR, 'platformio'), '/usr/local/bin/platformio'],
        [path.join(ENV_BIN_DIR, 'pio'), '/usr/local/bin/pio'],
      ];
      try {
        for (let item of map) {
          fs.symlinkSync(item[0], item[1]);
        }
      } catch(e) {
        let msg = 'Please install shell commands manually. Open system ' +
                  'Terminal and paste commands below:\n';
        for (let item of map) {
          msg += `\n$ sudo ln -s ${item[0]} ${item[1]}`;
        }
        atom.notifications.addError('PlaftormIO: Failed to install commands', {
          detail: msg,
          dismissable: true,
        });
      }
    } else {
      atom.notifications.addInfo('PlatformIO: Shell Commands installation skipped.', {
        detail: 'Commands are already available in your shell.',
        dismissable: true,
      });
    }
  }
}

export function openTerminal(cmd) {
  const status = runInTerminal([cmd]);
  if (-1 === status) {
    atom.notifications.addError('PlatformIO: Terminal service is not registered.', {
      detail: 'Make sure that "platformio-ide-terminal" package is installed.',
      dismissable: true,
    });
  }
}

export function checkClang() {
  if (localStorage.getItem('platformio-ide:clang-checked')) {
    return;
  }
  const result = child_process.spawnSync('clang', ['--version']);
  if (result.status !== 0) {
    atom.notifications.addWarning('Clang is not installed in your system!', {
      detail: 'PlatformIO IDE uses "clang" for the code autocompletion.\n' +
      'Please install it otherwise this feature will be disabled.\n' +
      'Details: http://docs.platformio.org/en/latest/ide/atom.html##code-completion',
      dismissable: true
    });
  }
  localStorage.setItem('platformio-ide:clang-checked', 1);
}

export function setBuildPanelVisibility(visibility) {
  atom.config.set('build.panelVisibility', visibility);
}

export function handleCustomPATH(newValue, oldValue) {
  if (oldValue) {
    process.env.PATH = process.env.PATH.replace(oldValue + path.delimiter, "");
    process.env.PATH = process.env.PATH.replace(path.delimiter + oldValue, "");
  }
  if (newValue && process.env.PATH.indexOf(newValue) < 0) {
    process.env.PATH = newValue + path.delimiter + process.env.PATH;
  }
}

function checkIfPlatformIOCanBeExecuted() {
  return new Promise((resolve, reject) => {
    var pioVersionProcessStderr = '';
    const pioVersionProcess = child_process.spawn("platformio");
    pioVersionProcess.stderr.on('data', (chunk) => pioVersionProcessStderr += chunk);
    pioVersionProcess.on('close', (code) => {
      if (0 !== code) {
        let title = 'PlaftormIO tool is not available.';
        let msg = 'Can not find `platformio` command. Please install it' +
                  ' using `pip install platformio` or enable built-in PlatformIO tool in' +
                  ' `platformio-ide` package settings.\nDetails:\n' +
                  pioVersionProcessStderr;
        atom.notifications.addError(title, {detail: msg, dismissable: true});
        console.error(title);
        console.error(pioVersionProcessStderr);
        reject();
      }
      resolve();
    });
  });
}
