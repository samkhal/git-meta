#!/usr/bin/env node
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

/**
 * This module contains the entrypoint for the `git-meta` program.  All 
 * significant functionality is deferred to the sub-commands.
 */

const ArgumentParser = require("argparse").ArgumentParser;
const NodeGit = require("nodegit");

const add          = require("./cmd/add");
const addSubmodule = require("./cmd/add_submodule");
const checkout     = require("./cmd/checkout");
const cherryPick   = require("./cmd/cherry_pick");
const close        = require("./cmd/close");
const commit       = require("./cmd/commit");
const diffIndex    = require("./cmd/diff_index");
const diffFiles    = require("./cmd/diff_files");
const Forward      = require("./cmd/forward");
const include      = require("./cmd/include");
// const listFiles    = require("./cmd/list_files");
const lsFiles    = require("./cmd/ls_files");
const merge        = require("./cmd/merge");
const open         = require("./cmd/open");
const pull         = require("./cmd/pull");
const push         = require("./cmd/push");
const rebase       = require("./cmd/rebase");
const reset        = require("./cmd/reset");
const rm           = require("./cmd/rm");
const root         = require("./cmd/root");
const commitShadow = require("./cmd/commit-shadow");
const stash        = require("./cmd/stash");
const status       = require("./cmd/status");
const syncrefs     = require("./cmd/syncrefs");
const submodule    = require("./cmd/submodule");
const updateIndex  = require("./cmd/update_index");
const UserError    = require("./util/user_error");
const version      = require("./cmd/version");

// see https://github.com/nodegit/nodegit/issues/827 -- this is required
// to prevent random hard crashes with e.g. parallelism in index operations.
// Eventually, this will be nodegit's default.
NodeGit.setThreadSafetyStatus(NodeGit.THREAD_SAFETY.ENABLED_FOR_ASYNC_ONLY);

/**
 * Configure the specified `parser` to include the command having the specified
 * `commandName` implemented in the specified `module`.
 *
 * @param {ArgumentParser} parser
 * @param {String}         commandName
 * @param {Object}         module
 * @param {Function}       module.configureParser
 * @param {Function}       module.executeableSubcommand
 * @param {String}         module.helpText
 */
function configureSubcommand(parser, commandName, module) {
    const subParser = parser.addParser(commandName, {
        help: module.helpText,
        description: module.description,
    });
    module.configureParser(subParser);
    subParser.setDefaults({
        func: async function (args, stdin) {
            await module.executeableSubcommand(args, stdin)
            .catch(function (error) {

                // If it's a 'UserError', don't print the stack, just the
                // diagnostic message because the stack is irrelevant.

                if (error instanceof UserError) {
                    console.error(error.message);
                }
                else {
                    console.error(error.stack);
                }
                // process.exit(-1);
            });
        }
    });
}

const description = `These commands are intended to make Git submodules more
powerful and easier to use.  Commands with the same name as regular Git
commands will generally perform that same operation, but across a *meta*
repository and the *sub* repositories that are locally *opened*.  These
commands work on any Git repository (even one without configured submodules);
we do not provide duplicate commands for Git functionality that does not need
to be applied across sub-modules such as 'clone' and 'init'.  Note that
git-meta will forward any subcommand that it does not implement to Git,
as if run with 'git -C $(git meta root) ...'.`;

const parser = new ArgumentParser({
    addHelp:true,
    description: description
});

const subParser = parser.addSubparsers({});

const commands = {
    "add": add,
    "checkout": checkout,
    "cherry-pick": cherryPick,
    "close": close,
    "commit": commit,
    "diff-index": diffIndex,
    "diff-files": diffFiles,
    "include": include,
    // "ls-files": listFiles,
    "ls-files": lsFiles,
    "merge": merge,
    "add-submodule": addSubmodule,
    "open": open,
    "pull": pull,
    "push": push,
    "rebase": rebase,
    "reset": reset,
    "rm": rm,
    "root": root,
    "commit-shadow": commitShadow,
    "stash": stash,
    "submodule": submodule,
    "status": status,
    "sync-refs": syncrefs,
    "update-index": updateIndex,
    "version": version,
};

// Configure the parser with commands in alphabetical order.

Object.keys(commands).sort().forEach(name => {
    const cmd = commands[name];
    configureSubcommand(subParser, name, cmd);
});

const blacklist = new Set([
    "--help",
    "--version",
    "-h",
    "am",
    "annotate",
    "archimport",
    "archive",
    "blame",
    "clean",
    "cvsexportcommit",
    "cvsimport",
    "cvsserver",
    "fast-export",
    "fast-import",
    "filter-branch",
    "grep",
    "merge-file",
    "merge-index",
    "merge-tree",
    "mv",
    "p4",
    "quiltimport",
    "revert",
    "rm",
    "shell",
    "stage",
    "svn",
    "worktree",
]);

// Whitelist for forwarded commands
const whitelist = new Set([
    // Fully supported by default
    "config", 
    "show-ref",

    // Mostly supported by default
    "rev-list", // Mostly supported except for specifying paths
    "rev-parse", // Should be fully supported, but some workdir-related things might break it

])

const intercept = require("intercept-stdout");

exports.runCommand = async function (argv, stdin){
    // If the first argument matches a forwarded sub-command, handle it manually.
    // I was not able to get ArgParse to allow unknown flags, e.g.
    // `git meta branch -r` to be passed to the REMAINDER positional argument on a
    // sub-parser level.
    let captured_stdout = "";
    
    var unhook_intercept = intercept(function(stdout) {
        captured_stdout += stdout;
        return "";
    }, function(stderr){});
    
    if (0 < argv.length &&
        !blacklist.has(argv[0]) && // blacklist is redundant here but we'll keep it around to refer to
        whitelist.has(argv[0]) &&
        !(argv[0] in commands)) {
        const name = argv[0];
        const args = argv.slice(1);
        const result = await Forward.execute(name, args);
        process.stdout.write(result.trim()); //why do we have to trim?
    }
    else {
        const args = parser.parseArgs(argv);
        await args.func(args, stdin);
    }
    
    unhook_intercept();
    return captured_stdout;
}
