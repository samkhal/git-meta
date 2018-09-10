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
const FileDiff            = require("../util/diff_list_util").FileDiff;

/**
 * Outputs the result of diff-files in the specified repo and open submodules,
 *  Note that the order of the list is
 * not defined.   
 *
 * @async
 * @param {NodeGit.Repository} repo
 * @return {String}
 */
exports.diffFiles = co.wrap(function *(repo, args) {
    assert.instanceOf(repo, NodeGit.Repository);

    const subNames = new Set(yield SubmoduleUtil.getSubmoduleNames(repo));
    const openSubs = yield SubmoduleUtil.listOpenSubmodules(repo);

    const commandArgs = ['-z'];

    // First look at all the files in the meta-repo, ignoring submodules
    // `.gitmodules` file.

    const fileDiffs = FileDiff.parseList(yield GitUtil.runGitCommand("diff-files", commandArgs)).filter(fileDiff => 
    {
        let name = fileDiff.paths[0];
        return !subNames.has(name) // Skip submodules
            && SubmoduleConfigUtil.modulesFileName !== name; //exclude .gitmodules 
    });

    // Then get diffs in submodules.

    yield openSubs.map(co.wrap(function *(name) {

        const subRepo = yield SubmoduleUtil.getRepo(repo, name);
        const subRepoDiffs = FileDiff.parseList(yield GitUtil.runGitCommand("diff-files", commandArgs, subRepo.path()));
        subRepoDiffs.map(diff => diff.addPathParent(name));
        fileDiffs.push.apply(fileDiffs, subRepoDiffs);
    }));
    // console.log(JSON.stringify(fileDiffs));
    return FileDiff.listToString(fileDiffs, args.z);
    // return metarepoDiffs + subrepoDiffs;

});
