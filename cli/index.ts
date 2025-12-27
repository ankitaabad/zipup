#!/usr/bin/env node
import { Command } from "commander";
import { deployCommand } from "./commands/deploy";

const program = new Command();

program
  .name("passup")
  .description("Passup PaaS CLI")
  .version("0.1.0");

program.addCommand(deployCommand);

program.parse();
