"use client";

import {
  Box,
  Text,
  VStack,
  Heading,
  Link,
  Container,
  SimpleGrid,
  Icon,
  Flex,
} from "@chakra-ui/react";
import NavBar from "@/components/navbar";
import { sailingColour, useAuth } from "@/shared";
import { TbDownload, TbChevronRight, TbClock, TbMedal } from "react-icons/tb";
import { MadeWithLove } from "@/components/ui/made-with-love";

const documents = [
  {
    title: "Qualifying Schedule",
    description: "Qualifying schedule in typical table format",
    href: "/qualifying_schedule.pdf",
  },
  {
    title: "Information Pack",
    description: "Social info, emergency contacts, itinerary, addresses",
    href: "/info-pack.pdf",
  },
  {
    title: "Sailing Instructions",
    description: "Tournament format, rules",
    href: "/instructions.pdf",
  },
  {
    title: "Notice of Race",
    description: "Information for competitors",
    href: "/nor.pdf",
  },
  {
    title: "World Sailing RRS",
    description: "2025-2028 World Sailing Racing Rules of Sailing",
    href: "/rrs.pdf",
  },
];

export default function Info() {
  const { isAdmin } = useAuth();

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
            size="5xl"
            textAlign="center"
            width="100%"
            color={sailingColour}
            textTransform="uppercase"
            letterSpacing="0.2em"
            fontWeight="bold"
            fontFamily="'Roboto Mono', monospace"
          >
            Imperial
          </Heading>
          <Heading
            mt={-5}
            as="h1"
            size="5xl"
            textAlign="center"
            width="100%"
            color={sailingColour}
            textTransform="uppercase"
            letterSpacing="0.2em"
            fontWeight="bold"
            fontFamily="'Roboto Mono', monospace"
          >
            Icicle
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
            <Link
              href="/races"
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
                color: sailingColour,
                "& svg.chevron": { transform: "translateX(2px)" },
              }}
              transition="all 0.2s"
              color="gray.700"
            >
              <Flex align="center" gap={1.5}>
                <Icon as={TbClock} boxSize={4} />
                <Text fontWeight="medium">Races</Text>
                <Icon
                  as={TbChevronRight}
                  boxSize={4}
                  className="chevron"
                  transition="transform 0.2s"
                  color={sailingColour}
                />
              </Flex>
              <Text fontSize="sm" color="gray.500">
                Schedule and Results
              </Text>
            </Link>
            <Link
              href="/leaderboard"
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
                color: sailingColour,
                "& svg.chevron": { transform: "translateX(2px)" },
              }}
              transition="all 0.2s"
              color="gray.700"
            >
              <Flex align="center" gap={1.5}>
                <Icon as={TbMedal} boxSize={4} />
                <Text fontWeight="medium">Leaderboard</Text>
                <Icon
                  as={TbChevronRight}
                  boxSize={4}
                  className="chevron"
                  transition="transform 0.2s"
                  color={sailingColour}
                />
              </Flex>
              <Text fontSize="sm" color="gray.500">
                View Rankings
              </Text>
            </Link>
          </SimpleGrid>
        </VStack>

        {/* Documents Section */}
        <Box>
          <Heading as="h2" size="lg" mb={6} textAlign="center" color="gray.700">
            Documents
          </Heading>
          <SimpleGrid columns={[1, null, 2]} gap={4} maxW="900px" mx="auto">
            {documents.map((doc) => (
              <Link
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
                  color={sailingColour}
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
              </Link>
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
            <Link href="mailto:personal@charlielidbury.com">
              personal@charlielidbury.com
            </Link>
            . In the future we will likely charge for its usage, but for now
            we're offering it for free so we can get as much practice running
            competitions as possible.
          </Text>
        </Box>
      </Container>

      <Box mt="auto" pb={4}>
        <MadeWithLove />
      </Box>
    </Box>
  );
}
