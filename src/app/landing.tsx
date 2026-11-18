"use client";

import {
  Box,
  Container,
  Flex,
  Heading,
  Icon,
  Image,
  Link as ChakraLink,
  Text,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import type { ReactNode } from "react";
import { TbCalendarEvent, TbChevronRight } from "react-icons/tb";
import { MadeWithLove } from "@/components/ui/made-with-love";
import {
  allCompetitions,
  COMPETITION_COOKIE,
  competitionUrl,
} from "@/competitions";

const accent = "#004a79";

// Every competition, newest first.
const competitions = Object.values(allCompetitions).reverse();

const cardStyle = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  p: 4,
  bg: "white",
  color: "gray.800",
  rounded: "lg",
  shadow: "md",
  transition: "all 0.2s",
  textDecoration: "none",
  _hover: {
    textDecoration: "none",
    transform: "translateY(-2px)",
    shadow: "lg",
    "& svg.chevron": { transform: "translateX(2px)" },
  },
} as const;

function CardBody({
  media,
  title,
  subtitle,
  chevronColour,
}: {
  media: ReactNode;
  title: string;
  subtitle: string;
  chevronColour: string;
}) {
  return (
    <>
      <Flex w={14} h={10} flexShrink={0} align="center" justify="center">
        {media}
      </Flex>
      <VStack align="start" gap={0} flex={1} minW={0}>
        <Text fontWeight="bold">{title}</Text>
        <Text fontSize="sm" color="gray.500" overflowWrap="anywhere">
          {subtitle}
        </Text>
      </VStack>
      <Icon
        as={TbChevronRight}
        boxSize={5}
        flexShrink={0}
        className="chevron"
        transition="transform 0.2s"
        color={chevronColour}
      />
    </>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <Heading
      as="h2"
      size="sm"
      color="gray.600"
      textTransform="uppercase"
      letterSpacing="0.1em"
      mb={3}
    >
      {children}
    </Heading>
  );
}

/**
 * Asks the visitor to pick a competition. Shown on the home page, and on any
 * competition page (`path`) when the address doesn't name a competition.
 * `host` is the Host header, so links stay on localhost in development.
 */
export default function Landing({
  host,
  path = "/",
}: {
  host: string | undefined;
  path?: string;
}) {
  return (
    <Flex minH="100vh" direction="column" bg="gray.50">
      <Container maxW="lg" px={4} pt={{ base: 12, md: 20 }} pb={8} flex={1}>
        <VStack gap={2} mb={10}>
          <Heading
            as="h1"
            size={{ base: "5xl", md: "6xl" }}
            color={accent}
            textTransform="uppercase"
            letterSpacing="0.2em"
            fontWeight="bold"
            fontFamily="'Roboto Mono', monospace"
            textAlign="center"
            // Balance the trailing letter-spacing so the word looks centred.
            mr="-0.2em"
          >
            iSail
          </Heading>
          <Text
            fontSize="lg"
            color="gray.600"
            textAlign="center"
            textWrap="balance"
          >
            Live race results for university team racing.
          </Text>
        </VStack>

        <Box as="section" mb={10}>
          <SectionHeading>Go to a competition</SectionHeading>
          <VStack gap={3} align="stretch">
            {competitions.map((competition) => {
              const url = competitionUrl(competition, host, path);
              // On hosts that can't name a competition (Vercel previews),
              // remember the choice in a cookie and reload this page.
              const choose =
                url === null
                  ? () => {
                      document.cookie = `${COMPETITION_COOKIE}=${competition.id}; path=/; max-age=31536000; samesite=lax`;
                    }
                  : undefined;
              return (
                <ChakraLink
                  key={competition.id}
                  href={url ?? path}
                  onClick={choose}
                  {...cardStyle}
                >
                  <CardBody
                    media={
                      <Image
                        src={competition.logo}
                        alt=""
                        maxW="full"
                        maxH="full"
                        objectFit="contain"
                      />
                    }
                    title={competition.name}
                    // The site's address, without "https://" or the path
                    subtitle={
                      url === null
                        ? `${competition.id}.isail.site`
                        : new URL(url).host
                    }
                    chevronColour={competition.accentColour}
                  />
                </ChakraLink>
              );
            })}
          </VStack>
        </Box>

        <Box as="section">
          <SectionHeading>Make a race schedule</SectionHeading>
          <ChakraLink asChild {...cardStyle}>
            <NextLink href="/scheduler">
              <CardBody
                media={<Icon as={TbCalendarEvent} boxSize={8} color={accent} />}
                title="Schedule generator"
                subtitle="Plan the races for your own event"
                chevronColour={accent}
              />
            </NextLink>
          </ChakraLink>
        </Box>
      </Container>

      <MadeWithLove />
    </Flex>
  );
}
