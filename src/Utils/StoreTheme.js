"use client";

export const STORE_THEMES = {
  default: {
    key: "default",
    name: "Grocery",
    icon: "🛒",
    color: "#0da89b",
    colorHover: "#0b8e83",
    colorRgb: "13, 168, 155",
    colorLight: "#f0fdfa",
    borderColor: "#99f6e4",
    gradient: "linear-gradient(26deg, #0da89b 0%, #059669 100%)",
  },
  foodzone: {
    key: "foodzone",
    name: "Food Zone",
    icon: "🍽️",
    color: "#ea580c", // Warm appetizing food orange
    colorHover: "#c2410c",
    colorRgb: "234, 88, 12",
    colorLight: "#fff7ed",
    borderColor: "#fdba74",
    gradient: "linear-gradient(26deg, #ea580c 0%, #f59e0b 100%)",
  },
  jewellery: {
    key: "jewellery",
    name: "Jewellery",
    icon: "💎",
    color: "#c59b27", // Royal luxury gold
    colorHover: "#a17c18",
    colorRgb: "197, 155, 39",
    colorLight: "#fefce8",
    borderColor: "#fde047",
    gradient: "linear-gradient(26deg, #c59b27 0%, #eab308 100%)",
  },
};

export const getStoreTheme = (store) => {
  if (!store) return STORE_THEMES.default;
  const raw = (store.store_name || store.name || "").toLowerCase().replace(/[\s_-]+/g, "");
  const id = Number(store.id);

  if (raw.includes("food") || id === 4) {
    return STORE_THEMES.foodzone;
  }
  if (raw.includes("jewel") || id === 5) {
    return STORE_THEMES.jewellery;
  }
  return STORE_THEMES.default;
};

export const applyStoreTheme = (store) => {
  if (typeof document === "undefined") return;
  const theme = getStoreTheme(store);
  const root = document.documentElement;

  root.style.setProperty("--theme-color", theme.color);
  root.style.setProperty("--theme-color-hover", theme.colorHover);
  root.style.setProperty("--theme-color-rgb", theme.colorRgb);
  root.style.setProperty("--theme-color-light", theme.colorLight);
  root.setAttribute("data-store-theme", theme.key);

  let styleTag = document.getElementById("store-theme-dynamic-styles");
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "store-theme-dynamic-styles";
    document.head.appendChild(styleTag);
  }

  styleTag.innerHTML = `
    :root {
      --theme-color: ${theme.color} !important;
    }
    .btn-theme,
    .btn-animation,
    .bg-theme {
      background-color: ${theme.color} !important;
      border-color: ${theme.color} !important;
    }
    .btn-theme:hover,
    .btn-animation:hover {
      background-color: ${theme.colorHover} !important;
      border-color: ${theme.colorHover} !important;
    }
    .sidebar-wrapper .sidebar-list .sidebar-link.active,
    .sidebar-wrapper .sidebar-list.active .sidebar-link {
      color: ${theme.color} !important;
    }
    .sidebar-wrapper .sidebar-list .sidebar-link.active svg,
    .sidebar-wrapper .sidebar-list.active .sidebar-link svg {
      stroke: ${theme.color} !important;
      fill: ${theme.color} !important;
    }
    .radix-store-check {
      color: ${theme.color} !important;
    }
    .store-badge-active {
      color: ${theme.color} !important;
    }
    .store-header-pill {
      background: ${theme.colorLight} !important;
      color: ${theme.color} !important;
      border: 1px solid ${theme.borderColor} !important;
    }
  `;
};
