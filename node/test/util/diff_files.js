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
const DiffFiles = require("../../lib/util/diff_files");
const DiffFilesCmd = require("../../lib/cmd/diff_files");
const RepoASTTestUtil = require("../../lib/util/repo_ast_test_util");

describe("DiffFiles", function () {
    const cases = {
        "no_change": {
            state: "x=S",
            args: [],
            expectedLinesContain: [],
        },
        "no_change_patch": {
            state: "x=S",
            args: ["--patch"],
            expectedLinesContain: [],
        },
        "no_change_stat": {
            state: "x=S",
            args: ["--stat"],
            expectedLinesContain: [],
        },
        "no_change_patchstat": {
            state: "x=S",
            args: ["--patch-with-stat"],
            expectedLinesContain: [],
        },
        "deleted": {
            state: "x=S:W README.md",
            args: [],
            expectedLinesContain: ["D\tREADME.md"],
        },
        "deleted_in_sub": {
            state: "a=S|x=U:Os W README.md",
            args: [],
            expectedLinesContain: ["D\ts/README.md"],
        },
        "modified_in_sub": {
            state: "a=S|x=U:Os W README.md=blah3",
            args: [],
            expectedLinesContain: ["M\ts/README.md"]
        },
        "modified path in sub": {
            state: "a=S|x=U:Os W README.md=x,other=y",
            args: [],
            expectedLinesContain: ["M\ts/README.md"]
        }
    };
    Object.keys(cases).forEach(caseName => {
        const c = cases[caseName];
        it(caseName, co.wrap(function* () {

            const written = yield RepoASTTestUtil.createMultiRepos(c.state);
            const repo = written.repos.x;
            const cwd = repo.workdir();

            const parser = new ArgumentParser()
            DiffFilesCmd.configureParser(parser);
            const parsedArgs = parser.parseArgs(c.args)

            const result = yield DiffFiles.diffFiles(repo, parsedArgs, cwd);
            const resultLines = result.split('\n').filter(val => val !== '');

            if (c.expectedLinesContain !== undefined) {
                assert.equal(resultLines.length, c.expectedLinesContain.length, "Result: ".concat(JSON.stringify(result)));
                let i;
                for (i = 0; i < resultLines.length; i++) {
                    assert.include(resultLines[i], c.expectedLinesContain[i]);
                }
            }
        }));
    });
});
