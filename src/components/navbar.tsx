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
  TbLogin,
  TbLogout,
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
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { SharedLogic } from "@/shared";

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
    label: "Schedule",
    href: "/",
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
      <SharedLogic />
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
            <Image
              src="/logo_transparent.png"
              alt="Logo"
              width={100}
              height={50}
            />
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
              variant="subtle"
              onClick={() => supabase.auth.signOut()}
            >
              Log out <TbLogout />
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
                  Log in <TbLogin />
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
      <Collapsible.Root open={open}>
        <Collapsible.Content>
          <MobileNav navItems={navItems} />
        </Collapsible.Content>
      </Collapsible.Root>
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
      p={4}
      display={{ md: "none" }}
    >
      {navItems.map((navItem) => (
        <MobileNavItem key={navItem.label} {...navItem} />
      ))}
    </Stack>
  );
};

const MobileNavItem = ({ label, children, href }: NavItem) => {
  const { open, onToggle } = useDisclosure();
  return (
    <Stack onClick={children && onToggle}>
      <Link href={href ?? "#"}>
        <Box
          py={2}
          as="a"
          justifyContent="space-between"
          alignItems="center"
          _hover={{ textDecoration: "none" }}
        >
          <Text
            fontWeight={600}
            color={useColorModeValue("gray.600", "gray.200")}
          >
            {label}
          </Text>
          {children && (
            <Icon
              as={TbChevronDown}
              transition={"all .25s ease-in-out"}
              transform={open ? "rotate(180deg)" : ""}
              w={6}
              h={6}
            />
          )}
        </Box>
      </Link>
      <Collapsible.Root open={open}>
        <Collapsible.Content>
          <Stack
            mt={2}
            pl={4}
            borderLeft={1}
            borderStyle={"solid"}
            borderColor={useColorModeValue("gray.200", "gray.700")}
            align={"start"}
          >
            {children &&
              children.map((child) => (
                <Link href={child.href} key={child.label}>
                  <Box as="a" py={2}>
                    {child.label}
                  </Box>
                </Link>
              ))}
          </Stack>
        </Collapsible.Content>
      </Collapsible.Root>
    </Stack>
  );
};
