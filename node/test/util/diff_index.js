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
const co = require("co");

const ArgumentParser = require("argparse").ArgumentParser;
const DiffIndex = require("../../lib/util/diff_index");
const DiffIndexCmd = require("../../lib/cmd/diff_index");
const RepoASTTestUtil = require("../../lib/util/repo_ast_test_util");

describe("DiffIndex", function () {
    // Will always read "x".

    // Define repos with commits
    // state: "a=S:C2-1 foo=bar;Bmaster=2|b=S:C3-1 foo2=bar2;Bmaster=3",

    // Define metarepo with sub repo with commits
    // state: "a=S:C2-1 foo=bar; Bmaster=2|x=S:C3-1 foo2=bar2, sub=Sa:2; Bmaster=3",

    // Define metarepo with sub repo with commits and local changes in subrepo
    // state: "a=S:C2-1 foo=bar; Bmaster=2|x=S:C3-1 foo2=bar2, sub=Sa:2; Bmaster=3; I f1=m; Osub W f2=m2",

    const cases = {
        "no_change": {
            state: "x=S",
            args: ["HEAD"],
            expectedLinesContain: [],
        },
        "no_change_patch": {
            state: "x=S",
            args: ["--patch", "HEAD"],
            expectedLinesContain: [],
        },
        "no_change_stat": {
            state: "x=S",
            args: ["--stat", "HEAD"],
            expectedLinesContain: [],
        },
        "no_change_patchstat": {
            state: "x=S",
            args: ["--patch-with-stat", "HEAD"],
            expectedLinesContain: [],
        },
        "deleted": {
            state: "x=S:I README.md",
            args: ["HEAD"],
            expectedLinesContain: ["D\tREADME.md"],
        },
        "deleted_in_sub": {
            state: "a=S|x=U:I f1=blah2; Os I README.md",
            args: ["HEAD"],
            expectedLinesContain: ["A\tf1", "D\ts/README.md"],
        },
        "modified_in_sub": {
            state: "a=S|x=U:Os I README.md=blah3",
            args: ["HEAD"],
            expectedLinesContain: ["M\ts/README.md"]
        },
        "modified path in sub": {
            state: "a=S|x=U:Os I README.md=x,other=y",
            args: ["HEAD", "--", "s/README.md"],
            expectedLinesContain: ["M\ts/README.md"]
        },
        "modified selected path in sub": {
            state: "a=S|b=S|x=S:I a=Sa:1, b=Sb:1; Oa I README.md=x; Ob I README.md",
            args: ["HEAD", "--", "a/README.md"],
            expectedLinesContain: ["M\ta/README.md"]
        }
    };
    Object.keys(cases).forEach(caseName => {
        const c = cases[caseName];
        it(caseName, co.wrap(function* () {

            const written = yield RepoASTTestUtil.createMultiRepos(c.state);
            const repo = written.repos.x;
            const cwd = repo.workdir();

            const parser = new ArgumentParser()
            DiffIndexCmd.configureParser(parser);
            const parsedArgs = parser.parseArgs(c.args)

            const result = yield DiffIndex.diffIndex(repo, parsedArgs, cwd);
            const resultLines = result.split('\n').filter(val => val !== '');

            if (c.expectedLinesContain !== undefined) {
                assert.deepEqual(c.expectedLinesContain.sort(), resultLines.map(line => line.split(" ").pop()).sort())
            }
        }));
    });
});
