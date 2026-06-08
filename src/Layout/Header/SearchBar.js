"use client";
import "./searchbar.css";
import React, { useContext, useEffect, useState } from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, X, Navigation } from "lucide-react";
import { useRouter } from "next/navigation";
import SettingContext from "../../Helper/SettingContext";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const SearchBar = ({ openSearchBar, setOpenSearchBar }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const { searchSidebarMenu } = useContext(SettingContext);
  const [menuList, setMenuList] = useState([]);
  const router = useRouter();

  // Flatten the sidebar tree into a list of { title, path, icon }
  useEffect(() => {
    const suggestionArray = [];
    const getAllLink = (item, icon) => {
      if (item.children) {
        item.children.forEach((ele) => getAllLink(ele, icon || item.icon));
      } else {
        suggestionArray.push({
          icon: icon || item.icon,
          title: item.title,
          path: item.path,
        });
      }
    };
    if (searchSidebarMenu) {
      searchSidebarMenu.forEach((item) => getAllLink(item, item.icon));
    }
    setMenuList(suggestionArray);
  }, [searchSidebarMenu]);

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpenSearchBar((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpenSearchBar]);

  const handleSelect = (path) => {
    setOpenSearchBar(false);
    router.push(path);
  };

  return (
    <Dialog.Root open={openSearchBar} onOpenChange={setOpenSearchBar}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99998] transition-opacity" />
        <Dialog.Content
          className="fixed top-[12%] left-[50%] translate-x-[-50%] w-[90%] max-w-[560px] bg-white rounded-xl shadow-2xl border border-slate-200 z-[99999] overflow-hidden focus:outline-none flex flex-col"
          style={{ maxHeight: "520px" }}
          aria-label="Command palette"
        >
          <Command label="Command Menu" shouldFilter={true}>
            {/* Search input row */}
            <div cmdk-input-wrapper="">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <Command.Input
                placeholder={`${t("SearchmStore")}... (Ctrl+K to toggle)`}
                autoFocus
              />
              <button
                onClick={() => setOpenSearchBar(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Command.List>
              <Command.Empty>
                <Search className="w-8 h-8 mb-2 opacity-25" />
                <span className="font-medium">{t("OppsTherearenoresultfound")}</span>
                <span className="text-xs text-slate-400 mt-1">
                  Try searching for products, orders, categories, or settings.
                </span>
              </Command.Empty>

              {menuList.length > 0 && (
                <Command.Group heading="Pages">
                  {menuList.map((item, i) => (
                    <Command.Item
                      key={i}
                      value={t(item.title) + " " + item.path}
                      onSelect={() => handleSelect(item.path)}
                    >
                      <div className="item-left">
                        <div className="item-icon">
                          <Navigation className="w-3.5 h-3.5" />
                        </div>
                        <span>{t(item.title)}</span>
                      </div>
                      <span className="item-path">{item.path}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>

            {/* Footer with keyboard hints */}
            <div className="cmd-footer">
              <span>mStore Command Palette</span>
              <span className="cmd-footer-keys">
                <span className="cmd-kbd">
                  <kbd>↑</kbd><kbd>↓</kbd> navigate
                </span>
                <span className="cmd-kbd">
                  <kbd>↵</kbd> select
                </span>
                <span className="cmd-kbd">
                  <kbd>Esc</kbd> close
                </span>
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SearchBar;