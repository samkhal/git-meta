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
const co     = require("co");

const DiffFiles = require("../../lib/util/diff_files");
const RepoASTTestUtil = require("../../lib/util/repo_ast_test_util");

describe("DiffIndex", function () {
    // Will always read "x".

    const cases = {
        "empty": {
            state: "x=S:I README.md",
            args: ["HEAD"],
            expected: ["D\tREADME.md"],
        },
        // "file in meta": {
        //     state: "x=S",
        //     expected: ["README.md"],
        // },
    };
    Object.keys(cases).forEach(caseName => {
        console.log("asdfasdf");
        const c = cases[caseName];
        it(caseName, co.wrap(function *() {
            console.log("bbbb");
            console.log(c.args);
            const written = yield RepoASTTestUtil.createMultiRepos(c.state);
            const repo = written.repos.x;
            const result = yield DiffFiles.diffFiles(repo, c.args);
            const resultLines = result.split('\n');
            process.stdout.write(result, c.args);
            process.stdout.write("asdfasdf");
            console.log("asdfasdf");
            assert.equal(resultLines.length, expected.length);
            let i;
            for (i=0; i<resultLines.length; i++){
                assert.include(expected[i], resultLines[i]);
            }
        }));
    });
});
