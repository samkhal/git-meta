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
 * This module contains methods for implementing the `diff-index` command.
 */

/**
 * help text for the `diff-index` command
 * @property {String}
 */
exports.helpText = `Compare a tree to the working tree or index in the meta-repo and open submodules.`;

/**
 * description of the `diff-index` command
 * @property {String}
 */
exports.description =`TODO`;

exports.configureParser = function (parser) {
    const argparse = require("argparse");
    // parser.addArgument(['-z'], {
    //     action: "storeConst",
    //     constant: true,
    //     help: "abort an in-progress rebase",
    // });;
    parser.addArgument('-z', {
        action: "storeTrue",
    });

    const argsToForward = [
        {name: "--diff-filter", nargs: "?"},
        {name: "--cached", nargs: 0},
        {name: "--encoding", nargs: "?"},
        {name: "--root", nargs: 0},
        {name: ["-M", "--find-renames"], nargs: "?"},
    ];

    function ForwardArgsAction(options){
        argparse.Action.call(this, options);
    }
    ForwardArgsAction.prototype = Object.create(argparse.Action.prototype);
    ForwardArgsAction.prototype.constructor = ForwardArgsAction;
    ForwardArgsAction.prototype.call = function(parser, namespace, values, optionString){
        // console.log("Namespace ",namespace);
        // console.log("Values ", values);
        // console.log("Options ", optionString);
        if(namespace.forwardArgs === undefined){
            namespace.forwardArgs = [];
        }
        namespace.forwardArgs.push(optionString);
        if(values !== null && values.length != 0){  //bug here, values might not be a list
            namespace.forwardArgs.push(values);
        }
    }

    argsToForward.map(arg => {
        parser.addArgument(arg.name, {
            nargs: arg.nargs,
            action: ForwardArgsAction
        });
    })

    parser.addArgument('-C', {
        nargs: "?",
        help: "Ignored",
    })

    parser.addArgument(['-p', '-u', '--patch'], {action: "storeTrue"});
    parser.addArgument(['--stat'], {action: "storeTrue"});
    parser.addArgument(['--raw'], {action: "storeTrue"});
    parser.addArgument(['--patch-with-stat'], {action: "storeTrue"});
    parser.addArgument(['--patch-with-raw'], {action: "storeTrue"});

    parser.addArgument(["commit"], { //bug if the treeish refers to a submodule commit
        type: "string",
        help: "id of tree object to diff against",
    });

    parser.addArgument("paths", {
        nargs: "*"
    })
};

/**
 * Execute the `diff-index` command according to the specified `args`.
 *
 * @async
 * @param {Object} args
 * @param {String} args.commit
 */
exports.executeableSubcommand = co.wrap(function *(args) {
    const fs   = require("fs-promise");
    const path = require("path");

    const DiffIndex = require("../util/diff_index");
    const GitUtil = require("../util/git_util");

    const repo = yield GitUtil.getCurrentRepo();

    // const args = ['-z','--diff-filter=ACDMRTXB','--cached','HEAD','--'];
    const indexDiff = yield DiffIndex.diffIndex(repo, args);
    console.log(indexDiff);
});
