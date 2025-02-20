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
import { useAuth } from "@/shared";
import { TbDownload, TbChevronRight, TbClock, TbMedal } from "react-icons/tb";

const documents = [
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
        <VStack gap={6} mb={8}>
          <Heading
            as="h1"
            size="4xl"
            textAlign="center"
            width="100%"
            color="blue.600"
            textTransform="uppercase"
            letterSpacing="0.1em"
            fontWeight="bold"
          >
            Imperial Icicle
          </Heading>
          <Text fontSize="xl" textAlign="center" color="gray.600" maxW="600px">
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
                color: "blue.500",
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
                  color="blue.400"
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
                color: "blue.500",
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
                  color="blue.400"
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
                bg="white"
                rounded="lg"
                shadow="md"
                position="relative"
                _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
                transition="all 0.2s"
              >
                <Text
                  position="absolute"
                  top={4}
                  right={4}
                  fontSize="xs"
                  color="blue.500"
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
      </Container>
    </Box>
  );
}
