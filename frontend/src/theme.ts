import {
  MantineProvider,
  createTheme,
  MantineColorsTuple,
  Input
} from "@mantine/core";
import classes from "../src/styles/custom.module.css";
const primaryColor: MantineColorsTuple = [
  "#ecefff",
  "#d5dafb",
  "#a9b1f1",
  "#7a87e9",
  "#5362e1",
  "#3a4bdd",
  "#2c40dc",
  "#1f32c4",
  "#182cb0",
  "#0a259c"
];

export const theme = createTheme({
  colors: {
    primaryColor
  },
  components: {
    Input: Input.extend({
      classNames: {
        input: classes.input
      }
    })
  },
  primaryColor: "primaryColor"
});
