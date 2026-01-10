#!/usr/bin/env node
import { Command } from "commander";
import { deployCommand } from "./commands/deploy";

const program = new Command();

program
  .name("zipup")
  .description("zipup CLI")
  .version("0.0.1");

program.addCommand(deployCommand);

program.parse();
