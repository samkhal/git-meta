
"use strict";

const ShorthandParserUtil = require("./shorthand_parser_util");
const WriteRepoASTUtil    = require("../../lib/util/write_repo_ast_util");


let input = "x=S:I README.md";
const inputASTs = ShorthandParserUtil.parseMultiRepoShorthand(input);
const path = "/home/sam/tmp/meta";
WriteRepoASTUtil.writeMultiRAST(inputASTs, path);
