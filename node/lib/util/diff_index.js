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

const assert  = require("chai").assert;
const co      = require("co");
const NodeGit = require("nodegit");

const SubmoduleConfigUtil = require("./submodule_config_util");
const SubmoduleUtil       = require("./submodule_util");
const GitUtil             = require("../util/git_util");
const DiffListUtil        = require("../util/diff_list_util");

/**
 * Outputs the result of diff-index in the specified repo and open submodules,
 *  Note that the order of the list is
 * not defined.   
 *
 * @async
 * @param {NodeGit.Repository} repo
 * @return {String}
 */
exports.diffIndex = co.wrap(function *(repo, args) {
    assert.instanceOf(repo, NodeGit.Repository);

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

    const subNames = new Set(yield SubmoduleUtil.getSubmoduleNames(repo));
    const openSubs = yield SubmoduleUtil.listOpenSubmodules(repo);

    const metaExcludePaths = subNames;
    metaExcludePaths.add(SubmoduleConfigUtil.modulesFileName);

    function pathArgs(paths){
        return ["--"].concat(paths);
    }

    // paths is an optional map of submodues->path list. The meta repo is represented by "."
    const distributeCommand = co.wrap(function *(command, args, manager, paths){
        let metaPathArgs = [];
        if(paths !== undefined && paths["."] !== undefined){
            metaPathArgs = ["--"].concat(paths["."]);
        }
        const metaOutputStr = yield GitUtil.runGitCommand(command, args.concat(metaPathArgs));
        const repoOutputs = [];

        repoOutputs.push(manager.parse(metaOutputStr, metaExcludePaths));

        yield openSubs.map(co.wrap(function *(subRepoName) {
            const subRepo = yield SubmoduleUtil.getRepo(repo, subRepoName);
            const subRepoPath = subRepo.path();

            let subPathArgs = [];
            if(paths !== undefined && paths[subRepoName] !== undefined){
                subPathArgs = ["--"].concat(paths[subRepoName]);
            }
            const subOutputStr = yield GitUtil.runGitCommand(command, args.concat(subPathArgs), subRepoPath);
            const subOutput = manager.convertToMeta(manager.parse(subOutputStr), subRepoName);
            repoOutputs.push(subOutput);
        }));

        return manager.combineToString(repoOutputs);
    });

    // console.log(args.paths);
    let subPaths;
    if(args.paths.length > 0){
        const indexSubNames = yield SubmoduleUtil.getSubmoduleNames(
            repo);
        const openSubmodules = yield SubmoduleUtil.listOpenSubmodules(
            repo);
        subPaths = SubmoduleUtil.resolvePaths(args.paths, indexSubNames, openSubmodules);
    }
    // console.log(subPaths);

    const handleRaw = co.wrap(function *(){
        const commandArgs = args.forwardArgs.concat(['-z', '--raw', args.commit]);
        return distributeCommand("diff-index", commandArgs, new DiffListUtil.FileDiffManager(args.z), subPaths);
    })


    const handlePatch = co.wrap(function *(){
        const commandArgs = args.forwardArgs.concat(['--patch', args.commit]);
        return distributeCommand("diff-index", commandArgs, new DiffListUtil.PatchManager(), subPaths);
    })

    const handleStat = co.wrap(function *(){
        const commandArgs = args.forwardArgs.concat(['--stat', args.commit]);
        return distributeCommand("diff-index", commandArgs, new DiffListUtil.StatManager(), subPaths);
    })

    let output_patch = args.patch || args.patch_with_stat || args.patch_with_raw;
    let output_stat = args.stat || args.patch_with_stat;
    let output_raw = args.raw || (!output_patch && !output_stat); // output raw if patch and stat are not selected


    let output = ""
    if(output_raw){
        output += yield handleRaw();
    }
    if(output_stat){
        output += yield handleStat();
    }
    if(output_patch){
        output += yield handlePatch();
    }
    return output;
});
