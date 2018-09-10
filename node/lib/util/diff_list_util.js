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

const Path = require("path");

exports.FileDiff = class {
    constructor(metadata, paths){
        this.metadata = metadata;
        this.paths = paths;
    }

    addPathParent(pathToRoot){
        this.paths = this.paths.map(path => Path.join(pathToRoot, path))
    }

    toString(formatZ){
        const pathSeparator = formatZ ? '\0' : '\t';
        return this.metadata + pathSeparator + this.paths.join(pathSeparator);
    }
}

exports.FileDiffManager = class {
    constructor(formatZ){
        this.formatZ = formatZ;
    }

    parse(str, excludePaths){
        const nullsplit = str.split("\0");
        const data = [];
        while(nullsplit.length > 0){
            const metadata = nullsplit.shift();
            if(metadata == ''){
                continue;
            }
            const paths = [nullsplit.shift()];
            const metaElements = metadata.split(" ");
            const status = metaElements[metaElements.length -1][0]
            if(status == "C" || status == "R"){
                paths.push(nullsplit.shift());
            }
            data.push(new exports.FileDiff(metadata, paths));
        }

        if(excludePaths !== undefined){
            return data.filter(fileDiff => !excludePaths.has(fileDiff.paths[0])); 
        }

        return data;
    }

    convertToMeta(fileDiffList, subrepoPath){
        fileDiffList.map(diff => diff.addPathParent(subrepoPath));
        return fileDiffList;
    }

    combineToString(fileDiffLists){
        const listSeparator = this.formatZ ? '\0' : '\n';
        const diffList = fileDiffLists.reduce((flattened, toFlatten) => flattened.concat(toFlatten));
        return diffList.map(diff => diff.toString(this.formatZ)).join(listSeparator);
    }
};

exports.PatchManager = class {
    parse(str, excludePaths){
        return str;
    }

    convertToMeta(str, subrepoPath){
        return str;
    }

    combineToString(strList){
        return strList.filter(str => str.length > 0).join("\n");
    }
}

exports.StatManager = class {
    parse(str, excludePaths){
        return str;
    }

    convertToMeta(str, subrepoPath){
        return str;
    }

    combineToString(strList){
        return strList.filter(str => str.length > 0).join("\n");
    }
}

