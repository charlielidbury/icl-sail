"use client";

import Image from "next/image";
import styles from "./page.module.css";
import NavBar from "@/components/navbar";
import { Box, Button, DialogRoot, Input, Stack } from "@chakra-ui/react";
import Race from "@/components/race";

export default function Home() {
  return (
    <>
      <NavBar />
      <Box p={4}>
        <Stack>
          <Input placeholder="Search" />
          <Race></Race>
          <Race></Race>
          <Race></Race>
          <Race></Race>
        </Stack>
      </Box>
    </>
  );
}
