import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query';
import { useCookies } from 'react-cookie';
import AccountContext from '.'
import request from '../../Utils/AxiosUtils';
import { selfData } from '../../Utils/AxiosUtils/API';
import { applyStoreTheme } from '../../Utils/StoreTheme';

const AccountProvider = (props) => {
    const [cookies, setCookie] = useCookies(["uat"]);
    const [role, setRole] = useState('')
    const { data, refetch, isLoading } = useQuery([selfData, cookies.uat], () => request({ url: selfData }), {
        enabled: false, select: (res) => { return res?.data },
        staleTime: 5 * 60 * 1000,  // 5 minutes — user account data rarely changes mid-session
        cacheTime: 10 * 60 * 1000,
    });
    const [accountData, setAccountData] = useState()
    const [accountContextData, setAccountContextData] = useState({
        name: "",
        image: {}
    })
    const DEFAULT_STORE = { id: 3, store_name: "Grocery", slug: "grocery", icon: "🛒" };

    // Active store for the "Switch Store" dropdown in ProfileNav.
    // Persisted so refresh / navigation keeps the switched store, and sent
    // as X-Store-Id on every API call (see Utils/AxiosUtils).
    const [activeStore, setActiveStoreState] = useState(() => {
        if (typeof window === "undefined") return DEFAULT_STORE;
        try {
            const raw = localStorage.getItem("active_store");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.id) return parsed;
            }
            return DEFAULT_STORE;
        } catch (e) {
            return DEFAULT_STORE;
        }
    });

    const setActiveStore = (storeObj) => {
        const target = storeObj || DEFAULT_STORE;
        setActiveStoreState(target);
        try {
            if (target?.id) {
                const slug = target.slug || (Number(target.id) === 3 ? "grocery" : Number(target.id) === 4 ? "food-zone" : "jewellery");
                const fullStore = { ...target, slug };
                localStorage.setItem("active_store", JSON.stringify(fullStore));
                localStorage.setItem("active_store_id", String(target.id));
                localStorage.setItem("active_store_slug", String(slug));
                setCookie("active_store_id", String(target.id), {
                    path: "/",
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                });
                setCookie("active_store_slug", String(slug), {
                    path: "/",
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                });
            } else {
                localStorage.removeItem("active_store");
                localStorage.removeItem("active_store_id");
                localStorage.removeItem("active_store_slug");
                setCookie("active_store_id", "", { path: "/", expires: new Date(0) });
                setCookie("active_store_slug", "", { path: "/", expires: new Date(0) });
            }
        } catch (e) {}
    };

    const clearActiveStore = () => setActiveStore(DEFAULT_STORE);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("active_store");
            if (!stored) {
                setActiveStore(DEFAULT_STORE);
            }
        }
    }, []);

    useEffect(() => {
        applyStoreTheme(activeStore);
    }, [activeStore]);

    useEffect(() => {
        cookies.uat && refetch()
    }, [cookies.uat])

    useEffect(() => {
        if (data) {
            localStorage.setItem("role", JSON.stringify(data?.role))
            const roleName = (data?.role?.name || "").toLowerCase();
            setRole(roleName);
            // Sync with cookie for middleware optimization
            const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            setCookie("account", JSON.stringify(data), {
                path: "/",
                expires: tokenExpiry,
            });

            // Vendor auto-scoping: if role is vendor, auto-scope to vendor's store
            if (roleName === "vendor" && (data.store_id || data.store)) {
                const vendorStoreId = data.store_id || data.store?.id;
                const vendorStore = data.store ? {
                    id: data.store.id,
                    store_name: data.store.store_name || data.store.name || "Vendor Store",
                    slug: data.store.slug || "",
                    store_logo: data.store.store_logo,
                } : {
                    id: vendorStoreId,
                    store_name: "Vendor Store",
                    slug: "",
                };
                setActiveStore(vendorStore);
            }
        }
        setAccountData(data)
    }, [data, cookies.uat])

    return (
        <AccountContext.Provider value={{ ...props, accountData, setAccountData, accountContextData, setAccountContextData, role, setRole, activeStore, setActiveStore, clearActiveStore }}>
            {props.children}
        </AccountContext.Provider>
    )
}
export default AccountProvider