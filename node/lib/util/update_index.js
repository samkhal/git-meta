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
const path    = require("path");

const SubmoduleUtil = require("./submodule_util");
const GitUtil = require("../util/git_util");

exports.updateIndex = co.wrap(function *(repo, files, args) {
    assert.instanceOf(repo, NodeGit.Repository);

    if (args.forwardArgs === undefined) {
        args.forwardArgs = [];
    }

    const commandArgs = args.forwardArgs.concat(['-q']);

    const openSubs = yield SubmoduleUtil.listOpenSubmodules(repo);
    const fileMap = SubmoduleUtil.mapPathsToRepos("/", files, repo.workdir(), openSubs);

    yield Promise.all(Object.entries(fileMap).map(async function (entry) {
        const [repoPath, subFiles] = entry;

        const commandArgs = args.forwardArgs.concat('--', subFiles);
        await GitUtil.runGitCommand("update-index", commandArgs, path.resolve(repo.workdir(), repoPath));
    }));
});