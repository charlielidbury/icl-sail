"use client";

import {
  Box,
  Flex,
  Text,
  IconButton,
  Button,
  Stack,
  Icon,
  Image,
  useBreakpointValue,
  useDisclosure,
  Collapsible,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
  Select,
  createListCollection,
} from "@chakra-ui/react";
import Link from "next/link";
import { useColorMode, useColorModeValue } from "@/components/ui/color-mode";
import {
  TbMenu2,
  TbX,
  TbChevronDown,
  TbChevronRight,
  TbHomeFilled,
  TbClockFilled,
  TbTrophyFilled,
  TbAdjustmentsFilled,
  TbBellRinging,
  TbMessageFilled,
} from "react-icons/tb";
import { Auth } from "@supabase/auth-ui-react";
import supabase from "../supabase";
import { useState, useEffect } from "react";
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { MadeWithLove } from "@/components/ui/made-with-love";
import {
  queryClient,
  competitionAtom,
  competitionBasicAtom,
  useCompetition,
  allCompetitions,
  CompetitionId,
} from "@/shared";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import {
  SelectRoot,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValueText,
} from "@/components/ui/select";

interface NavBarProps {
  isAdmin: boolean;
}

interface NavItem {
  label: string;
  subLabel?: string;
  children?: Array<NavItem>;
  href?: string;
}

const BASE_NAV_ITEMS: Array<NavItem> = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Races",
    href: "/races",
  },
  {
    label: "Leaderboard",
    href: "/leaderboard",
  },
];

export default function NavBarRoot({ isAdmin }: NavBarProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <NavBar isAdmin={isAdmin} />
    </QueryClientProvider>
  );
}

function NavBar({ isAdmin }: NavBarProps) {
  const { open, onToggle } = useDisclosure();
  const [session, setSession] = useState<any>(null);
  const { data: settings } = useAtomValue(competitionAtom);
  const { colorMode } = useColorMode();
  const colorModeValue = useColorModeValue("white", "gray.800");
  const textColorModeValue = useColorModeValue("gray.600", "white");
  const borderColorModeValue = useColorModeValue("gray.200", "gray.900");
  const headingColorModeValue = useColorModeValue("gray.800", "white");
  const bgColorModeValue = useColorModeValue("white", "gray.800");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const textAlign = useBreakpointValue({ base: "center", md: "left" });

  const competition = useCompetition();

  // Build nav items array and add Settings if isAdmin is true.
  const navItems: Array<NavItem> = [...BASE_NAV_ITEMS];
  // Add Feedback link if feedback is enabled
  if (settings?.feedback) {
    navItems.push({ label: "Feedback", href: "/feedback" });
  }
  if (isAdmin) {
    navItems.push({ label: "Controls", href: "/controls" });
  }

  return (
    <Box>
      <Flex
        bg={colorModeValue}
        color={textColorModeValue}
        minH={"60px"}
        py={{ base: 2 }}
        px={{ base: 4 }}
        borderBottom={1}
        borderStyle={"solid"}
        borderColor={borderColorModeValue}
        align={"center"}
      >
        <Flex
          flex={{ base: 1, md: "auto" }}
          ml={{ base: -2 }}
          display={{ base: "flex", md: "none" }}
        >
          <IconButton
            onClick={onToggle}
            variant={"ghost"}
            aria-label={"Toggle Navigation"}
          >
            {open ? <TbX /> : <TbMenu2 />}
          </IconButton>
        </Flex>
        <Flex flex={{ base: 1 }} justify={{ base: "center", md: "start" }}>
          <Text
            textAlign={textAlign}
            fontFamily={"heading"}
            color={headingColorModeValue}
          >
            <Link href="/">
              {competition.logo && (
                <Image
                  src={competition.logo}
                  alt={competition.logo}
                  height="50px"
                />
              )}
            </Link>
          </Text>
          <Flex display={{ base: "none", md: "flex" }} ml={10}>
            <DesktopNav navItems={navItems} />
          </Flex>
        </Flex>
        <Stack
          flex={{ base: 1, md: 0 }}
          justify={"flex-end"}
          direction={"row"}
          align="center"
        >
          <Box
            display={{ base: "none", md: "block" }}
            mr={4}
            minW="100px"
            width="auto"
          >
            <CompetitionSelector />
          </Box>
          {session ? (
            <Button
              as={"a"}
              fontSize="sm"
              fontWeight={400}
              variant="outline"
              onClick={() => supabase.auth.signOut()}
            >
              Logout
            </Button>
          ) : (
            <DialogRoot size="full" motionPreset="slide-in-bottom">
              <DialogTrigger asChild>
                <Button
                  as={"a"}
                  fontSize={"sm"}
                  fontWeight={400}
                  variant="outline"
                >
                  Login
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader />
                <DialogBody>
                  <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    providers={[]}
                  />
                </DialogBody>
                <DialogFooter />
                <DialogCloseTrigger />
              </DialogContent>
            </DialogRoot>
          )}
        </Stack>
      </Flex>

      {settings?.announcement && (
        <Flex
          bg={competition.accentColour}
          color="white"
          p={2}
          alignItems="center"
          justifyContent="center"
          gap={2}
        >
          <Icon as={TbBellRinging} />
          <Text>{settings.announcement}</Text>
        </Flex>
      )}

      {open && (
        <Box
          position="fixed"
          top="60px"
          left="0"
          right="0"
          bottom="0"
          display={{ base: "flex", md: "none" }}
          flexDirection="column"
          bg={bgColorModeValue}
          zIndex={1000}
        >
          <Box flex="1" overflowY="auto">
            <MobileNav navItems={navItems} />
          </Box>
          <Box>
            <CompetitionSelector isMobile />
            <MadeWithLove />
          </Box>
        </Box>
      )}
    </Box>
  );
}

