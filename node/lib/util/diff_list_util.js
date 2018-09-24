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

/**
 * This module contains utility methods for operating on the data output by 
 * git-diff-index
 * git-diff-tree
 * git-diff-files
 * git diff --raw
 *
 * See https://git-scm.com/docs/git-diff-index#_raw_output_format
 */

const path = require("path");
const co = require("co");

const GitUtil = require("../util/git_util");
const SubmoduleUtil = require("./submodule_util");
const SubmoduleConfigUtil = require("./submodule_config_util");

exports.CommandCombiner = class {
    constructor(command, args, repo) {
        this.command = command;
        this.args = args;
        this.repo = repo;
        this.repoRoot = repo.workdir();
    }

    /**
     * @param {Array} list file paths relative to metarepo root
     */
    async run(cwd, paths) {
        if (paths === undefined) {
            paths = [];
        }

        const subNames = new Set(await SubmoduleUtil.getSubmoduleNames(this.repo));
        const openSubs = await SubmoduleUtil.listOpenSubmodules(this.repo);

        const metaExcludePaths = subNames;
        metaExcludePaths.add(SubmoduleConfigUtil.modulesFileName);

        let pathMap = {};
        if (paths.length > 0) {
            const openSubmodules = await SubmoduleUtil.listOpenSubmodules(
                this.repo);
            pathMap = SubmoduleUtil.mapPathsToRepos(cwd, paths, this.repo.workdir(), openSubmodules)
        }

        const results = [];
        const metaRepoPaths = "." in pathMap ? pathMap["."] : [];
        results.push(await this.runForRepo(".", metaRepoPaths, metaExcludePaths));

        const self = this;
        await Promise.all(openSubs.map(async function (subName) {
            const subRepoPaths = subName in pathMap ? pathMap[subName] : [];
            results.push(await self.runForRepo(subName, subRepoPaths));
        }));

        return this.combineToString(results);
    }

    async runForRepo(repoPath, paths, excludePaths) {
        let subPathArgs = [];
        if (paths.length > 0) {
            subPathArgs = ["--"].concat(paths);
        }

        const runPath = path.resolve(this.repoRoot, repoPath);
        const subOutputStr = await GitUtil.runGitCommand(this.command, this.args.concat(subPathArgs), runPath);
        const parsed = this.parse(subOutputStr, excludePaths);
        if (repoPath === ".") {
            return parsed;
        }
        return this.raisePaths(parsed, repoPath);
    }
}

exports.FileDiff = class {
    constructor(metadata, paths) {
        this.metadata = metadata;
        this.paths = paths;
    }

    addPathParent(pathToRoot) {
        this.paths = this.paths.map(single_path => path.join(pathToRoot, single_path))
    }

    toString(formatZ) {
        const pathSeparator = formatZ ? '\0' : '\t';
        return this.metadata + pathSeparator + this.paths.join(pathSeparator);
    }
}

exports.FileDiffManager = class extends exports.CommandCombiner {
    constructor(command, args, repo, formatZ) {
        super(command, args, repo)
        this.formatZ = formatZ;
    }

    parse(str, excludePaths) {
        const nullsplit = str.split("\0");
        const data = [];
        while (nullsplit.length > 0) {
            const metadata = nullsplit.shift();
            if (metadata == '') {
                continue;
            }
            const paths = [nullsplit.shift()];
            const metaElements = metadata.split(" ");
            const status = metaElements[metaElements.length - 1][0]
            if (status == "C" || status == "R") {
                paths.push(nullsplit.shift());
            }
            data.push(new exports.FileDiff(metadata, paths));
        }

        if (excludePaths !== undefined) {
            return data.filter(fileDiff => !excludePaths.has(fileDiff.paths[0]));
        }

        return data;
    }

    raisePaths(fileDiffList, prefixPath) {
        fileDiffList.map(diff => diff.addPathParent(prefixPath));
        return fileDiffList;
    }

    combineToString(fileDiffLists) {
        const listSeparator = this.formatZ ? '\0' : '\n';
        const diffList = fileDiffLists.reduce((flattened, toFlatten) => flattened.concat(toFlatten));
        return diffList.map(diff => diff.toString(this.formatZ)).join(listSeparator);
    }
};

