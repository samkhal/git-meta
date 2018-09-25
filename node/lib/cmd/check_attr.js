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
const DiffListUtil = require("../util/diff_list_util")
const path = require("path");

/**
 * This module contains methods for implementing the `check-attr` command.
 * .gitattributes files in a meta repo don't extend to submodules.
 */

/**
 * help text for the `check-attr` command
 * @property {String}
 */
exports.helpText = ``;

/**
 * description of the `check-attr` command
 * @property {String}
 */
exports.description = ``;

exports.configureParser = function (parser) {
    const forwardArgs = require("../util/forward_args").forwardArgs;
    const argparse = require("argparse");

    forwardArgs(parser, [
        { name: ["-a", "--all"] },
        { name: "--cached" },
        { name: "-z" },
    ]);
    // Not implemented; stdin

    parser.addArgument('positionals', {
        nargs: argparse.Const.REMAINDER,
    });
};

function handlePositionals(args) {
    const positionals = args.positionals;
    if (positionals.length == 0) {
        throw "No positional arguments supplied";
    }
    const idx = positionals.indexOf("--");
    if (idx >= 0) {
        args.attrs = positionals.slice(0, idx);
        args.pathnames = positionals.slice(idx + 1);
    }
    else if (args.all) {
        args.pathnames = positionals;
    }
    else {
        args.attrs = [positionals[0]];
        args.pathnames = positionals.slice(1);
    }
}

class CheckAttrManager extends DiffListUtil.CommandCombiner {
    constructor(command, args, repo, formatZ, cwd) {
        super(command, args, repo)
        this.formatZ = formatZ;
        this.cwd = cwd;
    }

    parse(str, excludePaths) {
        // This function splits the text into an array of elements corresponding to paths
        // Each element is an array of [path, attribute, value]
        let val = str.split("\0").filter(val => val !== "").reduce((result, value, idx, arr) => {
            if (idx % 3 == 0)
                result.push(arr.slice(idx, idx + 3));
            return result;
        }, []);
        return val;
    }

    raisePaths(pathAttrs, prefixPath) {
        return pathAttrs.map(attr => {
            return [prefixPath + path.sep + attr[0], attr[1], attr[2]];
        })
    }

    combineToString(listOfPathAttrLists) {
        const tokenSeparator = this.formatZ ? '\0' : ': ';
        const attrSeparator = this.formatZ ? '\0' : '\n';
        const attrList = listOfPathAttrLists.reduce((flattened, toFlatten) => flattened.concat(toFlatten), []);
        return attrList.map(attr => attr.join(tokenSeparator)).join(attrSeparator) + attrSeparator;

    }
}


/**
 * Execute the `check-attr` command according to the specified `args`.
 *
 * @async
 * @param {Object} args
 */
exports.executeableSubcommand = co.wrap(function* (args) {
    handlePositionals(args);

    const fs = require("fs-promise");

    const GitUtil = require("../util/git_util");

    const repo = yield GitUtil.getCurrentRepo();
    const cwd = yield fs.realpath(process.cwd());

    args.forwardArgs = args.forwardArgs || [];
    const commandArgs = args.forwardArgs.concat('-z', args.attrs);
    const output = yield (new CheckAttrManager("check-attr", commandArgs, repo, args.z, cwd)).run(cwd, args.pathnames);
    process.stdout.write(output);
});
