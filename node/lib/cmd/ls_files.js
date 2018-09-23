/*
 * Copyright (c) 2016, Two Sigma Open Source
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of git-meta nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

const co = require("co");

/**
 * This module contains methods for implementing the `ls-files` command.
 */

/**
 * help text for the `ls-files` command
 * @property {String}
 */
exports.helpText = `List files in the meta-repo and open submodules.`;

/**
 * description of the `rebase` command
 * @property {String}
 */
exports.description =`Display information about combinations of files in the
directory cache index of the meta-repository and or open submodules.  The
default behavior is to list all files from the current working director down,
inluding (relevant) files in the meta-repository and opened submodules.`;

exports.configureParser = function (parser) {
    // parser.addArgument(['--others'], {action: "storeTrue"});
    // parser.addArgument(['--exclude-standard'], {action: "storeTrue"});
    const forwardArgs = require("../util/forward_args").forwardArgs;

    parser.addArgument('-z', {
        action: "storeTrue",
    });

    forwardArgs(parser, [
        {name: ["-c", "--cached"], nargs: 0},
        {name: ["-d", "--deleted"], nargs: 0},
        {name: ["-m", "--modified"], nargs: 0},
        {name: ["-o", "--others"], nargs: 0},
        {name: "--exclude-standard", nargs: 0},
    ]);
};

/**
 * Execute the `ls-files` command according to the specified `args`.
 *
 * @async
 * @param {Object} args
 * @param {String} args.commit
 */
exports.executeableSubcommand = co.wrap(function *(args) {

    const fs   = require("fs-promise");

    const LsFiles = require("../util/ls_files");
    const GitUtil = require("../util/git_util");

    const repo = yield GitUtil.getCurrentRepo();
    const cwd = yield fs.realpath(process.cwd());

    const output = yield LsFiles.lsFiles(repo, args, cwd);
    process.stdout.write(output);
});
