"use client";
import React, { useState, useEffect, useRef } from "react";
import styles from "./Header.module.scss";
import Link from "next/link";
import {
  GearIcon,
  HomeIcon,
  NotificationIcon,
  UserAcccountIcon,
} from "@/lib/svg/svgList";

const ChevronDownIcon = () => (
  <svg
    className={styles.chevronIcon}
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const navItems = [
  { label: "Home", href: "/", children: [], isHome: true },
  {
    label: "Insight Invoices",
    children: [
      { label: "Invoice Details", href: "/invoices/details" },
      { label: "Invoice History", href: "/invoices/history" },
    ],
  },
  {
    label: "Invoices",
    children: [
      {
        label: "Invoice Details",
        href: "/invoices/details",
      },
      {
        label: "Invoice History",
        href: "/invoices/history",
        children: [
          {
            label: "History Details",
            href: "/invoices/history/details",
          },
          {
            label: "History Summary",
            href: "/invoices/history/summary",
          },
        ],
      },
    ],
  },
  {
    label: "Cloud Consumption",
    children: [
      { label: "Azure Plan Invoice", href: "/cloud/azure-invoice" },
      { label: "Azure Plan Consumption", href: "/cloud/azure-consumption" },
      {
        label: "Azure Plan Unbilled Consumption",
        href: "/cloud/azure-unbilled",
      },
      { label: "Legacy Invoice", href: "/cloud/legacy-invoice" },
      { label: "Legacy Consumption", href: "/cloud/legacy-consumption" },
    ],
  },
  {
    label: "License Subscriptions",
    children: [
      { label: "View Subscriptions", href: "/licenses/view" },
      { label: "Manage Subscriptions", href: "/licenses/manage" },
    ],
  },
  { label: "Download Reports", href: "/reports", children: [] },
  {
    label: "Admin",
    children: [
      { label: "User Management", href: "/admin/users" },
      { label: "Settings", href: "/admin/settings" },
    ],
  },
];

const Header = () => {
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [openSubMenuLabel, setOpenSubMenuLabel] = useState(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const headerRef = useRef(null);
  const navLinkRefs = useRef([]);

  const handleMenuClick = (index) => {
    if (navItems[index].children.length === 0) {
      console.log(`Navigating to ${navItems[index].href}`);
      setOpenMenuIndex(null);
      setOpenSubMenuLabel(null);
      return;
    }

    if (openMenuIndex === index) {
      setOpenMenuIndex(null);
      setOpenSubMenuLabel(null);
    } else {
      setOpenMenuIndex(index);
      setOpenSubMenuLabel(null);
      const linkElement = navLinkRefs.current[index];
      if (linkElement) {
        const headerRect = headerRef.current.getBoundingClientRect();
        const linkRect = linkElement.getBoundingClientRect();
        setIndicatorStyle({
          left: `${linkRect.left - headerRect.left + linkRect.width / 2}px`,
          width: `${linkRect.width}px`,
          opacity: 1,
        });
      }
    }
  };

  const handleSubMenuClick = (label) => {
    if (openSubMenuLabel === label) {
      setOpenSubMenuLabel(null);
    } else {
      setOpenSubMenuLabel(label);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setOpenMenuIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setOpenMenuIndex(null);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setOpenMenuIndex(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
}, []);

  const hasOpenMenuWithChildren = openMenuIndex !== null && navItems[openMenuIndex]?.children.length > 0;

  return (
    <header className={styles.header} ref={headerRef}>
      {/* --- Top Bar --- */}
      <div className={styles.topBar}>
        <div className={styles.container}>
          <div className={styles.topBarLeft}>
            <a href="tel:1800INSIGHT" className={styles.phoneNumber}>
              1.800.INSIGHT
            </a>
          </div>
          <div className={styles.topBarRight}>
            <button className={styles.iconButton}>
              <sub>
                <span className={styles.notificationCount}>1</span>
              </sub>
              &nbsp;
              <NotificationIcon className="svg-style" />
            </button>

            {/* Account Details */}
            <div className={`${styles.iconAccount} ${isAccountMenuOpen ? styles.open : ''}`}>
              <button className={`${styles.iconButton}`}
                onClick={() => {
                  setIsAccountMenuOpen(!isAccountMenuOpen);
                  setIsAccountSettingsOpen(false);
                }}
              >
                <UserAcccountIcon className="svg-style" />
                <span>
                  &nbsp;&nbsp;{"3E Company Environmental,"} - {"0010816218"}
                </span>
              </button>
              {isAccountMenuOpen &&
                <div className={`${styles.iconAccountMenu}`}>
                  <ul className={`${styles.iconAccountList}`}>
                    <li className={`${styles.iconAccountListItem}`}>
                      <button className={`${styles.iconAccountLink}`} type="button">
                        Switch Account
                      </button>
                  </li>
                </ul>
              </div> }
            </div>

            {/* Account Setting */}
            <div className={`${styles.iconAccountSettings} ${isAccountSettingsOpen ? styles.open : ''}`}>
                <button className={`${styles.iconButton} ${styles.iconSettings}`} 
                  onClick={() => {
                    setIsAccountSettingsOpen(!isAccountSettingsOpen);
                    setIsAccountMenuOpen(false);
                  }}
                >
                  <GearIcon className="svg-style" />
                  <span>
                    &nbsp;&nbsp;{"kotapali"}, {"mahesh"}
                  </span>
              </button>
              {isAccountSettingsOpen &&
                <div className={`${styles.iconAccountSettingsMenu}`}>
                  <ul className={`${styles.iconAccountList}`}>
                    <li className={`${styles.iconAccountListItem}`}>
                      <button className={`${styles.iconAccountLink}`} type="button">
                        Account Settings
                      </button>
                  </li>
                </ul>
              </div> }
            </div>
          </div>
        </div>
      </div>

      {/* --- Main Header --- */}
      <div className={styles.mainHeader}>
        <div className={`${styles.container} ${styles.mainHeaderContainer}`}>
          <div className={styles.logo}>
            <Link href="/">
              <svg viewBox="0 -20 460 140" className={styles.svg}>
                <title>Insight Logo</title>
                <g>
                  <g id="Symbol">
                    <path
                      fill="#721357"
                      d="M60.6,89.7V42.9h11.8v46.7H60.6z M73.6,11c0-4-3.1-7.2-7.1-7.2c-4,0-7.2,3.2-7.2,7.2c0,4,3.2,7.1,7.2,7.1 C70.5,18.1,73.6,15,73.6,11z"
                    />
                    <path
                      fill="#AE0A46"
                      d="M35.4,6.3V53H23.6V6.3H35.4z M22.3,84.9c0,4,3.1,7.2,7.1,7.2c4,0,7.2-3.2,7.2-7.2c0-4-3.2-7.1-7.2-7.1 C25.4,77.9,22.3,81,22.3,84.9z"
                    />
                    <path
                      fill="#D40E8C"
                      d="M89.7,35.4H42.9V23.6h46.7V35.4z M11,22.3c-4,0-7.2,3.1-7.2,7.1c0,4,3.2,7.2,7.2,7.2c4,0,7.1-3.2,7.1-7.2 C18.1,25.4,15,22.3,11,22.3z"
                    />
                    <path
                      fill="#AF0E2E"
                      d="M6.3,60.6H53v11.8H6.3V60.6z M84.9,73.6c4,0,7.2-3.1,7.2-7.1c0-4-3.2-7.2-7.2-7.2c-4,0-7.1,3.2-7.1,7.2 C77.9,70.5,81,73.6,84.9,73.6z"
                    />
                  </g>
                  <g id="Wordmark">
                    <path
                      fill="#3E332D"
                      d="M120.2,89.7V6.3h13.7v83.4H120.2z M273.7,13.2c0-4.3-3.4-7.8-7.7-7.8 c-4.3,0-7.8,3.5-7.8,7.8c0,4.3,3.5,7.7,7.8,7.7C270.3,20.9,273.7,17.5,273.7,13.2z M272.6,89.7V30.8h-13.3v58.8H272.6z M197.3,54.2L197.3,54.2c0-16.2-10.3-25-27.4-25c-11.9,0-21.3,5.4-22.5,5.9v54.6h13.3v-47c1.4-0.6,5.4-2.2,9.9-2.2 c9,0,13.5,5,13.5,13.6v35.6h13.3V54.2z M399.9,54.2c0-15.4-10.8-25.1-24.6-25.1c-8,0-11.7,2.4-12,2.5V3.2h-13.3v86.4h13.3v-47 c0.4-0.2,4.4-2.2,9.5-2.2c8.9,0,13.9,4.8,13.9,13.6v35.6H400L399.9,54.2L399.9,54.2z M249.3,73c0-9.9-7.1-14.2-14.2-17.3 c-1.2-0.5-5.1-2.1-5.7-2.4c-5-2.1-8.5-3.6-8.5-7.6c0-3,2.4-5.8,9.4-5.8c6.8,0,12.7,3.5,13.3,3.8l4.9-9.2c-0.4-0.2-6.9-5.3-19-5.3 c-12.9,0-21.8,7-21.8,17.6c0,9.5,6.7,13.7,13.1,16.3c0.8,0.3,6.4,2.7,7.7,3.2c5,2,7.5,4.1,7.5,7.4c0,3.6-3.3,6.9-10.5,6.9 c-7.5,0-13.9-4.2-14.9-4.8l-5,9.2c0.7,0.6,8.9,6.3,21.5,6.3C239.9,91.2,249.3,84.5,249.3,73z M337.1,35.1v50.3 c0,18.1-8.2,30.9-29.4,30.9c-8.3,0-14.3-1.6-15.4-1.8v-10.9c1.4,0.4,7.5,2,13.7,2c13.2,0,17.8-6.6,17.8-15.6v-1.1 c-0.9,0.4-5,2.3-11.4,2.3c-19,0-29.4-14.2-29.4-31c0-17.7,11-31.1,30.9-31.1C325.7,29.2,335.6,34.3,337.1,35.1z M323.9,42.7 c-0.8-0.4-4.8-2.2-10.2-2.2c-9.9,0-17.2,7.3-17.2,19.8c0,13.3,8.4,19.6,17.2,19.6c5.2,0,9.8-1.8,10.2-2.2V42.7z M425.1,41.7h15 V30.8H425V13.2h-13.1v53c0,16.1,7.2,23.5,23,23.5c0.5,0,5.3,0,5.3,0V78.6c-10.7,0-15-3.1-15-14.1L425.1,41.7z"
                    />
                  </g>
                </g>
              </svg>
            </Link>
          </div>
          <nav className={styles.nav}>
            <ul className={styles.navList}>
              {navItems.map((item, index) => (
                <li key={index} className={styles.navItem}>
                  {item.isHome ? (
                    <Link href={item.href} className={styles.navLink}>
                      <HomeIcon
                        id="homeIcon"
                        className="svg-style"
                        fill="#AE0A46"
                      />
                    </Link>
                  ) : (
                    <button
                      ref={(el) => (navLinkRefs.current[index] = el)}
                      className={`${styles.navLink} ${
                        openMenuIndex === index ? styles.navLinkActive : ""
                      }`}
                      onClick={() => handleMenuClick(index)}
                    >
                      {item.label}
                      {item.children.length > 0 && <ChevronDownIcon />}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* --- Full Screen Dropdown Section --- */}
      <div
        className={`${styles.fullScreenDropdown} ${
          hasOpenMenuWithChildren ? styles.open : ""
        }`}
      >
        <div
          className={styles.activeIndicatorBar}
          style={{ opacity: hasOpenMenuWithChildren ? 1 : 0 }}
        >
          <div
            className={styles.upArrow}
            style={{ left: indicatorStyle.left }}
          ></div>
        </div>
        <div className={styles.container}>
          {hasOpenMenuWithChildren && (
            <div className={styles.dropdownContent}>
              {navItems[openMenuIndex].children.map((child, childIndex) => (
                <div key={childIndex}>
                  {/* Conditionally render link or button for sub-menus */}
                  {child.children ? (
                    <button
                      onClick={() => handleSubMenuClick(child.label)}
                      className={`${styles.dropdownLink} ${
                        openSubMenuLabel === child.label
                          ? styles.activeSubMenuLink
                          : ""
                      }`}
                    >
                      {child.label}
                    </button>
                  ) : (
                    <Link
                      href={child.href || "#"}
                      className={styles.dropdownLink}
                    >
                      {child.label}
                    </Link>
                  )}

                  {/* Conditionally render sub-menu */}
                  {child.children && openSubMenuLabel === child.label && (
                    <div className={styles.subMenu}>
                      {child.children.map((grandchild, grandchildIndex) => (
                        <Link
                          key={grandchildIndex}
                          href={grandchild.href || "#"}
                          className={styles.subMenuLink}
                        >
                          {grandchild.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