interface DesktopNavProps {
  navItems: Array<NavItem>;
}

const DesktopNav = ({ navItems }: DesktopNavProps) => {
  const linkColor = useColorModeValue("gray.600", "gray.200");
  const linkHoverColor = useColorModeValue("gray.800", "white");
  const popoverContentBgColor = useColorModeValue("white", "gray.800");
  const bgHover = useColorModeValue("gray.50", "gray.700");
  const competition = useCompetition();
  if (competition === null) {
    return <></>;
  }

  return (
    <Flex direction="row" gap={4} align="center">
      {navItems.map((navItem) => (
        <Box key={navItem.label}>
          <PopoverRoot>
            <PopoverTrigger>
              <Link
                href={navItem.href ?? "#"}
                style={{ textDecoration: "none" }}
              >
                <Flex
                  py={2}
                  px={3}
                  fontSize={"sm"}
                  fontWeight={500}
                  color={linkColor}
                  align="center"
                  gap={2}
                  rounded="md"
                  transition="all 0.2s"
                  _hover={{
                    textDecoration: "none",
                    color: linkHoverColor,
                    bg: bgHover,
                  }}
                >
                  {navItem.label === "Home" && (
                    <Icon
                      as={TbHomeFilled}
                      boxSize={4}
                      color={competition.accentColour}
                    />
                  )}
                  {navItem.label === "Races" && (
                    <Icon
                      as={TbClockFilled}
                      boxSize={4}
                      color={competition.accentColour}
                    />
                  )}
                  {navItem.label === "Leaderboard" && (
                    <Icon
                      as={TbTrophyFilled}
                      boxSize={4}
                      color={competition.accentColour}
                    />
                  )}
                  {navItem.label === "Feedback" && (
                    <Icon
                      as={TbMessageFilled}
                      boxSize={4}
                      color={competition.accentColour}
                    />
                  )}
                  {navItem.label === "Controls" && (
                    <Icon
                      as={TbAdjustmentsFilled}
                      boxSize={4}
                      color={competition.accentColour}
                    />
                  )}
                  {navItem.label}
                  {navItem.children && (
                    <Icon
                      as={TbChevronDown}
                      boxSize={4}
                      ml={1}
                      color={competition.accentColour}
                    />
                  )}
                </Flex>
              </Link>
            </PopoverTrigger>
            {navItem.children && (
              <PopoverContent
                border={0}
                boxShadow={"xl"}
                bg={popoverContentBgColor}
                p={4}
                rounded={"xl"}
                minW={"sm"}
              >
                <Stack>
                  {navItem.children.map((child) => (
                    <DesktopSubNav key={child.label} {...child} />
                  ))}
                </Stack>
              </PopoverContent>
            )}
          </PopoverRoot>
        </Box>
      ))}
    </Flex>
  );
};

interface DesktopSubNavProps extends NavItem {}
const DesktopSubNav = ({ label, href, subLabel }: DesktopSubNavProps) => {
  const bgHover = useColorModeValue("gray.50", "gray.700");
  const competition = useCompetition();
  if (competition === null) {
    return <></>;
  }

  return (
    <Link href={href ?? "#"} style={{ textDecoration: "none" }}>
      <Flex
        role={"group"}
        p={3}
        rounded={"md"}
        align="center"
        transition="all 0.2s"
        _hover={{ bg: bgHover }}
      >
        <Box flex={1}>
          <Text
            transition={"all .3s ease"}
            _groupHover={{ color: competition.accentColour }}
            fontWeight={500}
          >
            {label}
          </Text>
          {subLabel && (
            <Text fontSize={"sm"} color="gray.500">
              {subLabel}
            </Text>
          )}
        </Box>
        <Icon
          color={competition.accentColour}
          w={5}
          h={5}
          as={TbChevronRight}
          opacity={0.7}
          _groupHover={{
            opacity: 1,
            transform: "translateX(2px)",
          }}
          transition="all 0.2s"
        />
      </Flex>
    </Link>
  );
};

