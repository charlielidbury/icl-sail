"use client";

import {
  Box,
  Flex,
  Text,
  IconButton,
  Button,
  Stack,
  Icon,
  Link,
  Image,
  useBreakpointValue,
  useDisclosure,
  Collapsible,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import {
  TbMenu2,
  TbX,
  TbChevronDown,
  TbChevronRight,
  TbHome,
  TbClock,
  TbMedal,
  TbSettings,
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

export default function NavBar({ isAdmin }: NavBarProps) {
  const { open, onToggle } = useDisclosure();
  const [session, setSession] = useState<any>(null);

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

  // Build nav items array and add Settings if isAdmin is true.
  const navItems: Array<NavItem> = [...BASE_NAV_ITEMS];
  if (isAdmin) {
    navItems.push({ label: "Settings", href: "/settings" });
  }

  return (
    <Box>
      <Flex
        bg={useColorModeValue("white", "gray.800")}
        color={useColorModeValue("gray.600", "white")}
        minH={"60px"}
        py={{ base: 2 }}
        px={{ base: 4 }}
        borderBottom={1}
        borderStyle={"solid"}
        borderColor={useColorModeValue("gray.200", "gray.900")}
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
            textAlign={useBreakpointValue({ base: "center", md: "left" })}
            fontFamily={"heading"}
            color={useColorModeValue("gray.800", "white")}
          >
            <Link href="/">
              <Image
                src="/logo_transparent.png"
                alt="Logo"
                width={100}
                height={50}
              />
            </Link>
          </Text>
          <Flex display={{ base: "none", md: "flex" }} ml={10}>
            <DesktopNav navItems={navItems} />
          </Flex>
        </Flex>
        <Stack flex={{ base: 1, md: 0 }} justify={"flex-end"} direction={"row"}>
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
                  <Auth supabaseClient={supabase} />
                </DialogBody>
                <DialogFooter />
                <DialogCloseTrigger />
              </DialogContent>
            </DialogRoot>
          )}
        </Stack>
      </Flex>
      {open && (
        <Box
          position="fixed"
          top="60px"
          left="0"
          right="0"
          bottom="0"
          display={{ base: "flex", md: "none" }}
          flexDirection="column"
          bg={useColorModeValue("white", "gray.800")}
          zIndex={1000}
        >
          <Box flex="1" overflowY="auto">
            <MobileNav navItems={navItems} />
          </Box>
          <Box py="2">
            <Text
              textAlign="center"
              fontSize="xs"
              fontStyle="italic"
              color="gray.500"
              whiteSpace="pre-wrap"
            >
              {
                "Made (with love) by\nCharlie Lidbury, Henry Hollingworth\nand Rushil Patel"
              }
            </Text>
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

  return (
    <Stack direction={"row"}>
      {navItems.map((navItem) => (
        <Box key={navItem.label}>
          <PopoverRoot>
            <PopoverTrigger>
              <Link href={navItem.href ?? "#"}>
                <Box
                  as="a"
                  p={2}
                  fontSize={"sm"}
                  fontWeight={500}
                  color={linkColor}
                  _hover={{
                    textDecoration: "none",
                    color: linkHoverColor,
                  }}
                >
                  {navItem.label}
                </Box>
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
    </Stack>
  );
};

interface DesktopSubNavProps extends NavItem {}
const DesktopSubNav = ({ label, href, subLabel }: DesktopSubNavProps) => {
  return (
    <Link href={href}>
      <Box
        as="a"
        role={"group"}
        display={"block"}
        p={2}
        rounded={"md"}
        _hover={{ bg: useColorModeValue("pink.50", "gray.900") }}
      >
        <Stack direction={"row"} align={"center"}>
          <Box>
            <Text
              transition={"all .3s ease"}
              _groupHover={{ color: "pink.400" }}
              fontWeight={500}
            >
              {label}
            </Text>
            <Text fontSize={"sm"}>{subLabel}</Text>
          </Box>
          <Flex
            transition={"all .3s ease"}
            transform={"translateX(-10px)"}
            opacity={0}
            _groupHover={{ opacity: "100%", transform: "translateX(0)" }}
            justify={"flex-end"}
            align={"center"}
            flex={1}
          >
            <Icon color={"pink.400"} w={5} h={5} as={TbChevronRight} />
          </Flex>
        </Stack>
      </Box>
    </Link>
  );
};

interface MobileNavProps {
  navItems: Array<NavItem>;
}
const MobileNav = ({ navItems }: MobileNavProps) => {
  return (
    <Stack
      bg={useColorModeValue("white", "gray.800")}
      p={6}
      display={{ md: "none" }}
      gap={0}
    >
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

  return (
    <Stack gap={0}>
      <Link
        href={href ?? "#"}
        _hover={{ textDecoration: "none" }}
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
              <Icon as={TbHome} boxSize={5} color="blue.500" />
            )}
            {label === "Races" && (
              <Icon as={TbClock} boxSize={5} color="blue.500" />
            )}
            {label === "Leaderboard" && (
              <Icon as={TbMedal} boxSize={5} color="blue.500" />
            )}
            {label === "Settings" && (
              <Icon as={TbSettings} boxSize={5} color="blue.500" />
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
                  href={child.href}
                  _hover={{ textDecoration: "none" }}
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