exports.PatchManager = class extends exports.CommandCombiner {
    parse(str, excludePaths) {
        return str;
    }

    raisePaths(str, prefixPath) {
        return str;
    }

    combineToString(strList) {
        return strList.filter(str => str.length > 0).join("\n");
    }
}

exports.StatManager = class extends exports.CommandCombiner {
    parse(str, excludePaths) {
        return str;
    }

    raisePaths(str, prefixPath) {
        return str;
    }

    combineToString(strList) {
        return strList.filter(str => str.length > 0).join("\n");
    }
}

exports.FileListManager = class extends exports.CommandCombiner {
    constructor(command, args, repo, formatZ) {
        super(command, args, repo)
        this.formatZ = formatZ;
    }

    async run(cwd, paths) {
        const openSubs = await SubmoduleUtil.listOpenSubmodules(this.repo);
        const mapped = SubmoduleUtil.mapPathsToRepos('', [cwd], this.repo.workdir(), openSubs);
        this.runningInRepo = Object.keys(mapped)[0];
        this.relativeRunPath = mapped[this.runningInRepo][0];

        return await super.run(cwd, paths);
    }

    async runForRepo(repoPath, paths, excludePaths) {
        if (repoPath == ".") {
            return this.runForMetarepo(repoPath, paths, excludePaths);
        }
        else {
            return this.runForSubrepo(repoPath, paths, excludePaths);
        }
    }

    async runForMetarepo(repoPath, paths, excludePaths) {
        // If we're not in the repo, no output
        if (this.runningInRepo !== ".") {
            return [];
        }

        let metaPathArgs = [];
        if (paths.length > 0) {
            metaPathArgs = ["--"].concat(paths);
        }

        const runPath = path.resolve(this.repoRoot, this.relativeRunPath);
        const metaOutputStr = await GitUtil.runGitCommand(this.command, this.args.concat(metaPathArgs), runPath);

        const files = this.parse(metaOutputStr, excludePaths);
        return files;
    }

    async runForSubrepo(subRepoName, paths) {
        let runPath;
        if (this.runningInRepo === ".") {
            runPath = path.resolve(this.repoRoot, subRepoName);
            // Check if the run dir excludes this subrepro
            const trueRunPathToSubmodule = path.relative(path.resolve(this.repoRoot, this.relativeRunPath), runPath);
            if (trueRunPathToSubmodule.startsWith("..")) {
                return []; // nothing to do here
            }
        }
        else if (this.runningInRepo === subRepoName) {
            runPath = path.resolve(this.repoRoot, subRepoName, this.relativeRunPath);
        }
        else {
            return []; //Not running in the metarepo or this subrepo, nothing to do here
        }

        let subPathArgs = [];
        if (paths.length > 0) {
            subPathArgs = ["--"].concat(paths);
        }

        const subOutputStr = await GitUtil.runGitCommand(this.command, this.args.concat(subPathArgs), runPath);
        const fileList = this.parse(subOutputStr);

        // If running from meta repo, need to prepend a path based on the relative path
        if (this.runningInRepo === ".") {
            const prependPath = path.relative(this.relativeRunPath, subRepoName);
            return fileList.map(file => prependPath + path.sep + file);
        }
        return fileList;
    }

    parse(str, excludePaths) {
        const nullsplit = str.split('\0').filter(line => line.length > 0);
        if (excludePaths !== undefined) {
            return nullsplit.filter(filename => !excludePaths.has(filename));
        }
        return nullsplit;
    }

    raisePaths(fileList, subrepoPath) {
        return fileList.map(file => subrepoPath + path.sep + file);
    }

    combineToString(listOfFileLists) {
        const listSeparator = this.formatZ ? '\0' : '\n';
        const fileList = listOfFileLists.reduce((flattened, toFlatten) => flattened.concat(toFlatten));
        return fileList.filter(str => str.length > 0).join(listSeparator);
    }
}
