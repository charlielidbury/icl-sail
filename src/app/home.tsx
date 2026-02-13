"use client";

import {
  Box,
  Text,
  VStack,
  Heading,
  Link as ChakraLink,
  Container,
  SimpleGrid,
  Icon,
  Flex,
} from "@chakra-ui/react";
import NextLink from "next/link";
import NavBar from "@/components/navbar";
import {
  competitionBasicAtom,
  competitionAtom,
  CompetitionId,
  hostnameAtom,
  useAuth,
} from "@/shared";
import {
  TbDownload,
  TbChevronRight,
  TbClockFilled,
  TbTrophyFilled,
  TbMessageFilled,
} from "react-icons/tb";
import { MadeWithLove } from "@/components/ui/made-with-love";
import { useColorMode } from "@/components/ui/color-mode";
import { useEffect } from "react";
import { useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
const documents: Record<
  CompetitionId,
  {
    title: string;
    description: string;
    href: string;
  }[]
> = {
  icicle: [
    {
      title: "Qualifying Schedule",
      description: "Qualifying schedule in typical table format",
      href: "/icicle/qualifying_schedule.pdf",
    },
    {
      title: "Information Pack",
      description: "Social info, emergency contacts, itinerary, addresses",
      href: "/icicle/info-pack.pdf",
    },
    {
      title: "Sailing Instructions",
      description: "Tournament format, rules",
      href: "/icicle/instructions.pdf",
    },
    {
      title: "Notice of Race",
      description: "Information for competitors",
      href: "/icicle/nor.pdf",
    },
    {
      title: "World Sailing RRS",
      description: "2025-2028 World Sailing Racing Rules of Sailing",
      href: "/icicle/rrs.pdf",
    },
  ],
  topgun: [
    {
      title: "Qualifying Schedule",
      description: "Qualifying schedule in typical table format",
      href: "/topgun/topgun_schedule.pdf",
    },
  ],
  bathrobe: [
    {
      title: "Sailing Instructions",
      description: "Tournament format, rules",
      href: "/bathrobe/instructions.pdf",
    },
    {
      title: "Qualifying Schedule",
      description: "Qualifying schedule in typical table format",
      href: "/bathrobe/qualifying_schedule.pdf",
    },
  ],
  icicle2026: [
    {
      title: "Qualifying Schedule",
      description: "Qualifying schedule in typical table format",
      href: "/icicle2026/19_schedule.pdf",
    },
    {
      title: "Notice of Race",
      description: "Information for competitors",
      href: "/icicle2026/Icicle_nor_2026.pdf",
    },
    {
      title: "Sailing Instructions",
      description: "Tournament format, rules",
      href: "/icicle2026/icicle_sis_2026.pdf",
    },
  ],
  badger: [
    {
      title: "Qualifying Schedule",
      description: "Qualifying schedule in typical table format",
      href: "/badger/schedule.pdf",
    },
    {
      title: "Sailing Instructions",
      description: "Tournament format, rules",
      href: "/badger/instructions.pdf",
    },
    {
      title: "Notice of Race",
      description: "Information for competitors",
      href: "/badger/nor.pdf",
    },
  ],
};

// export async function getServerSideProps(context: GetServerSidePropsContext) {
//   return { props: { hostname: context.req.headers.hostname } };
// }

function Info() {
  const { isAdmin } = useAuth();
  const competition = useAtomValue(competitionBasicAtom);
  const { data: competitionData } = useAtomValue(competitionAtom);
  const feedbackEnabled = competitionData?.feedback ?? true;

  // Ensure light mode.
  const { setColorMode } = useColorMode();
  useEffect(() => {
    setColorMode("light");
  }, []);

  if (competition === null) {
    return <></>;
  }

  const [topLine, bottomLine] =
    competition.id === "icicle" || competition.id === "icicle2026"
      ? ["IMPERIAL", "ICICLE"]
      : competition.id === "topgun"
        ? ["OXFORD", "TOPGUN"]
        : competition.id === "bathrobe"
          ? ["BATH", "ROBE"]
          : competition.id === "badger"
            ? ["BRUNEL", "BADGER"]
            : []; // never

  const textSize = competition.id === "bathrobe" ? "7xl" : "5xl";

  return (
    <Box minH="100vh" bg="gray.50">
      <Box position="sticky" top="0" zIndex="100">
        <NavBar isAdmin={isAdmin} />
      </Box>

      <Container maxW="1200px" py={12}>
        {/* Header Section */}
        <VStack mb={8}>
          <Heading
            as="h1"
            size={textSize}
            textAlign="center"
            width="100%"
            color={competition.accentColour}
            textTransform="uppercase"
            letterSpacing="0.2em"
            fontWeight="bold"
            fontFamily="'Roboto Mono', monospace"
          >
            {topLine}
          </Heading>
          <Heading
            mt={-5}
            as="h1"
            size={textSize}
            textAlign="center"
            width="100%"
            color={competition.accentColour}
            textTransform="uppercase"
            letterSpacing="0.2em"
            fontWeight="bold"
            fontFamily="'Roboto Mono', monospace"
          >
            {bottomLine}
          </Heading>
          <Text
            py={4}
            fontSize="xl"
            textAlign="center"
            color="gray.600"
            maxW="600px"
          >
            Welcome to an exciting tournament experience where skill meets
            competition on the water.
          </Text>

          {/* Quick Links */}
          <SimpleGrid columns={2} gap={4} w="full" maxW="400px" pt={1}>
            <NextLink href="/races" style={{ textDecoration: "none" }}>
              <Box
                p={3}
                bg="white"
                rounded="lg"
                shadow="md"
                display="flex"
                flexDir="column"
                alignItems="center"
                gap={1}
                _hover={{
                  transform: "translateY(-2px)",
                  shadow: "lg",
                  color: competition.accentColour,
                  "& svg.chevron": { transform: "translateX(2px)" },
                }}
                transition="all 0.2s"
                color="gray.700"
              >
                <Flex align="center" gap={1.5}>
                  <Icon
                    as={TbClockFilled}
                    boxSize={4}
                    color={competition.accentColour}
                  />
                  <Text fontWeight="medium">Races</Text>
                  <Icon
                    as={TbChevronRight}
                    boxSize={4}
                    className="chevron"
                    transition="transform 0.2s"
                    color={competition.accentColour}
                  />
                </Flex>
                <Text fontSize="sm" color="gray.500">
                  Schedule and results
                </Text>
              </Box>
            </NextLink>
            <NextLink href="/leaderboard" style={{ textDecoration: "none" }}>
              <Box
                p={3}
                bg="white"
                rounded="lg"
                shadow="md"
                display="flex"
                flexDir="column"
                alignItems="center"
                gap={1}
                _hover={{
                  transform: "translateY(-2px)",
                  shadow: "lg",
                  color: competition.accentColour,
                  "& svg.chevron": { transform: "translateX(2px)" },
                }}
                transition="all 0.2s"
                color="gray.700"
              >
                <Flex align="center" gap={1.5}>
                  <Icon
                    as={TbTrophyFilled}
                    boxSize={4}
                    color={competition.accentColour}
                  />
                  <Text fontWeight="medium">Leaderboard</Text>
                  <Icon
                    as={TbChevronRight}
                    boxSize={4}
                    className="chevron"
                    transition="transform 0.2s"
                    color={competition.accentColour}
                  />
                </Flex>
                <Text fontSize="sm" color="gray.500">
                  View rankings
                </Text>
              </Box>
            </NextLink>
          </SimpleGrid>

          {feedbackEnabled && (
            <Box w="full" maxW="400px" mt={4}>
              <NextLink href="/feedback" style={{ textDecoration: "none" }}>
                <Box
                  p={3}
                  bg="white"
                  rounded="lg"
                  shadow="md"
                  display="flex"
                  flexDir="column"
                  alignItems="center"
                  gap={1}
                  _hover={{
                    transform: "translateY(-2px)",
                    shadow: "lg",
                    color: competition.accentColour,
                    "& svg.chevron": { transform: "translateX(2px)" },
                  }}
                  transition="all 0.2s"
                  color="gray.700"
                >
                  <Flex align="center" gap={1.5}>
                    <Icon
                      as={TbMessageFilled}
                      boxSize={4}
                      color={competition.accentColour}
                    />
                    <Text fontWeight="medium">Website Feedback</Text>
                    <Icon
                      as={TbChevronRight}
                      boxSize={4}
                      className="chevron"
                      transition="transform 0.2s"
                      color={competition.accentColour}
                    />
                  </Flex>
                  <Text fontSize="sm" color="gray.500">
                    Bug reports and feature requests
                  </Text>
                </Box>
              </NextLink>
            </Box>
          )}
        </VStack>

        {/* Documents Section */}
        <Box>
          <Heading as="h2" size="lg" mb={6} textAlign="center" color="gray.700">
            Documents
          </Heading>
          <SimpleGrid columns={[1, null, 2]} gap={4} maxW="900px" mx="auto">
            {competition &&
              documents[competition.id].map((doc) => (
                <ChakraLink
                  key={doc.href}
                  href={doc.href}
                  p={4}
                  target="_blank"
                  bg="white"
                  rounded="lg"
                  shadow="md"
                  position="relative"
                  _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
                  transition="all 0.2s"
                >
                  <Text
                    position="absolute"
                    top={4.5}
                    right={4.5}
                    fontSize="xs"
                    color={competition.accentColour}
                    fontWeight="medium"
                  >
                    PDF
                  </Text>
                  <VStack align="start" gap={2}>
                    <Flex align="center">
                      <Icon as={TbDownload} boxSize="4" mr={2} />
                      <Text fontWeight="bold">{doc.title}</Text>
                    </Flex>
                    <Text fontSize="sm" color="gray.500">
                      {doc.description}
                    </Text>
                  </VStack>
                </ChakraLink>
              ))}
          </SimpleGrid>
        </Box>

        {/* Advert */}
        <Box mt={10}>
          <Heading as="h2" size="lg" mb={4} textAlign="center" color="gray.700">
            Host A Competition With Us
          </Heading>
          <Text textAlign="center" color="gray.600" maxW="600px" mx="auto">
            If you would like to use this software for your university's team
            racing competitions, leave me an email at{" "}
            <ChakraLink href="mailto:personal@charlielidbury.com">
              personal@charlielidbury.com
            </ChakraLink>
            .
          </Text>
        </Box>
      </Container>

      <Box mt="auto" pb={4}>
        <MadeWithLove />
      </Box>
    </Box>
  );
}

export default function Home({ hostname }: { hostname: string | undefined }) {
  useHydrateAtoms([[hostnameAtom, hostname]]);
  return <Info />;
}
