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

const assert = require("chai").assert;
const path = require("path");
const co = require("co");
const NodeGit = require("nodegit");

const SubmoduleConfigUtil = require("./submodule_config_util");
const SubmoduleUtil = require("./submodule_util");
const GitUtil = require("../util/git_util");
const DiffListUtil = require("../util/diff_list_util");

/**
 * Outputs the result of diff-index in the specified repo and open submodules,
 *  Note that the order of the list is
 * not defined.   
 *
 * @async
 * @param {NodeGit.Repository} repo
 * @return {String}
 */
exports.diffIndex = co.wrap(function* (repo, args, cwd) {
    assert.instanceOf(repo, NodeGit.Repository);
    if( cwd === undefined){
        cwd = path.resolve();
    }

    // const ChildProcess = require('child_process');
    // const ChildProcess = require("child-process-promise");
    // ChildProcess.exec('git diff-index -z --diff-filter=ACDMRTXB -C --cached HEAD --', (err, stdout, stderr) => {
    //   if (err) {
    //     console.error(`exec error: ${err}`);
    //     return;
    //   }

    //   console.log(`output ${stdout}`);
    // });

    // ChildProcess.exec('git diff-index -z --diff-filter=ACDMRTXB -C --cached HEAD --')
    //     .then(function(result){console.log(`output ${result.stdout}`);})
    //     .catch(function(err){console.log("ERR");})

    // ChildProcess.exec('git diff-index -z --diff-filter=ACDMRTXB -C --cached HEAD --')
    //     .then(result => {console.log(`output ${result.stdout}`);})
    //     .catch(err => {console.log("ERR");})

    // ChildProcess.spawn('git', ['diff-index','-z','--diff-filter=ACDMRTXB','-C','--cached','HEAD','--'], {capture: [ 'stdout']})
    //     .then(result =>{console.log(`output ${result.stdout.toString()}`);})
    //     .catch(err => {console.log("err",err);})

    // const result = yield runGitCommand("status", []);//.then(result =>{console.log(`output ${result}`);});
    // console.log(result);

    if (args.forwardArgs === undefined) {
        args.forwardArgs = [];
    }

    const handleRaw = co.wrap(function* () {
        const commandArgs = args.forwardArgs.concat(['-z', '--raw', args.commit]);
        return yield (new DiffListUtil.FileDiffManager("diff-index", commandArgs, repo, args.z)).run(cwd, args.paths);
    })


    const handlePatch = co.wrap(function* () {
        const commandArgs = args.forwardArgs.concat(['--patch', args.commit]);
        return yield (new DiffListUtil.PatchManager("diff-index", commandArgs, repo)).run(cwd, args.paths);
    })

    const handleStat = co.wrap(function* () {
        const commandArgs = args.forwardArgs.concat(['--stat', args.commit]);
        return yield (new DiffListUtil.StatManager("diff-index", commandArgs, repo)).run(cwd, args.paths);
    })

    let output_patch = args.patch || args.patch_with_stat || args.patch_with_raw;
    let output_stat = args.stat || args.patch_with_stat;
    let output_raw = args.raw || (!output_patch && !output_stat); // output raw if patch and stat are not selected


    let output = ""
    if (output_raw) {
        output += yield handleRaw();
    }
    if (output_stat) {
        output += yield handleStat();
    }
    if (output_patch) {
        output += yield handlePatch();
    }
    return output;
});
