import { Text, Link } from "@chakra-ui/react";
import { useColorModeValue } from "./color-mode";

export function MadeWithLove() {
  const linkColor = useColorModeValue("blue.500", "blue.300");

  return (
    <Text
      textAlign="center"
      fontSize="xs"
      fontStyle="italic"
      color={useColorModeValue("gray.500", "gray.400")}
      whiteSpace="pre-wrap"
      py="4"
      pb="6"
    >
      Made (with love) by
      {"\n"}
      <Link
        href="https://charlielidbury.com"
        color={linkColor}
        target="_blank"
        rel="noopener noreferrer"
      >
        Charlie Lidbury
      </Link>
      ,{" "}
      <Link
        href="https://www.linkedin.com/in/henry-hollingworth/"
        color={linkColor}
        target="_blank"
        rel="noopener noreferrer"
      >
        Henry Hollingworth
      </Link>
      {"\n"}and{" "}
      <Link
        href="https://www.linkedin.com/in/r-ushil/"
        color={linkColor}
        target="_blank"
        rel="noopener noreferrer"
      >
        Rushil Patel
      </Link>
      . {"<"}3
    </Text>
  );
}
