"use client";
import React, { useContext, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, X, Navigation } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SettingContext from "../../Helper/SettingContext";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const SearchBar = ({ openSearchBar, setOpenSearchBar }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  const { searchSidebarMenu } = useContext(SettingContext);
  const [input, setInput] = useState("");
  const [menuList, setMenuList] = useState([]);
  const [searchArr, setSearchArray] = useState([]);
  const router = useRouter();

  // Load all links on mounting/input change
  useEffect(() => {
    const suggestionArray = [];
    const getAllLink = (item, icon) => {
      if (item.children) {
        item.children.forEach((ele) => {
          getAllLink(ele, icon || item.icon);
        });
      } else {
        suggestionArray.push({ icon: icon || item.icon, title: item.title, path: item.path });
      }
    };

    if (searchSidebarMenu) {
      searchSidebarMenu.forEach((item) => {
        getAllLink(item, item.icon);
      });
    }
    setMenuList(suggestionArray);
  }, [searchSidebarMenu]);

  // Handle hotkeys (Ctrl+K or Cmd+K)
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

  const handleChange = (e) => {
    const value = e.target.value;
    setInput(value);
    if (value !== "") {
      const search = menuList.filter((item) =>
        t(item.title).toLowerCase().includes(value.toLowerCase())
      );
      setSearchArray(search);
    } else {
      setSearchArray([]);
    }
  };

  const handleNavigate = (path) => {
    setOpenSearchBar(false);
    setInput("");
    setSearchArray([]);
    router.push(path);
  };

  return (
    <Dialog.Root open={openSearchBar} onOpenChange={setOpenSearchBar}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99998] transition-opacity" />
        <Dialog.Content className="fixed top-[15%] left-[50%] translate-x-[-50%] w-[90%] max-w-[550px] bg-white rounded-xl shadow-2xl border border-slate-200 z-[99999] overflow-hidden focus:outline-none flex flex-col max-h-[500px]">
          
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              value={input}
              onChange={handleChange}
              className="w-full bg-transparent border-none text-slate-800 placeholder-slate-400 focus:outline-none text-[14.5px]"
              type="text"
              placeholder={t("SearchmStore") + "... (or press Esc to close)"}
              autoFocus
            />
            <button 
              onClick={() => setOpenSearchBar(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all focus:outline-none"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 min-h-[150px] max-h-[350px]">
            {input === "" ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                <Search className="w-8 h-8 mb-2 opacity-30 text-slate-500" />
                <p className="text-sm font-medium">{t("Type to search admin panels")}</p>
                <p className="text-xs text-slate-400 mt-1">Quickly jump to products, orders, categories, or settings.</p>
              </div>
            ) : searchArr.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                <span className="text-sm font-medium">{t("OppsTherearenoresultfound")}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Pages
                </div>
                {searchArr.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleNavigate(item.path)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-600 hover:text-[#172B4D] hover:bg-slate-50 text-left transition-all group focus:outline-none focus:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-[#172B4D]/10 group-hover:text-[#172B4D] transition-colors">
                        <Navigation className="w-4 h-4" />
                      </div>
                      <span className="text-[13.5px] font-medium">{t(item.title)}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 group-hover:text-[#172B4D]/70 font-mono transition-colors">
                      {item.path}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-400 font-medium select-none">
            <span>mStore Command Palette</span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-xs">Ctrl + K</kbd> to open
            </span>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SearchBar;