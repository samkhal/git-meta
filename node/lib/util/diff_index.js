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

    const distributeCommand = co.wrap(function *(command, args, manager){
        const metaOutputStr = yield GitUtil.runGitCommand(command, args);
        const repoOutputs = [];

        const excludes = subNames.add(SubmoduleConfigUtil.modulesFileName);

        repoOutputs.push(manager.parse(metaOutputStr, excludes));

        yield openSubs.map(co.wrap(function *(subRepoName) {
            const subRepo = yield SubmoduleUtil.getRepo(repo, subRepoName);
            const subRepoPath = subRepo.path();
            const subOutputStr = yield GitUtil.runGitCommand(command, args, subRepoPath);
            const subOutput = manager.convertToMeta(manager.parse(subOutputStr), subRepoName);
            repoOutputs.push(subOutput);
        }));

        return manager.combineToString(repoOutputs);
    });

    const handleRaw = co.wrap(function *(){
        const commandArgs = args.forwardArgs.concat(['-z', '--raw', args.commit]);
        return distributeCommand("diff-index", commandArgs, new DiffListUtil.FileDiffManager(args.z));
        return "";
        // DiffListUtil
        // const commandArgs = args.forwardArgs.concat(['-z', '--raw', args.commit]);

        // // First look at all the files in the meta-repo, ignoring submodules
        // // `.gitmodules` file.

        // const fileDiffs = DiffListUtil.FileDiff.parseList(yield GitUtil.runGitCommand("diff-index", commandArgs)).filter(fileDiff =>
        // {
        //     let name = fileDiff.paths[0];
        //     return !subNames.has(name) // Skip submodules
        //         && SubmoduleConfigUtil.modulesFileName !== name; //exclude .gitmodules 
        // });

        // // Then get diffs in submodules.

        // yield openSubs.map(co.wrap(function *(name) {

        //     const subRepo = yield SubmoduleUtil.getRepo(repo, name);
        //     const subRepoDiffs = DiffListUtil.FileDiff.parseList(yield GitUtil.runGitCommand("diff-index", commandArgs, subRepo.path()));
        //     subRepoDiffs.map(diff => diff.addPathParent(name));
        //     fileDiffs.push.apply(fileDiffs, subRepoDiffs);
        // }));
        // return DiffListUtil.FileDiff.listToString(fileDiffs, args.z);
    })


    const handlePatch = co.wrap(function *(){
        const commandArgs = args.forwardArgs.concat(['--patch']);

        // get obj list for metarepo
        // filter out submodules/.gitmodules
        // for each subrepo, get obj list
        //      fix paths
        // join the pieces
        return "";

    })

    const handleStat = co.wrap(function *(){
        return "";

    })

    let output_patch = args.patch || args.patch_with_stat || args.patch_with_raw;
    let output_stat = args.stat || args.patch_with_stat;
    let output_raw = args.raw || (!output_patch && !output_stat); // output raw if patch and stat are not selected

    let output = ""
    if(output_raw){
        output += yield handleRaw();
    }
    if(output_stat){
        output += handleStat();
    }
    if(output_patch){
        output += handlePatch();
    }
    return output;
});
