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
const path = require("path");

/**
 * This module contains methods for implementing the `update-index` command.
 */

/**
 * help text for the `update-index` command
 * @property {String}
 */
exports.helpText = `Modifies the index in the meta-repo and open submodules.`;

/**
 * description of the `update-index` command
 * @property {String}
 */
exports.description =`Modifies the index or directory cache. Each file mentioned is updated into the index 
                      and any unmerged or needs updating state is cleared.`;

exports.configureParser = function (parser) {
    const forwardArgs = require("../util/forward_args").forwardArgs;

    parser.addArgument('-z', {
        action: "storeTrue",
    });

    parser.addArgument('--stdin', {
        action: "storeTrue",
    });

    forwardArgs(parser, [
        {name: "--add", nargs: 0},
        {name: "-q", nargs: 0}, //Should check this
        {name: "--refresh", nargs: 0},
        {name: "--remove", nargs: 0},
        {name: "--unmerged", nargs: 0},
    ]);

    parser.addArgument("files", {
        nargs: "*"
    })
};

/**
 * Execute the `ls-files` command according to the specified `args`.
 *
 * @async
 * @param {Object} args
 * @param {String} args.commit
 */
exports.executeableSubcommand = co.wrap(function *(args) {
    let files;
    if(args.stdin){
        const separator = args.z ? "\0" : "\n";
        const fs = require("fs");
        const input = fs.readFileSync(0, "utf-8");
        files = input.split(separator).filter(file => file.length > 0);
    }
    else{
        files = args.files;
    }

    const absoluteFiles = files.map(file => path.resolve(file));

    const UpdateIndex = require("../util/update_index");
    const GitUtil = require("../util/git_util");

    const repo = yield GitUtil.getCurrentRepo();

    const indexDiff = yield UpdateIndex.updateIndex(repo, absoluteFiles, args);
});