const CompetitionSelector = ({ isMobile = false }) => {
  const currentCompetition = useCompetition();
  const setCompetition = useSetAtom(competitionBasicAtom);
  if (currentCompetition === null) {
    return <></>;
  }

  const handleCompetitionChange = (compId: string) => {
    if (compId in allCompetitions) {
      const selectedComp = allCompetitions[compId as CompetitionId];
      if (selectedComp) {
        setCompetition(selectedComp);
      }
    }
  };

  const competitionItems = createListCollection({
    items: Object.values(allCompetitions).map((comp) => ({
      label: comp.name,
      value: comp.id,
    })),
  });

  // Ensure we have a valid default value
  const defaultValue = currentCompetition && [currentCompetition.id];

  return (
    <Box
      p={isMobile ? 4 : 0}
      borderTop={isMobile ? "1px" : "none"}
      borderColor={useColorModeValue("gray.100", "gray.700")}
      maxW={isMobile ? "300px" : "200px"}
      width={isMobile ? "auto" : "100%"}
      mx={isMobile ? "auto" : "0"}
    >
      <SelectRoot
        positioning={{ placement: isMobile ? "top" : "bottom" }}
        value={defaultValue}
        defaultValue={defaultValue}
        onValueChange={(details) => {
          if (details.value && details.value.length > 0) {
            handleCompetitionChange(details.value[0]);
          }
        }}
        collection={competitionItems}
      >
        <SelectTrigger width="100%">
          <SelectValueText placeholder="Select competition" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(allCompetitions).map((comp) => (
            <SelectItem
              key={comp.id}
              item={{ value: comp.id, label: comp.name }}
            >
              {comp.name}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
    </Box>
  );
};

interface MobileNavProps {
  navItems: Array<NavItem>;
}
const MobileNav = ({ navItems }: MobileNavProps) => {
  const bgColorModeValue = useColorModeValue("white", "gray.800");

  return (
    <Stack bg={bgColorModeValue} p={6} display={{ md: "none" }}>
      {navItems.map((navItem, index) => (
        <Box key={navItem.label}>
          <MobileNavItem {...navItem} />
          {index < navItems.length - 1 && (
            <Box
              borderBottom="1px"
              borderColor={useColorModeValue("gray.100", "gray.700")}
              mx={-6}
              my={1}
            />
          )}
        </Box>
      ))}
    </Stack>
  );
};

const MobileNavItem = ({ label, children, href }: NavItem) => {
  const { open, onToggle } = useDisclosure();
  const bgHover = useColorModeValue("gray.50", "gray.700");
  const competition = useCompetition();
  if (competition === null) {
    return <></>;
  }

  return (
    <Stack gap={0}>
      <Link
        href={href ?? "#"}
        style={{ textDecoration: "none" }}
        onClick={children ? onToggle : undefined}
      >
        <Flex
          py={4}
          px={4}
          as="button"
          width="full"
          justify="space-between"
          align="center"
          rounded="lg"
          _hover={{ bg: bgHover }}
          transition="all 0.2s"
        >
          <Flex align="center" gap={3}>
            {label === "Home" && (
              <Icon
                as={TbHomeFilled}
                boxSize={5}
                color={competition.accentColour}
              />
            )}
            {label === "Races" && (
              <Icon
                as={TbClockFilled}
                boxSize={5}
                color={competition.accentColour}
              />
            )}
            {label === "Leaderboard" && (
              <Icon
                as={TbTrophyFilled}
                boxSize={5}
                color={competition.accentColour}
              />
            )}
            {label === "Controls" && (
              <Icon
                as={TbAdjustmentsFilled}
                boxSize={5}
                color={competition.accentColour}
              />
            )}
            {label === "Feedback" && (
              <Icon
                as={TbMessageFilled}
                boxSize={5}
                color={competition.accentColour}
              />
            )}
            <Text
              fontSize="lg"
              fontWeight={500}
              color={useColorModeValue("gray.700", "gray.200")}
            >
              {label}
            </Text>
          </Flex>
          {children && (
            <Icon
              as={TbChevronDown}
              transition="transform 0.2s"
              transform={open ? "rotate(180deg)" : ""}
              boxSize={5}
              color="blue.500"
            />
          )}
        </Flex>
      </Link>

      <Collapsible.Root open={open}>
        <Collapsible.Content>
          <Stack
            mt={2}
            ml={12}
            gap={2}
            borderLeft="2px"
            borderColor={useColorModeValue("blue.100", "blue.900")}
          >
            {children &&
              children.map((child) => (
                <Link
                  key={child.label}
                  href={child.href ?? "#"}
                  style={{ textDecoration: "none" }}
                >
                  <Flex
                    py={2}
                    px={4}
                    rounded="md"
                    align="center"
                    _hover={{ bg: bgHover }}
                    transition="all 0.2s"
                  >
                    <Text fontSize="md" color="gray.600">
                      {child.label}
                    </Text>
                    {child.subLabel && (
                      <Text fontSize="sm" color="gray.500" ml={2}>
                        {child.subLabel}
                      </Text>
                    )}
                  </Flex>
                </Link>
              ))}
          </Stack>
        </Collapsible.Content>
      </Collapsible.Root>
    </Stack>
  );
};
